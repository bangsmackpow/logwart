use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use regex::Regex;
use lazy_static::lazy_static;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub event_type: Option<String>,
    pub metadata: HashMap<String, String>,
    pub raw: String,
}

lazy_static! {
    // Regex to parse the main parts of the log line
    // Example: 2026-04-21T15:37:37Z INFO Starting Stalwart Server v0.15.5 (server.startup) version = "0.15.5"
    static ref LOG_RE: Regex = Regex::new(r#"^(?P<ts>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+(?P<level>[A-Z]+)\s+(?P<msg>.+?)(?:\s+\((?P<event>[^)]+)\))?(?:\s+(?P<meta>[a-zA-Z0-9._-]+\s*=.*))?$"#).unwrap();
    
    // Regex to parse key-value pairs in metadata
    // Handles key = "value" and key = value
    static ref META_RE: Regex = Regex::new(r#"(?P<key>[a-zA-Z0-9._-]+)\s*=\s*(?:"(?P<val1>[^"]*)"|(?P<val2>[^\s,]*))"#).unwrap();
}

pub fn parse_line(line: &str) -> Option<LogEntry> {
    let caps = LOG_RE.captures(line)?;
    
    let timestamp = caps.name("ts")?.as_str().to_string();
    let level = caps.name("level")?.as_str().to_string();
    let message = caps.name("msg")?.as_str().trim().to_string();
    let event_type = caps.name("event").map(|m| m.as_str().to_string());
    
    let mut metadata = HashMap::new();
    if let Some(meta_str) = caps.name("meta") {
        for meta_caps in META_RE.captures_iter(meta_str.as_str()) {
            let key = meta_caps.name("key")?.as_str().to_string();
            let val = meta_caps.name("val1")
                .or_else(|| meta_caps.name("val2"))
                .map(|m| m.as_str().to_string())
                .unwrap_or_default();
            metadata.insert(key, val);
        }
    }
    
    Some(LogEntry {
        timestamp,
        level,
        message,
        event_type,
        metadata,
        raw: line.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_complex_line() {
        let line = "2026-04-21T15:37:37Z INFO Queued report for delivery (queue.queue-report) queueId = 303050747904262246, from = \"noreply-dmarc@builtnetworks.com\", size = 2886";
        let entry = parse_line(line).unwrap();
        assert_eq!(entry.timestamp, "2026-04-21T15:37:37Z");
        assert_eq!(entry.level, "INFO");
        assert_eq!(entry.message, "Queued report for delivery");
        assert_eq!(entry.event_type.unwrap(), "queue.queue-report");
        assert_eq!(entry.metadata.get("queueId").unwrap(), "303050747904262246");
        assert_eq!(entry.metadata.get("from").unwrap(), "noreply-dmarc@builtnetworks.com");
        assert_eq!(entry.metadata.get("size").unwrap(), "2886");
    }

    #[test]
    fn test_parse_simple_line() {
        let line = "2026-04-21T15:37:37Z INFO Starting Stalwart Server";
        let entry = parse_line(line).unwrap();
        assert_eq!(entry.level, "INFO");
        assert_eq!(entry.message, "Starting Stalwart Server");
        assert!(entry.event_type.is_none());
    }
}
