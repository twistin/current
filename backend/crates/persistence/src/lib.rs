//! current-persistence — Acceso a PostgreSQL.
//!
//! Esta crate es la única que puede importar `sqlx`.
//! Traduce entre filas de BD y tipos del dominio (`current-domain`).

pub mod db;
pub mod error;
pub mod repos;
