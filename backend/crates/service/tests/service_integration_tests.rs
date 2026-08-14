use current_domain::entities::{
    AssertionStatus, ClaimKind, ClaimStatus, ClaimVerdict, EvidenceStance, EvidenceStrength,
    RebuttalStatus, SourceKind, SourceReliability,
};
use current_persistence::db::create_pool;
use current_service::{
    NewAssertionInput, NewSourceInput, ServiceError, VerificationService,
};
use uuid::Uuid;

fn get_db_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://current:current_secret@localhost:5432/current_dev".to_string())
}

#[tokio::test]
async fn test_use_case_report_and_decompose() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let service = VerificationService::new(pool);

    let member_id = Uuid::new_v4();
    let pseudo = format!("reporter_{}", member_id);
    service
        .get_or_create_member(member_id, &pseudo)
        .await
        .unwrap();

    // 1. Reportar bulo
    let (claim, variant) = service
        .report_claim(
            "Bulo sobre ayuda económica".to_string(),
            ClaimKind::Text,
            75,
            "https://x.com/post/100".to_string(),
            "X".to_string(),
            "es".to_string(),
            None,
            member_id,
        )
        .await
        .unwrap();

    assert_eq!(claim.status, ClaimStatus::Open);
    assert_eq!(claim.verdict, None);
    assert_eq!(variant.platform, "X");

    // 2. Descomponer bulo en afirmaciones
    let assertions_input = vec![
        NewAssertionInput {
            text: "Afirmación clave 1".to_string(),
            is_load_bearing: true,
        },
        NewAssertionInput {
            text: "Afirmación secundaria".to_string(),
            is_load_bearing: false,
        },
    ];

    let assertions = service
        .decompose_claim(claim.id, assertions_input, member_id)
        .await
        .unwrap();

    assert_eq!(assertions.len(), 2);
    assert_eq!(assertions[0].status, AssertionStatus::Unverified);
}

#[tokio::test]
async fn test_use_case_publish_rebuttal_invariant_enforcement() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let service = VerificationService::new(pool);

    let member_id = Uuid::new_v4();
    let pseudo = format!("verifier_{}", member_id);
    service
        .get_or_create_member(member_id, &pseudo)
        .await
        .unwrap();

    // Reportar y descomponer bulo sin verificar
    let (claim, _) = service
        .report_claim(
            "Bulo no probado".to_string(),
            ClaimKind::Text,
            30,
            "https://example.org/claim".to_string(),
            "Web".to_string(),
            "es".to_string(),
            None,
            member_id,
        )
        .await
        .unwrap();

    // Intentar publicar desmentido cuando el veredicto es None/Unproven
    let err = service
        .publish_rebuttal(
            claim.id,
            "Intento prematuro de desmentido".to_string(),
            member_id,
        )
        .await
        .unwrap_err();

    match err {
        ServiceError::CannotPublishUnprovenRebuttal => {
            // Error esperado: se cumple el invariante
        }
        other => panic!("Esperado CannotPublishUnprovenRebuttal, pero se recibió: {:?}", other),
    }
}

/// TEST END-TO-END DEL CASO 1: Cascada completa de verificación
#[tokio::test]
async fn test_use_case_end_to_end_cascade() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let service = VerificationService::new(pool);

    let member_id = Uuid::new_v4();
    let pseudo = format!("e2e_verifier_{}", member_id);
    service
        .get_or_create_member(member_id, &pseudo)
        .await
        .unwrap();

    // 1. Reportar el bulo
    let (claim, _) = service
        .report_claim(
            "Bulo viral: Subida masiva de impuestos del 300%".to_string(),
            ClaimKind::Text,
            95,
            "https://x.com/viral_post".to_string(),
            "X".to_string(),
            "es".to_string(),
            None,
            member_id,
        )
        .await
        .unwrap();

    // 2. Descomponer en 2 afirmaciones clave
    let assertions_input = vec![
        NewAssertionInput {
            text: "La tasa impositiva aumentó un 300%".to_string(),
            is_load_bearing: true,
        },
        NewAssertionInput {
            text: "El decreto fue firmado en secreto en mayo".to_string(),
            is_load_bearing: true,
        },
    ];

    let assertions = service
        .decompose_claim(claim.id, assertions_input, member_id)
        .await
        .unwrap();

    let a1_id = assertions[0].id;
    let a2_id = assertions[1].id;

    // 3. Añadir evidencia fuerte refutando Afirmación 1
    let source1_input = NewSourceInput {
        url: "https://boe.es/oficial_impuestos".to_string(),
        title: "Boletín Oficial del Estado - Publicación Fiscal".to_string(),
        kind: SourceKind::Official,
        reliability: SourceReliability::High,
        excerpt: Some("La tasa fiscal real ajustada se fijó en el 5%.".to_string()),
    };

    let res1 = service
        .add_evidence(
            a1_id,
            source1_input,
            EvidenceStance::Refutes,
            EvidenceStrength::Strong,
            "El BOE oficial demuestra que la tasa real es del 5%, desmintiendo el 300%.".to_string(),
            member_id,
        )
        .await
        .unwrap();

    assert_eq!(res1.new_assertion_status, AssertionStatus::Refuted);
    assert_eq!(res1.new_claim_verdict, None);

    // 4. Añadir evidencia fuerte refutando Afirmación 2
    let source2_input = NewSourceInput {
        url: "https://gobierno.es/registro_decretos".to_string(),
        title: "Registro Oficial de Decretos Executivos".to_string(),
        kind: SourceKind::Official,
        reliability: SourceReliability::High,
        excerpt: Some("No se registró ningún decreto fiscal en mayo.".to_string()),
    };

    let res2 = service
        .add_evidence(
            a2_id,
            source2_input,
            EvidenceStance::Refutes,
            EvidenceStrength::Strong,
            "El registro oficial confirma que no existió tal decreto en mayo.".to_string(),
            member_id,
        )
        .await
        .unwrap();

    assert_eq!(res2.new_assertion_status, AssertionStatus::Refuted);
    assert_eq!(res2.new_claim_verdict, Some(ClaimVerdict::False));

    // 5. Publicar desmentido ahora que el veredicto es 'False'
    let rebuttal = service
        .publish_rebuttal(
            claim.id,
            "Desmentido verificado: La cifra del 300% y la fecha de mayo son falsas según el BOE y el registro oficial.".to_string(),
            member_id,
        )
        .await
        .unwrap();

    assert_eq!(rebuttal.status, RebuttalStatus::Published);
    assert!(rebuttal.published_at.is_some());
}
