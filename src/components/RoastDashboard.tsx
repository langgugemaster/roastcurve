import { useEffect, useRef, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { CurvePoint, RoastEvent, RoastDegree, ROAST_DEGREES, formatTime } from "../types/models";

interface SessionReading {
  elapsed: number;
  bean_temp: number;
  env_temp: number;
  ror: number;
}

interface MarkedEvent {
  event: RoastEvent;
  time: number;
  bean_temp: number;
}

const EVENT_BUTTONS: { event: RoastEvent; label: string; key: string }[] = [
  { event: "入豆", label: "入豆", key: "1" },
  { event: "回温点", label: "回温点", key: "2" },
  { event: "转黄", label: "转黄", key: "3" },
  { event: "一爆", label: "一爆", key: "4" },
  { event: "一爆结束", label: "一爆结束", key: "5" },
  { event: "二爆", label: "二爆", key: "6" },
  { event: "出豆", label: "出豆", key: "7" },
];

export function RoastDashboard() {
  const [running, setRunning] = useState(false);
  const [curveData, setCurveData] = useState<CurvePoint[]>([]);
  const [events, setEvents] = useState<MarkedEvent[]>([]);
  const [currentBt, setCurrentBt] = useState(0);
  const [currentEt, setCurrentEt] = useState(0);
  const [currentRor, setCurrentRor] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showRor, setShowRor] = useState(true);
  const [showEnv, setShowEnv] = useState(true);

  // Pre-roast settings
  const [beanName, setBeanName] = useState("");
  const [batchWeight, setBatchWeight] = useState(200);
  const [chargeTemp, setChargeTemp] = useState(200);

  // Post-roast save dialog
  const [showSave, setShowSave] = useState(false);
  const [endWeight, setEndWeight] = useState("");
  const [degree, setDegree] = useState<RoastDegree | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const unlistenRef = useRef<UnlistenFn | null>(null);

  // Listen to sensor readings
  useEffect(() => {
    let mounted = true;
    listen<SessionReading>("sensor-reading", (e) => {
      if (!mounted) return;
      const r = e.payload;
      setCurrentBt(r.bean_temp);
      setCurrentEt(r.env_temp);
      setCurrentRor(r.ror);
      setElapsed(r.elapsed);
      setCurveData(prev => [...prev, {
        time: r.elapsed,
        bean_temp: r.bean_temp,
        env_temp: r.env_temp,
        ror: r.ror,
        gas: 0,
        airflow: 0,
      }]);
    }).then(unlisten => {
      unlistenRef.current = unlisten;
    });

    return () => {
      mounted = false;
      unlistenRef.current?.();
    };
  }, []);

  const handleStart = useCallback(async () => {
    if (!beanName.trim()) return;
    setCurveData([]);
    setEvents([]);
    setElapsed(0);
    setShowSave(false);
    setSaved(false);
    try {
      await invoke("start_roast", { chargeTemp });
      setRunning(true);
    } catch (e) {
      console.error("Start failed:", e);
    }
  }, [beanName, chargeTemp]);

  const handleStop = useCallback(async () => {
    try {
      await invoke("stop_roast");
      setRunning(false);
      setShowSave(true);
    } catch (e) {
      console.error("Stop failed:", e);
    }
  }, []);

  const handleMarkEvent = useCallback(async (event: RoastEvent) => {
    try {
      await invoke("mark_roast_event", { event });
      setEvents(prev => [...prev, { event, time: elapsed, bean_temp: currentBt }]);
    } catch (e) {
      console.error("Mark event failed:", e);
    }
  }, [elapsed, currentBt]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await invoke("finish_roast", {
        beanName: beanName.trim(),
        batchWeight,
        roastDegree: degree || null,
        endWeight: endWeight ? parseFloat(endWeight) : null,
        notes,
      });
      setSaved(true);
      setShowSave(false);
    } catch (e) {
      console.error("Save failed:", e);
    }
    setSaving(false);
  }, [beanName, batchWeight, degree, endWeight, notes]);

  // Keyboard shortcuts for events
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!running) return;
      const btn = EVENT_BUTTONS.find(b => b.key === e.key);
      if (btn) handleMarkEvent(btn.event);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, handleMarkEvent]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar: status + controls */}
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--md)",
        padding: "var(--sm) var(--md)", borderBottom: "0.5px solid var(--panel-border)",
      }}>
        {!running && !showSave && !saved && (
          <>
            <input className="input-field" placeholder="豆名 *" value={beanName}
              onChange={e => setBeanName(e.target.value)} style={{ width: 180 }} />
            <div style={{ display: "flex", alignItems: "center", gap: "var(--xs)" }}>
              <span className="font-caption text-muted">批重</span>
              <input className="input-field" type="number" value={batchWeight}
                onChange={e => setBatchWeight(Number(e.target.value))} style={{ width: 70 }} />
              <span className="font-caption text-muted">g</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--xs)" }}>
              <span className="font-caption text-muted">入豆温</span>
              <input className="input-field" type="number" value={chargeTemp}
                onChange={e => setChargeTemp(Number(e.target.value))} style={{ width: 60 }} />
              <span className="font-caption text-muted">℃</span>
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn-primary" onClick={handleStart}
              style={{ padding: "var(--sm) var(--lg)", opacity: beanName.trim() ? 1 : 0.5 }}
              disabled={!beanName.trim()}>
              开始烘焙
            </button>
          </>
        )}

        {running && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--xs)" }}>
              <span style={{ width: 8, height: 8, background: "var(--danger)", display: "inline-block", animation: "blink 1s infinite" }} />
              <span className="font-label" style={{ color: "var(--danger)" }}>烘焙中</span>
            </div>
            <span className="font-mono-lg">{formatTime(elapsed)}</span>
            <span className="font-heading">{beanName}</span>
            <div style={{ flex: 1 }} />
            <button className="btn-primary" onClick={handleStop}
              style={{ padding: "var(--sm) var(--lg)", background: "var(--danger)" }}>
              结束烘焙
            </button>
          </>
        )}

        {!running && (showSave || saved) && (
          <>
            <span className="font-heading">{beanName}</span>
            <span className="font-mono-sm text-secondary">{formatTime(elapsed)}</span>
            <div style={{ flex: 1 }} />
            {saved && <span className="font-label" style={{ color: "var(--success)" }}>已保存</span>}
          </>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Main chart area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "var(--md)" }}>
          {/* Temperature display */}
          {(running || curveData.length > 0) && (
            <div style={{ display: "flex", gap: "var(--lg)", marginBottom: "var(--md)" }}>
              <TempCard label="豆温 BT" value={currentBt} color="var(--curve-bean)" />
              <TempCard label="环温 ET" value={currentEt} color="var(--curve-env)" />
              <TempCard label="RoR" value={currentRor} color="var(--curve-ror)" unit="℃/min" />
            </div>
          )}

          {/* Chart */}
          <div style={{ flex: 1, background: "var(--surface)", border: "0.5px solid var(--panel-border)", padding: "var(--sm)" }}>
            {curveData.length > 0 ? (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--md)", marginBottom: "var(--xs)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--xs)", fontSize: 11, color: "var(--curve-env)", cursor: "pointer" }}>
                    <input type="checkbox" checked={showEnv} onChange={e => setShowEnv(e.target.checked)} /> ET
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--xs)", fontSize: 11, color: "var(--curve-ror)", cursor: "pointer" }}>
                    <input type="checkbox" checked={showRor} onChange={e => setShowRor(e.target.checked)} /> RoR
                  </label>
                </div>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={curveData}>
                    <XAxis dataKey="time" tickFormatter={(v: number) => formatTime(v)} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="temp" domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
                    {showRor && <YAxis yAxisId="ror" orientation="right" domain={["auto", "auto"]} tick={{ fontSize: 10 }} />}
                    <Tooltip labelFormatter={(v: number) => formatTime(v)} />
                    <Line yAxisId="temp" type="monotone" dataKey="bean_temp" stroke="var(--curve-bean)" strokeWidth={2} dot={false} name="豆温" isAnimationActive={false} />
                    {showEnv && <Line yAxisId="temp" type="monotone" dataKey="env_temp" stroke="var(--curve-env)" strokeWidth={1.5} dot={false} name="环温" isAnimationActive={false} />}
                    {showRor && <Line yAxisId="ror" type="monotone" dataKey="ror" stroke="var(--curve-ror)" strokeWidth={1.5} dot={false} name="RoR" isAnimationActive={false} />}
                    {events.map((evt, i) => (
                      <ReferenceLine key={i} yAxisId="temp" x={evt.time} stroke="var(--text-muted)" strokeDasharray="3 3"
                        label={{ value: evt.event, position: "top", fontSize: 10, fill: "var(--text-secondary)" }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: "var(--md)" }}>🔥</div>
                  <div className="font-heading">准备烘焙</div>
                  <div className="font-label-sm text-muted" style={{ marginTop: "var(--xs)" }}>
                    输入豆名和参数，然后点击「开始烘焙」
                  </div>
                  <div className="font-caption text-muted" style={{ marginTop: "var(--md)" }}>
                    当前为模拟模式 · 可在设置中配置串口传感器
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar: events + save */}
        <div style={{ width: 200, borderLeft: "0.5px solid var(--panel-border)", display: "flex", flexDirection: "column" }}>
          {/* Event buttons */}
          <div style={{ padding: "var(--sm)" }}>
            <div className="font-label text-secondary" style={{ marginBottom: "var(--sm)", padding: "0 var(--xs)" }}>
              事件标记
            </div>
            {EVENT_BUTTONS.map(btn => {
              const marked = events.some(e => e.event === btn.event);
              return (
                <button key={btn.event}
                  onClick={() => handleMarkEvent(btn.event)}
                  disabled={!running}
                  style={{
                    width: "100%",
                    padding: "var(--sm)",
                    marginBottom: "var(--xs)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: marked ? "var(--copper)" : running ? "var(--text)" : "var(--text-muted)",
                    background: marked ? "var(--copper-muted)" : "var(--surface)",
                    border: "0.5px solid var(--panel-border)",
                    opacity: running ? 1 : 0.5,
                  }}
                >
                  <span>{btn.label}</span>
                  <span className="font-caption text-muted">{btn.key}</span>
                </button>
              );
            })}
          </div>

          <div className="divider" />

          {/* Event log */}
          <div style={{ flex: 1, overflow: "auto", padding: "var(--sm)" }}>
            <div className="font-label text-secondary" style={{ marginBottom: "var(--sm)", padding: "0 var(--xs)" }}>
              事件记录
            </div>
            {events.length === 0 ? (
              <div className="font-caption text-muted" style={{ padding: "var(--sm)" }}>暂无事件</div>
            ) : (
              events.map((evt, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px var(--xs)", fontSize: 11 }}>
                  <span>{evt.event}</span>
                  <span className="font-mono-xs text-secondary">
                    {formatTime(evt.time)} · {Math.round(evt.bean_temp)}℃
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Save dialog */}
          {showSave && (
            <>
              <div className="divider" />
              <div style={{ padding: "var(--sm)", display: "flex", flexDirection: "column", gap: "var(--sm)" }}>
                <div className="font-label text-secondary">保存烘焙</div>
                <div>
                  <span className="font-caption text-muted">出豆重 (g)</span>
                  <input className="input-field" type="number" value={endWeight}
                    onChange={e => setEndWeight(e.target.value)} style={{ width: "100%", marginTop: 2 }} />
                </div>
                <div>
                  <span className="font-caption text-muted">烘焙度</span>
                  <select className="input-field" value={degree}
                    onChange={e => setDegree(e.target.value as RoastDegree)}
                    style={{ width: "100%", marginTop: 2 }}>
                    <option value="">未选择</option>
                    {ROAST_DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <span className="font-caption text-muted">备注</span>
                  <textarea className="input-field" value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ width: "100%", minHeight: 40, marginTop: 2, resize: "vertical" }} />
                </div>
                <button className="btn-primary" onClick={handleSave} disabled={saving}
                  style={{ width: "100%", padding: "var(--sm)" }}>
                  {saving ? "保存中..." : "保存记录"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TempCard({ label, value, color, unit = "℃" }: { label: string; value: number; color: string; unit?: string }) {
  return (
    <div style={{ padding: "var(--sm) var(--md)", background: "var(--surface)", border: "0.5px solid var(--panel-border)", minWidth: 120 }}>
      <div className="font-caption" style={{ color }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--xs)" }}>
        <span className="font-mono-lg" style={{ color }}>{value.toFixed(1)}</span>
        <span className="font-caption text-muted">{unit}</span>
      </div>
    </div>
  );
}
