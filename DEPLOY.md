# Guía de Despliegue en DigitalOcean App Platform — Current

Esta guía detalla los pasos exactos para desplegar el monorepo de **Current** en **DigitalOcean App Platform** con arquitectura nativa de 3 componentes (Servicio Web Rust + Sitio Estático React/Vite + PostgreSQL gestionado).

---

## 🏗️ Arquitectura de Componentes en la Nube

1. **Backend Rust (`backend`)**:
   - Compilado nativamente con el buildpack de Rust (`cargo build --release --bin current-api`).
   - Servidor HTTP con Axum escuchando en el puerto `$PORT` (8080).
   - **Migraciones Automáticas**: Al arrancar en producción, ejecuta las migraciones de `sqlx::migrate!("../../migrations")` de forma idempotente sobre la base de datos gestionada.
   - **CORS dinámico**: Permite peticiones únicamente desde el dominio del frontend (`${frontend.PUBLIC_URL}`).

2. **Frontend React (`frontend`)**:
   - Sitio estático servido desde CDN de alto rendimiento (`npm run build` $\rightarrow$ carpeta `dist/`).
   - Conectado al backend mediante la variable de entorno de build `${backend.PUBLIC_URL}`.

3. **Base de Datos PostgreSQL (`db`)**:
   - Instancia gestionada por DigitalOcean App Platform (engine `PG 15`).
   - La cadena de conexión privada SSL se inyecta de forma segura mediante `${db.DATABASE_URL}` sin almacenar credenciales en texto plano.

---

## 📋 Prerrequisitos

- Cuenta activa en [DigitalOcean](https://cloud.digitalocean.com/).
- El código actualizado en GitHub (`git push origin main`).
- *(Opcional)* CLI `doctl` instalado localmente.

---

## 🚀 Paso a Paso para el Despliegue

### Opción A: Despliegue desde el Panel Web de DigitalOcean (Recomendado)

1. **Entrar en App Platform**:
   - Ve al panel de DigitalOcean y haz clic en **Apps** $\rightarrow$ **Create App**.

2. **Conectar el Repositorio de GitHub**:
   - Selecciona **GitHub** como proveedor de código.
   - Selecciona el repositorio `twistin/current` y la rama `main`.
   - Marca la casilla **Source Directory** y déjala en la raíz o selecciona la especificación en `.do/app.yaml`.

3. **Cargar la Especificación `.do/app.yaml`**:
   - Si el panel ofrece "Import App Spec", selecciona el archivo `.do/app.yaml`.
   - Si no, DigitalOcean detectará los componentes. Asegúrate de configurar:
     - Componente **backend**: Tipo *Web Service*, directorio `backend`, comando de build `cargo build --release --bin current-api`, puerto `8080`.
     - Componente **frontend**: Tipo *Static Site*, directorio `frontend`, comando de build `npm run build`, directorio de salida `dist`.
     - Componente **db**: Tipo *Database*, motor *PostgreSQL 15*.

4. **Revisar Variables de Entorno y Secretos**:
   - En **backend**:
     - `DATABASE_URL` = `${db.DATABASE_URL}`
     - `PORT` = `8080`
     - `CORS_ALLOWED_ORIGIN` = `${frontend.PUBLIC_URL}`
   - En **frontend**:
     - `VITE_API_URL` = `${backend.PUBLIC_URL}`

5. **Iniciar Despliegue**:
   - Haz clic en **Launch App**. DigitalOcean compilará el backend en Rust, el frontend en React e inicializará la base de datos PostgreSQL.

---

### Opción B: Despliegue en 1 Comando con `doctl` (CLI)

Si tienes `doctl` configurado y autenticado (`doctl auth init`), puedes lanzar todo el despliegue con este comando:

```bash
doctl apps create --spec .do/app.yaml
```

Para ver el progreso de los logs de build y despliegue:

```bash
doctl apps list
doctl apps logs <APP_ID> --type build
```

---

## 🧪 Verificación Post-despliegue

Una vez completado el despliegue:

1. **Verificar Backend**:
   - Visita `https://<tu-backend>.ondigitalocean.app/health`. Debe responder:
     ```json
     { "status": "ok", "service": "current-api" }
     ```

2. **Verificar Migraciones de Base de Datos**:
   - Las migraciones se ejecutan en el arranque. Puedes comprobar los logs en la pestaña **Runtime Logs** del componente `backend` en DigitalOcean:
     ```text
     INFO current_api: Ejecutando migraciones SQLx...
     INFO current_api: Servidor escuchando en http://0.0.0.0:8080
     ```

3. **Probar la Interfaz de Usuario**:
   - Visita la URL pública del frontend `https://<tu-frontend>.ondigitalocean.app`.
   - Prueba a reportar un bulo, descomponerlo en afirmaciones y añadir una evidencia para comprobar la cascada de veredictos en vivo en producción.
