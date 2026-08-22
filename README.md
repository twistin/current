# Current — Backend

Infraestructura de verificación colaborativa contra la desinformación.

> Leer `doc/current-documento-maestro.md` y `doc/current-modelo-de-datos.md`
> antes de modificar cualquier cosa.

---

## Requisitos

| Herramienta | Versión mínima | Instalación |
|---|---|---|
| Rust + Cargo | 1.75+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Docker + Compose | Docker 24+ | [docs.docker.com](https://docs.docker.com/get-docker/) |
| sqlx-cli | 0.7+ | `cargo install sqlx-cli --no-default-features --features rustls,postgres` |

---

## Levantar el proyecto localmente

### 1. Clonar y entrar al directorio del backend

```bash
git clone <repo-url>
cd current-project/backend
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env si necesitas cambiar puerto o credenciales
```

### 3. Levantar PostgreSQL

```bash
docker compose up -d
# Comprueba que está corriendo:
docker compose ps
```

### 4. Ejecutar migraciones

```bash
sqlx migrate run --database-url postgres://current:current_secret@localhost:5432/current_dev
```

O con la variable de entorno cargada:

```bash
source .env && sqlx migrate run
```

### 5. Compilar y arrancar el servidor

```bash
cargo run -p current-api
```

El servidor escucha en `http://localhost:3000`.

### 6. Verificar que funciona

```bash
curl http://localhost:3000/health
# → {"status":"ok","service":"current-api"}
```

---

## Estructura del proyecto

```
backend/
├── Cargo.toml              Workspace raíz
├── docker-compose.yml      PostgreSQL local
├── .env.example            Plantilla de configuración
├── migrations/             Migraciones SQL (sqlx)
│   ├── 0001_member.sql
│   ├── 0002_claim.sql
│   ├── 0003_assertion.sql
│   ├── 0004_source_evidence.sql
│   └── 0005_rebuttal_contribution.sql
└── crates/
    ├── domain/             Lógica pura — sin dependencias de BD
    │   └── src/
    │       ├── entities/   Structs y enums del dominio
    │       └── logic/      Funciones puras de derivación (⚠ zona crítica)
    ├── persistence/        Acceso a PostgreSQL (sqlx)
    │   └── src/
    │       └── repos/      Un repo por entidad
    └── api/                Servidor Axum
        └── src/
            └── handlers/   Un archivo por recurso
```

---

## Capas y sus responsabilidades

| Crate | Responsabilidad | Dependencias externas |
|---|---|---|
| `current-domain` | Lógica pura. Tipos y reglas de negocio | Solo `uuid`, `chrono`, `serde` |
| `current-persistence` | Leer/escribir en PostgreSQL | `sqlx`, `current-domain` |
| `current-api` | HTTP con Axum | `axum`, `current-persistence`, `current-domain` |

**Regla de oro:** `current-domain` no puede importar `sqlx` ni `axum`. Si necesitas algo de BD en el dominio, es un error de diseño.

---

## Zona crítica: lógica de derivación

Los archivos más importantes del proyecto:

- [`crates/domain/src/logic/assertion_status.rs`](crates/domain/src/logic/assertion_status.rs) — Deriva el estado de una afirmación a partir de su evidencia.
- [`crates/domain/src/logic/claim_verdict.rs`](crates/domain/src/logic/claim_verdict.rs) — Deriva el veredicto del bulo a partir de sus afirmaciones clave.

Ambas son funciones puras con `todo!()` (andamiaje). Los tests documentan los casos esperados con `#[ignore]`. **No implementar sin revisión del equipo.**

Un bug aquí produce desinformación desde la herramienta que combate la desinformación.

---

## Comandos útiles

```bash
# Compilar todo
# Si tienes Rust en el PATH (MacPorts/Homebrew) además de rustup,
# usa este formato para evitar conflictos de versión:
PATH="$HOME/.cargo/bin:$PATH" cargo build
# O simplemente:
cargo build  # funciona si ~/.cargo/bin está primero en tu PATH

# Ejecutar tests (los de dominio están en #[ignore] hasta implementar)
cargo test

# Tests ignorados: ver los casos documentados
cargo test -- --ignored

# Linting estricto
cargo clippy -- -D warnings

# Formateo
cargo fmt

# Ver migraciones aplicadas
sqlx migrate info
```

---

## Estado del MVP (Fase 1)

- [x] Esqueleto y estructura de capas
- [x] Migraciones completas
- [x] Entidades de dominio con tipos exactos
- [x] Andamiaje de lógica de derivación con tests documentados
- [ ] Implementar `derive_assertion_status` (trabajo con el equipo)
- [ ] Implementar `derive_claim_verdict` (trabajo con el equipo)
- [ ] Repos de persistencia (sqlx queries)
- [ ] Endpoints de API (claims, assertions, evidence, rebuttals)
- [ ] WebSockets para sala de verificación colaborativa

## Licencia

Este proyecto está protegido bajo los términos de la **GNU Affero General Public License v3.0 (AGPL-3.0)**. Consulta el archivo [`LICENSE`](./LICENSE) para más detalles.

Cualquier servicio derivado o modificación que opere en red debe mantener el código 100 % abierto, transparente y accesible para la comunidad.
