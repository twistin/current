use chrono::Utc;
use current_domain::entities::{
    Assertion, AssertionStatus, Claim, ClaimKind, ClaimStatus, ClaimVerdict, ClaimVariant, Contribution,
    ContributionOutcome, ContributionTargetType, Evidence, EvidenceStance, EvidenceStrength, Member,
    Rebuttal, RebuttalStatus, Source, SourceKind, SourceReliability,
};
use current_domain::logic::{derive_assertion_status, DerivationConfig};
use current_persistence::db::create_pool;
use current_persistence::repos::assertion_repo::AssertionRepo;
use current_persistence::repos::claim_repo::ClaimRepo;
use current_persistence::repos::claim_variant_repo::ClaimVariantRepo;
use current_persistence::repos::contribution_repo::ContributionRepo;
use current_persistence::repos::evidence_repo::EvidenceRepo;
use current_persistence::repos::member_repo::MemberRepo;
use current_persistence::repos::rebuttal_repo::RebuttalRepo;
use current_persistence::repos::source_repo::SourceRepo;
use uuid::Uuid;

fn get_db_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://current:current_secret@localhost:5432/current_dev".to_string())
}

#[tokio::test]
async fn test_member_repo_crud() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let repo = MemberRepo::new(pool);

    let test_id = Uuid::new_v4();
    let pseudonym = format!("pseudonym_{}", test_id);

    let new_member = Member {
        id: test_id,
        pseudonym: pseudonym.clone(),
        created_at: Utc::now(),
        rigor_score: 10,
        auth_ref: Some("token_opaco_123".to_string()),
    };

    let created = repo.create(&new_member).await.unwrap();
    assert_eq!(created.id, test_id);

    let found_by_id = repo.find_by_id(test_id).await.unwrap().unwrap();
    assert_eq!(found_by_id.pseudonym, pseudonym);

    repo.update_rigor_score(test_id, 5).await.unwrap();
    let updated = repo.find_by_id(test_id).await.unwrap().unwrap();
    assert_eq!(updated.rigor_score, 15);
}

#[tokio::test]
async fn test_source_repo_crud() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let member_repo = MemberRepo::new(pool.clone());
    let source_repo = SourceRepo::new(pool);

    let member_id = Uuid::new_v4();
    member_repo
        .create(&Member {
            id: member_id,
            pseudonym: format!("source_creator_{}", member_id),
            created_at: Utc::now(),
            rigor_score: 0,
            auth_ref: None,
        })
        .await
        .unwrap();

    let source_id = Uuid::new_v4();
    let new_source = Source {
        id: source_id,
        url: "https://estudios.org/papel.pdf".to_string(),
        title: "Estudio sobre desinformación".to_string(),
        kind: SourceKind::Academic,
        reliability: SourceReliability::High,
        excerpt: Some("Fragmento relevante del estudio científico.".to_string()),
        added_by: member_id,
        added_at: Utc::now(),
    };

    let created = source_repo.create(&new_source).await.unwrap();
    assert_eq!(created.id, source_id);

    let found = source_repo.find_by_id(source_id).await.unwrap().unwrap();
    assert_eq!(found.title, "Estudio sobre desinformación");
}

#[tokio::test]
async fn test_claim_repo_crud_and_prioritization() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let member_repo = MemberRepo::new(pool.clone());
    let claim_repo = ClaimRepo::new(pool);

    let creator_id = Uuid::new_v4();
    member_repo
        .create(&Member {
            id: creator_id,
            pseudonym: format!("claim_creator_{}", creator_id),
            created_at: Utc::now(),
            rigor_score: 0,
            auth_ref: None,
        })
        .await
        .unwrap();

    let claim1_id = Uuid::new_v4();
    let claim1 = Claim {
        id: claim1_id,
        summary: "Bulo de baja propagación".to_string(),
        kind: ClaimKind::Text,
        detected_at: Utc::now(),
        propagation_score: 20,
        status: ClaimStatus::Open,
        verdict: None,
        created_by: creator_id,
    };

    let claim2_id = Uuid::new_v4();
    let claim2 = Claim {
        id: claim2_id,
        summary: "Bulo viral de alta propagación".to_string(),
        kind: ClaimKind::Image,
        detected_at: Utc::now(),
        propagation_score: 95,
        status: ClaimStatus::Open,
        verdict: None,
        created_by: creator_id,
    };

    claim_repo.create(&claim1).await.unwrap();
    claim_repo.create(&claim2).await.unwrap();

    let prioritized = claim_repo.list_prioritized().await.unwrap();
    let pos_claim2 = prioritized.iter().position(|c| c.id == claim2_id).unwrap();
    let pos_claim1 = prioritized.iter().position(|c| c.id == claim1_id).unwrap();
    assert!(pos_claim2 < pos_claim1);

    claim_repo.update_status(claim1_id, ClaimStatus::Resolved).await.unwrap();
    claim_repo.update_verdict(claim1_id, Some(ClaimVerdict::False)).await.unwrap();

    let updated = claim_repo.find_by_id(claim1_id).await.unwrap().unwrap();
    assert_eq!(updated.status, ClaimStatus::Resolved);
    assert_eq!(updated.verdict, Some(ClaimVerdict::False));
}

#[tokio::test]
async fn test_claim_variant_repo_crud() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let member_repo = MemberRepo::new(pool.clone());
    let claim_repo = ClaimRepo::new(pool.clone());
    let variant_repo = ClaimVariantRepo::new(pool);

    let creator_id = Uuid::new_v4();
    member_repo
        .create(&Member {
            id: creator_id,
            pseudonym: format!("variant_creator_{}", creator_id),
            created_at: Utc::now(),
            rigor_score: 0,
            auth_ref: None,
        })
        .await
        .unwrap();

    let claim_id = Uuid::new_v4();
    claim_repo
        .create(&Claim {
            id: claim_id,
            summary: "Bulo con múltiples variantes".to_string(),
            kind: ClaimKind::Mixed,
            detected_at: Utc::now(),
            propagation_score: 50,
            status: ClaimStatus::InReview,
            verdict: None,
            created_by: creator_id,
        })
        .await
        .unwrap();

    let var1 = ClaimVariant {
        id: Uuid::new_v4(),
        claim_id,
        origin_url: "https://x.com/post/123".to_string(),
        platform: "X".to_string(),
        language: "es".to_string(),
        snapshot: Some("https://archive.org/snap1".to_string()),
        seen_at: Utc::now(),
    };

    variant_repo.create(&var1).await.unwrap();

    let variants = variant_repo.list_by_claim(claim_id).await.unwrap();
    assert_eq!(variants.len(), 1);
    assert_eq!(variants[0].platform, "X");
}

#[tokio::test]
async fn test_assertion_repo_crud_and_filtering() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let member_repo = MemberRepo::new(pool.clone());
    let claim_repo = ClaimRepo::new(pool.clone());
    let assertion_repo = AssertionRepo::new(pool);

    let creator_id = Uuid::new_v4();
    member_repo
        .create(&Member {
            id: creator_id,
            pseudonym: format!("assertion_creator_{}", creator_id),
            created_at: Utc::now(),
            rigor_score: 0,
            auth_ref: None,
        })
        .await
        .unwrap();

    let claim_id = Uuid::new_v4();
    claim_repo
        .create(&Claim {
            id: claim_id,
            summary: "Bulo para descomponer en afirmaciones".to_string(),
            kind: ClaimKind::Text,
            detected_at: Utc::now(),
            propagation_score: 40,
            status: ClaimStatus::Open,
            verdict: None,
            created_by: creator_id,
        })
        .await
        .unwrap();

    let a1 = Assertion {
        id: Uuid::new_v4(),
        claim_id,
        text: "Afirmación clave 1".to_string(),
        is_load_bearing: true,
        status: AssertionStatus::Unverified,
        created_by: creator_id,
    };

    assertion_repo.create(&a1).await.unwrap();

    let load_bearing = assertion_repo.list_load_bearing_by_claim(claim_id).await.unwrap();
    assert_eq!(load_bearing.len(), 1);
    assert!(load_bearing[0].is_load_bearing);
}

#[tokio::test]
async fn test_evidence_repo_chain_and_derivation_input() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let member_repo = MemberRepo::new(pool.clone());
    let claim_repo = ClaimRepo::new(pool.clone());
    let assertion_repo = AssertionRepo::new(pool.clone());
    let source_repo = SourceRepo::new(pool.clone());
    let evidence_repo = EvidenceRepo::new(pool);

    // Cadena completa: Member -> Claim -> Assertion + Source -> Evidence
    let member_id = Uuid::new_v4();
    member_repo
        .create(&Member {
            id: member_id,
            pseudonym: format!("evidence_verifier_{}", member_id),
            created_at: Utc::now(),
            rigor_score: 0,
            auth_ref: None,
        })
        .await
        .unwrap();

    let claim_id = Uuid::new_v4();
    claim_repo
        .create(&Claim {
            id: claim_id,
            summary: "Bulo sobre subida de impuestos".to_string(),
            kind: ClaimKind::Text,
            detected_at: Utc::now(),
            propagation_score: 80,
            status: ClaimStatus::InReview,
            verdict: None,
            created_by: member_id,
        })
        .await
        .unwrap();

    let assertion_id = Uuid::new_v4();
    assertion_repo
        .create(&Assertion {
            id: assertion_id,
            claim_id,
            text: "Impuestos subieron un 50%".to_string(),
            is_load_bearing: true,
            status: AssertionStatus::Unverified,
            created_by: member_id,
        })
        .await
        .unwrap();

    let source_id = Uuid::new_v4();
    source_repo
        .create(&Source {
            id: source_id,
            url: "https://boe.es/oficial".to_string(),
            title: "Boletín Oficial del Estado".to_string(),
            kind: SourceKind::Official,
            reliability: SourceReliability::High,
            excerpt: Some("La tasa oficial fue del 5%.".to_string()),
            added_by: member_id,
            added_at: Utc::now(),
        })
        .await
        .unwrap();

    let evidence_id = Uuid::new_v4();
    let evidence = Evidence {
        id: evidence_id,
        assertion_id,
        source_id,
        stance: EvidenceStance::Refutes,
        strength: EvidenceStrength::Strong,
        rationale: "El BOE demuestra que la cifra real es del 5%, desmintiendo el 50%.".to_string(),
        added_by: member_id,
        added_at: Utc::now(),
    };

    // 1. Crear evidencia con rationale obligatorio
    let created = evidence_repo.create(&evidence).await.unwrap();
    assert_eq!(created.id, evidence_id);
    assert_eq!(created.rationale, "El BOE demuestra que la cifra real es del 5%, desmintiendo el 50%.");

    // 2. Listar evidencias de la afirmación
    let list = evidence_repo.list_by_assertion(assertion_id).await.unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].stance, EvidenceStance::Refutes);

    // 3. Alimentar la función pura de derivación de estado
    let evidence_inputs = assertion_repo.load_evidence_inputs(assertion_id).await.unwrap();
    assert_eq!(evidence_inputs.len(), 1);

    let derived_status = derive_assertion_status(&evidence_inputs, &DerivationConfig::default());
    assert_eq!(derived_status, AssertionStatus::Refuted);
}

#[tokio::test]
async fn test_rebuttal_repo_crud_and_publishing() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let member_repo = MemberRepo::new(pool.clone());
    let claim_repo = ClaimRepo::new(pool.clone());
    let rebuttal_repo = RebuttalRepo::new(pool);

    let member_id = Uuid::new_v4();
    member_repo
        .create(&Member {
            id: member_id,
            pseudonym: format!("rebuttal_writer_{}", member_id),
            created_at: Utc::now(),
            rigor_score: 0,
            auth_ref: None,
        })
        .await
        .unwrap();

    let claim_id = Uuid::new_v4();
    claim_repo
        .create(&Claim {
            id: claim_id,
            summary: "Bulo desmentido listo para publicar".to_string(),
            kind: ClaimKind::Text,
            detected_at: Utc::now(),
            propagation_score: 90,
            status: ClaimStatus::Resolved,
            verdict: Some(ClaimVerdict::False),
            created_by: member_id,
        })
        .await
        .unwrap();

    let rebuttal_id = Uuid::new_v4();
    let rebuttal = Rebuttal {
        id: rebuttal_id,
        claim_id,
        base_text: "Desmentido oficial: La afirmación es totalmente falsa según el BOE.".to_string(),
        published_at: None,
        status: RebuttalStatus::Draft,
    };

    // 1. Crear borrador
    rebuttal_repo.create(&rebuttal).await.unwrap();

    let found = rebuttal_repo.find_by_claim(claim_id).await.unwrap().unwrap();
    assert_eq!(found.status, RebuttalStatus::Draft);
    assert_eq!(found.published_at, None);

    // 2. Publicar desmentido
    rebuttal_repo.publish(rebuttal_id).await.unwrap();

    let published = rebuttal_repo.find_by_claim(claim_id).await.unwrap().unwrap();
    assert_eq!(published.status, RebuttalStatus::Published);
    assert!(published.published_at.is_some());
}

#[tokio::test]
async fn test_contribution_repo_crud_and_rigor_score_impact() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let member_repo = MemberRepo::new(pool.clone());
    let contribution_repo = ContributionRepo::new(pool);

    let member_id = Uuid::new_v4();
    let member = Member {
        id: member_id,
        pseudonym: format!("contributor_{}", member_id),
        created_at: Utc::now(),
        rigor_score: 10,
        auth_ref: None,
    };
    member_repo.create(&member).await.unwrap();

    let target_assertion_id = Uuid::new_v4();
    let contrib_id = Uuid::new_v4();

    let contrib = Contribution {
        id: contrib_id,
        member_id,
        target_type: ContributionTargetType::Assertion,
        target_id: target_assertion_id,
        created_at: Utc::now(),
        outcome: None,
    };

    // 1. Crear contribución
    contribution_repo.create(&contrib).await.unwrap();

    let list = contribution_repo.list_by_member(member_id).await.unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].outcome, None);

    // 2. Evaluar contribución como 'Held' (+1 rigor_score)
    contribution_repo
        .update_outcome(contrib_id, ContributionOutcome::Held)
        .await
        .unwrap();

    let updated_contrib = contribution_repo.find_by_id(contrib_id).await.unwrap().unwrap();
    assert_eq!(updated_contrib.outcome, Some(ContributionOutcome::Held));

    let updated_member = member_repo.find_by_id(member_id).await.unwrap().unwrap();
    assert_eq!(updated_member.rigor_score, 11);
}
