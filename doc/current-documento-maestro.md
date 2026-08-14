# Current — Documento Maestro

> Fuente de verdad del proyecto. Cualquier agente de código (Antigravity, Claude Code, etc.) debe leer este documento **antes** de escribir una sola línea. Cualquier decisión técnica que contradiga los *Principios innegociables* está mal, por muy elegante que sea la solución.

---

## 1. Qué es Current

Current es una **infraestructura de verificación y vínculo** para combatir la desinformación en las redes. Su función es permitir que personas reales, organizadas, detecten un bulo emergente, lo verifiquen de forma colaborativa con una cadena de fuentes comprobable, y produzcan un desmentido que cada quien difunde con su propia voz.

El efecto de Current es desarmar los movimientos que envenenan el debate público (tecnofascismos, campañas de manipulación coordinada). Pero ese antifascismo es **la consecuencia, no la identidad**. Current no se define por su enemigo; se define por lo que construye: la capacidad repartida de discernir.

### Qué NO es Current

- **No es otra red social generalista.** No competimos con X ni con Mastodon en su terreno. Somos la capa de discernimiento que ninguna red te da.
- **No es un arma de saturación.** No existe, ni existirá, ninguna función para inundar, spamear o colapsar redes de forma coordinada. Eso es comportamiento no auténtico coordinado: exactamente lo que combatimos, y quema lo único que nos da ventaja, la credibilidad.
- **No es un árbitro de la verdad.** Nunca decimos "esto es falso, fíate de nosotros". Siempre decimos "esto es falso, y aquí tienes cómo comprobarlo sin fiarte de nosotros".
- **No es un púlpito de una minoría lúcida.** No hay élite que administra la verdad a una masa. El instrumento se reparte; el veredicto no se acapara.

---

## 2. Principios innegociables

Estos principios son el ADN del proyecto. Guían cada decisión de producto, diseño y arquitectura.

1. **El instrumento, no el veredicto.** Todo desmentido lleva su cadena de fuentes verificable. Se reparte el método de comprobación, no un dictamen que acatar.

2. **Río, no tubería.** Current da dirección y suelo ético común, pero nunca se convierte en el canal único que decide por cada persona qué pensar. Orden emergente desde abajo, no impuesto desde arriba.

3. **Gotas distintas, misma corriente.** La difusión es diversa y auténtica: cada persona adapta el desmentido con su voz. Nunca un enjambre de mensajes idénticos (que el algoritmo penaliza y que nos igualaría a los bots que combatimos).

4. **La exigencia se aplica primero a uno mismo.** El diseño debe hacer *incómodo* colar el bulo que nos gusta, no solo el del adversario. El sesgo propio es el peligroso. (Ortega dentro de la máquina.)

5. **Velocidad, no indignación.** Se prioriza por velocidad de propagación de un bulo, no por cuánta rabia genera. Ganar las primeras horas.

6. **Rigor por encima de todo.** Quien combate bulos tiene que ser el más riguroso de la sala. Nada de conspiranoia, nada de estirar la ciencia, nada de atribuir a un plan lo que es una dinámica. Un desmentido falso nos hunde.

7. **Coherencia entre fin y medio.** El cómo se construye es parte del qué se construye. No se construye fraternidad con herramientas de desunión, ni verdad repartida con métodos de quien acapara el veredicto.

### El test de diseño (gota / tubería)

Ante cualquier decisión dudosa, una sola pregunta:

> **¿Esto trata a las personas como gotas de un río —distintas y vinculadas— o como agua de una tubería —fundidas y dirigidas?**

Si es lo segundo, está mal. Sin excepción.

---

## 3. Alcance del MVP

El MVP **no** es "la red social mundial". Es **una sola cosa hecha impecable**:

> Detectar un bulo emergente → verificarlo de forma colaborativa con fuentes → producir un desmentido difundible con su cadena de evidencia.

Un grupo real (~10 personas) recorriendo ese flujo de principio a fin. Todo lo demás crece desde ahí.

### Dentro del MVP

- Reporte de un bulo emergente (URL al post original + descripción).
- Sala de verificación colaborativa: varias personas aportan fuentes y contrastan, en tiempo real.
- Cadena de evidencia: cada afirmación del desmentido enlaza a su(s) fuente(s).
- Estado del caso: abierto → en verificación → verificado / desmentido / no concluyente.
- Desmentido publicable y reutilizable, que cada persona adapta y difunde con su voz.
- Reputación básica por rigor (historial de acertar y de corregirse).
- IA asistente (ver sección 5).

### Fuera del MVP (fases posteriores)

- Federación ActivityPub / interoperabilidad con el fediverso.
- Integración vía API con X / Bluesky / Meta.
- App móvil nativa (el MVP es web / PWA).
- Nodos locales por región e idioma (arquitectura federada mundial).
- Blindaje de seguridad avanzado (anonimato fuerte, resistencia a captura).
- Gamificación / estatus avanzado de la comunidad.

---

## 4. Modelo de datos (conceptual)

El corazón de Current es cómo se representa una **verificación**. Entidades núcleo:

- **Bulo (Claim):** la afirmación falsa o sospechosa. Tiene una o varias *variantes* (mismo bulo, distinto texto/idioma/imagen). Campos: id, texto normalizado, tipo (texto/imagen/vídeo), fecha de detección, velocidad de propagación estimada, estado.

- **Variante (ClaimVariant):** una instancia concreta del bulo en circulación. Campos: id, claim_id, url_origen, plataforma, idioma, captura/snapshot.

- **Fuente (Source):** una referencia de evidencia. Campos: id, url, tipo (primaria/secundaria), fiabilidad, cita/extracto, quién la aportó.

- **Verificación (Verification):** el proceso colaborativo sobre un bulo. Campos: id, claim_id, participantes, aportaciones, veredicto, cadena de evidencia (lista ordenada de Source), timestamp.

- **Desmentido (Rebuttal):** el producto final publicable. Campos: id, verification_id, texto base, cadena de fuentes, versiones/adaptaciones, métricas de difusión.

- **Persona (Member):** usuario seudónimo. Campos: id, seudónimo, reputación_por_rigor, historial. **Sin PII: sin nombre real, sin teléfono, sin email obligatorio en el modelo central.**

Principio de modelado: la **cadena de evidencia** es ciudadana de primera clase. Un desmentido sin fuentes trazables no puede publicarse. Esto es el "instrumento, no veredicto" hecho esquema de base de datos.

---

## 5. Rol de la IA en el MVP

La IA **asiste el juicio humano, nunca lo sustituye**. Las fuentes siempre visibles; la IA nunca emite el veredicto final. Tres funciones dentro del MVP:

1. **Detección / clustering de bulos:** agrupar variantes de una misma narrativa y detectar propagación emergente.
2. **Asistencia al redactar desmentidos:** ayudar a estructurar el desmentido con rigor, sin inventar y citando siempre.
3. **Verificación de fuentes asistida:** ayudar a localizar, contrastar y valorar la fiabilidad de fuentes.

Línea roja: la IA propone y organiza; las personas deciden y firman. Ninguna publicación sale solo por decisión de un modelo.

---

## 6. Arquitectura técnica

Stack elegido según la experiencia previa del equipo (React + Rust) y las necesidades de un proyecto sensible.

- **Backend: Rust** (framework sugerido: Axum). Motivos: rendimiento para el radar de propagación y el clustering; seguridad de memoria (crítica cuando eres un objetivo); concurrencia sólida para el tiempo real.
- **Frontend: React + TypeScript.** Web / PWA primero. Móvil nativo en fase posterior.
- **Tiempo real:** WebSockets para la sala de verificación colaborativa (varias personas contrastando fuentes en vivo).
- **IA:** capa de servicio desacoplada (clustering, asistencia de redacción, valoración de fuentes). Aislada del núcleo sensible.
- **Datos:** PostgreSQL como base; el modelo de la sección 4.
- **Federación (fase 2):** ActivityPub, para conectar nodos sin depender de nadie.

Principio de arquitectura: **soberanía sobre las tripas.** El núcleo sensible (datos de verificadores, lógica de reputación, lo que protege a usuarios) debe ser autoalojable y no quedar atado ni expuesto a infraestructura de terceros más de lo estrictamente necesario. Coherencia entre fin y medio.

---

## 7. Seguridad y gobernanza (principio desde el minuto uno)

Para una herramienta cívica con aspiración mundial, esto **es el producto**, no un extra de fase 2. En el MVP no se construye el blindaje completo, pero se toman las decisiones fundacionales que no se pueden añadir después:

- **Minimización de datos:** se recoge lo mínimo imprescindible. Lo que no se guarda no se puede requisar ni filtrar.
- **Seudonimato por defecto:** sin nombre real, sin teléfono, sin PII en el modelo central.
- **Cifrado en tránsito** y buenas prácticas base.
- **Infraestructura soberana / autoalojable.**
- **Diseño anti-captura (previsión):** la gobernanza debe resistir infiltración y brigadas. En el MVP basta con dejarlo previsto en el modelo (reputación por rigor, trazabilidad de aportaciones); el mecanismo completo llega en fase 2.

Riesgo asumido conscientemente: una plataforma así, el día que funcione, será objetivo de operaciones de desinformación, campañas de denuncia y presión política en países hostiles. Diseñar con esto en mente desde hoy es lo que separa "comunidad valiente" de "lista de objetivos".

---

## 8. Hoja de ruta

- **Fase 0 — Terreno (ahora):** este documento + modelo de datos detallado + spec del flujo de verificación.
- **Fase 1 — MVP:** el flujo único (detectar → verificar → desmentir) funcionando con ~10 personas reales. App autónoma, web/PWA.
- **Fase 2 — Federación y blindaje:** ActivityPub, nodos locales por idioma/región, seguridad avanzada.
- **Fase 3 — Escala mundial:** federación de cauces locales autónomos unidos por método y ética. Muchos ríos que comparten el mar; imposible de decapitar de un golpe.

---

## 9. Decisiones tomadas (registro)

- **Nombre de trabajo:** Current (provisional; "Social" como sufijo reactiva el riesgo de "otra red social más" — revisar antes de cerrar marca).
- **Dónde vive el MVP:** app propia autónoma primero; federación en fase 2. (Descartado: empezar como capa sobre API de X/Bluesky — dependencia del adversario; descartado: federar desde el día 1 — complejidad prematura.)
- **IA en el MVP:** detección/clustering + asistencia a la redacción + verificación de fuentes asistida. Siempre asistiendo, nunca decidiendo.
- **Seguridad en el MVP:** decisiones fundacionales ahora (minimización de datos, seudonimato, soberanía); blindaje completo en fase 2.
- **Ejecutor de código:** Antigravity como motor principal; Codex reservado para cirugía puntual.

---

## 10. El ciclo red social ↔ Current (diferencial)

El valor diferencial de Current es cerrar el bucle: detectar el bulo donde vive → verificarlo en Current → volver a responderlo donde vive. Sin la vuelta, Current sería una isla donde se verifica pero el desmentido no llega.

- **MVP (semiautomático, sin dependencia de APIs):** al publicarse un desmentido, Current ofrece un botón "responder en [plataforma]" que abre el post/variante original con el texto del desmentido ya preparado para pegar/adaptar. El humano da el clic final. Coherente con la difusión diversa (cada quien con su voz, no un enjambre) y con no depender del terreno del adversario.
- **Fase 2 (integración vía API donde sea viable):** Bluesky y Mastodon (APIs abiertas y baratas) primero; X a evaluar por coste y restricciones.

*Principio:* la vuelta a la red la ejecuta una persona, no una máquina en masa. La automatización asiste, no satura.

---

## 11. Señal de reincidencia (fase 2, versión prudente)

Detectar cuentas/fuentes que propagan repetidamente narrativas ya verificadas como falsas.

- **NO una lista negra pública de personas** (riesgo legal —difamación, RGPD— y de principio —señalamiento, lo contrario de repartir el método).
- **SÍ una señal interna, basada en cuentas/fuentes, no en identidades civiles:** "esta cuenta ha propagado N narrativas ya verificadas como falsas". Visible como contexto para verificadores, no como picota pública.

*Principio:* informar el juicio del verificador, no exponer al ciudadano.
