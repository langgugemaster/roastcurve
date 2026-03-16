import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Roast, formatTime, formatDate } from "../types/models";

interface Props {
  roastId: string;
  onBack: () => void;
}

export function RoastDetailView({ roastId, onBack }: Props) {
  const [roast, setRoast] = useState<Roast | null>(null);
  const [showRor, setShowRor] = useState(true);
  const [showEnv, setShowEnv] = useState(true);

  useEffect(() => {
    invoke<Roast | null>("get_roast", { id: roastId })
      .then(setRoast)
      .catch(() => setRoast(null));
  }, [roastId]);

  if (!roast) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <span className="text-muted">加载中...</span>
      </div>
    );
  }

  const events = roast.events || [];
  const hasChart = roast.curve_data.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--md)",
        padding: "var(--sm) var(--md)", borderBottom: "0.5px solid var(--panel-border)",
      }}>
        <button className="btn-ghost" onClick={onBack}>← 返回</button>
        <span className="font-title">{roast.bean_name}</span>
        {roast.roast_degree && (
          <span style={{ fontSize: 12, color: "white", padding: "2px 8px", background: "var(--primary-hover)" }}>
            {roast.roast_degree}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span className="font-label-sm text-muted">{formatDate(roast.date)}</span>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "var(--lg)" }}>
        {/* Curve Chart */}
        {hasChart && (
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--panel-border)", padding: "var(--md)", marginBottom: "var(--lg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--md)", marginBottom: "var(--sm)" }}>
              <span className="font-label">烘焙曲线</span>
              <div style={{ flex: 1 }} />
              <label style={{ display: "flex", alignItems: "center", gap: "var(--xs)", fontSize: 11, color: "var(--curve-env)", cursor: "pointer" }}>
                <input type="checkbox" checked={showEnv} onChange={e => setShowEnv(e.target.checked)} /> 环境温
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "var(--xs)", fontSize: 11, color: "var(--curve-ror)", cursor: "pointer" }}>
                <input type="checkbox" checked={showRor} onChange={e => setShowRor(e.target.checked)} /> RoR
              </label>
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={roast.curve_data}>
                <XAxis dataKey="time" tickFormatter={(v: number) => formatTime(v)} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="temp" domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
                {showRor && <YAxis yAxisId="ror" orientation="right" domain={["auto", "auto"]} tick={{ fontSize: 10 }} />}
                <Tooltip labelFormatter={(v: number) => formatTime(v)} />
                <Line yAxisId="temp" type="monotone" dataKey="bean_temp" stroke="var(--curve-bean)" strokeWidth={2} dot={false} name="豆温" />
                {showEnv && <Line yAxisId="temp" type="monotone" dataKey="env_temp" stroke="var(--curve-env)" strokeWidth={1.5} dot={false} name="环境温" />}
                {showRor && <Line yAxisId="ror" type="monotone" dataKey="ror" stroke="var(--curve-ror)" strokeWidth={1.5} dot={false} name="RoR" />}
                {events.map(evt => (
                  <ReferenceLine key={evt.id} yAxisId="temp" x={evt.time} stroke="var(--text-muted)" strokeDasharray="3 3"
                    label={{ value: evt.event, position: "top", fontSize: 10, fill: "var(--text-secondary)" }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--lg)" }}>
          {/* Info Panel */}
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--panel-border)", padding: "var(--md)" }}>
            <div className="font-label" style={{ marginBottom: "var(--sm)" }}>烘焙参数</div>
            <InfoGrid>
              <InfoItem label="批次重量" value={`${Math.round(roast.batch_weight)}g`} />
              <InfoItem label="入豆温" value={roast.charge_temp ? `${Math.round(roast.charge_temp)}℃` : "—"} />
              <InfoItem label="出豆温" value={roast.drop_temp ? `${Math.round(roast.drop_temp)}℃` : "—"} />
              <InfoItem label="总时长" value={roast.total_time ? formatTime(roast.total_time) : "—"} />
              <InfoItem label="发展时间" value={roast.development_time ? formatTime(roast.development_time) : "—"} />
              <InfoItem label="失重率" value={roast.weight_loss != null ? `${roast.weight_loss.toFixed(1)}%` : "—"} />
              <InfoItem label="出豆重" value={roast.end_weight != null ? `${Math.round(roast.end_weight)}g` : "—"} />
              <InfoItem label="曲线点" value={String(roast.curve_data.length)} />
            </InfoGrid>
          </div>

          {/* Events & Cupping */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--lg)" }}>
            {/* Events */}
            {events.length > 0 && (
              <div style={{ background: "var(--surface)", border: "0.5px solid var(--panel-border)", padding: "var(--md)" }}>
                <div className="font-label" style={{ marginBottom: "var(--sm)" }}>事件记录</div>
                {events.map(evt => (
                  <div key={evt.id} style={{ display: "flex", justifyContent: "space-between", padding: "var(--xs) 0", borderBottom: "0.5px solid var(--panel-border)" }}>
                    <span className="font-label-sm">{evt.event}</span>
                    <div style={{ display: "flex", gap: "var(--md)" }}>
                      <span className="font-mono-xs text-secondary">{formatTime(evt.time)}</span>
                      <span className="font-mono-xs" style={{ color: "var(--curve-bean)" }}>{Math.round(evt.bean_temp)}℃</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cupping */}
            {roast.cupping_record && (
              <div style={{ background: "var(--surface)", border: "0.5px solid var(--panel-border)", padding: "var(--md)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sm)" }}>
                  <span className="font-label">SCA 杯测</span>
                  <span className="font-mono-sm" style={{ color: "var(--warning)" }}>
                    {(roast.cupping_record.fragrance + roast.cupping_record.flavor +
                      roast.cupping_record.aftertaste + roast.cupping_record.acidity +
                      roast.cupping_record.body + roast.cupping_record.uniformity +
                      roast.cupping_record.balance + roast.cupping_record.clean_cup +
                      roast.cupping_record.sweetness + roast.cupping_record.overall -
                      roast.cupping_record.defects).toFixed(1)} 分
                  </span>
                </div>
                <CuppingGrid record={roast.cupping_record} />
              </div>
            )}

            {/* Tags */}
            {roast.tags.length > 0 && (
              <div style={{ background: "var(--surface)", border: "0.5px solid var(--panel-border)", padding: "var(--md)" }}>
                <div className="font-label" style={{ marginBottom: "var(--sm)" }}>标签</div>
                <div style={{ display: "flex", gap: "var(--xs)", flexWrap: "wrap" }}>
                  {roast.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {roast.notes && (
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--panel-border)", padding: "var(--md)", marginTop: "var(--lg)" }}>
            <div className="font-label" style={{ marginBottom: "var(--sm)" }}>备注</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{roast.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sm)" }}>{children}</div>;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-caption text-muted">{label}</div>
      <div className="font-mono-sm">{value}</div>
    </div>
  );
}

const CUPPING_ATTRS = [
  { key: "fragrance", name: "干香/湿香" },
  { key: "flavor", name: "风味" },
  { key: "aftertaste", name: "余韵" },
  { key: "acidity", name: "酸质" },
  { key: "body", name: "醇厚度" },
  { key: "uniformity", name: "一致性" },
  { key: "balance", name: "平衡感" },
  { key: "clean_cup", name: "干净度" },
  { key: "sweetness", name: "甜度" },
  { key: "overall", name: "总评" },
] as const;

function CuppingGrid({ record }: { record: NonNullable<Roast["cupping_record"]> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--xs)" }}>
      {CUPPING_ATTRS.map(a => (
        <div key={a.key} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
          <span className="font-caption text-secondary">{a.name}</span>
          <span className="font-mono-xs">{record[a.key].toFixed(1)}</span>
        </div>
      ))}
      {record.defects > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
          <span className="font-caption" style={{ color: "var(--danger)" }}>缺陷扣分</span>
          <span className="font-mono-xs" style={{ color: "var(--danger)" }}>-{record.defects}</span>
        </div>
      )}
    </div>
  );
}
