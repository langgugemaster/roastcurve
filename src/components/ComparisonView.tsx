import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { RoastSummary, Roast, formatTime, formatDate } from "../types/models";

const CURVE_COLORS = ["#C4704B", "#5B7FA5", "#4A7A5B", "#B8860B", "#A04040"];

export function ComparisonView() {
  const [roasts, setRoasts] = useState<RoastSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadedRoasts, setLoadedRoasts] = useState<Roast[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    invoke<RoastSummary[]>("get_roasts").then(setRoasts).catch(() => setRoasts([]));
  }, []);

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  }

  async function loadComparison() {
    if (selectedIds.length < 2) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        selectedIds.map(id => invoke<Roast | null>("get_roast", { id }))
      );
      setLoadedRoasts(results.filter((r): r is Roast => r != null));
    } catch {
      setLoadedRoasts([]);
    }
    setLoading(false);
  }

  // Merge curve data by time for overlay
  const mergedData: Record<number, Record<string, number>>[] = [];
  if (loadedRoasts.length > 0) {
    const timeSet = new Set<number>();
    loadedRoasts.forEach(r => r.curve_data.forEach(p => timeSet.add(Math.round(p.time))));
    const times = Array.from(timeSet).sort((a, b) => a - b);
    times.forEach(t => {
      const point: Record<string, number> = { time: t };
      loadedRoasts.forEach((r, i) => {
        const closest = r.curve_data.reduce((prev, curr) =>
          Math.abs(curr.time - t) < Math.abs(prev.time - t) ? curr : prev
        , r.curve_data[0]);
        if (closest && Math.abs(closest.time - t) <= 3) {
          point[`bt_${i}`] = closest.bean_temp;
        }
      });
      mergedData.push(point as any);
    });
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Left: Roast selector */}
      <div style={{ width: 320, borderRight: "0.5px solid var(--panel-border)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "var(--sm) var(--md)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="font-label text-secondary">选择烘焙记录（2-5条）</span>
          <span className="font-caption text-muted">{selectedIds.length}/5</span>
        </div>
        <div className="divider" />
        <div style={{ flex: 1, overflow: "auto" }}>
          {roasts.map(r => {
            const selected = selectedIds.includes(r.id);
            const idx = selectedIds.indexOf(r.id);
            return (
              <div
                key={r.id}
                onClick={() => toggleSelect(r.id)}
                style={{
                  padding: "var(--sm) var(--md)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--sm)",
                  background: selected ? "var(--copper-muted)" : "var(--surface)",
                  borderBottom: "0.5px solid var(--panel-border)",
                }}
              >
                <div style={{
                  width: 16, height: 16,
                  border: selected ? "none" : "1px solid var(--panel-border-strong)",
                  background: selected ? CURVE_COLORS[idx] || "var(--copper)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "white", fontWeight: 700,
                }}>
                  {selected ? idx + 1 : ""}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="font-label">{r.bean_name}</div>
                  <div className="font-caption text-muted">{formatDate(r.date)}</div>
                </div>
                {r.roast_degree && (
                  <span className="font-caption" style={{ color: "var(--text-secondary)" }}>{r.roast_degree}</span>
                )}
              </div>
            );
          })}
          {roasts.length === 0 && (
            <div style={{ padding: "var(--lg)", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
              暂无烘焙记录
            </div>
          )}
        </div>
        <div className="divider" />
        <div style={{ padding: "var(--sm) var(--md)" }}>
          <button
            className="btn-primary"
            style={{ width: "100%", padding: "var(--sm)", opacity: selectedIds.length < 2 ? 0.5 : 1 }}
            disabled={selectedIds.length < 2 || loading}
            onClick={loadComparison}
          >
            {loading ? "加载中..." : `对比 ${selectedIds.length} 条记录`}
          </button>
        </div>
      </div>

      {/* Right: Comparison result */}
      <div style={{ flex: 1, overflow: "auto", padding: "var(--lg)" }}>
        {loadedRoasts.length < 2 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: "var(--md)" }}>⇄</div>
              <div className="font-heading">选择记录后点击对比</div>
              <div className="font-label-sm text-muted" style={{ marginTop: "var(--xs)" }}>从左侧选择 2-5 条烘焙记录进行对比</div>
            </div>
          </div>
        ) : (
          <>
            {/* Curve overlay */}
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--panel-border)", padding: "var(--md)", marginBottom: "var(--lg)" }}>
              <div className="font-label" style={{ marginBottom: "var(--sm)" }}>温度曲线对比</div>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={mergedData as any[]}>
                  <XAxis
                    dataKey="time"
                    tickFormatter={(v: number) => formatTime(v)}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(v: number) => formatTime(v)}
                    formatter={(value: number, name: string) => {
                      const idx = parseInt(name.split("_")[1]);
                      return [`${value.toFixed(1)}℃`, loadedRoasts[idx]?.bean_name || name];
                    }}
                  />
                  <Legend formatter={(value: string) => {
                    const idx = parseInt(value.split("_")[1]);
                    return loadedRoasts[idx]?.bean_name || value;
                  }} />
                  {loadedRoasts.map((_, i) => (
                    <Line
                      key={i}
                      type="monotone"
                      dataKey={`bt_${i}`}
                      stroke={CURVE_COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stats table */}
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--panel-border)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "0.5px solid var(--panel-border)" }}>
                    <th style={thStyle}>指标</th>
                    {loadedRoasts.map((r, i) => (
                      <th key={r.id} style={{ ...thStyle, color: CURVE_COLORS[i] }}>{r.bean_name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <StatsRow label="烘焙度" values={loadedRoasts.map(r => r.roast_degree || "—")} />
                  <StatsRow label="批次重量" values={loadedRoasts.map(r => `${Math.round(r.batch_weight)}g`)} />
                  <StatsRow label="入豆温" values={loadedRoasts.map(r => r.charge_temp ? `${Math.round(r.charge_temp)}℃` : "—")} />
                  <StatsRow label="出豆温" values={loadedRoasts.map(r => r.drop_temp ? `${Math.round(r.drop_temp)}℃` : "—")} />
                  <StatsRow label="总时长" values={loadedRoasts.map(r => r.total_time ? formatTime(r.total_time) : "—")} />
                  <StatsRow label="发展时间" values={loadedRoasts.map(r => r.development_time ? formatTime(r.development_time) : "—")} />
                  <StatsRow label="失重率" values={loadedRoasts.map(r => r.weight_loss != null ? `${r.weight_loss.toFixed(1)}%` : "—")} />
                  <StatsRow label="杯测" values={loadedRoasts.map(r => r.cupping_score != null ? `${r.cupping_score.toFixed(1)}` : "—")} />
                  <StatsRow label="曲线点数" values={loadedRoasts.map(r => String(r.curve_data.length))} />
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "var(--sm) var(--md)",
  textAlign: "left",
  fontWeight: 500,
  fontSize: 12,
};

function StatsRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr style={{ borderBottom: "0.5px solid var(--panel-border)" }}>
      <td style={{ padding: "var(--sm) var(--md)", fontSize: 12, color: "var(--text-secondary)" }}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className="font-mono-xs" style={{ padding: "var(--sm) var(--md)" }}>{v}</td>
      ))}
    </tr>
  );
}
