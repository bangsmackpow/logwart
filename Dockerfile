# Stage 1: Build the Rust backend
FROM rust:alpine AS backend-builder
RUN apk add --no-cache musl-dev sqlite-dev pkgconfig
WORKDIR /app
COPY backend/ .
RUN cargo build --release

# Stage 2: Build the frontend
FROM node:24-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 3: Final slim image
FROM alpine:latest
RUN apk add --no-cache sqlite-libs libgcc
WORKDIR /app
COPY --from=backend-builder /app/target/release/backend ./logwart
COPY --from=frontend-builder /app/out ./dist

# Create logs directory
RUN mkdir -p /logs

ENV LOG_DIR=/logs
ENV DATABASE_URL=sqlite:/app/logwart.db
ENV PORT=3000

EXPOSE 3000
CMD ["./logwart"]
