use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
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
    /// Simulated roast phase tracking
    sim_phase: SimPhase,
}

#[derive(Debug, Clone)]
enum SimPhase {
    Charge,     // 入豆后温度骤降
    Drying,     // 回温、干燥期
    Maillard,   // 梅纳德反应
    Development,// 发展期
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
    pub fn start(&self, app: AppHandle, charge_temp: f64) {
        let inner = self.inner.clone();

        {
            let mut s = inner.lock().unwrap();
            s.running = true;
            s.start_time = Some(Instant::now());
            s.last_bt = charge_temp;
            s.last_et = charge_temp + 30.0;
            s.curve_data.clear();
            s.events.clear();
            s.sim_phase = SimPhase::Charge;
        }

        // Spawn simulation loop
        std::thread::spawn(move || {
            let mut tick = 0u64;
            loop {
                std::thread::sleep(Duration::from_secs(1));

                let mut s = inner.lock().unwrap();
                if !s.running {
                    break;
                }

                tick += 1;
                let elapsed = tick as f64;

                // Simulate temperature changes
                let (bt, et) = simulate_temps(&s.sim_phase, elapsed, s.last_bt, s.last_et, charge_temp);

                // Calculate RoR (rate of rise per minute)
                let ror = (bt - s.last_bt) * 60.0; // per second → per minute

                s.last_bt = bt;
                s.last_et = et;

                // Update sim phase based on bean temp
                if bt < charge_temp * 0.75 {
                    s.sim_phase = SimPhase::Charge;
                } else if bt < 150.0 {
                    s.sim_phase = SimPhase::Drying;
                } else if bt < 195.0 {
                    s.sim_phase = SimPhase::Maillard;
                } else {
                    s.sim_phase = SimPhase::Development;
                }

                let point = CurvePoint {
                    time: elapsed,
                    bean_temp: bt,
                    env_temp: et,
                    ror,
                    gas: 0.0,
                    airflow: 0.0,
                };
                s.curve_data.push(point.clone());

                let reading = SessionReading {
                    elapsed,
                    bean_temp: bt,
                    env_temp: et,
                    ror,
                };

                drop(s); // release lock before emit
                let _ = app.emit("sensor-reading", &reading);
            }
        });
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
    // Add slight randomness
    let noise = ((elapsed * 7.3).sin() * 0.3) + ((elapsed * 13.1).cos() * 0.2);

    let bt = match phase {
        SimPhase::Charge => {
            // Temperature drops after charging beans, then recovers
            if elapsed < 30.0 {
                // Drop phase: charge_temp → about 60% of charge temp
                let drop_target = charge_temp * 0.55;
                let progress = elapsed / 30.0;
                let drop = (charge_temp - drop_target) * progress;
                (charge_temp - drop + noise).max(80.0)
            } else {
                // Recovery: climbing back up
                last_bt + 0.25 + noise * 0.5
            }
        }
        SimPhase::Drying => {
            // Steady climb ~1.2°C/s slowing down
            let rate = 0.18 - (last_bt - 100.0) * 0.0005;
            last_bt + rate.max(0.08) + noise * 0.3
        }
        SimPhase::Maillard => {
            // Slower rise ~0.8°C/s
            let rate = 0.13 - (last_bt - 150.0) * 0.0008;
            last_bt + rate.max(0.06) + noise * 0.2
        }
        SimPhase::Development => {
            // Even slower, approaching plateau
            let rate = 0.08 - (last_bt - 195.0) * 0.001;
            last_bt + rate.max(0.02) + noise * 0.15
        }
    };

    // Environment temp stays higher and more stable
    let et_target = bt + 25.0 + ((elapsed * 0.01).sin() * 5.0);
    let et = last_et + (et_target - last_et) * 0.05 + noise * 0.2;

    (bt, et)
}
