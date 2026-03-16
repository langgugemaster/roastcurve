import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { RoastSummary, ROAST_DEGREES } from "../types/models";

const DEGREE_COLORS: Record<string, string> = {
  "浅烘": "#D4906B",
  "中浅": "#C4704B",
  "中烘": "#A85A3A",
  "中深": "#7A3F28",
  "深烘": "#4A2518",
};

export function StatsView() {
  const [roasts, setRoasts] = useState<RoastSummary[]>([]);

  useEffect(() => {
    invoke<RoastSummary[]>("get_roasts").then(setRoasts).catch(() => setRoasts([]));
  }, []);

  if (roasts.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: "var(--md)" }}>📊</div>
          <div className="font-heading">暂无数据</div>
          <div className="font-label-sm text-muted" style={{ marginTop: "var(--xs)" }}>完成烘焙后这里会显示统计信息</div>
        </div>
      </div>
    );
  }

  // KPI calculations
  const totalRoasts = roasts.length;
  const totalWeight = roasts.reduce((s, r) => s + r.batch_weight, 0);
  const avgTime = roasts.filter(r => r.total_time).reduce((s, r, _, a) => s + (r.total_time || 0) / a.length, 0);
  const avgWeightLoss = roasts.filter(r => r.weight_loss != null);
  const avgWL = avgWeightLoss.length > 0 ? avgWeightLoss.reduce((s, r) => s + (r.weight_loss || 0), 0) / avgWeightLoss.length : 0;
  const cuppedRoasts = roasts.filter(r => r.cupping_score != null);
  const avgCupping = cuppedRoasts.length > 0 ? cuppedRoasts.reduce((s, r) => s + (r.cupping_score || 0), 0) / cuppedRoasts.length : 0;

  // Degree distribution
  const degreeDist = ROAST_DEGREES.map(d => ({
    name: d,
    count: roasts.filter(r => r.roast_degree === d).length,
  })).filter(d => d.count > 0);

  // Bean frequency (top 8)
  const beanMap = new Map<string, number>();
  roasts.forEach(r => beanMap.set(r.bean_name, (beanMap.get(r.bean_name) || 0) + 1));
  const beanFreq = Array.from(beanMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Monthly trend (last 12 months)
  const monthMap = new Map<string, number>();
  roasts.forEach(r => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  });
  const monthTrend = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, count]) => ({ month: month.slice(5), count }));

  return (
    <div style={{ overflow: "auto", height: "100%", padding: "var(--lg)" }}>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "var(--md)", marginBottom: "var(--lg)" }}>
        <KpiCard label="总烘焙次数" value={String(totalRoasts)} unit="次" />
        <KpiCard label="总用豆量" value={totalWeight >= 1000 ? (totalWeight / 1000).toFixed(1) : String(Math.round(totalWeight))} unit={totalWeight >= 1000 ? "kg" : "g"} />
        <KpiCard label="平均时长" value={Math.floor(avgTime / 60) + ":" + String(Math.floor(avgTime % 60)).padStart(2, "0")} />
        <KpiCard label="平均失重" value={avgWL > 0 ? avgWL.toFixed(1) : "—"} unit={avgWL > 0 ? "%" : ""} />
        <KpiCard label="平均杯测" value={avgCupping > 0 ? avgCupping.toFixed(1) : "—"} unit={avgCupping > 0 ? "分" : ""} />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--lg)" }}>
        {/* Degree Distribution */}
        <ChartCard title="烘焙度分布">
          {degreeDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={degreeDist} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {degreeDist.map(d => (
                    <Cell key={d.name} fill={DEGREE_COLORS[d.name] || "var(--text-muted)"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Bean Frequency */}
        <ChartCard title="常用豆种">
          {beanFreq.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={beanFreq} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--copper)" name="次数" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Monthly Trend */}
        <ChartCard title="月度趋势">
          {monthTrend.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--copper)" strokeWidth={2} dot={{ r: 3 }} name="烘焙次数" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Weight Loss Distribution */}
        <ChartCard title="失重率分布">
          {avgWeightLoss.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weightLossBuckets(roasts)}>
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--curve-env)" name="次数" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function weightLossBuckets(roasts: RoastSummary[]) {
  const buckets = [
    { range: "<10%", min: 0, max: 10, count: 0 },
    { range: "10-12%", min: 10, max: 12, count: 0 },
    { range: "12-14%", min: 12, max: 14, count: 0 },
    { range: "14-16%", min: 14, max: 16, count: 0 },
    { range: "16-18%", min: 16, max: 18, count: 0 },
    { range: ">18%", min: 18, max: 100, count: 0 },
  ];
  roasts.forEach(r => {
    if (r.weight_loss == null) return;
    const b = buckets.find(b => r.weight_loss! >= b.min && r.weight_loss! < b.max);
    if (b) b.count++;
  });
  return buckets.filter(b => b.count > 0);
}

function KpiCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{ padding: "var(--md)", background: "var(--surface)", border: "0.5px solid var(--panel-border)" }}>
      <div className="font-label-sm text-muted">{label}</div>
      <div style={{ marginTop: "var(--xs)", display: "flex", alignItems: "baseline", gap: "var(--xs)" }}>
        <span className="font-mono-lg">{value}</span>
        {unit && <span className="font-label-sm text-muted">{unit}</span>}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "var(--md)", background: "var(--surface)", border: "0.5px solid var(--panel-border)" }}>
      <div className="font-label" style={{ marginBottom: "var(--sm)" }}>{title}</div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
      数据不足
    </div>
  );
}
