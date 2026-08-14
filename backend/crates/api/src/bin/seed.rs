use current_domain::entities::{
    ClaimKind, EvidenceStance, EvidenceStrength, SourceKind, SourceReliability,
};
use current_service::{NewAssertionInput, NewSourceInput, VerificationService};
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://current:current_secret@localhost:5432/current_dev".to_string()
    });

    println!("🌱 Conectando a la base de datos para sembrar datos limpios...");
    let pool = current_persistence::db::create_pool(&database_url).await?;

    // 1. Limpiar tablas
    println!("🧹 Vaciando datos antiguos...");
    sqlx::query(
        "TRUNCATE TABLE member, claim, claim_variant, assertion, source, evidence, rebuttal, contribution CASCADE;",
    )
    .execute(&pool)
    .await?;

    let service = VerificationService::new(pool.clone());

    // 2. Crear miembros de prueba
    let member_kai = service.get_or_create_member(Uuid::new_v4(), "kai").await?;
    let member_nix = service.get_or_create_member(Uuid::new_v4(), "nix").await?;
    let member_sol = service.get_or_create_member(Uuid::new_v4(), "sol").await?;
    let member_mara = service.get_or_create_member(Uuid::new_v4(), "mara").await?;

    println!("👤 Miembros creados: @kai, @nix, @sol, @mara");

    // -----------------------------------------------------------------------
    // BULO 1: Veredicto derivado -> MISLEADING (Engañoso)
    // -----------------------------------------------------------------------
    println!("📦 Creando Bulo 1 (Engañoso / Misleading)...");
    let (claim1, _) = service
        .report_claim(
            "Las ayudas a solicitantes de asilo se han multiplicado por tres en 2025, superando ya el gasto en pensiones.".to_string(),
            ClaimKind::Text,
            95,
            "https://x.com/viral_post/300".to_string(),
            "X".to_string(),
            "es".to_string(),
            None,
            member_kai.id,
        )
        .await?;

    let assertions1 = service
        .decompose_claim(
            claim1.id,
            vec![
                NewAssertionInput {
                    text: "El gasto en ayudas a solicitantes de asilo se multiplicó por tres (300 %) durante 2025.".to_string(),
                    is_load_bearing: true,
                },
                NewAssertionInput {
                    text: "Ese gasto supera ya al gasto público en pensiones.".to_string(),
                    is_load_bearing: true,
                },
                NewAssertionInput {
                    text: "La cifra procede de un informe oficial del Ministerio.".to_string(),
                    is_load_bearing: false,
                },
            ],
            member_kai.id,
        )
        .await?;

    // Evidencia 1 (Refuta A1): BOE oficial
    service
        .add_evidence(
            assertions1[0].id,
            NewSourceInput {
                url: "https://boe.es/presupuestos_2025".to_string(),
                title: "Presupuestos Generales — ejecución 2025".to_string(),
                kind: SourceKind::Primary,
                reliability: SourceReliability::High,
                excerpt: Some("Las partidas oficiales muestran un aumento interanual del 18 %, no del 300 %.".to_string()),
            },
            EvidenceStance::Refutes,
            EvidenceStrength::Strong,
            "Las partidas presupuestarias desmienten la multiplicación por tres.".to_string(),
            member_nix.id,
        )
        .await?;

    // Evidencia 2 (Contextualiza A1): Hemeroteca
    service
        .add_evidence(
            assertions1[0].id,
            NewSourceInput {
                url: "https://verificado.es/hemeroteca".to_string(),
                title: "Verificado — hemeroteca del dato".to_string(),
                kind: SourceKind::Press,
                reliability: SourceReliability::Medium,
                excerpt: Some("Sí hubo un aumento real del gasto, de en torno al 18 %: la cifra parte de un dato verdadero, exagerado.".to_string()),
            },
            EvidenceStance::Contextualizes,
            EvidenceStrength::Moderate,
            "Existe un incremento real pero se exageró exponencialmente la cifra.".to_string(),
            member_sol.id,
        )
        .await?;

    // Evidencia 3 (Refuta A2): Seguridad Social
    service
        .add_evidence(
            assertions1[1].id,
            NewSourceInput {
                url: "https://seg-social.es/ejecucion".to_string(),
                title: "Seguridad Social — ejecución presupuestaria".to_string(),
                kind: SourceKind::Official,
                reliability: SourceReliability::High,
                excerpt: Some("El gasto en pensiones es de un orden de magnitud muy superior; la comparación no se sostiene.".to_string()),
            },
            EvidenceStance::Refutes,
            EvidenceStrength::Strong,
            "La comparación de magnitudes es rotundamente falsa.".to_string(),
            member_mara.id,
        )
        .await?;

    // -----------------------------------------------------------------------
    // BULO 2: Veredicto derivado -> FALSE (Falso)
    // -----------------------------------------------------------------------
    println!("📦 Creando Bulo 2 (Falso / False)...");
    let (claim2, _) = service
        .report_claim(
            "El gobierno aprobó en secreto una subida del impuesto de sucesiones del 40% que entra en vigor en mayo.".to_string(),
            ClaimKind::Text,
            80,
            "https://t.me/canal_noticias/409".to_string(),
            "Telegram".to_string(),
            "es".to_string(),
            None,
            member_nix.id,
        )
        .await?;

    let assertions2 = service
        .decompose_claim(
            claim2.id,
            vec![
                NewAssertionInput {
                    text: "Se ha aprobado un aumento de la tasa fiscal de sucesiones hasta el 40%.".to_string(),
                    is_load_bearing: true,
                },
                NewAssertionInput {
                    text: "El decreto fue tramitado en secreto sin publicación ni debate.".to_string(),
                    is_load_bearing: true,
                },
            ],
            member_nix.id,
        )
        .await?;

    // Evidencia 1 (Refuta A1)
    service
        .add_evidence(
            assertions2[0].id,
            NewSourceInput {
                url: "https://boe.es/ley_tasas".to_string(),
                title: "Boletín Oficial del Estado - Ley de Tasas".to_string(),
                kind: SourceKind::Official,
                reliability: SourceReliability::High,
                excerpt: Some("Las tablas del impuesto permanecen totalmente congeladas.".to_string()),
            },
            EvidenceStance::Refutes,
            EvidenceStrength::Strong,
            "No se ha modificado la escala del impuesto de sucesiones.".to_string(),
            member_mara.id,
        )
        .await?;

    // Evidencia 2 (Refuta A2)
    service
        .add_evidence(
            assertions2[1].id,
            NewSourceInput {
                url: "https://congreso.es/diario_sesiones".to_string(),
                title: "Congreso de los Diputados - Registro de Decretos".to_string(),
                kind: SourceKind::Official,
                reliability: SourceReliability::High,
                excerpt: Some("No existe ningún proyecto ni decreto fiscal en la mesa del Congreso.".to_string()),
            },
            EvidenceStance::Refutes,
            EvidenceStrength::Strong,
            "El registro oficial del Congreso confirma la inexistencia del borrador.".to_string(),
            member_sol.id,
        )
        .await?;

    // -----------------------------------------------------------------------
    // BULO 3: Veredicto derivado -> UNPROVEN (No probado)
    // -----------------------------------------------------------------------
    println!("📦 Creando Bulo 3 (No probado / Unproven)...");
    let (claim3, _) = service
        .report_claim(
            "La marca de agua embotellada X contiene niveles peligrosos de microplásticos autorizados por sanidad.".to_string(),
            ClaimKind::Text,
            60,
            "https://tiktok.com/@alerta_salud".to_string(),
            "TikTok".to_string(),
            "es".to_string(),
            None,
            member_sol.id,
        )
        .await?;

    let _assertions3 = service
        .decompose_claim(
            claim3.id,
            vec![
                NewAssertionInput {
                    text: "Los análisis químicos independientes detectaron niveles de microplásticos superiores a la norma.".to_string(),
                    is_load_bearing: true,
                },
                NewAssertionInput {
                    text: "El Ministerio de Sanidad emitió una autorización especial de tolerancia.".to_string(),
                    is_load_bearing: true,
                },
            ],
            member_sol.id,
        )
        .await?;

    println!("✨ Sembrado completado. 3 bulos creados con veredictos derivados (misleading, false, unproven).");
    Ok(())
}
