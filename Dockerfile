# Stage 1: Build the Rust backend
FROM rust:1.85-alpine AS backend-builder
RUN apk add --no-cache musl-dev sqlite-dev pkgconfig build-base
WORKDIR /app
COPY backend/ .
# Build and move to a fixed location
RUN cargo build --release && \
    cp target/release/logwart /app/logwart-bin

# Stage 2: Build the frontend
FROM node:24-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 3: Final slim image
FROM alpine:3.21
RUN apk add --no-cache libgcc
WORKDIR /app
COPY --from=backend-builder /app/logwart-bin ./logwart
COPY --from=frontend-builder /app/out ./dist

RUN chmod +x ./logwart

# Create logs directory
RUN mkdir -p /logs

ENV LOG_DIR=/logs
ENV DATABASE_URL=sqlite:/app/logwart.db
ENV PORT=3000

EXPOSE 3000
CMD ["./logwart"]
