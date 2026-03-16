/** 烘焙度 */
export type RoastDegree = "浅烘" | "中浅" | "中烘" | "中深" | "深烘";

/** 烘焙事件 */
export type RoastEvent = "入豆" | "回温点" | "转黄" | "一爆" | "一爆结束" | "二爆" | "出豆";

/** 烘焙状态 */
export type RoastState = "待机" | "预热" | "烘焙中" | "冷却" | "完成";

/** 曲线数据点 */
export interface CurvePoint {
  time: number;
  bean_temp: number;
  env_temp: number;
  ror: number;
  gas: number;
  airflow: number;
}

/** 烘焙事件记录 */
export interface RoastEventRecord {
  id: string;
  event: RoastEvent;
  time: number;
  bean_temp: number;
}

/** SCA 杯测评分 */
export interface CuppingRecord {
  fragrance: number;
  flavor: number;
  aftertaste: number;
  acidity: number;
  body: number;
  uniformity: number;
  balance: number;
  clean_cup: number;
  sweetness: number;
  overall: number;
  defects: number;
}

/** 烘焙记录摘要 */
export interface RoastSummary {
  id: string;
  bean_name: string;
  date: string;
  batch_weight: number;
  charge_temp: number | null;
  drop_temp: number | null;
  total_time: number | null;
  roast_degree: RoastDegree | null;
  weight_loss: number | null;
  cupping_score: number | null;
  tags: string[];
}

/** 烘焙事件记录 */
export interface RoastEventRecord {
  id: string;
  event: RoastEvent;
  time: number;
  bean_temp: number;
}

/** 完整烘焙记录（含曲线） */
export interface Roast {
  id: string;
  bean_id: string;
  bean_name: string;
  date: string;
  batch_weight: number;
  charge_temp: number | null;
  drop_temp: number | null;
  total_time: number | null;
  development_time: number | null;
  curve_data: CurvePoint[];
  events: RoastEventRecord[];
  notes: string;
  state: string;
  profile_id: string | null;
  roast_degree: RoastDegree | null;
  end_weight: number | null;
  weight_loss: number | null;
  cupping_score: number | null;
  cupping_notes: string;
  cupping_record: CuppingRecord | null;
  tags: string[];
}

/** 生豆库存 */
export interface GreenBean {
  id: string;
  name: string;
  origin: string;
  process: string;
  variety: string;
  purchase_date: string | null;
  quantity_kg: number;
  price_per_kg: number | null;
  notes: string;
}

/** 串口信息 */
export interface PortInfo {
  name: string;
  port_type: string;
}

/** 所有烘焙度选项 */
export const ROAST_DEGREES: RoastDegree[] = ["浅烘", "中浅", "中烘", "中深", "深烘"];

/** 格式化时间 */
export function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  const prefix = seconds < 0 ? "-" : "";
  return `${prefix}${m}:${String(Math.floor(s)).padStart(2, "0")}`;
}

/** 格式化日期 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
