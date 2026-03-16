use tauri::State;

use crate::database::Database;
use crate::models::*;
use crate::serial;

/// Tauri 命令：获取烘焙记录列表
#[tauri::command]
pub fn get_roasts(db: State<Database>) -> Result<Vec<RoastSummary>, String> {
    db.fetch_roast_summaries().map_err(|e| e.to_string())
}

/// Tauri 命令：保存烘焙记录
#[tauri::command]
pub fn save_roast(db: State<Database>, roast: Roast) -> Result<(), String> {
    db.insert_roast(&roast).map_err(|e| e.to_string())
}

/// Tauri 命令：删除烘焙记录
#[tauri::command]
pub fn delete_roast(db: State<Database>, id: String) -> Result<(), String> {
    db.delete_roast(&id).map_err(|e| e.to_string())
}

/// Tauri 命令：列举可用串口
#[tauri::command]
pub fn list_serial_ports() -> Vec<serial::PortInfo> {
    serial::list_ports()
}
