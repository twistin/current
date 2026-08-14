use crate::entities::{AssertionStatus, EvidenceStance, EvidenceStrength, SourceReliability};

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

/// Input para calcular el estado de una afirmación.
///
/// Combina los campos de `Evidence` con la `reliability` de su `Source`.
/// La persistencia es responsable de hacer el JOIN y construir este tipo
/// antes de llamar a `derive_assertion_status`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvidenceInput {
    pub stance: EvidenceStance,
    pub strength: EvidenceStrength,
    /// Fiabilidad de la fuente asociada a esta evidencia.
    pub source_reliability: SourceReliability,
}

impl EvidenceInput {
    pub fn new(
        stance: EvidenceStance,
        strength: EvidenceStrength,
        source_reliability: SourceReliability,
    ) -> Self {
        Self {
            stance,
            strength,
            source_reliability,
        }
    }

    /// Calcula el peso de esta evidencia (§1.1).
    /// `peso = valor(source_reliability) × valor(strength)`
    pub fn weight(&self) -> f64 {
        let reliability_val = match self.source_reliability {
            SourceReliability::High => 1.5,
            SourceReliability::Medium => 1.0,
            SourceReliability::Low => 0.5,
            SourceReliability::Disputed => 0.0,
        };

        let strength_val = match self.strength {
            EvidenceStrength::Strong => 2.0,
            EvidenceStrength::Moderate => 1.0,
            EvidenceStrength::Weak => 0.5,
        };

        reliability_val * strength_val
    }

    /// Determina si esta evidencia es una contextualización sólida (§3.1).
    /// Requisitos: stance == Contextualizes, reliability != Disputed, strength >= Moderate.
    pub fn is_solid_contextualization(&self) -> bool {
        self.stance == EvidenceStance::Contextualizes
            && self.source_reliability != SourceReliability::Disputed
            && (self.strength == EvidenceStrength::Strong
                || self.strength == EvidenceStrength::Moderate)
    }
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

/// Parámetros configurables del algoritmo de derivación.
///
/// El umbral `threshold` (T) es el "piso de solidez" que tanto el lado
/// `supports` como el lado `refutes` deben superar para que se considere
/// que hay evidencia efectiva. Por debajo de T → `Unverified`.
///
/// El valor por defecto (1.5) equivale a necesitar al menos una evidencia
/// de nivel "medium × moderate" (1.0) más otra débil, o una "high × moderate" (1.5).
/// Ver `doc/current-logica-derivacion.md §1`.
#[derive(Debug, Clone)]
pub struct DerivationConfig {
    /// Umbral mínimo de solidez T. Ambos lados deben superar T para contar.
    pub threshold: f64,
}

impl Default for DerivationConfig {
    fn default() -> Self {
        Self { threshold: 1.5 }
    }
}

// ---------------------------------------------------------------------------
// Función pura principal
// ---------------------------------------------------------------------------

/// Deriva el estado de una afirmación a partir de su conjunto de evidencias.
///
/// # Algoritmo (§1 de `doc/current-logica-derivacion.md`)
///
/// 1. **Peso** de cada evidencia: `reliability_weight × strength_multiplier`
///    - `Disputed` → peso 0.0 siempre.
///    - `Contextualizes` no entra en el balance supports/refutes.
///
/// 2. **Sumas:**
///    - `apoyo = Σ pesos donde stance = Supports`
///    - `refutación = Σ pesos donde stance = Refutes`
///
/// 3. **Clasificación** con umbral T (`config.threshold`):
///    - `apoyo < T` y `refutación < T` → `Unverified`
///    - `apoyo ≥ T` y `refutación < T` → `Supported`
///    - `refutación ≥ T` y `apoyo < T` → `Refuted`
///    - `apoyo ≥ T` y `refutación ≥ T` → `Contested`
pub fn derive_assertion_status(
    evidence: &[EvidenceInput],
    config: &DerivationConfig,
) -> AssertionStatus {
    let mut apoyo = 0.0;
    let mut refutacion = 0.0;

    for item in evidence {
        match item.stance {
            EvidenceStance::Supports => {
                apoyo += item.weight();
            }
            EvidenceStance::Refutes => {
                refutacion += item.weight();
            }
            EvidenceStance::Contextualizes => {
                // Contextualizes no influye en apoyo ni refutación
            }
        }
    }

    let t = config.threshold;
    if apoyo < t && refutacion < t {
        AssertionStatus::Unverified
    } else if apoyo >= t && refutacion < t {
        AssertionStatus::Supported
    } else if refutacion >= t && apoyo < t {
        AssertionStatus::Refuted
    } else {
        AssertionStatus::Contested
    }
}

// ---------------------------------------------------------------------------
// Tests del dominio (§4 de doc/current-logica-derivacion.md)
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    fn cfg() -> DerivationConfig {
        DerivationConfig::default() // threshold = 1.5
    }

    fn ev(
        stance: EvidenceStance,
        strength: EvidenceStrength,
        reliability: SourceReliability,
    ) -> EvidenceInput {
        EvidenceInput::new(stance, strength, reliability)
    }

    // Test 1: Sin evidencia → unverified.
    #[test]
    fn test_1_sin_evidencia_es_unverified() {
        assert_eq!(
            derive_assertion_status(&[], &cfg()),
            AssertionStatus::Unverified
        );
    }

    // Test 2: Una evidencia supports high×strong (3.0) → supported.
    #[test]
    fn test_2_una_evidencia_supports_high_strong_es_supported() {
        let evs = vec![ev(
            EvidenceStance::Supports,
            EvidenceStrength::Strong,
            SourceReliability::High,
        )];
        assert_eq!(derive_assertion_status(&evs, &cfg()), AssertionStatus::Supported);
    }

    // Test 3: Una evidencia refutes high×strong (3.0) → refuted.
    #[test]
    fn test_3_una_evidencia_refutes_high_strong_es_refuted() {
        let evs = vec![ev(
            EvidenceStance::Refutes,
            EvidenceStrength::Strong,
            SourceReliability::High,
        )];
        assert_eq!(derive_assertion_status(&evs, &cfg()), AssertionStatus::Refuted);
    }

    // Test 4: Una evidencia supports low×weak (0.25) → unverified (no llega a T=1.5).
    #[test]
    fn test_4_una_evidencia_supports_low_weak_es_unverified() {
        let evs = vec![ev(
            EvidenceStance::Supports,
            EvidenceStrength::Weak,
            SourceReliability::Low,
        )];
        assert_eq!(
            derive_assertion_status(&evs, &cfg()),
            AssertionStatus::Unverified
        );
    }

    // Test 5: supports 3.0 + refutes 3.0 → contested.
    #[test]
    fn test_5_supports_y_refutes_sobre_umbral_es_contested() {
        let evs = vec![
            ev(
                EvidenceStance::Supports,
                EvidenceStrength::Strong,
                SourceReliability::High,
            ),
            ev(
                EvidenceStance::Refutes,
                EvidenceStrength::Strong,
                SourceReliability::High,
            ),
        ];
        assert_eq!(derive_assertion_status(&evs, &cfg()), AssertionStatus::Contested);
    }

    // Test 6: Solo evidencia contextualizes (aunque sea high×strong) → unverified.
    #[test]
    fn test_6_solo_evidencia_contextualizes_es_unverified() {
        let evs = vec![
            ev(
                EvidenceStance::Contextualizes,
                EvidenceStrength::Strong,
                SourceReliability::High,
            ),
        ];
        assert_eq!(
            derive_assertion_status(&evs, &cfg()),
            AssertionStatus::Unverified
        );
    }

    // Test 7: Una evidencia supports con fuente disputed (peso 0) → unverified.
    #[test]
    fn test_7_fuente_disputed_peso_cero_es_unverified() {
        let evs = vec![ev(
            EvidenceStance::Supports,
            EvidenceStrength::Strong,
            SourceReliability::Disputed,
        )];
        assert_eq!(
            derive_assertion_status(&evs, &cfg()),
            AssertionStatus::Unverified
        );
    }
}
