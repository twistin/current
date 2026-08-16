use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use current_api::router::build_router;
use current_persistence::db::create_pool;
use serde_json::{json, Value};
use tower::util::ServiceExt;

fn get_db_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://current:current_secret@localhost:5432/current_dev".to_string())
}

async fn parse_json_response(response: axum::response::Response) -> (StatusCode, Value) {
    let status = response.status();
    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: Value = serde_json::from_slice(&body_bytes).unwrap_or(json!({}));
    (status, json)
}

#[tokio::test]
async fn test_api_auth_and_pseudonymity() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let app = build_router(pool);

    // 1. Petición autenticada sin header Authorization -> 401 Unauthorized
    let req = Request::builder()
        .method("POST")
        .uri("/claims")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "summary": "Bulo de prueba sin autenticación",
            "kind": "text",
            "origin_url": "https://x.com/post",
            "platform": "X",
            "language": "es"
        }).to_string()))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(body["error"], "unauthorized");

    // 2. Registro seudónimo de miembro -> 201 Created con token opaco
    let pseudo = format!("test_user_{}", uuid::Uuid::new_v4());
    let req = Request::builder()
        .method("POST")
        .uri("/auth/register")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({ "pseudonym": pseudo }).to_string()))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::CREATED);
    assert!(body["token"].as_str().unwrap().starts_with("current_tok_"));

    let token = body["token"].as_str().unwrap();

    // 3. Petición con el token opaco recién creado -> 201 Created
    let req = Request::builder()
        .method("POST")
        .uri("/claims")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "summary": "Bulo creado con token seudónimo",
            "kind": "text",
            "propagation_score": 80,
            "origin_url": "https://x.com/post/100",
            "platform": "X",
            "language": "es"
        }).to_string()))
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["claim"]["summary"], "Bulo creado con token seudónimo");
}

#[tokio::test]
async fn test_api_claims_prioritization_and_detail() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let app = build_router(pool);

    // Registro
    let pseudo = format!("user_{}", uuid::Uuid::new_v4());
    let req = Request::builder()
        .method("POST")
        .uri("/auth/register")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({ "pseudonym": &pseudo }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (_, body) = parse_json_response(res).await;
    let token = body["token"].as_str().unwrap();

    // Crear bulo score 10
    let req = Request::builder()
        .method("POST")
        .uri("/claims")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "summary": "Bulo score 10",
            "kind": "text",
            "propagation_score": 10,
            "origin_url": "https://x.com/post/10",
            "platform": "X",
            "language": "es"
        }).to_string()))
        .unwrap();
    let _ = app.clone().oneshot(req).await.unwrap();

    // Crear bulo score 99
    let req = Request::builder()
        .method("POST")
        .uri("/claims")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "summary": "Bulo score 99",
            "kind": "text",
            "propagation_score": 99,
            "origin_url": "https://x.com/post/99",
            "platform": "X",
            "language": "es"
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (_, claim_body) = parse_json_response(res).await;
    let claim_id = claim_body["claim"]["id"].as_str().unwrap();

    // GET /claims -> lista priorizada
    let req = Request::builder()
        .method("GET")
        .uri("/claims")
        .body(Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, list_body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::OK);
    assert!(list_body.as_array().unwrap().len() >= 2);

    // GET /claims/:id -> detalle sala de verificación
    let req = Request::builder()
        .method("GET")
        .uri(format!("/claims/{}", claim_id))
        .body(Body::empty())
        .unwrap();
    let res = app.oneshot(req).await.unwrap();
    let (status, detail_body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(detail_body["claim"]["summary"], "Bulo score 99");
}

#[tokio::test]
async fn test_api_validations_and_rebuttal_conflict_409() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let app = build_router(pool);

    // 1. Registro
    let pseudo = format!("verifier_{}", uuid::Uuid::new_v4());
    let req = Request::builder()
        .method("POST")
        .uri("/auth/register")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({ "pseudonym": &pseudo }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (_, body) = parse_json_response(res).await;
    let token = body["token"].as_str().unwrap();

    // 2. Reportar bulo
    let req = Request::builder()
        .method("POST")
        .uri("/claims")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "summary": "Bulo para test de 409 y validaciones",
            "kind": "text",
            "propagation_score": 50,
            "origin_url": "https://x.com/post/409",
            "platform": "X",
            "language": "es"
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (_, claim_body) = parse_json_response(res).await;
    let claim_id = claim_body["claim"]["id"].as_str().unwrap();

    // 3. Intento de publicar desmentido con veredicto 'unproven' -> 409 CONFLICT
    let req = Request::builder()
        .method("POST")
        .uri(format!("/claims/{}/rebuttal", claim_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "base_text": "Desmentido prematuro sin veredicto"
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, conflict_body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::CONFLICT);
    assert_eq!(conflict_body["error"], "conflict");

    // 4. Validación: Descomponer con lista vacía -> 400 BAD REQUEST
    let req = Request::builder()
        .method("POST")
        .uri(format!("/claims/{}/assertions", claim_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({ "assertions": [] }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, val_body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(val_body["error"], "validation_error");

    // 5. Descomponer en 1 afirmación clave
    let req = Request::builder()
        .method("POST")
        .uri(format!("/claims/{}/assertions", claim_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "assertions": [
                { "text": "Afirmación clave 1 a refutar", "is_load_bearing": true }
            ]
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, assertion_body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::CREATED);
    let assertion_id = assertion_body[0]["id"].as_str().unwrap();

    // 6. Validación: Añadir evidencia con rationale vacío -> 400 BAD REQUEST
    let req = Request::builder()
        .method("POST")
        .uri(format!("/assertions/{}/evidence", assertion_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "source": {
                "url": "https://official.gov/doc",
                "title": "Documento Oficial",
                "kind": "official",
                "reliability": "high"
            },
            "stance": "refutes",
            "strength": "strong",
            "rationale": "   "
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, ev_val_body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(ev_val_body["error"], "validation_error");

    // 7. Añadir evidencia sólida que refuta la clave -> CASCADA AUTOMÁTICA
    let req = Request::builder()
        .method("POST")
        .uri(format!("/assertions/{}/evidence", assertion_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "source": {
                "url": "https://official.gov/doc",
                "title": "Documento Oficial",
                "kind": "official",
                "reliability": "high"
            },
            "stance": "refutes",
            "strength": "strong",
            "rationale": "El documento oficial desmiente categóricamente la afirmación."
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, cascade_body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(cascade_body["new_assertion_status"], "refuted");
    assert_eq!(cascade_body["new_claim_verdict"], "false");

    // 8. Publicar desmentido AHORA QUE EL VEREDICTO ES 'false' -> 200 OK
    let req = Request::builder()
        .method("POST")
        .uri(format!("/claims/{}/rebuttal", claim_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "base_text": "Desmentido oficial verificado: La afirmación es totalmente falsa según el documento oficial."
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, rebuttal_body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(rebuttal_body["status"], "published");

    // 9. Consultar Perfil de Miembro por seudónimo -> 200 OK con estadísticas e historial
    let req = Request::builder()
        .method("GET")
        .uri(format!("/members/{}", pseudo))
        .body(Body::empty())
        .unwrap();
    let res = app.oneshot(req).await.unwrap();
    let (status, profile_body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(profile_body["member"]["pseudonym"], pseudo);
    assert_eq!(profile_body["stats"]["assertions_count"], 1);
    assert_eq!(profile_body["stats"]["evidence_count"], 1);
    assert_eq!(profile_body["stats"]["total_contributions"], 2);
    assert_eq!(profile_body["stats"]["claims_participated"], 1);
    assert_eq!(profile_body["assertions"].as_array().unwrap().len(), 1);
    assert_eq!(profile_body["evidence"].as_array().unwrap().len(), 1);
}

#[tokio::test]
async fn test_api_security_headers() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let app = build_router(pool);

    let req = Request::builder()
        .method("GET")
        .uri("/health")
        .body(Body::empty())
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let headers = res.headers();
    assert!(headers.contains_key("content-security-policy"));
    assert_eq!(headers.get("x-frame-options").unwrap(), "DENY");
    assert_eq!(headers.get("x-content-type-options").unwrap(), "nosniff");
    assert_eq!(headers.get("referrer-policy").unwrap(), "strict-origin-when-cross-origin");
}

#[tokio::test]
async fn test_api_validation_rejections() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let app = build_router(pool);

    // 1. Registro con seudónimo inválido (< 3 caracteres) -> 400
    let req = Request::builder()
        .method("POST")
        .uri("/auth/register")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({ "pseudonym": "ab" }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "validation_error");

    // 2. Registro con seudónimo con caracteres inválidos (scripts/HTML) -> 400
    let req = Request::builder()
        .method("POST")
        .uri("/auth/register")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({ "pseudonym": "<script>alert(1)</script>" }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "validation_error");

    // 3. Registro válido para obtener token
    let pseudo = format!("valid_user_{}", uuid::Uuid::new_v4().to_string().replace('-', ""));
    let pseudo = &pseudo[0..20];
    let req = Request::builder()
        .method("POST")
        .uri("/auth/register")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({ "pseudonym": pseudo }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (_, body) = parse_json_response(res).await;
    let token = body["token"].as_str().unwrap();

    // 4. Bulo con summary demasiado corto (< 10 caracteres) -> 400
    let req = Request::builder()
        .method("POST")
        .uri("/claims")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "summary": "Corto",
            "kind": "text",
            "origin_url": "https://x.com/valid",
            "platform": "X",
            "language": "es"
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "validation_error");

    // 5. Bulo con URL maliciosa (javascript:) -> 400
    let req = Request::builder()
        .method("POST")
        .uri("/claims")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "summary": "Resumen de bulo completamente válido y descriptivo",
            "kind": "text",
            "origin_url": "javascript:alert(document.cookie)",
            "platform": "X",
            "language": "es"
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "validation_error");
    assert!(body["details"].as_str().unwrap().contains("URL de origen"));
}

#[tokio::test]
async fn test_api_rate_limiting_registration() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let app = build_router(pool);

    // Intentamos 6 registros consecutivos desde la misma IP (127.0.0.1)
    // El límite es 5 peticiones cada 10 min -> la 6ª debe devolver 429 TOO_MANY_REQUESTS
    let mut last_status = StatusCode::OK;
    for _ in 0..6 {
        let pseudo = format!("rate_{}", uuid::Uuid::new_v4().to_string().replace('-', ""));
        let pseudo = &pseudo[0..20];
        let req = Request::builder()
            .method("POST")
            .uri("/auth/register")
            .header(header::CONTENT_TYPE, "application/json")
            .header("x-forwarded-for", "198.51.100.42")
            .body(Body::from(json!({ "pseudonym": pseudo }).to_string()))
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        last_status = res.status();
    }

    assert_eq!(last_status, StatusCode::TOO_MANY_REQUESTS);
}

#[tokio::test]
async fn test_api_retraction_cascade_and_authorization() {
    let pool = create_pool(&get_db_url()).await.unwrap();
    let app = build_router(pool);

    // 1. Registrar dos usuarios distintos (Alice y Bob)
    let pseudo_alice = format!("alice_{}", &uuid::Uuid::new_v4().to_string().replace('-', "")[0..10]);
    let req = Request::builder()
        .method("POST")
        .uri("/auth/register")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({ "pseudonym": pseudo_alice }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (_, body) = parse_json_response(res).await;
    let alice_token = body["token"].as_str().unwrap();

    let pseudo_bob = format!("bob_{}", &uuid::Uuid::new_v4().to_string().replace('-', "")[0..10]);
    let req = Request::builder()
        .method("POST")
        .uri("/auth/register")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({ "pseudonym": pseudo_bob }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (_, body) = parse_json_response(res).await;
    let bob_token = body["token"].as_str().unwrap();

    // 2. Alice crea un bulo
    let req = Request::builder()
        .method("POST")
        .uri("/claims")
        .header(header::AUTHORIZATION, format!("Bearer {}", alice_token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "summary": "Bulo para test de retractacion y reversibilidad",
            "kind": "text",
            "propagation_score": 85,
            "origin_url": format!("https://x.com/fake/{}", uuid::Uuid::new_v4()),
            "platform": "X",
            "language": "es"
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::CREATED);
    let claim_id = body["claim"]["id"].as_str().unwrap();

    // 3. Alice descompone el bulo con una afirmación clave
    let req = Request::builder()
        .method("POST")
        .uri(format!("/claims/{}/assertions", claim_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", alice_token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "assertions": [
                {
                    "text": "El documento citado es una falsificación oficial completa",
                    "is_load_bearing": true
                }
            ]
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::CREATED);
    let assertion_id = body[0]["id"].as_str().unwrap();

    // 4. Alice añade evidencia fuerte refutadora -> el veredicto del bulo pasa a 'false'
    let req = Request::builder()
        .method("POST")
        .uri(format!("/assertions/{}/evidence", assertion_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", alice_token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(json!({
            "source": {
                "url": format!("https://boe.es/noticias/{}", uuid::Uuid::new_v4()),
                "title": "Comunicado oficial de desmentido institucional",
                "kind": "official",
                "reliability": "high",
                "excerpt": "El documento no figura en ningún registro."
            },
            "stance": "refutes",
            "strength": "strong",
            "rationale": "Demostrado por el registro oficial que el documento no existe."
        }).to_string()))
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["new_assertion_status"], "refuted");
    assert_eq!(body["new_claim_verdict"], "false");
    let evidence_id = body["evidence"]["id"].as_str().unwrap();

    // 5. Bob (otro usuario) intenta retirar la evidencia de Alice -> 403 Forbidden
    let req = Request::builder()
        .method("POST")
        .uri(format!("/evidence/{}/retract", evidence_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", bob_token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(body["error"], "forbidden");

    // 6. Alice (autora) retira su propia evidencia -> 200 OK
    let req = Request::builder()
        .method("POST")
        .uri(format!("/evidence/{}/retract", evidence_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", alice_token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["new_assertion_status"], "unverified");
    assert!(body["new_claim_verdict"].is_null()); // Recalculado a unproven / null
    assert_eq!(body["new_claim_status"], "open");

    // 7. Consultar la sala del bulo: la evidencia SIGUE presente (no borrada silenciosamente) con retracted_at
    let req = Request::builder()
        .method("GET")
        .uri(format!("/claims/{}", claim_id))
        .body(Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, body) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::OK);
    assert!(body["claim"]["verdict"].is_null());
    assert_eq!(body["claim"]["status"], "open");

    let ev_in_detail = &body["assertions"][0]["evidence"][0]["evidence"];
    assert_eq!(ev_in_detail["id"], evidence_id);
    assert!(ev_in_detail["retracted_at"].is_string()); // Preserva trazabilidad completa

    // 8. Alice retira también su afirmación
    let req = Request::builder()
        .method("POST")
        .uri(format!("/assertions/{}/retract", assertion_id))
        .header(header::AUTHORIZATION, format!("Bearer {}", alice_token))
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::empty())
        .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let (status, _) = parse_json_response(res).await;
    assert_eq!(status, StatusCode::OK);
}



