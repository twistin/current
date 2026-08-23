use dotenvy::dotenv;
use log::info;
use serde::Deserialize;
use std::env;
use teloxide::{prelude::*, utils::command::BotCommands};

#[derive(Debug, Deserialize)]
struct ClaimSearchResult {
    id: String,
    summary: String,
    propagation_score: i32,
    current_verdict: Option<String>,
}

#[derive(BotCommands, Clone)]
#[command(
    rename_rule = "lowercase",
    description = "Comandos de Ciberdefensa Ciudadana en Telegram - Current:"
)]
enum Command {
    #[command(description = "Muestra este mensaje de ayuda")]
    Help,
    #[command(description = "Inicia el bot y explica cómo verificar bulos")]
    Start,
    #[command(description = "Verifica un texto, titular o enlace: /check <texto o link>")]
    Check(String),
    #[command(description = "Consulta el estado del Radar de Actores: /radar")]
    Radar,
    #[command(description = "Información del proyecto y código abierto: /info")]
    Info,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    pretty_env_logger::init();
    info!("Iniciando Current Telegram Bot de Ciberdefensa...");

    let bot_token = env::var("TELEGRAM_BOT_TOKEN")
        .or_else(|_| env::var("TELOXIDE_TOKEN"))
        .expect("Debes configurar TELEGRAM_BOT_TOKEN o TELOXIDE_TOKEN en .env");

    let bot = Bot::new(bot_token);

    Command::repl(bot, answer).await;
}

async fn answer(bot: Bot, msg: Message, cmd: Command) -> ResponseResult<()> {
    let api_base = env::var("CURRENT_API_URL")
        .unwrap_or_else(|_| "https://current-app-qg6pp.ondigitalocean.app/api".to_string());

    match cmd {
        Command::Start => {
            let text = "🛡️ *Bienvenido a Current Shield Bot*\n\n\
                Herramienta de verificación ciudadana y ciberdefensa contra la desinformación en Telegram.\n\n\
                *¿Cómo usarme?*\n\
                1️⃣ *Reenvíame cualquier mensaje* o enlace sospechoso de un canal.\n\
                2️⃣ Escribe `/check <texto>` para buscarlo en la base forense.\n\
                3️⃣ Escribe `/radar` para ver actores fichados de alto riesgo.\n\n\
                🌐 Web: https://current-app-qg6pp.ondigitalocean.app\n\
                💻 Código Abierto bajo licencia AGPL-3.0";
            bot.send_message(msg.chat.id, text)
                .parse_mode(teloxide::types::ParseMode::MarkdownV2)
                .await?;
        }
        Command::Help => {
            let text = Command::descriptions().to_string();
            bot.send_message(msg.chat.id, text).await?;
        }
        Command::Check(query) => {
            if query.trim().is_empty() {
                bot.send_message(
                    msg.chat.id,
                    "⚠️ Debes indicar qué quieres verificar.\nEjemplo: `/check Pedro Sanchez coche Lanzarote`",
                )
                .await?;
                return Ok(());
            }

            bot.send_message(
                msg.chat.id,
                format!("🔍 *Auditando en la base de Current:*\n_«{}»_\n\n⏳ Consultando matriz de evidencias y radar...", query),
            )
            .parse_mode(teloxide::types::ParseMode::MarkdownV2)
            .await?;

            // Consulta a la API de Current
            let client = reqwest::Client::new();
            let url = format!("{}/claims", api_base);
            let resp = client.get(&url).send().await;

            let reply_text = match resp {
                Ok(res) => {
                    if let Ok(claims) = res.json::<Vec<ClaimSearchResult>>().await {
                        let query_lower = query.to_lowercase();
                        let found = claims
                            .into_iter()
                            .find(|c| c.summary.to_lowercase().contains(&query_lower));

                        if let Some(c) = found {
                            let verdict_str = c.current_verdict.unwrap_or_else(|| "unproven".to_string());
                            let emoji = if verdict_str == "false" { "❌ FALSO" } else if verdict_str == "misleading" { "⚠️ ENGAÑOSO" } else { "🔍 EN AUDITORÍA" };
                            format!(
                                "🚨 *EXPEDIENTE ENCONTRADO EN CURRENT*\n\n\
                                *Veredicto:* {}\n\
                                *Resumen:* {}\n\
                                *Índice de Propagación:* {}/100\n\n\
                                🔗 *Ver informe completo con fuentes oficiales:*\n\
                                https://current-app-qg6pp.ondigitalocean.app/claims/{}",
                                emoji, c.summary, c.propagation_score, c.id
                            )
                        } else {
                            format!(
                                "ℹ️ *No se encontró un bulo idéntico registrado.*\n\n\
                                ¿Crees que es una noticia falsa? Puedes reportarlo en la Cola de Verificación:\n\
                                🌐 https://current-app-qg6pp.ondigitalocean.app/queue"
                            )
                        }
                    } else {
                        "⚠️ Error al procesar datos de la API de Current.".to_string()
                    }
                }
                Err(_) => {
                    "⚠️ No se pudo conectar con el servidor central de Current en este momento.".to_string()
                }
            };

            bot.send_message(msg.chat.id, reply_text).await?;
        }
        Command::Radar => {
            let radar_text = "📡 *Radar de Actores y Canales Fichados:*\n\n\
                1️⃣ *@Alvise_Canal_Noticias* (Telegram) · Confianza: 28.0/100 · 🚨 CRÍTICO\n\
                2️⃣ *@Okdiario* (Medio) · Confianza: 34.5/100 · 🚨 CRÍTICO\n\
                3️⃣ *Liberal Digital / @Liberaldig* (X) · Confianza: 38.0/100 · 🚨 CRÍTICO\n\
                4️⃣ *Periodista Digital* (Medio) · Confianza: 42.0/100 · 🚨 CRÍTICO\n\n\
                🔗 *Ver todos los expedientes en vivo:*\n\
                https://current-app-qg6pp.ondigitalocean.app/radar";
            bot.send_message(msg.chat.id, radar_text).await?;
        }
        Command::Info => {
            let info_text = "🔬 *Current — Inteligencia Ciudadana y Ciberdefensa*\n\n\
                Plataforma comunitaria abierta para auditar desinformación, rastrear cadenas de propagación en grafos y proteger la navegación.\n\n\
                ⚖️ *Licencia:* GNU Affero GPL v3.0\n\
                💻 *GitHub:* https://github.com/twistin/current\n\
                🌐 *Web App:* https://current-app-qg6pp.ondigitalocean.app";
            bot.send_message(msg.chat.id, info_text).await?;
        }
    }

    Ok(())
}
