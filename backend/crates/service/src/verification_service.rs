use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::ServiceError;
use current_domain::entities::{
    Assertion, AssertionStatus, Claim, ClaimKind, ClaimStatus, ClaimVerdict, ClaimVariant,
    Contribution, ContributionTargetType, Evidence, EvidenceStance, EvidenceStrength, Member,
    Rebuttal, RebuttalStatus, Source, SourceKind, SourceReliability,
};
use current_domain::logic::{
    derive_assertion_status, derive_claim_verdict, DerivationConfig, KeyAssertionInput,
};
use current_persistence::repos::assertion_repo::AssertionRepo;
use current_persistence::repos::claim_repo::ClaimRepo;
use current_persistence::repos::claim_variant_repo::ClaimVariantRepo;
use current_persistence::repos::contribution_repo::ContributionRepo;
use current_persistence::repos::evidence_repo::EvidenceRepo;
use current_persistence::repos::member_repo::MemberRepo;
use current_persistence::repos::rebuttal_repo::RebuttalRepo;
use current_persistence::repos::source_repo::SourceRepo;

// ---------------------------------------------------------------------------
// Structs DTO / Input para los casos de uso
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct NewAssertionInput {
    pub text: String,
    pub is_load_bearing: bool,
}

#[derive(Debug, Clone)]
pub struct NewSourceInput {
    pub url: String,
    pub title: String,
    pub kind: SourceKind,
    pub reliability: SourceReliability,
    pub excerpt: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AddEvidenceResult {
    pub source: Source,
    pub evidence: Evidence,
    pub new_assertion_status: AssertionStatus,
    pub new_claim_verdict: Option<ClaimVerdict>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RetractEvidenceResult {
    pub evidence_id: Uuid,
    pub assertion_id: Uuid,
    pub claim_id: Uuid,
    pub new_assertion_status: AssertionStatus,
    pub new_claim_verdict: Option<ClaimVerdict>,
    pub new_claim_status: ClaimStatus,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RetractAssertionResult {
    pub assertion_id: Uuid,
    pub claim_id: Uuid,
    pub new_claim_verdict: Option<ClaimVerdict>,
    pub new_claim_status: ClaimStatus,
}

// ---------------------------------------------------------------------------
// Servicio de Verificación Colaborativa (Orquestador principal)
// ---------------------------------------------------------------------------

pub struct VerificationService {
    member_repo: MemberRepo,
    claim_repo: ClaimRepo,
    variant_repo: ClaimVariantRepo,
    assertion_repo: AssertionRepo,
    source_repo: SourceRepo,
    evidence_repo: EvidenceRepo,
    rebuttal_repo: RebuttalRepo,
    contribution_repo: ContributionRepo,
}

impl VerificationService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            member_repo: MemberRepo::new(pool.clone()),
            claim_repo: ClaimRepo::new(pool.clone()),
            variant_repo: ClaimVariantRepo::new(pool.clone()),
            assertion_repo: AssertionRepo::new(pool.clone()),
            source_repo: SourceRepo::new(pool.clone()),
            evidence_repo: EvidenceRepo::new(pool.clone()),
            rebuttal_repo: RebuttalRepo::new(pool.clone()),
            contribution_repo: ContributionRepo::new(pool),
        }
    }

    /// CASO DE USO 3: Reportar un bulo emergente en estado 'open' con su primera variante.
    pub async fn report_claim(
        &self,
        summary: String,
        kind: ClaimKind,
        propagation_score: i32,
        origin_url: String,
        platform: String,
        language: String,
        snapshot: Option<String>,
        member_id: Uuid,
    ) -> Result<(Claim, ClaimVariant), ServiceError> {
        let trimmed_url = origin_url.trim().to_string();
        let trimmed_summary = summary.trim().to_string();

        // 1. Deduplicación por origin_url: si la URL ya existe, devolver el bulo existente
        if let Some(existing_variant) = self.variant_repo.find_by_origin_url(&trimmed_url).await? {
            if let Some(existing_claim) = self.claim_repo.find_by_id(existing_variant.claim_id).await? {
                return Ok((existing_claim, existing_variant));
            }
        }

        // 2. Deduplicación por resumen idéntico: agrupar como nueva variante del bulo existente
        if let Some(existing_claim) = self.claim_repo.find_by_summary(&trimmed_summary).await? {
            let variant_id = Uuid::new_v4();
            let variant = ClaimVariant {
                id: variant_id,
                claim_id: existing_claim.id,
                origin_url: trimmed_url,
                platform,
                language,
                snapshot,
                seen_at: Utc::now(),
            };
            let created_variant = self.variant_repo.create(&variant).await?;
            return Ok((existing_claim, created_variant));
        }

        // 3. Crear nuevo bulo y su primera variante
        let claim_id = Uuid::new_v4();
        let claim = Claim {
            id: claim_id,
            summary: trimmed_summary,
            kind,
            detected_at: Utc::now(),
            propagation_score,
            status: ClaimStatus::Open,
            verdict: None,
            created_by: member_id,
        };

        let created_claim = self.claim_repo.create(&claim).await?;

        let variant_id = Uuid::new_v4();
        let variant = ClaimVariant {
            id: variant_id,
            claim_id,
            origin_url: trimmed_url,
            platform,
            language,
            snapshot,
            seen_at: Utc::now(),
        };

        let created_variant = self.variant_repo.create(&variant).await?;

        Ok((created_claim, created_variant))
    }

    /// CASO DE USO 2: Descomponer un bulo en afirmaciones verificables.
    pub async fn decompose_claim(
        &self,
        claim_id: Uuid,
        assertions_input: Vec<NewAssertionInput>,
        member_id: Uuid,
    ) -> Result<Vec<Assertion>, ServiceError> {
        let claim = self
            .claim_repo
            .find_by_id(claim_id)
            .await?
            .ok_or(ServiceError::ClaimNotFound(claim_id))?;

        let mut created_assertions = Vec::new();

        for input in assertions_input {
            let assertion_id = Uuid::new_v4();
            let assertion = Assertion {
                id: assertion_id,
                claim_id: claim.id,
                text: input.text,
                is_load_bearing: input.is_load_bearing,
                status: AssertionStatus::Unverified,
                created_by: member_id,
                retracted_at: None,
                retracted_by: None,
            };

            let created = self.assertion_repo.create(&assertion).await?;

            // Traza de contribución
            let contrib = Contribution {
                id: Uuid::new_v4(),
                member_id,
                target_type: ContributionTargetType::Assertion,
                target_id: assertion_id,
                created_at: Utc::now(),
                outcome: None,
            };
            self.contribution_repo.create(&contrib).await?;

            created_assertions.push(created);
        }

        Ok(created_assertions)
    }

    /// CASO DE USO 1: Añadir evidencia y RECALCULAR la cascada completa (Assertion Status -> Claim Verdict).
    pub async fn add_evidence(
        &self,
        assertion_id: Uuid,
        new_source: NewSourceInput,
        stance: EvidenceStance,
        strength: EvidenceStrength,
        rationale: String,
        member_id: Uuid,
    ) -> Result<AddEvidenceResult, ServiceError> {
        if rationale.trim().is_empty() {
            return Err(ServiceError::EmptyRationale);
        }

        let assertion = self
            .assertion_repo
            .find_by_id(assertion_id)
            .await?
            .ok_or(ServiceError::AssertionNotFound(assertion_id))?;

        if assertion.is_retracted() {
            return Err(ServiceError::Unauthorized("No se puede aportar evidencia a una afirmación retirada".to_string()));
        }

        // 1. Guardar la fuente
        let source_id = Uuid::new_v4();
        let source = Source {
            id: source_id,
            url: new_source.url,
            title: new_source.title,
            kind: new_source.kind,
            reliability: new_source.reliability,
            excerpt: new_source.excerpt,
            added_by: member_id,
            added_at: Utc::now(),
        };
        let created_source = self.source_repo.create(&source).await?;

        // Registrar contribución de la fuente
        let source_contrib = Contribution {
            id: Uuid::new_v4(),
            member_id,
            target_type: ContributionTargetType::Source,
            target_id: source_id,
            created_at: Utc::now(),
            outcome: None,
        };
        self.contribution_repo.create(&source_contrib).await?;

        // 2. Guardar la evidencia
        let evidence_id = Uuid::new_v4();
        let evidence = Evidence {
            id: evidence_id,
            assertion_id,
            source_id,
            stance,
            strength,
            rationale,
            added_by: member_id,
            added_at: Utc::now(),
            retracted_at: None,
            retracted_by: None,
        };
        let created_evidence = self.evidence_repo.create(&evidence).await?;

        // Registrar contribución de la evidencia
        let evidence_contrib = Contribution {
            id: Uuid::new_v4(),
            member_id,
            target_type: ContributionTargetType::Evidence,
            target_id: evidence_id,
            created_at: Utc::now(),
            outcome: None,
        };
        self.contribution_repo.create(&evidence_contrib).await?;

        // 3. Recalcular la cascada completa
        let (new_assertion_status, new_claim_verdict, _) =
            self.recalculate_cascade(assertion.claim_id, Some(assertion_id)).await?;

        Ok(AddEvidenceResult {
            source: created_source,
            evidence: created_evidence,
            new_assertion_status: new_assertion_status.unwrap_or(AssertionStatus::Unverified),
            new_claim_verdict,
        })
    }

    /// CASO DE USO: Retractar una evidencia con rastro y recalcular la cascada en tiempo real.
    pub async fn retract_evidence(
        &self,
        evidence_id: Uuid,
        member_id: Uuid,
    ) -> Result<RetractEvidenceResult, ServiceError> {
        let evidence = self
            .evidence_repo
            .find_by_id(evidence_id)
            .await?
            .ok_or(ServiceError::EvidenceNotFound(evidence_id))?;

        // 1. Control de autorización: solo el autor puede retirar su propia aportación
        if evidence.added_by != member_id {
            return Err(ServiceError::Unauthorized(
                "Solo el autor de la evidencia puede retirarla".to_string(),
            ));
        }

        if evidence.is_retracted() {
            return Err(ServiceError::AlreadyRetracted);
        }

        // 2. Marcar como retirada en BD preservando el rastro
        self.evidence_repo.retract(evidence_id, member_id).await?;

        let assertion = self
            .assertion_repo
            .find_by_id(evidence.assertion_id)
            .await?
            .ok_or(ServiceError::AssertionNotFound(evidence.assertion_id))?;

        let claim_id = assertion.claim_id;

        // 3. Recalcular la cascada completa
        let (new_assertion_status, new_claim_verdict, new_claim_status) =
            self.recalculate_cascade(claim_id, Some(assertion.id)).await?;

        Ok(RetractEvidenceResult {
            evidence_id,
            assertion_id: assertion.id,
            claim_id,
            new_assertion_status: new_assertion_status.unwrap_or(AssertionStatus::Unverified),
            new_claim_verdict,
            new_claim_status,
        })
    }

    /// CASO DE USO: Retractar una afirmación con rastro y recalcular el veredicto del bulo.
    pub async fn retract_assertion(
        &self,
        assertion_id: Uuid,
        member_id: Uuid,
    ) -> Result<RetractAssertionResult, ServiceError> {
        let assertion = self
            .assertion_repo
            .find_by_id(assertion_id)
            .await?
            .ok_or(ServiceError::AssertionNotFound(assertion_id))?;

        // 1. Control de autorización: solo el autor puede retirar su propia afirmación
        if assertion.created_by != member_id {
            return Err(ServiceError::Unauthorized(
                "Solo el autor de la afirmación puede retirarla".to_string(),
            ));
        }

        if assertion.is_retracted() {
            return Err(ServiceError::AlreadyRetracted);
        }

        // 2. Marcar como retirada en BD
        self.assertion_repo.retract(assertion_id, member_id).await?;

        let claim_id = assertion.claim_id;

        // 3. Recalcular el veredicto del bulo
        let (_, new_claim_verdict, new_claim_status) =
            self.recalculate_cascade(claim_id, None).await?;

        Ok(RetractAssertionResult {
            assertion_id,
            claim_id,
            new_claim_verdict,
            new_claim_status,
        })
    }

    /// Recalcula en vivo la cascada completa (afirmación -> veredicto -> estado del bulo)
    async fn recalculate_cascade(
        &self,
        claim_id: Uuid,
        assertion_id_to_update: Option<Uuid>,
    ) -> Result<(Option<AssertionStatus>, Option<ClaimVerdict>, ClaimStatus), ServiceError> {
        let config = DerivationConfig::default();

        let mut updated_assertion_status = None;

        // 1. Recalcular la afirmación específica si se indicó
        if let Some(a_id) = assertion_id_to_update {
            let ev_inputs = self.assertion_repo.load_evidence_inputs(a_id).await?;
            let new_status = derive_assertion_status(&ev_inputs, &config);
            self.assertion_repo.update_status(a_id, new_status).await?;
            updated_assertion_status = Some(new_status);
        }

        // 2. Cargar afirmaciones clave ACTIVAS (no retiradas)
        let key_assertions = self
            .assertion_repo
            .list_load_bearing_by_claim(claim_id)
            .await?;

        let mut key_assertion_inputs = Vec::new();
        for key_assertion in key_assertions {
            let key_ev_inputs = self
                .assertion_repo
                .load_evidence_inputs(key_assertion.id)
                .await?;

            let has_solid_context = key_ev_inputs
                .iter()
                .any(|input| input.is_solid_contextualization());

            let key_status = derive_assertion_status(&key_ev_inputs, &config);
            key_assertion_inputs.push(KeyAssertionInput::new(key_status, has_solid_context));
        }

        let derived_verdict = derive_claim_verdict(&key_assertion_inputs);
        let final_verdict = if derived_verdict == ClaimVerdict::Unproven {
            None
        } else {
            Some(derived_verdict)
        };

        // 3. Determinar y persistir el estado del bulo
        let claim = self
            .claim_repo
            .find_by_id(claim_id)
            .await?
            .ok_or(ServiceError::ClaimNotFound(claim_id))?;

        let new_status = match (&final_verdict, claim.status) {
            (Some(_), ClaimStatus::Resolved) => ClaimStatus::Resolved,
            (Some(_), _) => ClaimStatus::InReview,
            (None, _) => ClaimStatus::Open,
        };

        self.claim_repo.update_verdict(claim_id, final_verdict).await?;
        self.claim_repo.update_status(claim_id, new_status).await?;

        Ok((updated_assertion_status, final_verdict, new_status))
    }

    /// CASO DE USO 4: Publicar desmentido aplicando el invariante de seguridad.
    pub async fn publish_rebuttal(
        &self,
        claim_id: Uuid,
        base_text: String,
        _member_id: Uuid,
    ) -> Result<Rebuttal, ServiceError> {
        if base_text.trim().is_empty() {
            return Err(ServiceError::EmptyBaseText);
        }

        let claim = self
            .claim_repo
            .find_by_id(claim_id)
            .await?
            .ok_or(ServiceError::ClaimNotFound(claim_id))?;

        // ⚠️ ENFORCING INVARIANT:
        // "Un desmentido solo puede publicarse si el veredicto del claim no es unproven"
        match claim.verdict {
            Some(ClaimVerdict::False) | Some(ClaimVerdict::True) | Some(ClaimVerdict::Misleading) => {
                // Veredicto definitivo válido para publicar
            }
            _ => {
                return Err(ServiceError::CannotPublishUnprovenRebuttal);
            }
        }

        // Buscar o crear borrador de desmentido
        let existing = self.rebuttal_repo.find_by_claim(claim_id).await?;

        let rebuttal_id = match existing {
            Some(r) => r.id,
            None => {
                let r_id = Uuid::new_v4();
                let draft = Rebuttal {
                    id: r_id,
                    claim_id,
                    base_text: base_text.clone(),
                    published_at: None,
                    status: RebuttalStatus::Draft,
                };
                self.rebuttal_repo.create(&draft).await?.id
            }
        };

        // Publicar desmentido
        self.rebuttal_repo.publish(rebuttal_id).await?;

        // Marcar el bulo como Resolved
        self.claim_repo
            .update_status(claim_id, ClaimStatus::Resolved)
            .await?;

        let published = self
            .rebuttal_repo
            .find_by_claim(claim_id)
            .await?
            .ok_or(ServiceError::ClaimNotFound(claim_id))?;

        Ok(published)
    }

    /// Helper para obtener un miembro o crearlo (para tests o auth)
    pub async fn get_or_create_member(
        &self,
        id: Uuid,
        pseudonym: &str,
    ) -> Result<Member, ServiceError> {
        if let Some(m) = self.member_repo.find_by_id(id).await? {
            Ok(m)
        } else {
            let m = Member {
                id,
                pseudonym: pseudonym.to_string(),
                created_at: Utc::now(),
                rigor_score: 0,
                auth_ref: None,
            };
            Ok(self.member_repo.create(&m).await?)
        }
    }
}
