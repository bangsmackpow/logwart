# Logwart 🪵

A lightweight, high-performance log viewer for the [Stalwart Mail Server](https://stalw.art/). Designed to run in Docker with minimal resources.

## Features

- **Real-time Tailing:** Uses Server-Sent Events (SSE) to stream logs directly from the file to your browser.
- **Dual-Mode Search:**
  - **File-Scan:** Search directly through log files (zero setup).
  - **Database (FTS5):** Ingest logs into a SQLite database with Full-Text Search for instantaneous historical queries.
- **Structured Parsing:** Automatically extracts levels, event types, and metadata (like Queue IDs, Domains, etc.) from Stalwart's log format.
- **Slim Resources:** Written in Rust (Backend) and Next.js (Frontend) for a tiny footprint.
- **Dark Mode UI:** Built with Tailwind CSS and shadcn/ui.

## Quick Start (Docker)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bangsmackpow/logwart.git
   cd logwart
   ```

2. **Configure Environment:**
   Update `docker-compose.yml` with your paths and a secure token:
   ```yaml
   environment:
     - LOGWART_TOKEN=your_secure_token
     - LOG_DIR=/logs
   ```

3. **Deploy:**
   ```bash
   docker-compose up -d
   ```

4. **Access UI:**
   Open `http://localhost:3000` in your browser.

## Deployment with Portainer CE

Logwart is optimized for Portainer Community Edition using GitOps:

1. Create a new **Stack** in Portainer using the **Repository** method.
2. Point it to your fork or this repository.
3. Enable **GitOps updates** and use the **Webhook** mechanism.
4. Add the webhook URL to your GitHub repository secrets as `PORTAINER_WEBHOOK_URL`.

## CI/CD

The project includes a GitHub Actions workflow that:
1. Builds a multi-stage Docker image (Alpine-based).
2. Pushes the image to **GitHub Container Registry (ghcr.io)**.
3. Triggers a Portainer webhook to redeploy the stack.

## Architecture

- **Backend:** Rust (Axum, Tokio, SQLx).
- **Frontend:** Next.js 15+ (App Router, Tailwind CSS, shadcn/ui).
- **Database:** SQLite with FTS5 for log indexing.

## License

MIT
