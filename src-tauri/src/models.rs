use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 烘焙度
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RoastDegree {
    #[serde(rename = "浅烘")]
    Light,
    #[serde(rename = "中浅")]
    MediumLight,
    #[serde(rename = "中烘")]
    Medium,
    #[serde(rename = "中深")]
    MediumDark,
    #[serde(rename = "深烘")]
    Dark,
}

/// 烘焙事件类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RoastEvent {
    #[serde(rename = "入豆")]
    Charge,
    #[serde(rename = "回温点")]
    TurningPoint,
    #[serde(rename = "转黄")]
    Yellowing,
    #[serde(rename = "一爆")]
    FirstCrack,
    #[serde(rename = "一爆结束")]
    FirstCrackEnd,
    #[serde(rename = "二爆")]
    SecondCrack,
    #[serde(rename = "出豆")]
    Drop,
}

/// 烘焙状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RoastState {
    #[serde(rename = "待机")]
    Idle,
    #[serde(rename = "预热")]
    Preheating,
    #[serde(rename = "烘焙中")]
    Roasting,
    #[serde(rename = "冷却")]
    Cooling,
    #[serde(rename = "完成")]
    Completed,
}

/// 曲线数据点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurvePoint {
    pub time: f64,
    pub bean_temp: f64,
    pub env_temp: f64,
    pub ror: f64,
    pub gas: f64,
    pub airflow: f64,
}

/// 烘焙事件记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoastEventRecord {
    pub id: Uuid,
    pub event: RoastEvent,
    pub time: f64,
    pub bean_temp: f64,
}

/// SCA 杯测评分
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CuppingRecord {
    pub fragrance: f64,
    pub flavor: f64,
    pub aftertaste: f64,
    pub acidity: f64,
    pub body: f64,
    pub uniformity: f64,
    pub balance: f64,
    pub clean_cup: f64,
    pub sweetness: f64,
    pub overall: f64,
    pub defects: i32,
}

impl CuppingRecord {
    pub fn total_score(&self) -> f64 {
        let sum = self.fragrance + self.flavor + self.aftertaste + self.acidity
            + self.body + self.uniformity + self.balance + self.clean_cup
            + self.sweetness + self.overall;
        (sum - self.defects as f64).max(0.0)
    }
}

/// 传感器读数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SensorReading {
    pub bean_temp: f64,
    pub env_temp: f64,
    pub timestamp: DateTime<Utc>,
}

/// 一次烘焙记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Roast {
    pub id: Uuid,
    pub bean_id: Uuid,
    pub bean_name: String,
    pub date: DateTime<Utc>,
    pub batch_weight: f64,
    pub charge_temp: Option<f64>,
    pub drop_temp: Option<f64>,
    pub total_time: Option<f64>,
    pub development_time: Option<f64>,
    pub curve_data: Vec<CurvePoint>,
    pub events: Vec<RoastEventRecord>,
    pub notes: String,
    pub state: RoastState,
    pub profile_id: Option<Uuid>,
    pub roast_degree: Option<RoastDegree>,
    pub end_weight: Option<f64>,
    pub weight_loss: Option<f64>,
    pub cupping_score: Option<f64>,
    pub cupping_notes: String,
    pub cupping_record: Option<CuppingRecord>,
    pub tags: Vec<String>,
}

/// 烘焙记录摘要（列表用，不含曲线数据）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoastSummary {
    pub id: Uuid,
    pub bean_name: String,
    pub date: DateTime<Utc>,
    pub batch_weight: f64,
    pub charge_temp: Option<f64>,
    pub drop_temp: Option<f64>,
    pub total_time: Option<f64>,
    pub roast_degree: Option<RoastDegree>,
    pub weight_loss: Option<f64>,
    pub cupping_score: Option<f64>,
    pub tags: Vec<String>,
}
