use rusqlite::{params, Connection, OptionalExtension, Result};
use std::path::PathBuf;
use std::sync::Mutex;

use crate::models::*;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = Self::db_path();
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.create_tables()?;
        Ok(db)
    }

    fn db_path() -> PathBuf {
        let mut path = dirs_next::data_dir().unwrap_or_else(|| PathBuf::from("."));
        path.push("RoastCurve");
        path.push("roast.db");
        path
    }

    fn create_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS roasting_records (
                id TEXT PRIMARY KEY,
                bean_id TEXT NOT NULL,
                bean_name TEXT NOT NULL,
                date TEXT NOT NULL,
                batch_weight REAL DEFAULT 0,
                charge_temp REAL,
                drop_temp REAL,
                total_time REAL,
                development_time REAL,
                notes TEXT DEFAULT '',
                state TEXT NOT NULL,
                profile_id TEXT,
                roast_degree TEXT,
                end_weight REAL,
                weight_loss REAL,
                cupping_score REAL,
                cupping_notes TEXT DEFAULT '',
                tags TEXT DEFAULT '[]',
                cupping_record TEXT
            );

            CREATE TABLE IF NOT EXISTS curve_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id TEXT NOT NULL,
                elapsed_seconds REAL NOT NULL,
                bt REAL,
                et REAL,
                ror REAL,
                gas REAL,
                airflow REAL
            );

            CREATE INDEX IF NOT EXISTS idx_curve_record ON curve_data(record_id, elapsed_seconds);

            CREATE TABLE IF NOT EXISTS roasting_events (
                id TEXT PRIMARY KEY,
                record_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                elapsed_seconds REAL NOT NULL,
                bean_temp REAL
            );

            CREATE TABLE IF NOT EXISTS green_beans (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                origin TEXT DEFAULT '',
                process TEXT DEFAULT '',
                variety TEXT DEFAULT '',
                purchase_date TEXT,
                quantity_kg REAL DEFAULT 0,
                price_per_kg REAL,
                notes TEXT DEFAULT ''
            );
        ",
        )?;
        Ok(())
    }

    pub fn insert_roast(&self, roast: &Roast) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let tags_json = serde_json::to_string(&roast.tags).unwrap_or_else(|_| "[]".to_string());
        let cupping_json = roast
            .cupping_record
            .as_ref()
            .and_then(|r| serde_json::to_string(r).ok());
        let degree = roast
            .roast_degree
            .as_ref()
            .and_then(|d| serde_json::to_value(d).ok())
            .and_then(|v| v.as_str().map(|s| s.to_string()));
        let state_str = serde_json::to_value(&roast.state)
            .ok()
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .unwrap_or_else(|| "完成".to_string());

        conn.execute(
            "INSERT OR REPLACE INTO roasting_records
             (id, bean_id, bean_name, date, batch_weight, charge_temp, drop_temp,
              total_time, development_time, notes, state, profile_id,
              roast_degree, end_weight, weight_loss, cupping_score, cupping_notes,
              tags, cupping_record)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)",
            params![
                roast.id.to_string(),
                roast.bean_id.to_string(),
                roast.bean_name,
                roast.date.to_rfc3339(),
                roast.batch_weight,
                roast.charge_temp,
                roast.drop_temp,
                roast.total_time,
                roast.development_time,
                roast.notes,
                state_str,
                roast.profile_id.map(|id| id.to_string()),
                degree,
                roast.end_weight,
                roast.weight_loss,
                roast.cupping_score,
                roast.cupping_notes,
                tags_json,
                cupping_json,
            ],
        )?;

        // Curve data
        if !roast.curve_data.is_empty() {
            conn.execute(
                "DELETE FROM curve_data WHERE record_id=?1",
                params![roast.id.to_string()],
            )?;
            let mut stmt = conn.prepare(
                "INSERT INTO curve_data (record_id, elapsed_seconds, bt, et, ror, gas, airflow)
                 VALUES (?1,?2,?3,?4,?5,?6,?7)",
            )?;
            for p in &roast.curve_data {
                stmt.execute(params![
                    roast.id.to_string(),
                    p.time,
                    p.bean_temp,
                    p.env_temp,
                    p.ror,
                    p.gas,
                    p.airflow,
                ])?;
            }
        }

        // Events
        if !roast.events.is_empty() {
            conn.execute(
                "DELETE FROM roasting_events WHERE record_id=?1",
                params![roast.id.to_string()],
            )?;
            let mut stmt = conn.prepare(
                "INSERT INTO roasting_events (id, record_id, event_type, elapsed_seconds, bean_temp)
                 VALUES (?1,?2,?3,?4,?5)",
            )?;
            for e in &roast.events {
                let event_str = serde_json::to_value(&e.event)
                    .ok()
                    .and_then(|v| v.as_str().map(|s| s.to_string()))
                    .unwrap_or_default();
                stmt.execute(params![
                    e.id.to_string(),
                    roast.id.to_string(),
                    event_str,
                    e.time,
                    e.bean_temp,
                ])?;
            }
        }

        Ok(())
    }

    pub fn fetch_roast_summaries(&self) -> Result<Vec<RoastSummary>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, bean_name, date, batch_weight, charge_temp, drop_temp,
                    total_time, roast_degree, weight_loss, cupping_score, tags
             FROM roasting_records ORDER BY date DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let tags_json: String = row.get(10)?;
            let tags: Vec<String> =
                serde_json::from_str(&tags_json).unwrap_or_default();
            let degree_str: Option<String> = row.get(7)?;
            let degree = degree_str.and_then(|s| {
                serde_json::from_value(serde_json::Value::String(s)).ok()
            });

            Ok(RoastSummary {
                id: uuid::Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                bean_name: row.get(1)?,
                date: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(2)?)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| chrono::Utc::now()),
                batch_weight: row.get(3)?,
                charge_temp: row.get(4)?,
                drop_temp: row.get(5)?,
                total_time: row.get(6)?,
                roast_degree: degree,
                weight_loss: row.get(8)?,
                cupping_score: row.get(9)?,
                tags,
            })
        })?;

        rows.collect()
    }

    pub fn delete_roast(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM roasting_records WHERE id=?1", params![id])?;
        conn.execute("DELETE FROM curve_data WHERE record_id=?1", params![id])?;
        conn.execute("DELETE FROM roasting_events WHERE record_id=?1", params![id])?;
        Ok(())
    }

    pub fn fetch_roast(&self, id: &str) -> Result<Option<Roast>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, bean_id, bean_name, date, batch_weight, charge_temp, drop_temp,
                    total_time, development_time, notes, state, profile_id,
                    roast_degree, end_weight, weight_loss, cupping_score, cupping_notes,
                    tags, cupping_record
             FROM roasting_records WHERE id=?1",
        )?;

        let roast = stmt.query_row(params![id], |row| {
            let tags_json: String = row.get(17)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            let cupping_json: Option<String> = row.get(18)?;
            let cupping_record = cupping_json.and_then(|j| serde_json::from_str(&j).ok());
            let degree_str: Option<String> = row.get(12)?;
            let degree = degree_str.and_then(|s| serde_json::from_value(serde_json::Value::String(s)).ok());
            let state_str: String = row.get(10)?;
            let state: RoastState = serde_json::from_value(serde_json::Value::String(state_str))
                .unwrap_or(RoastState::Completed);
            let profile_str: Option<String> = row.get(11)?;

            Ok(Roast {
                id: uuid::Uuid::parse_str(&row.get::<_, String>(0)?).unwrap(),
                bean_id: uuid::Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_else(|_| uuid::Uuid::new_v4()),
                bean_name: row.get(2)?,
                date: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| chrono::Utc::now()),
                batch_weight: row.get(4)?,
                charge_temp: row.get(5)?,
                drop_temp: row.get(6)?,
                total_time: row.get(7)?,
                development_time: row.get(8)?,
                notes: row.get(9)?,
                state,
                profile_id: profile_str.and_then(|s| uuid::Uuid::parse_str(&s).ok()),
                roast_degree: degree,
                end_weight: row.get(13)?,
                weight_loss: row.get(14)?,
                cupping_score: row.get(15)?,
                cupping_notes: row.get(16)?,
                cupping_record,
                tags,
                curve_data: Vec::new(),
                events: Vec::new(),
            })
        }).optional()?;

        if let Some(mut roast) = roast {
            // Load curve data
            let mut stmt = conn.prepare(
                "SELECT elapsed_seconds, bt, et, ror, gas, airflow
                 FROM curve_data WHERE record_id=?1 ORDER BY elapsed_seconds",
            )?;
            roast.curve_data = stmt.query_map(params![id], |row| {
                Ok(CurvePoint {
                    time: row.get(0)?,
                    bean_temp: row.get::<_, Option<f64>>(1)?.unwrap_or(0.0),
                    env_temp: row.get::<_, Option<f64>>(2)?.unwrap_or(0.0),
                    ror: row.get::<_, Option<f64>>(3)?.unwrap_or(0.0),
                    gas: row.get::<_, Option<f64>>(4)?.unwrap_or(0.0),
                    airflow: row.get::<_, Option<f64>>(5)?.unwrap_or(0.0),
                })
            })?.collect::<Result<Vec<_>>>()?;

            // Load events
            let mut stmt = conn.prepare(
                "SELECT id, event_type, elapsed_seconds, bean_temp
                 FROM roasting_events WHERE record_id=?1 ORDER BY elapsed_seconds",
            )?;
            roast.events = stmt.query_map(params![id], |row| {
                let event_str: String = row.get(1)?;
                let event: RoastEvent = serde_json::from_value(serde_json::Value::String(event_str))
                    .unwrap_or(RoastEvent::Charge);
                Ok(RoastEventRecord {
                    id: uuid::Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_else(|_| uuid::Uuid::new_v4()),
                    event,
                    time: row.get(2)?,
                    bean_temp: row.get::<_, Option<f64>>(3)?.unwrap_or(0.0),
                })
            })?.collect::<Result<Vec<_>>>()?;

            Ok(Some(roast))
        } else {
            Ok(None)
        }
    }

    // ── 生豆库存 ──

    pub fn fetch_beans(&self) -> Result<Vec<GreenBean>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, origin, process, variety, purchase_date, quantity_kg, price_per_kg, notes
             FROM green_beans ORDER BY name",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(GreenBean {
                id: uuid::Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_else(|_| uuid::Uuid::new_v4()),
                name: row.get(1)?,
                origin: row.get(2)?,
                process: row.get(3)?,
                variety: row.get(4)?,
                purchase_date: row.get(5)?,
                quantity_kg: row.get(6)?,
                price_per_kg: row.get(7)?,
                notes: row.get(8)?,
            })
        })?;
        rows.collect()
    }

    pub fn save_bean(&self, bean: &GreenBean) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO green_beans (id, name, origin, process, variety, purchase_date, quantity_kg, price_per_kg, notes)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            params![
                bean.id.to_string(),
                bean.name,
                bean.origin,
                bean.process,
                bean.variety,
                bean.purchase_date,
                bean.quantity_kg,
                bean.price_per_kg,
                bean.notes,
            ],
        )?;
        Ok(())
    }

    pub fn delete_bean(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM green_beans WHERE id=?1", params![id])?;
        Ok(())
    }
}

// dirs_next is not in dependencies, use a simpler approach
mod dirs_next {
    use std::path::PathBuf;

    pub fn data_dir() -> Option<PathBuf> {
        #[cfg(target_os = "macos")]
        {
            std::env::var("HOME")
                .ok()
                .map(|h| PathBuf::from(h).join("Library/Application Support"))
        }
        #[cfg(target_os = "windows")]
        {
            std::env::var("APPDATA").ok().map(PathBuf::from)
        }
        #[cfg(target_os = "linux")]
        {
            std::env::var("XDG_DATA_HOME")
                .ok()
                .map(PathBuf::from)
                .or_else(|| std::env::var("HOME").ok().map(|h| PathBuf::from(h).join(".local/share")))
        }
    }
}
