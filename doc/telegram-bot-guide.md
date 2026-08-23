# Guía de Puesta en Marcha: Current Telegram Bot (@CurrentRadarBot)

Bot oficial de ciberdefensa ciudadana en Telegram: **[`https://t.me/CurrentRadarBot`](https://t.me/CurrentRadarBot)** (`@CurrentRadarBot`).

Este microservicio en Rust (`backend/crates/telegram-bot`) permite auditar bulos, consultar el Radar de Actores y recibir alertas automáticas en grupos y canales de Telegram.

---

## 🛠️ Cómo Activar el Bot en 3 Pasos

### 1. Crear el Bot en Telegram con BotFather
1. Abre Telegram y busca `@BotFather`.
2. Escribe el comando `/newbot`.
3. Dale un nombre (ej. `Current Shield Bot`) y un alias (ej. `CurrentShieldBot` o `CurrentVerificaBot`).
4. `@BotFather` te entregará un **Token HTTP API** (ej. `7123456789:AAFxxx...`).

### 2. Configurar la Variable de Entorno
Copia el token en tu archivo `.env` o en las variables de entorno de tu servidor:
```bash
TELEGRAM_BOT_TOKEN="7123456789:AAFxxx..."
CURRENT_API_URL="https://current-app-qg6pp.ondigitalocean.app/api"
```

### 3. Ejecutar el Bot
```bash
cd backend
cargo run -p current-telegram-bot
```

---

## 🤖 Comandos Disponibles para Usuarios y Grupos

| Comando | Descripción |
| :--- | :--- |
| `/start` | Mensaje de bienvenida, guía de uso y enlace al manifiesto. |
| `/check <texto o link>` | Busca en la base forense de Current y devuelve el veredicto con fuentes oficiales. |
| `/radar` | Muestra el estado en vivo de actores críticos y canales fichados en el Radar. |
| `/info` | Información del proyecto, licencia AGPL-3.0 y repositorio de GitHub. |

---

## 🛡️ Uso en Canales y Supergrupos
Al añadir el bot como administrador en un canal o grupo de Telegram, los miembros pueden escribir `/check` ante cualquier mensaje sospechoso y el bot responderá inmediatamente en el hilo con el expediente y las pruebas oficiales.
