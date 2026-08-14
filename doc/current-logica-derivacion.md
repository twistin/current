# Current — Especificación de la Lógica de Derivación

> Companion de `current-documento-maestro.md` y `current-modelo-de-datos.md`. Detalla la sección 4 del modelo de datos con las reglas EXACTAS que deben implementar `derive_assertion_status` y `derive_claim_verdict`. Antigravity debe implementar los `todo!()` siguiendo este documento al pie de la letra. No inventar reglas no especificadas aquí; si algo falta, preguntar.
>
> Recordatorio de principio: esta es la capa más crítica de Current. Un veredicto mal derivado es desinformación producida por la herramienta que la combate. Cobertura de tests alta y explícita, por encima de cualquier otra capa.

---

## 1. Derivación del estado de una afirmación (`derive_assertion_status`)

Función **pura**: mismo conjunto de evidencia → mismo resultado. Sin efectos secundarios, sin acceso a BD.

### 1.1 Peso de una evidencia

Cada evidencia con `stance = supports` o `stance = refutes` aporta un peso, producto de la fiabilidad de su fuente y la fuerza del vínculo:

```
peso = valor(source_reliability) × valor(strength)
```

Tablas de valores (punto de partida; `threshold` y estos valores son configurables en `DerivationConfig`):

| source_reliability | valor |
| ------------------ | ----- |
| high               | 1.5   |
| medium             | 1.0   |
| low                | 0.5   |
| disputed           | 0.0   |

| strength | valor |
| -------- | ----- |
| strong   | 2.0   |
| moderate | 1.0   |
| weak     | 0.5   |

Ejemplos de peso resultante: high×strong = 3.0; medium×moderate = 1.0; low×weak = 0.25; disputed×cualquiera = 0.0.

> `disputed` anula el peso a 0: una fuente en disputa no mueve el balance por sí sola. Sigue registrada en la cadena (trazabilidad), pero no computa.

### 1.2 Cálculo del estado

```
apoyo      = Σ pesos de las evidencias con stance = supports
refutacion = Σ pesos de las evidencias con stance = refutes
```

Las evidencias con `stance = contextualizes` **NO entran aquí** (ver §3).

Sea `T = config.threshold` (por defecto **1.5**):

| condición                          | estado       |
| ---------------------------------- | ------------ |
| `apoyo < T` **y** `refutacion < T` | `unverified` |
| `apoyo ≥ T` **y** `refutacion < T` | `supported`  |
| `refutacion ≥ T` **y** `apoyo < T` | `refuted`    |
| `apoyo ≥ T` **y** `refutacion ≥ T` | `contested`  |

Interpretación: hace falta evidencia sólida (≥ T) y no contradicha en el otro sentido para dar una afirmación por resuelta. Evidencia sólida en ambos lados = `contested` (no se resuelve; requiere más trabajo humano).

---

## 2. Derivación del veredicto del bulo (`derive_claim_verdict`)

Función **pura** sobre los estados de las afirmaciones con `is_load_bearing = true` (las afirmaciones clave). Las afirmaciones no clave NO influyen en el veredicto (sí enriquecen el desmentido para el lector).

### 2.1 Filosofía: estricto con matices

Current no emite veredicto hasta tener la foto completa de las afirmaciones clave. El rigor manda: mejor decir honestamente "no probado" que precipitar un "falso" verificado a medias. Un desmentido precipitado hace más daño a la credibilidad que un bulo no tocado.

`unproven` **no es un fracaso**: es un estado honesto y publicable ("esto no está probado ni en un sentido ni en otro"). Es la prueba de que Current no fuerza el veredicto que le conviene: río, no tubería.

### 2.2 Regla

Sea el conjunto `K` = estados de las afirmaciones clave.

1. **Si `K` está vacío** (no hay afirmaciones clave) → `unproven`. (No se puede juzgar un bulo sin descomponerlo en afirmaciones clave.)

2. **Si alguna clave está `unverified` o `contested`** → `unproven`. (Falta resolver; no se emite veredicto todavía.)

   > A partir de aquí, todas las claves están resueltas (`supported` o `refuted`).

3. **Si todas las claves están `refuted`** → `false`.

4. **Si todas las claves están `supported`** → `true`. (Hay que poder admitir que un supuesto bulo era cierto. Esto separa a Current de un aparato de propaganda.)

5. **Si las claves mezclan `supported` y `refuted`** → `misleading`. (Verdad y falsedad entretejidas: el caso más común en los bulos bien hechos, verdades torcidas.)

### 2.3 Tabla resumen

| estados de las afirmaciones clave | veredicto    |
| --------------------------------- | ------------ |
| conjunto vacío                    | `unproven`   |
| alguna `unverified` o `contested` | `unproven`   |
| todas `refuted`                   | `false`      |
| todas `supported`                 | `true`       |
| mezcla de `supported` y `refuted` | `misleading` |

---

## 3. Papel de `contextualizes`

La evidencia con `stance = contextualizes` **no toca el balance supports/refutes** (no entra en §1.2). Pero **puede degradar el veredicto final a `misleading`**.

### 3.1 Regla

Tras calcular el veredicto según §2, aplicar este ajuste final:

- Si el veredicto es `false` **o** `true`, y existe **al menos una** evidencia `contextualizes` con peso sólido (fuente con `reliability` ≠ `disputed` y `strength` ≥ `moderate`) sobre **cualquiera de las afirmaciones clave** → el veredicto se degrada a **`misleading`**.
- Si el veredicto ya es `misleading` o `unproven`, `contextualizes` no lo cambia.

### 3.2 Por qué

Ejemplo: bulo "las ayudas subieron un 300%". La afirmación clave (el 300%) queda `refuted` → veredicto tiende a `false`. Pero una evidencia `contextualizes` dice "la cifra es falsa, pero sí hubo un aumento real del 40%". Esa fuente no apoya ni refuta el 300%; lo contextualiza. El veredicto justo no es `false` (como si no hubiera pasado nada), sino `misleading` (se exageró algo con base real). Más verdadero, más difícil de atacar, y fiel al principio de reconocer el grano de verdad en vez de negarlo en bloque.

---

## 4. Casos de prueba (implementar como tests del dominio)

`derive_assertion_status` (T = 1.5 por defecto):

1. Sin evidencia → `unverified`.
2. Una evidencia supports high×strong (3.0) → `supported`.
3. Una evidencia refutes high×strong (3.0) → `refuted`.
4. Una evidencia supports low×weak (0.25) → `unverified` (no llega a T).
5. supports 3.0 + refutes 3.0 → `contested`.
6. Solo evidencia `contextualizes` (aunque sea high×strong) → `unverified` (no entra en el balance).
7. Una evidencia supports con fuente `disputed` (peso 0) → `unverified`.

`derive_claim_verdict`:

8. Sin afirmaciones clave → `unproven`.
9. Claves = [refuted, refuted] → `false`.
10. Claves = [supported, supported] → `true`.
11. Claves = [refuted, supported] → `misleading`.
12. Claves = [refuted, unverified] → `unproven`.
13. Claves = [supported, contested] → `unproven`.

Ajuste `contextualizes`:

14. Veredicto `false` + 1 contextualizes sólida (medium×moderate) sobre una clave → `misleading`.
15. Veredicto `false` + 1 contextualizes débil (low×weak) → sigue `false` (no es sólida).
16. Veredicto `unproven` + contextualizes sólida → sigue `unproven` (no aplica).

---

## 5. Notas de implementación

- Ambas funciones puras, en `crates/domain/src/logic/`, sin dependencias de BD.
- `DerivationConfig` lleva `threshold` (default 1.5) y, si se quiere, las tablas de pesos, para poder recalibrar sin tocar la lógica.
- Determinismo total: ninguna aleatoriedad, ningún reloj, ninguna fuente externa dentro de estas funciones.
- Toda la §4 (casos de prueba) debe quedar cubierta antes de dar la lógica por terminada.
- La tabla de pesos y el umbral son un punto de partida; se recalibran con casos reales de la fase 1. No son dogma: son configuración.
