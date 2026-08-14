FROM rust:latest AS builder
WORKDIR /workspace

# Instalar dependencias del sistema necesarias para construir
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copiar el código fuente del backend
COPY . .

# Compilar el binario release de current-api
RUN cargo build --release --bin current-api

# Imagen final ligera de producción
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /workspace/target/release/current-api /app/current-api

EXPOSE 8080
ENV PORT=8080

CMD ["/app/current-api"]
