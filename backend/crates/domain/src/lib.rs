//! current-domain — Lógica pura de Current.
//!
//! Esta crate no tiene dependencias de base de datos ni de red.
//! Contiene los tipos del dominio y las funciones de derivación.
//!
//! # Regla de oro
//! Si necesitas importar `sqlx` o `axum` aquí, estás en el lugar equivocado.
//! Mueve esa lógica a `current-persistence` o `current-api`.
//!
//! # Zona crítica
//! El módulo `logic` contiene las funciones de derivación de estado y veredicto.
//! Un bug aquí produce desinformación desde la herramienta que la combate.
//! Ver `doc/current-modelo-de-datos.md §4` y `§6`.

pub mod entities;
pub mod logic;
