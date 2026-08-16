use axum::{
    body::Body,
    extract::{ConnectInfo, Request},
    http::{header, HeaderValue, Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

#[derive(Clone)]
pub struct RateLimiter {
    windows: Arc<RwLock<HashMap<String, Vec<Instant>>>>,
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

impl RateLimiter {
    pub fn new() -> Self {
        let limiter = Self {
            windows: Arc::new(RwLock::new(HashMap::new())),
        };

        // Tarea de limpieza periódica de registros caducados cada 5 minutos
        let windows_clone = limiter.windows.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300));
            loop {
                interval.tick().await;
                let cutoff = Instant::now().checked_sub(Duration::from_secs(3600)).unwrap_or_else(Instant::now);
                if let Ok(mut map) = windows_clone.write() {
                    map.retain(|_, timestamps| {
                        timestamps.retain(|&t| t > cutoff);
                        !timestamps.is_empty()
                    });
                }
            }
        });

        limiter
    }

    /// Comprueba si una clave (IP o token) ha excedido su cuota en una ventana de tiempo.
    /// Devuelve Ok(()) si está dentro del límite, o Err(retry_after_segundos) si excede.
    pub fn check(&self, key: &str, max_requests: usize, window: Duration) -> Result<(), u64> {
        let now = Instant::now();
        let cutoff = now.checked_sub(window).unwrap_or(now);
        let mut map = self.windows.write().unwrap();
        let timestamps = map.entry(key.to_string()).or_default();
        timestamps.retain(|&t| t > cutoff);

        if timestamps.len() >= max_requests {
            let oldest = timestamps.first().copied().unwrap_or(now);
            let elapsed = now.duration_since(oldest);
            let retry_after = window.saturating_sub(elapsed).as_secs().max(1);
            Err(retry_after)
        } else {
            timestamps.push(now);
            Ok(())
        }
    }
}

/// Extrae la IP cliente priorizando cabeceras de proxy inverso (CF-Connecting-IP, X-Forwarded-For, X-Real-IP)
pub fn extract_client_ip(req: &Request<Body>) -> String {
    if let Some(cf_ip) = req.headers().get("cf-connecting-ip").and_then(|v| v.to_str().ok()) {
        return cf_ip.trim().to_string();
    }
    if let Some(forwarded) = req.headers().get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        if let Some(first_ip) = forwarded.split(',').next() {
            return first_ip.trim().to_string();
        }
    }
    if let Some(real_ip) = req.headers().get("x-real-ip").and_then(|v| v.to_str().ok()) {
        return real_ip.trim().to_string();
    }
    if let Some(ConnectInfo(addr)) = req.extensions().get::<ConnectInfo<SocketAddr>>() {
        return addr.ip().to_string();
    }
    "127.0.0.1".to_string()
}

/// Extrae el identificador para rate limiting (Bearer token si existe, o IP si es anónimo)
pub fn extract_rate_limit_key(req: &Request<Body>, prefix: &str) -> String {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());

    if let Some(h) = auth_header {
        if let Some(token) = h.strip_prefix("Bearer ") {
            let trimmed = token.trim();
            if !trimmed.is_empty() {
                return format!("{}:token:{}", prefix, trimmed);
            }
        }
    }

    let ip = extract_client_ip(req);
    format!("{}:ip:{}", prefix, ip)
}

/// Middleware de Rate Limiting centralizado
pub async fn rate_limit_middleware(
    limiter: RateLimiter,
    req: Request<Body>,
    next: Next,
) -> Response {
    let path = req.uri().path();
    let method = req.method();

    // 1. POST /auth/register: máx 5 peticiones por IP cada 10 minutos (600s)
    if method == Method::POST && path == "/auth/register" {
        let ip = extract_client_ip(&req);
        let key = format!("register:ip:{}", ip);
        if let Err(retry_after) = limiter.check(&key, 5, Duration::from_secs(600)) {
            let mut res = (
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({
                    "error": "rate_limited",
                    "details": "Límite de registros excedido (máximo 5 cada 10 minutos). Por favor, inténtalo más tarde."
                })),
            )
                .into_response();
            res.headers_mut().insert(
                header::RETRY_AFTER,
                HeaderValue::from_str(&retry_after.to_string()).unwrap_or_else(|_| HeaderValue::from_static("60")),
            );
            return res;
        }
    }

    // 2. POST /claims: máx 10 peticiones por token/IP por hora (3600s)
    if method == Method::POST && path == "/claims" {
        let key = extract_rate_limit_key(&req, "create_claim");
        if let Err(retry_after) = limiter.check(&key, 10, Duration::from_secs(3600)) {
            let mut res = (
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({
                    "error": "rate_limited",
                    "details": "Límite de creación de bulos excedido (máximo 10 por hora). Por favor, inténtalo más tarde."
                })),
            )
                .into_response();
            res.headers_mut().insert(
                header::RETRY_AFTER,
                HeaderValue::from_str(&retry_after.to_string()).unwrap_or_else(|_| HeaderValue::from_static("3600")),
            );
            return res;
        }
    }

    // 3. POST /assertions/:id/evidence: máx 20 evidencias por token/IP por hora (3600s)
    if method == Method::POST && path.starts_with("/assertions/") && path.ends_with("/evidence") {
        let key = extract_rate_limit_key(&req, "add_evidence");
        if let Err(retry_after) = limiter.check(&key, 20, Duration::from_secs(3600)) {
            let mut res = (
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({
                    "error": "rate_limited",
                    "details": "Límite de aportación de evidencias excedido (máximo 20 por hora). Por favor, inténtalo más tarde."
                })),
            )
                .into_response();
            res.headers_mut().insert(
                header::RETRY_AFTER,
                HeaderValue::from_str(&retry_after.to_string()).unwrap_or_else(|_| HeaderValue::from_static("3600")),
            );
            return res;
        }
    }

    next.run(req).await
}
