use regex::Regex;
use std::sync::OnceLock;
use url::Url;

static PSEUDONYM_RE: OnceLock<Regex> = OnceLock::new();

fn pseudonym_regex() -> &'static Regex {
    PSEUDONYM_RE.get_or_init(|| Regex::new(r"^[a-zA-Z0-9_-]+$").unwrap())
}

/// Valida un seudónimo: 3-30 caracteres, alfanumérico más guión y guión bajo.
pub fn validate_pseudonym(pseudonym: &str) -> Result<(), &'static str> {
    let trimmed = pseudonym.trim();
    let len = trimmed.chars().count();
    if len < 3 || len > 30 {
        return Err("El seudónimo debe tener entre 3 y 30 caracteres");
    }
    if !pseudonym_regex().is_match(trimmed) {
        return Err("El seudónimo solo puede contener letras (a-z, A-Z), números (0-9), guiones (-) y guiones bajos (_)");
    }
    Ok(())
}

/// Valida el resumen de un bulo: 10-500 caracteres.
pub fn validate_claim_summary(summary: &str) -> Result<(), &'static str> {
    let trimmed = summary.trim();
    let len = trimmed.chars().count();
    if len < 10 || len > 500 {
        return Err("El resumen del bulo debe tener entre 10 y 500 caracteres");
    }
    Ok(())
}

/// Valida el texto de una afirmación: 10-300 caracteres.
pub fn validate_assertion_text(text: &str) -> Result<(), &'static str> {
    let trimmed = text.trim();
    let len = trimmed.chars().count();
    if len < 10 || len > 300 {
        return Err("El texto de la afirmación debe tener entre 10 y 300 caracteres");
    }
    Ok(())
}

/// Valida el razonamiento explicativo de una evidencia: 10-2000 caracteres.
pub fn validate_evidence_rationale(rationale: &str) -> Result<(), &'static str> {
    let trimmed = rationale.trim();
    let len = trimmed.chars().count();
    if len < 10 || len > 2000 {
        return Err("El razonamiento explicativo debe tener entre 10 y 2000 caracteres");
    }
    Ok(())
}

/// Valida una URL: esquema http o https obligatorio, longitud máxima de 2048 caracteres.
pub fn validate_url(raw_url: &str) -> Result<(), &'static str> {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return Err("La URL no puede estar vacía");
    }
    if trimmed.len() > 2048 {
        return Err("La URL no puede exceder los 2048 caracteres");
    }
    let parsed = Url::parse(trimmed).map_err(|_| "La URL no tiene un formato válido")?;
    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Err("La URL debe utilizar un protocolo seguro válido (http:// o https://)");
    }
    if parsed.host_str().is_none() {
        return Err("La URL debe incluir un host o dominio válido");
    }
    Ok(())
}
