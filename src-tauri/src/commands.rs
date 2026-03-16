use tauri::State;

use crate::database::Database;
use crate::models::*;
use crate::serial;

/// Tauri 命令：获取烘焙记录列表
#[tauri::command]
pub fn get_roasts(db: State<Database>) -> Result<Vec<RoastSummary>, String> {
    db.fetch_roast_summaries().map_err(|e| e.to_string())
}

/// Tauri 命令：获取单个烘焙记录（含曲线数据）
#[tauri::command]
pub fn get_roast(db: State<Database>, id: String) -> Result<Option<Roast>, String> {
    db.fetch_roast(&id).map_err(|e| e.to_string())
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

/// Tauri 命令：获取生豆列表
#[tauri::command]
pub fn get_beans(db: State<Database>) -> Result<Vec<GreenBean>, String> {
    db.fetch_beans().map_err(|e| e.to_string())
}

/// Tauri 命令：保存生豆
#[tauri::command]
pub fn save_bean(db: State<Database>, bean: GreenBean) -> Result<(), String> {
    db.save_bean(&bean).map_err(|e| e.to_string())
}

/// Tauri 命令：删除生豆
#[tauri::command]
pub fn delete_bean(db: State<Database>, id: String) -> Result<(), String> {
    db.delete_bean(&id).map_err(|e| e.to_string())
}
