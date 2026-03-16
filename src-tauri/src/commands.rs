use tauri::{AppHandle, State};

use crate::database::Database;
use crate::models::*;
use crate::roast_session::RoastSession;
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

/// Tauri 命令：开始烘焙（模拟模式）
#[tauri::command]
pub fn start_roast(
    session: State<RoastSession>,
    app: AppHandle,
    charge_temp: f64,
) -> Result<(), String> {
    if session.is_running() {
        return Err("烘焙正在进行中".to_string());
    }
    session.start(app, charge_temp);
    Ok(())
}

/// Tauri 命令：停止烘焙
#[tauri::command]
pub fn stop_roast(session: State<RoastSession>) -> Result<(), String> {
    session.stop();
    Ok(())
}

/// Tauri 命令：标记烘焙事件
#[tauri::command]
pub fn mark_roast_event(session: State<RoastSession>, event: RoastEvent) -> Result<(), String> {
    if !session.is_running() {
        return Err("没有正在进行的烘焙".to_string());
    }
    session.mark_event(event);
    Ok(())
}

/// Tauri 命令：完成烘焙并保存
#[tauri::command]
pub fn finish_roast(
    session: State<RoastSession>,
    db: State<Database>,
    bean_name: String,
    batch_weight: f64,
    roast_degree: Option<RoastDegree>,
    end_weight: Option<f64>,
    notes: String,
) -> Result<String, String> {
    session.stop();

    let (elapsed, last_bt, _) = session.get_current();
    let curve_data = session.get_curve_data();
    let events = session.get_events();

    let charge_temp = curve_data.first().map(|p| p.bean_temp);
    let drop_temp = curve_data.last().map(|p| p.bean_temp);
    let weight_loss = end_weight.map(|ew| ((batch_weight - ew) / batch_weight) * 100.0);

    // Find development time (from first crack to end)
    let fc_time = events.iter().find(|e| e.event == RoastEvent::FirstCrack).map(|e| e.time);
    let development_time = fc_time.map(|fc| elapsed - fc);

    let id = uuid::Uuid::new_v4();
    let roast = Roast {
        id,
        bean_id: uuid::Uuid::new_v4(),
        bean_name,
        date: chrono::Utc::now(),
        batch_weight,
        charge_temp,
        drop_temp,
        total_time: Some(elapsed),
        development_time,
        curve_data,
        events,
        notes,
        state: RoastState::Completed,
        profile_id: None,
        roast_degree,
        end_weight,
        weight_loss,
        cupping_score: None,
        cupping_notes: String::new(),
        cupping_record: None,
        tags: Vec::new(),
    };

    db.insert_roast(&roast).map_err(|e| e.to_string())?;
    Ok(id.to_string())
}
