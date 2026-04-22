# Logwart Repository Context

This file provides foundational context for AI agents working on this repository.

## Project Architecture
- **Backend (Rust):** High-performance Axum server.
  - Tailing: Uses standard file I/O with offsets.
  - SSE: Real-time event streaming to the frontend.
  - Database: SQLite + FTS5 for historical indexing.
- **Frontend (Next.js):** App Router, shadcn/ui, Tailwind CSS.
  - Features draggable columns and persistent storage of layout.
  - Uses `useLogStream` hook for SSE management.

## Environment Variables
- `LOGWART_TOKEN`: Secret key for dashboard access.
- `LOG_DIR`: Path to the mounted Stalwart logs.
- `DATABASE_URL`: SQLite connection string.

## Engineering Standards
- **Surgical Updates:** Always use `replace` for targeted edits to large files like `main.rs` or `page.tsx`.
- **Rust Patterns:** Prefer `tokio` for async operations and `sqlx` for database interactions.
- **Frontend Patterns:** Use `lucide-react` for icons and adhere to shadcn/ui component structures.

## Handover Memory
- **Deployment:** The app is designed for Docker. The binary is located at `/usr/local/bin/logwart` to avoid volume shadowing.
- **Filters:** Filters are regex-based on the `event_type` and `message` fields parsed in `parser.rs`.
- **Persistence:** Column widths are stored in `localStorage` under keys `logwart-live-columns` and `logwart-search-columns`.
