use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use sqlx::Row;
use crate::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Node {
    pub id: String,
    pub label: String,
    pub node_type: String, // "server", "remote", "client"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Edge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub label: String,
    pub status: String, // "success", "error", "neutral"
}

pub async fn get_graph_data(state: &AppState, filter_q: &str) -> Result<GraphData, sqlx::Error> {
    // We'll aggregate connections from the logs table
    // For simplicity, we'll look at the most recent 1000 logs and extract connections
    
    let query = if filter_q.is_empty() {
        "SELECT timestamp, event_type, metadata, message FROM logs ORDER BY id DESC LIMIT 1000".to_string()
    } else {
        format!("SELECT logs.timestamp, logs.event_type, logs.metadata, logs.message 
                 FROM logs_fts 
                 JOIN logs ON logs.id = logs_fts.rowid 
                 WHERE logs_fts MATCH '{}' 
                 ORDER BY logs.id DESC LIMIT 1000", filter_q.replace("'", "''"))
    };

    let rows = sqlx::query(&query)
        .fetch_all(&state.db)
        .await?;

    let mut nodes: HashMap<String, Node> = HashMap::new();
    let mut edges: HashMap<String, Edge> = HashMap::new();

    // The Stalwart Server itself is a node
    nodes.insert("stalwart".to_string(), Node {
        id: "stalwart".to_string(),
        label: "Stalwart Server".to_string(),
        node_type: "server".to_string(),
    });

    for row in rows {
        let event_type: Option<String> = row.get("event_type");
        let metadata_str: String = row.get("metadata");
        let metadata: HashMap<String, String> = serde_json::from_str(&metadata_str).unwrap_or_default();
        
        let et = event_type.unwrap_or_default();
        
        // Inbound
        if et.starts_with("smtp.ehlo") || et.starts_with("auth.success") || et.starts_with("smtp.mail-from") {
            if let Some(remote_ip) = metadata.get("remoteIp") {
                let node_id = format!("ip_{}", remote_ip);
                nodes.entry(node_id.clone()).or_insert(Node {
                    id: node_id.clone(),
                    label: remote_ip.clone(),
                    node_type: "remote".to_string(),
                });
                
                let edge_id = format!("{}_to_stalwart", node_id);
                edges.entry(edge_id.clone()).or_insert(Edge {
                    id: edge_id,
                    source: node_id,
                    target: "stalwart".to_string(),
                    label: "Inbound".to_string(),
                    status: "neutral".to_string(),
                });
            }
        }
        
        // Outbound
        if et.starts_with("delivery.attempt-start") || et.starts_with("smtp.delivery") || et.starts_with("delivery.domain-delivery-start") {
            let remote = metadata.get("remoteIp")
                .or_else(|| metadata.get("hostname"))
                .or_else(|| metadata.get("domain"));
            
            if let Some(remote_val) = remote {
                let node_id = format!("remote_{}", remote_val);
                nodes.entry(node_id.clone()).or_insert(Node {
                    id: node_id.clone(),
                    label: remote_val.clone(),
                    node_type: "remote".to_string(),
                });
                
                let edge_id = format!("stalwart_to_{}", node_id);
                let status = if et.contains("error") || row.get::<String, _>("message").to_lowercase().contains("error") {
                    "error".to_string()
                } else if et.contains("success") || et.contains("completed") {
                    "success".to_string()
                } else {
                    "neutral".to_string()
                };

                edges.entry(edge_id.clone()).or_insert(Edge {
                    id: edge_id,
                    source: "stalwart".to_string(),
                    target: node_id,
                    label: "Outbound".to_string(),
                    status,
                });
            }
        }
    }

    Ok(GraphData {
        nodes: nodes.into_values().collect(),
        edges: edges.into_values().collect(),
    })
}
