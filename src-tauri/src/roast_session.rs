use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use std::io::BufRead;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::models::*;

/// 烘焙会话状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionReading {
    pub elapsed: f64,
    pub bean_temp: f64,
    pub env_temp: f64,
    pub ror: f64,
}

/// 烘焙会话内部状态
struct SessionInner {
    running: bool,
    start_time: Option<Instant>,
    last_bt: f64,
    last_et: f64,
    curve_data: Vec<CurvePoint>,
    events: Vec<RoastEventRecord>,
    sim_phase: SimPhase,
}

#[derive(Debug, Clone)]
enum SimPhase {
    Charge,
    Drying,
    Maillard,
    Development,
}

pub struct RoastSession {
    inner: Arc<Mutex<SessionInner>>,
}

impl RoastSession {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(SessionInner {
                running: false,
                start_time: None,
                last_bt: 0.0,
                last_et: 0.0,
                curve_data: Vec::new(),
                events: Vec::new(),
                sim_phase: SimPhase::Charge,
            })),
        }
    }

    pub fn is_running(&self) -> bool {
        self.inner.lock().unwrap().running
    }

    /// 开始烘焙（模拟模式）
    pub fn start_simulated(&self, app: AppHandle, charge_temp: f64) {
        self.init_session(charge_temp);
        let inner = self.inner.clone();

        std::thread::spawn(move || {
            let mut tick = 0u64;
            loop {
                std::thread::sleep(Duration::from_secs(1));

                let mut s = inner.lock().unwrap();
                if !s.running { break; }

                tick += 1;
                let elapsed = tick as f64;

                let (bt, et) = simulate_temps(&s.sim_phase, elapsed, s.last_bt, s.last_et, charge_temp);
                let ror = (bt - s.last_bt) * 60.0;

                s.last_bt = bt;
                s.last_et = et;

                if bt < charge_temp * 0.75 {
                    s.sim_phase = SimPhase::Charge;
                } else if bt < 150.0 {
                    s.sim_phase = SimPhase::Drying;
                } else if bt < 195.0 {
                    s.sim_phase = SimPhase::Maillard;
                } else {
                    s.sim_phase = SimPhase::Development;
                }

                let point = CurvePoint { time: elapsed, bean_temp: bt, env_temp: et, ror, gas: 0.0, airflow: 0.0 };
                s.curve_data.push(point);

                let reading = SessionReading { elapsed, bean_temp: bt, env_temp: et, ror };
                drop(s);
                let _ = app.emit("sensor-reading", &reading);
            }
        });
    }

    /// 开始烘焙（串口模式）
    /// 期望串口数据格式: "BT,ET\n" 例如 "185.3,210.5\n"
    pub fn start_serial(&self, app: AppHandle, port_name: String, baud_rate: u32) {
        self.init_session(0.0);
        let inner = self.inner.clone();

        std::thread::spawn(move || {
            let port = serialport::new(&port_name, baud_rate)
                .timeout(Duration::from_millis(2000))
                .open();

            let port = match port {
                Ok(p) => p,
                Err(e) => {
                    let _ = app.emit("sensor-error", &format!("串口打开失败: {}", e));
                    inner.lock().unwrap().running = false;
                    return;
                }
            };

            let reader = std::io::BufReader::new(port);
            let start = Instant::now();

            for line in reader.lines() {
                {
                    let s = inner.lock().unwrap();
                    if !s.running { break; }
                }

                let line = match line {
                    Ok(l) => l,
                    Err(_) => continue,
                };

                // Parse "BT,ET" format
                let parts: Vec<&str> = line.trim().split(',').collect();
                if parts.len() < 2 { continue; }

                let bt: f64 = match parts[0].parse() { Ok(v) => v, Err(_) => continue };
                let et: f64 = match parts[1].parse() { Ok(v) => v, Err(_) => continue };

                let mut s = inner.lock().unwrap();
                let elapsed = start.elapsed().as_secs_f64();
                let ror = if s.last_bt > 0.0 { (bt - s.last_bt) * 60.0 } else { 0.0 };

                s.last_bt = bt;
                s.last_et = et;

                let point = CurvePoint { time: elapsed, bean_temp: bt, env_temp: et, ror, gas: 0.0, airflow: 0.0 };
                s.curve_data.push(point);

                let reading = SessionReading { elapsed, bean_temp: bt, env_temp: et, ror };
                drop(s);
                let _ = app.emit("sensor-reading", &reading);
            }

            // If loop exits (port disconnected), mark not running
            inner.lock().unwrap().running = false;
            let _ = app.emit("sensor-error", &"串口连接断开".to_string());
        });
    }

    fn init_session(&self, charge_temp: f64) {
        let mut s = self.inner.lock().unwrap();
        s.running = true;
        s.start_time = Some(Instant::now());
        s.last_bt = charge_temp;
        s.last_et = charge_temp + 30.0;
        s.curve_data.clear();
        s.events.clear();
        s.sim_phase = SimPhase::Charge;
    }

    pub fn stop(&self) {
        self.inner.lock().unwrap().running = false;
    }

    pub fn mark_event(&self, event: RoastEvent) {
        let mut s = self.inner.lock().unwrap();
        let elapsed = s.start_time.map(|t| t.elapsed().as_secs_f64()).unwrap_or(0.0);
        let bt = s.last_bt;
        s.events.push(RoastEventRecord {
            id: uuid::Uuid::new_v4(),
            event,
            time: elapsed,
            bean_temp: bt,
        });
    }

    pub fn get_curve_data(&self) -> Vec<CurvePoint> {
        self.inner.lock().unwrap().curve_data.clone()
    }

    pub fn get_events(&self) -> Vec<RoastEventRecord> {
        self.inner.lock().unwrap().events.clone()
    }

    pub fn get_current(&self) -> (f64, f64, f64) {
        let s = self.inner.lock().unwrap();
        let elapsed = s.start_time.map(|t| t.elapsed().as_secs_f64()).unwrap_or(0.0);
        (elapsed, s.last_bt, s.last_et)
    }
}

/// 模拟烘焙温度变化
fn simulate_temps(phase: &SimPhase, elapsed: f64, last_bt: f64, last_et: f64, charge_temp: f64) -> (f64, f64) {
    let noise = ((elapsed * 7.3).sin() * 0.3) + ((elapsed * 13.1).cos() * 0.2);

    let bt = match phase {
        SimPhase::Charge => {
            if elapsed < 30.0 {
                let drop_target = charge_temp * 0.55;
                let progress = elapsed / 30.0;
                let drop = (charge_temp - drop_target) * progress;
                (charge_temp - drop + noise).max(80.0)
            } else {
                last_bt + 0.25 + noise * 0.5
            }
        }
        SimPhase::Drying => {
            let rate = 0.18 - (last_bt - 100.0) * 0.0005;
            last_bt + rate.max(0.08) + noise * 0.3
        }
        SimPhase::Maillard => {
            let rate = 0.13 - (last_bt - 150.0) * 0.0008;
            last_bt + rate.max(0.06) + noise * 0.2
        }
        SimPhase::Development => {
            let rate = 0.08 - (last_bt - 195.0) * 0.001;
            last_bt + rate.max(0.02) + noise * 0.15
        }
    };

    let et_target = bt + 25.0 + ((elapsed * 0.01).sin() * 5.0);
    let et = last_et + (et_target - last_et) * 0.05 + noise * 0.2;

    (bt, et)
}
