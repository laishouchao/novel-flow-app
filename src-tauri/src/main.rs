#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use tauri::{command, Manager, Window};
use std::collections::HashMap;
use std::sync::OnceLock;
use std::time::Duration;

/// 全局共享的 HTTP 客户端，带 120 秒超时配置
/// 使用 OnceLock 确保只初始化一次，避免每次请求创建新客户端
fn http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(120))
            .connect_timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client")
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct StreamChunk {
    pub request_id: String,
    pub chunk: String,
    pub done: bool,
}

#[command]
async fn http_request(request: HttpRequest) -> Result<HttpResponse, String> {
    let client = http_client();
    
    let method = match request.method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH" => reqwest::Method::PATCH,
        _ => reqwest::Method::POST,
    };
    
    let mut req_builder = client.request(method, &request.url);
    
    for (key, value) in &request.headers {
        req_builder = req_builder.header(key, value);
    }
    
    if let Some(body) = request.body {
        req_builder = req_builder.body(body);
    }
    
    let response = req_builder.send().await.map_err(|e| e.to_string())?;
    
    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("Unknown").to_string();
    
    let mut headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            headers.insert(key.to_string(), v.to_string());
        }
    }
    
    let body = response.text().await.map_err(|e| e.to_string())?;
    
    Ok(HttpResponse {
        status,
        status_text,
        headers,
        body,
    })
}

/// 流式HTTP请求，通过事件推送数据
#[command]
async fn http_request_stream(
    window: Window,
    request_id: String,
    request: HttpRequest,
) -> Result<(), String> {
    let client = http_client();
    
    let mut req_builder = client.post(&request.url);
    
    for (key, value) in &request.headers {
        req_builder = req_builder.header(key, value);
    }
    
    if let Some(body) = request.body {
        req_builder = req_builder.body(body);
    }
    
    let mut response = req_builder.send().await.map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        let _ = window.emit("stream-error", serde_json::json!({
            "request_id": request_id,
            "error": format!("HTTP {}: {}", status, body)
        }));
        return Ok(());
    }
    
    let mut stream = response.bytes_stream();
    
    while let Some(chunk_result) = futures::StreamExt::next(&mut stream).await {
        match chunk_result {
            Ok(chunk) => {
                let text = String::from_utf8_lossy(&chunk);
                let _ = window.emit("stream-chunk", StreamChunk {
                    request_id: request_id.clone(),
                    chunk: text.to_string(),
                    done: false,
                });
            }
            Err(e) => {
                let _ = window.emit("stream-error", serde_json::json!({
                    "request_id": request_id,
                    "error": e.to_string()
                }));
                return Ok(());
            }
        }
    }
    
    // 发送完成信号
    let _ = window.emit("stream-chunk", StreamChunk {
        request_id,
        chunk: String::new(),
        done: true,
    });
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![http_request, http_request_stream])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
