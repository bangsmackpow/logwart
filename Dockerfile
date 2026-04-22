# Stage 1: Build the Rust backend
FROM rust:1.85-alpine3.21 AS backend-builder
RUN apk add --no-cache musl-dev sqlite-dev pkgconfig build-base
WORKDIR /usr/src/logwart
COPY backend/ .
RUN cargo build --release

# Stage 2: Build the frontend
FROM node:24-alpine3.21 AS frontend-builder
WORKDIR /usr/src/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 3: Final slim image
FROM alpine:3.21
RUN apk add --no-cache libgcc ca-certificates
WORKDIR /app
# Copy the binary specifically from the target dir
COPY --from=backend-builder /usr/src/logwart/target/release/logwart /app/logwart
COPY --from=frontend-builder /usr/src/frontend/out /app/dist

RUN chmod +x /app/logwart

# Create logs directory
RUN mkdir -p /logs

ENV LOG_DIR=/logs
ENV DATABASE_URL=sqlite:/app/logwart.db
ENV PORT=3000

EXPOSE 3000
ENTRYPOINT ["/app/logwart"]
