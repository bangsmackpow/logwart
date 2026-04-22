use sqlx::sqlite::{SqlitePool, SqliteConnectOptions};
use sqlx::{Pool, Sqlite};
use std::str::FromStr;
use crate::parser::LogEntry;
use serde_json::json;

pub async fn init_db(database_url: &str) -> Result<Pool<Sqlite>, sqlx::Error> {
    let options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true);
    
    let pool = SqlitePool::connect_with(options).await?;
    
    // Create tables
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            event_type TEXT,
            metadata TEXT NOT NULL,
            raw TEXT NOT NULL
        );"
    ).execute(&pool).await?;

    // Create FTS5 table for fast full-text search
    sqlx::query(
        "CREATE VIRTUAL TABLE IF NOT EXISTS logs_fts USING fts5(
            message,
            raw,
            content='logs',
            content_rowid='id'
        );"
    ).execute(&pool).await?;

    // Triggers to keep FTS index in sync
    sqlx::query(
        "CREATE TRIGGER IF NOT EXISTS logs_ai AFTER INSERT ON logs BEGIN
            INSERT INTO logs_fts(rowid, message, raw) VALUES (new.id, new.message, new.raw);
        END;"
    ).execute(&pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS processed_files (
            filename TEXT PRIMARY KEY,
            last_offset INTEGER NOT NULL,
            last_modified INTEGER NOT NULL
        );"
    ).execute(&pool).await?;

    Ok(pool)
}

pub async fn insert_log(pool: &Pool<Sqlite>, entry: &LogEntry) -> Result<(), sqlx::Error> {
    let metadata_json = json!(entry.metadata).to_string();
    
    sqlx::query(
        "INSERT INTO logs (timestamp, level, message, event_type, metadata, raw)
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&entry.timestamp)
    .bind(&entry.level)
    .bind(&entry.message)
    .bind(&entry.event_type)
    .bind(metadata_json)
    .bind(&entry.raw)
    .execute(pool)
    .await?;
    
    Ok(())
}
