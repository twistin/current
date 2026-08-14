# Current — Sistema de Diseño

> Companion de `current-documento-maestro.md`. Define la piel visual y los principios de la capa social del frontend. Fuente de verdad para construir la interfaz (aquí o en Claude Design). Antigravity debe leerlo antes de generar frontend.

---

## 1. Carácter

Current es una **herramienta moderna y cuidada** (referencia de sensación: productos como Linear o Arc), seria y confiable, pero **nunca fría ni clínica**. Premium significa cálido en los detalles, generoso en el espacio, preciso sin ser instrumental de laboratorio. La persona que entra debe sentir que está en un sitio solvente donde vale la pena aportar con cuidado.

Dirección elegida: **B — Premium sereno** (fondo oscuro templado, no negro duro; acento azul sereno; serif de lectura sobria).

Nota de aprendizaje: una primera propuesta monocroma/instrumental (estética Ikeda/Raster-Noton) se descartó por **fría**. No repetir ese registro: el rigor no se transmite con frialdad sino con claridad y cuidado.

---

## 2. Color (tokens)

Base (oscuro templado, azulado, no negro):
- `--bg`        #14161A  (fondo principal)
- `--surface`   #191C21  (tarjetas, paneles)
- `--surface-2` #1C2028  (paneles destacados / verdict)
- `--border`    #262A31
- `--border-soft` #23262C

Texto:
- `--text`       #F2F3F5  (titulares)
- `--text-body`  #D6D9DE  (cuerpo)
- `--text-soft`  #9AA0AC  (secundario)
- `--text-faint` #6B7180  (labels, mono, metadatos)

Marca / interacción:
- `--accent`     #6FA8FF  (azul sereno — marca, enlaces, foco, "en vivo")

Semánticos (estado de afirmación y veredicto) — brillan un punto sobre el fondo:
- supported / verdadero: `--support` #5FB88A
- refuted / falso:       `--refute`  #E8705A
- contested / en disputa:`--contested` #E0A64D
- unverified / no probado: `--neutral` #7C8290
- misleading / engañoso: `--misleading` #E0A64D (ámbar cálido)

(Los valores son punto de partida; ajustar en construcción cuidando contraste AA.)

---

## 3. Tipografía

Tres roles, con significado:
- **Display / serif de lectura:** `Newsreader` (o similar serif humanista). Para el nombre de marca, el enunciado del bulo y titulares. Aporta el aire editorial serio y cálido.
- **Cuerpo / UI:** `Inter`. Para texto de interfaz, afirmaciones, razonamientos. Legible y neutro.
- **Mono / datos:** `IBM Plex Mono`. Para lo **calculado por el sistema**: pesos, umbral, estados derivados, labels, metadatos, seudónimos.

Principio tipográfico (mantener del concepto original, que sí funcionaba): **la mono marca lo que la máquina calcula; la serif/sans marca lo que las personas escriben y juzgan.** Encarna la división humano/máquina que es el alma de Current.

---

## 4. La capa social — al servicio del rigor

Current tiene comunidad, **no feed**. Lo social sirve a la verificación; nunca la sustituye ni compite con ella. Frontera de diseño innegociable:

**SÍ se construye:**
- **Autoría visible (prioridad 1):** cada afirmación y cada fuente muestra quién la aportó (`@seudónimo`). Nadie se esconde tras un veredicto anónimo; las aportaciones tienen dueño y responsabilidad.
- **Reputación por rigor:** el `rigor_score` visible, ligado a la autoría. Se gana acertando y corrigiéndose, no gustando.
- **Presencia:** quién está verificando en una sala.
- Perfiles seudónimos con su historial de aportaciones.

**NO se construye (mecánicas de red social que premian reacción sobre verdad):**
- Nada de "me gusta" como moneda social ni contadores de popularidad.
- Nada de feed algorítmico ordenado por indignación/engagement.
- Nada de métricas de vanidad que conviertan verificar en concurso de popularidad.
- Nada que premie la reacción rápida sobre el juicio cuidado.

Test social (aplicar a cada función social): **¿esto premia acertar y corregirse, o premia gustar y reaccionar?** Si es lo segundo, no entra.

---

## 5. Pantallas (orden de construcción)

1. **Sala de verificación** (corazón — se construye primero, marca el estándar): un bulo descompuesto en afirmaciones, cada una con su evidencia (postura, fiabilidad, fuerza, razonamiento, **autor**), y el veredicto derivado, reversible, mostrado como cálculo vivo.
2. Cola de bulos (lista priorizada por propagación).
3. Registro seudónimo (mínimo, sin PII).
4. Desmentido publicado (la salida difundible).

---

## 6. Principios de interacción (heredados del maestro)

- El veredicto se muestra siempre como **derivado y reversible**, nunca como sello. Visible "derivado de N afirmaciones clave".
- La cadena de evidencia siempre a la vista: nunca "confconfía en nosotros", siempre el rastro.
- Estados y veredicto con color semántico + etiqueta de texto (accesibilidad: no solo color).
- Calidad mínima: responsive a móvil, foco de teclado visible, `prefers-reduced-motion` respetado.
