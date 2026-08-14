use crate::entities::{AssertionStatus, ClaimVerdict};

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

/// Información de una afirmación clave (`is_load_bearing = true`) para derivar el veredicto.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KeyAssertionInput {
    pub status: AssertionStatus,
    /// Indica si esta afirmación clave posee al menos una evidencia `contextualizes` sólida
    /// (fuente con `reliability != disputed` y `strength >= moderate`). Ver §3.1.
    pub has_solid_context: bool,
}

impl KeyAssertionInput {
    pub fn new(status: AssertionStatus, has_solid_context: bool) -> Self {
        Self {
            status,
            has_solid_context,
        }
    }
}

impl From<AssertionStatus> for KeyAssertionInput {
    fn from(status: AssertionStatus) -> Self {
        Self {
            status,
            has_solid_context: false,
        }
    }
}

// ---------------------------------------------------------------------------
// Función pura principal
// ---------------------------------------------------------------------------

/// Deriva el veredicto del bulo a partir del estado de sus afirmaciones clave.
///
/// El caller debe pasar **solo** las afirmaciones con `is_load_bearing = true`.
/// Las afirmaciones no clave no entran en el cálculo del veredicto.
///
/// # Algoritmo (§2 y §3 de `doc/current-logica-derivacion.md`)
///
/// 1. **Sin afirmaciones clave** → `Unproven`.
/// 2. **Alguna clave `Unverified` o `Contested`** → `Unproven`.
/// 3. **Todas las claves `Refuted`** → base `False`.
/// 4. **Todas las claves `Supported`** → base `True`.
/// 5. **Mezcla de `Supported` y `Refuted`** → base `Misleading`.
///
/// **Ajuste por `contextualizes` (§3.1):**
/// - Si el veredicto base es `False` o `True`, y existe al menos una clave con
///   `has_solid_context == true` → se degrada a `Misleading`.
/// - Si ya es `Misleading` o `Unproven`, se mantiene sin cambios.
pub fn derive_claim_verdict(key_assertions: &[KeyAssertionInput]) -> ClaimVerdict {
    if key_assertions.is_empty() {
        return ClaimVerdict::Unproven;
    }

    let mut all_refuted = true;
    let mut all_supported = true;
    let mut has_solid_context = false;

    for item in key_assertions {
        match item.status {
            AssertionStatus::Unverified | AssertionStatus::Contested => {
                // §2.2 regla 2: La duda bloquea el veredicto.
                return ClaimVerdict::Unproven;
            }
            AssertionStatus::Refuted => {
                all_supported = false;
            }
            AssertionStatus::Supported => {
                all_refuted = false;
            }
        }

        if item.has_solid_context {
            has_solid_context = true;
        }
    }

    let base_verdict = if all_refuted {
        ClaimVerdict::False
    } else if all_supported {
        ClaimVerdict::True
    } else {
        ClaimVerdict::Misleading
    };

    // Ajuste por contextualización sólida (§3.1)
    if (base_verdict == ClaimVerdict::False || base_verdict == ClaimVerdict::True)
        && has_solid_context
    {
        ClaimVerdict::Misleading
    } else {
        base_verdict
    }
}

/// Helper para derivar el veredicto cuando solo se dispone de los estados de las afirmaciones clave,
/// asumiendo que ninguna tiene evidencia contextualizadora sólida.
pub fn derive_claim_verdict_from_statuses(statuses: &[AssertionStatus]) -> ClaimVerdict {
    let inputs: Vec<KeyAssertionInput> = statuses.iter().copied().map(Into::into).collect();
    derive_claim_verdict(&inputs)
}

// ---------------------------------------------------------------------------
// Tests del dominio (§4 de doc/current-logica-derivacion.md)
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    fn key(status: AssertionStatus) -> KeyAssertionInput {
        KeyAssertionInput::from(status)
    }

    fn key_ctx(status: AssertionStatus, has_solid_context: bool) -> KeyAssertionInput {
        KeyAssertionInput::new(status, has_solid_context)
    }

    // Test 8: Sin afirmaciones clave → unproven.
    #[test]
    fn test_8_sin_afirmaciones_clave_es_unproven() {
        assert_eq!(derive_claim_verdict(&[]), ClaimVerdict::Unproven);
    }

    // Test 9: Claves = [refuted, refuted] → false.
    #[test]
    fn test_9_todas_refuted_es_false() {
        let keys = vec![key(AssertionStatus::Refuted), key(AssertionStatus::Refuted)];
        assert_eq!(derive_claim_verdict(&keys), ClaimVerdict::False);
    }

    // Test 10: Claves = [supported, supported] → true.
    #[test]
    fn test_10_todas_supported_es_true() {
        let keys = vec![
            key(AssertionStatus::Supported),
            key(AssertionStatus::Supported),
        ];
        assert_eq!(derive_claim_verdict(&keys), ClaimVerdict::True);
    }

    // Test 11: Claves = [refuted, supported] → misleading.
    #[test]
    fn test_11_mezcla_supported_y_refuted_es_misleading() {
        let keys = vec![
            key(AssertionStatus::Refuted),
            key(AssertionStatus::Supported),
        ];
        assert_eq!(derive_claim_verdict(&keys), ClaimVerdict::Misleading);
    }

    // Test 12: Claves = [refuted, unverified] → unproven.
    #[test]
    fn test_12_clave_unverified_bloquea_es_unproven() {
        let keys = vec![
            key(AssertionStatus::Refuted),
            key(AssertionStatus::Unverified),
        ];
        assert_eq!(derive_claim_verdict(&keys), ClaimVerdict::Unproven);
    }

    // Test 13: Claves = [supported, contested] → unproven.
    #[test]
    fn test_13_clave_contested_bloquea_es_unproven() {
        let keys = vec![
            key(AssertionStatus::Supported),
            key(AssertionStatus::Contested),
        ];
        assert_eq!(derive_claim_verdict(&keys), ClaimVerdict::Unproven);
    }

    // Test 14: Veredicto false + 1 contextualizes sólida (medium×moderate) → misleading.
    #[test]
    fn test_14_veredicto_false_con_contextualizes_solida_se_degrada_a_misleading() {
        let keys = vec![key_ctx(AssertionStatus::Refuted, true)];
        assert_eq!(derive_claim_verdict(&keys), ClaimVerdict::Misleading);
    }

    // Test 15: Veredicto false + 1 contextualizes débil → sigue false.
    #[test]
    fn test_15_veredicto_false_con_contextualizes_debil_sigue_false() {
        let keys = vec![key_ctx(AssertionStatus::Refuted, false)];
        assert_eq!(derive_claim_verdict(&keys), ClaimVerdict::False);
    }

    // Test 16: Veredicto unproven + contextualizes sólida → sigue unproven.
    #[test]
    fn test_16_veredicto_unproven_con_contextualizes_solida_sigue_unproven() {
        let keys = vec![key_ctx(AssertionStatus::Unverified, true)];
        assert_eq!(derive_claim_verdict(&keys), ClaimVerdict::Unproven);
    }
}
