mod commands;
mod database;
mod models;
mod serial;

use database::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Database::new().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            commands::get_roasts,
            commands::get_roast,
            commands::save_roast,
            commands::delete_roast,
            commands::list_serial_ports,
            commands::get_beans,
            commands::save_bean,
            commands::delete_bean,
        ])
        .run(tauri::generate_context!())
        .expect("error while running RoastCurve");
}
