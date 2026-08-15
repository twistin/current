# Current — Sistema de Diseño

> Companion de `current-documento-maestro.md`. Define la piel visual, los modos de visualización (claro/oscuro), la tipografía y los principios de la capa social del frontend. Fuente de verdad para construir la interfaz.

---

## 1. Carácter

Current es una **herramienta moderna y cuidada** (referencia de sensación: productos como Linear, Arc o The Atlantic), seria y confiable, pero **nunca fría ni clínica**. Premium significa cálido en los detalles, generoso en el espacio, preciso sin ser instrumental de laboratorio.

El sistema de diseño cuenta con **dos modos oficiales** conmutables por el usuario o guiados por la preferencia del sistema operativo:

1. **Modo Oscuro (Dirección B — Premium Sereno)**: Fondo oscuro templado azulado (no negro duro), acento azul sereno, serif de lectura sobria.
2. **Modo Claro (Papel Cálido)**: Fondo crema/papel cálido (`#F7F5F0`), superficies limpias, tinta profunda de imprenta (`#1A1A17`), acento azul clásico (`#3B6FD4`).

---

## 2. Paletas de Color y Tokens CSS

Todos los colores se administran exclusivamente mediante **variables CSS** vinculadas al atributo `data-theme="light"` / `data-theme="dark"` en el elemento raíz `<html>`.

### Paleta Modo Oscuro (`[data-theme="dark"]` / por defecto)
- `--bg`: `#14161A` (fondo principal, oscuro templado)
- `--surface`: `#191C21` (tarjetas, contenedores)
- `--surface-2`: `#1C2028` (paneles destacados / veredicto)
- `--surface-3`: `#20242C` (chips, controles secundarios)
- `--border`: `#262A31` (bordes estructurales)
- `--border-soft`: `#23262C` (divisores sutiles)
- `--text`: `#F2F3F5` (titulares y alta jerarquía)
- `--text-body`: `#D6D9DE` (cuerpo de lectura)
- `--text-soft`: `#9AA0AC` (texto secundario)
- `--text-faint`: `#6B7180` (labels, metadatos, mono)
- `--accent`: `#6FA8FF` (azul sereno — marca, enlaces, foco)
- `--accent-text`: `#0C1830` (texto legible sobre botón acento)
- `--support`: `#5FB88A` (apoyada / verdadero)
- `--refute`: `#E8705A` (refutada / falso)
- `--contested` / `--misleading`: `#E0A64D` (en disputa / engañoso)
- `--neutral`: `#7C8290` (sin verificar / no probado)
- `--source-green`: `#5FB88A` (gota de fuente registrada)

### Paleta Modo Claro (`[data-theme="light"]`)
- `--bg`: `#F7F5F0` (papel cálido de imprenta)
- `--surface`: `#FFFFFF` (tarjetas blancas de alto contraste)
- `--surface-2`: `#FBFAF6` (paneles destacados)
- `--surface-3`: `#F0EEE7` (chips, botones y controles secundarios)
- `--border`: `#E4E1D8` (bordes sutiles de papel)
- `--border-soft`: `#EDEBE3` (separadores suaves)
- `--text`: `#1A1A17` (tinta negra profunda para titulares)
- `--text-body`: `#3A3A34` (cuerpo de lectura de alta legibilidad)
- `--text-soft`: `#6B6B62` (secundario cálido)
- `--text-faint`: `#9A9A8E` (labels, metadatos, mono)
- `--accent`: `#3B6FD4` (azul cobalto clásico)
- `--accent-text`: `#FFFFFF` (texto blanco de alto contraste sobre botón acento)
- `--support`: `#2E8B5E` (verde esmeralda sobrio)
- `--refute`: `#C24634` (rojo terracota de imprenta)
- `--contested` / `--misleading`: `#C08420` (ámbar quemado)
- `--neutral`: `#8A8A7E` (gris cálido neutro)
- `--source-green`: `#2E9E6A` (verde de gota de fuente)

---

## 3. Logo Adaptativo

El logotipo de Current es un sistema vectorial compuesto por:
1. **Símbolo de la Corriente**: Tres ondas sinusoidales bajo una gota solitaria superior.
   - **En modo oscuro (`-dark`)**: Ondas en gradación azul (`#6FA8FF`, `#4F8EEB`, `#8CB8FF`) con punto verde esmeralda (`#5FB88A`).
   - **En modo claro (`-light`)**: Ondas en tinta negra de grabado (`#1A1A17`, `#1A1A17`, `#8A8A7E`) con punto verde (`#2E8B5E`).
2. **Wordmark**: Tipografía *Newsreader* en seminegrita, finalizado con el punto azul característico (`Current.`).

---

## 4. Tipografía

Tres roles, con significado:
- **Display / serif de lectura:** `Newsreader` (o serif humanista). Para el nombre de marca, el enunciado del bulo, lemas y titulares. Aporta el aire editorial serio y cálido.
- **Cuerpo / UI:** `Inter`. Para texto de interfaz, afirmaciones, razonamientos. Legible y neutro.
- **Mono / datos:** `IBM Plex Mono`. Para lo **calculado por el sistema**: pesos, umbral, estados derivados, labels, metadatos, seudónimos.

Principio tipográfico: **la mono marca lo que la máquina calcula; la serif/sans marca lo que las personas escriben y juzgan.**

---

## 5. Accesibilidad y Contraste (WCAG AA)

- Todos los textos principales y secundarios superan la relación de contraste 4.5:1 exigida por WCAG AA tanto sobre fondo oscuro como sobre fondo claro.
- Los botones principales utilizan la variable `--accent-text` para garantizar que el texto sobre el botón acento tenga contraste óptimo (`#0C1830` sobre azul claro en modo oscuro; `#FFFFFF` sobre azul cobalto en modo claro).
- Los estados y veredictos siempre van acompañados de símbolo/etiqueta textual, nunca confiando únicamente en el color.
