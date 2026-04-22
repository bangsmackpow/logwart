mod parser;
mod db;

use axum::{
    extract::{Query, State, Request},
    response::{sse::{Event, Sse}, Response},
    routing::{get, post},
    middleware::{self, Next},
    Router,
    Json,
    http::StatusCode,
};
use serde::Deserialize;
use std::{collections::HashMap, path::PathBuf, sync::Arc, time::Duration};
use tokio::sync::broadcast;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::{info, error, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use std::env;
use dotenvy::dotenv;
use tokio::fs::{File, metadata};
use tokio::io::{AsyncBufReadExt, BufReader, SeekFrom, AsyncSeekExt};
use futures_util::stream::Stream;
use std::convert::Infallible;
use sqlx::{Row, FromRow};

#[derive(Clone)]
struct AppState {
    db: sqlx::Pool<sqlx::Sqlite>,
    tx: broadcast::Sender<parser::LogEntry>,
    log_dir: PathBuf,
    auth_token: String,
}

#[derive(FromRow)]
struct ProcessedFile {
    last_offset: i64,
    last_modified: i64,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:logwart.db".to_string());
    let log_dir = PathBuf::from(env::var("LOG_DIR").unwrap_or_else(|_| "../example_logs".to_string()));
    let auth_token = env::var("LOGWART_TOKEN").unwrap_or_else(|_| "admin".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());

    let pool = db::init_db(&database_url).await.expect("Failed to initialize database");
    let (tx, _rx) = broadcast::channel(1000);

    let state = Arc::new(AppState {
        db: pool,
        tx,
        log_dir: log_dir.clone(),
        auth_token,
    });

    // Start background tailing task
    let state_clone = state.clone();
    tokio::spawn(async move {
        tail_logs(state_clone).await;
    });

    let api_routes = Router::new()
        .route("/logs/stream", get(stream_handler))
        .route("/logs/search", get(search_handler))
        .route("/ingest", post(ingest_handler))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    let app = Router::new()
        .nest("/api", api_routes)
        .fallback_service(tower_http::services::ServeDir::new("dist").fallback(tower_http::services::ServeFile::new("dist/index.html")))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = format!("0.0.0.0:{}", port);
    info!("Logwart backend listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    let token_query = req.uri().query()
        .and_then(|q| q.split('&').find(|p| p.starts_with("token=")))
        .and_then(|p| p.split('=').nth(1));

    let is_authorized = match auth_header {
        Some(auth) if auth == format!("Bearer {}", state.auth_token) => true,
        _ => match token_query {
            Some(token) if token == state.auth_token => true,
            _ => false,
        }
    };

    if is_authorized {
        Ok(next.run(req).await)
    } else {
        warn!("Unauthorized access attempt to {}", req.uri().path());
        Err(StatusCode::UNAUTHORIZED)
    }
}

async fn tail_logs(state: Arc<AppState>) {
    info!("Starting log tailing task in {:?}", state.log_dir);
    let mut last_file: Option<PathBuf> = None;
    let mut last_pos: u64 = 0;

    loop {
        let newest = match find_newest_log(&state.log_dir).await {
            Ok(Some(path)) => path,
            Ok(None) => {
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }
            Err(e) => {
                error!("Error finding newest log: {}", e);
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }
        };

        if Some(&newest) != last_file.as_ref() {
            info!("Newest log file changed to {:?}", newest);
            last_file = Some(newest.clone());
            
            // On new file, start from the beginning if it's small, 
            // or last 50 lines if it's large.
            let meta = metadata(&newest).await.unwrap();
            last_pos = if meta.len() > 10000 {
                meta.len() - 10000 // Heuristic: last ~10KB
            } else {
                0
            };
        }

        let file = match File::open(&newest).await {
            Ok(f) => f,
            Err(e) => {
                error!("Error opening log file: {}", e);
                tokio::time::sleep(Duration::from_secs(1)).await;
                continue;
            }
        };

        let mut reader = BufReader::new(file);
        if let Err(e) = reader.seek(SeekFrom::Start(last_pos)).await {
            error!("Error seeking in log file: {}", e);
            last_pos = 0;
            continue;
        }

        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) => break,
                Ok(_) => {
                    if let Some(entry) = parser::parse_line(line.trim()) {
                        let _ = state.tx.send(entry);
                    }
                    last_pos = reader.stream_position().await.unwrap_or(last_pos);
                }
                Err(e) => {
                    error!("Error reading log line: {}", e);
                    break;
                }
            }
        }

        tokio::time::sleep(Duration::from_millis(500)).await;
    }
}

async fn find_newest_log(dir: &PathBuf) -> tokio::io::Result<Option<PathBuf>> {
    let mut entries = tokio::fs::read_dir(dir).await?;
    let mut newest: Option<(PathBuf, std::time::SystemTime)> = None;

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        if path.is_file() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with("stalwart.log.") {
                    let meta = entry.metadata().await?;
                    let modified = meta.modified()?;
                    if newest.is_none() || modified > newest.as_ref().unwrap().1 {
                        newest = Some((path, modified));
                    }
                }
            }
        }
    }
    Ok(newest.map(|(p, _)| p))
}

async fn stream_handler(
    State(state): State<Arc<AppState>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let mut rx = state.tx.subscribe();

    let stream = async_stream::stream! {
        while let Ok(entry) = rx.recv().await {
            yield Ok(Event::default().json_data(entry).unwrap());
        }
    };

    Sse::new(stream).keep_alive(axum::response::sse::KeepAlive::default())
}

#[derive(Deserialize)]
struct SearchParams {
    q: Option<String>,
    mode: Option<String>,
    limit: Option<usize>,
}

async fn search_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchParams>,
) -> Result<Json<Vec<parser::LogEntry>>, StatusCode> {
    let mode = params.mode.unwrap_or_else(|| "file".to_string());
    let limit = params.limit.unwrap_or(100);
    let q = params.q.unwrap_or_default();

    if mode == "db" {
        let rows = sqlx::query(
            "SELECT logs.timestamp, logs.level, logs.message, logs.event_type, logs.metadata, logs.raw 
             FROM logs_fts 
             JOIN logs ON logs.id = logs_fts.rowid 
             WHERE logs_fts MATCH ? 
             ORDER BY logs.id DESC LIMIT ?"
        )
        .bind(&q)
        .bind(limit as i64)
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            error!("DB Search error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        let entries = rows.into_iter().map(|r| parser::LogEntry {
            timestamp: r.get(0),
            level: r.get(1),
            message: r.get(2),
            event_type: r.get(3),
            metadata: serde_json::from_str(r.get(4)).unwrap_or_default(),
            raw: r.get(5),
        }).collect();

        Ok(Json(entries))
    } else {
        let mut entries = Vec::new();
        let mut log_files = Vec::new();
        if let Ok(mut dir_entries) = tokio::fs::read_dir(&state.log_dir).await {
            while let Some(entry) = dir_entries.next_entry().await.unwrap_or(None) {
                let path = entry.path();
                if path.is_file() {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        if name.starts_with("stalwart.log.") {
                            log_files.push(path);
                        }
                    }
                }
            }
        }
        
        log_files.sort_by(|a, b| b.cmp(a));

        for path in log_files {
            if entries.len() >= limit { break; }
            if let Ok(file) = File::open(&path).await {
                let mut reader = BufReader::new(file);
                let mut line = String::new();
                let mut file_entries = Vec::new();
                while let Ok(n) = reader.read_line(&mut line).await {
                    if n == 0 { break; }
                    if line.to_lowercase().contains(&q.to_lowercase()) {
                        if let Some(entry) = parser::parse_line(line.trim()) {
                            file_entries.push(entry);
                        }
                    }
                    line.clear();
                }
                file_entries.reverse();
                entries.extend(file_entries);
            }
        }
        entries.truncate(limit);
        Ok(Json(entries))
    }
}

async fn ingest_handler(
    State(state): State<Arc<AppState>>,
) -> Json<HashMap<String, String>> {
    info!("Starting manual ingestion");
    let state_clone = state.clone();
    tokio::spawn(async move {
        let mut log_files = Vec::new();
        if let Ok(mut dir_entries) = tokio::fs::read_dir(&state_clone.log_dir).await {
            while let Some(entry) = dir_entries.next_entry().await.unwrap_or(None) {
                let path = entry.path();
                if path.is_file() {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        if name.starts_with("stalwart.log.") {
                            log_files.push(path);
                        }
                    }
                }
            }
        }

        for path in log_files {
            let filename = path.file_name().unwrap().to_str().unwrap().to_string();
            let meta = match metadata(&path).await {
                Ok(m) => m,
                Err(_) => continue,
            };
            let modified = meta.modified().unwrap().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64;

            let processed: Option<ProcessedFile> = sqlx::query_as::<_, ProcessedFile>(
                "SELECT last_offset, last_modified FROM processed_files WHERE filename = ?"
            )
            .bind(&filename)
            .fetch_optional(&state_clone.db)
            .await
            .unwrap_or(None);

            let start_offset = match processed {
                Some(p) if p.last_modified == modified && p.last_offset >= meta.len() as i64 => continue,
                Some(p) => p.last_offset,
                None => 0,
            };

            info!("Ingesting {:?} from offset {}", filename, start_offset);
            if let Ok(file) = File::open(&path).await {
                let mut reader = BufReader::new(file);
                let _ = reader.seek(SeekFrom::Start(start_offset as u64)).await;
                let mut line = String::new();
                while let Ok(n) = reader.read_line(&mut line).await {
                    if n == 0 { break; }
                    if let Some(entry) = parser::parse_line(line.trim()) {
                        let _ = db::insert_log(&state_clone.db, &entry).await;
                    }
                    line.clear();
                }
                let end_offset = reader.stream_position().await.unwrap_or(start_offset as u64) as i64;
                let _ = sqlx::query(
                    "INSERT INTO processed_files (filename, last_offset, last_modified) 
                     VALUES (?, ?, ?) ON CONFLICT(filename) DO UPDATE SET 
                     last_offset = excluded.last_offset, last_modified = excluded.last_modified"
                )
                .bind(&filename)
                .bind(end_offset)
                .bind(modified)
                .execute(&state_clone.db)
                .await;
            }
        }
        info!("Ingestion complete");
    });

    let mut res = HashMap::new();
    res.insert("status".to_string(), "started".to_string());
    Json(res)
}
