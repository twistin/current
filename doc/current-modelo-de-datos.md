# Current — Modelo de Datos (Verificación por Evidencia Estructurada)

> Companion de current-documento-maestro.md. Detalla el esquema de la sección 4 del documento maestro. Diseñado para backend Rust + PostgreSQL.

## 0. La idea central

En Current, nadie declara el veredicto. El veredicto emerge del estado de la cadena de evidencia.

Flujo lógico:
Bulo → se descompone en → Afirmaciones verificables
Cada Afirmación recibe → Evidencia (Fuente + postura)
El estado de cada Afirmación se DERIVA de su evidencia
El veredicto del Bulo se DERIVA del estado de sus afirmaciones clave

Las personas construyen la cadena (aportan afirmaciones, fuentes, evidencia). El sistema calcula los estados; no los vota una persona.

## 1. Entidades

### member — persona seudónima (SIN PII en el núcleo)
- id: UUID (PK)
- pseudonym: text (unique)
- created_at: timestamptz
- rigor_score: integer (reputación por rigor, derivada, ver §4)
- auth_ref: text nullable (referencia opaca a credencial; NUNCA email/teléfono en claro)
Sin real_name, sin phone, sin email obligatorio.

### claim — bulo
- id: UUID (PK)
- summary: text (enunciado normalizado del bulo)
- kind: enum (text / image / video / mixed)
- detected_at: timestamptz
- propagation_score: integer (velocidad de propagación, prioriza cola)
- status: enum (open / in_review / resolved)
- verdict: enum nullable — DERIVADO (false / true / misleading / unproven)
- created_by: UUID (FK → member)
verdict no se escribe a mano: lo recalcula el sistema.

### claim_variant — variante en circulación
- id: UUID (PK)
- claim_id: UUID (FK → claim)
- origin_url: text
- platform: text
- language: text (ISO 639)
- snapshot: text nullable
- seen_at: timestamptz

### assertion — afirmación verificable (ENTIDAD CLAVE)
Cada bulo se descompone en las afirmaciones concretas que sostienen su mensaje.
- id: UUID (PK)
- claim_id: UUID (FK → claim)   [cuelga de CLAIM, no de rebuttal]
- text: text (la afirmación concreta y comprobable)
- is_load_bearing: boolean (¿es afirmación clave? el veredicto depende de estas)
- status: enum — DERIVADO (unverified / supported / refuted / contested)
- created_by: UUID (FK → member)

### source — fuente
- id: UUID (PK)
- url: text
- title: text
- kind: enum (primary / secondary / official / press / academic / other)
- reliability: enum (high / medium / low / disputed)
- excerpt: text nullable (cita breve, respetar copyright)
- added_by: UUID (FK → member)
- added_at: timestamptz

### evidence — vínculo Afirmación ↔ Fuente CON POSTURA (corazón del modelo)
- id: UUID (PK)
- assertion_id: UUID (FK → assertion)
- source_id: UUID (FK → source)
- stance: enum (supports / refutes / contextualizes)   [IMPRESCINDIBLE]
- strength: enum (strong / moderate / weak)
- rationale: text (por qué esta fuente prueba/refuta esto)
- added_by: UUID (FK → member)
- added_at: timestamptz

### rebuttal — desmentido publicable
Solo puede existir si el bulo alcanzó veredicto con cadena de evidencia completa.
- id: UUID (PK)
- claim_id: UUID (FK → claim)
- base_text: text (con enlaces a la cadena de fuentes)
- published_at: timestamptz nullable
- status: enum (draft / published)

### contribution — traza de aportaciones (reputación + anti-captura)
- id: UUID (PK)
- member_id: UUID (FK → member)
- target_type: enum (assertion / source / evidence)
- target_id: UUID
- created_at: timestamptz
- outcome: enum nullable (held / overturned)

## 2. Relaciones
member 1─N claim (created_by)
member 1─N contribution
claim 1─N claim_variant
claim 1─N assertion
claim 1─1 rebuttal (cuando resuelto)
assertion 1─N evidence
source 1─N evidence

## 3. Máquinas de estado

claim.status: open → (1+ afirmación con evidencia) → in_review → (veredicto estable + afirmaciones clave resueltas) → resolved

assertion.status (DERIVADO, recalculado al cambiar su evidencia):
- unverified: sin evidencia
- supported: evidencia supports sólida supera a refutes
- refuted: evidencia refutes sólida supera a supports
- contested: evidencia sólida en ambos sentidos sin predominio

claim.verdict (DERIVADO de sus afirmaciones is_load_bearing = true):
- false: las afirmaciones clave están refuted
- true: las afirmaciones clave están supported (el bulo resultó cierto — hay que poder admitirlo)
- misleading: mezcla — algunas clave ciertas pero el conjunto engaña
- unproven: afirmaciones clave unverified o contested → NO se publica desmentido

## 4. Lógica de derivación (núcleo a implementar en Rust como funciones puras)

ESTADO DE UNA AFIRMACIÓN — función pura sobre su conjunto de evidence:
1. A cada evidencia: peso = f(source.reliability, evidence.strength)
   ej: high×strong=3, medium×moderate=1.5, low×weak=0.3, disputed=0
2. apoyo = Σ pesos de stance=supports; refutación = Σ pesos de stance=refutes
3. Umbral mínimo de solidez T (configurable). Si ambos < T → unverified
4. Si apoyo ≥ T y refutación < T → supported. Simétrico → refuted
5. Si ambos ≥ T → contested

VEREDICTO DEL BULO — función pura sobre sus afirmaciones clave (§3).

Propiedades obligatorias:
- Determinista y reproducible: mismo conjunto de evidencia → mismo veredicto. Cualquiera puede recalcularlo.
- Reversible: nueva evidencia → recalcula, puede cambiar. Nada es dogma cerrado.
- Trazable: todo veredicto expone la cadena completa que lo produjo.

REPUTACIÓN POR RIGOR (member.rigor_score): sube cuando las aportaciones resultan held; baja cuando resultan overturned. No mide cuánto participa ni de qué bando es: mide si acierta y si se corrige.

## 5. Ganchos de principio (previstos, no todos en el MVP)
- Exigencia primero a uno mismo: hook para detectar si alguien solo aporta evidencia alineada con un sesgo. Dejar el contribution log preparado.
- Anti-captura: la reputación pondera pero NUNCA sustituye a la evidencia. Nadie de alto rigor_score puede cerrar un veredicto que la cadena no sostiene. La cadena manda siempre.
- Minimización: ningún campo del núcleo guarda PII.

## 6. Nota para la implementación
La derivación (§4) vive en el dominio Rust como funciones puras y testeadas, separadas de la persistencia. Es el corazón intelectual de Current y donde un bug es más grave: un veredicto mal derivado es desinformación producida por la herramienta que la combate. Cobertura de tests alta y explícita en esta capa, por encima de cualquier otra.
