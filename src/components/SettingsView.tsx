import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PortInfo } from "../types/models";

export function SettingsView() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-20250514");
  const [showKey, setShowKey] = useState(false);
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [baudRate, setBaudRate] = useState(115200);

  useEffect(() => {
    // Load settings from localStorage
    setApiKey(localStorage.getItem("rc_api_key") || "");
    setModel(localStorage.getItem("rc_model") || "claude-sonnet-4-20250514");
    setSelectedPort(localStorage.getItem("rc_port") || "");
    setBaudRate(Number(localStorage.getItem("rc_baud")) || 115200);
    refreshPorts();
  }, []);

  function save(key: string, value: string) {
    localStorage.setItem(key, value);
  }

  async function refreshPorts() {
    try {
      const p = await invoke<PortInfo[]>("list_serial_ports");
      setPorts(p);
    } catch {
      setPorts([]);
    }
  }

  return (
    <div style={{ overflow: "auto", height: "100%", padding: "var(--lg)" }}>
      <h2 className="font-title" style={{ marginBottom: "var(--lg)" }}>
        设置
      </h2>

      {/* AI Section */}
      <Section title="AI 分析">
        <Row label="Claude API Key">
          <div style={{ display: "flex", gap: "var(--sm)", alignItems: "center" }}>
            <input
              className="input-field"
              type={showKey ? "text" : "password"}
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                save("rc_api_key", e.target.value);
              }}
              style={{ width: 300, fontFamily: "var(--font-mono)", fontSize: 11 }}
            />
            <button className="btn-ghost" onClick={() => setShowKey(!showKey)}>
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
        </Row>
        <Row label="模型">
          <select
            className="input-field"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              save("rc_model", e.target.value);
            }}
            style={{ width: 200 }}
          >
            <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            <option value="claude-opus-4-6">Claude Opus 4.6</option>
          </select>
        </Row>
        <p className="font-caption text-muted" style={{ marginTop: "var(--sm)" }}>
          ℹ API Key 仅存储在本地，不会上传至任何服务器
        </p>
      </Section>

      {/* Sensor Section */}
      <Section title="传感器">
        <Row label="串口">
          <div style={{ display: "flex", gap: "var(--sm)", alignItems: "center" }}>
            <select
              className="input-field"
              value={selectedPort}
              onChange={(e) => {
                setSelectedPort(e.target.value);
                save("rc_port", e.target.value);
              }}
              style={{ width: 250 }}
            >
              <option value="">模拟数据</option>
              {ports.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.port_type})
                </option>
              ))}
            </select>
            <button className="btn-ghost" onClick={refreshPorts}>
              刷新
            </button>
          </div>
        </Row>
        <Row label="波特率">
          <select
            className="input-field"
            value={baudRate}
            onChange={(e) => {
              setBaudRate(Number(e.target.value));
              save("rc_baud", e.target.value);
            }}
            style={{ width: 120 }}
          >
            {[9600, 19200, 38400, 57600, 115200].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      {/* About */}
      <Section title="关于">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sm)" }}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path
              d="M4 40 Q12 38 18 28 Q22 22 26 18 Q32 10 36 8 L36 40"
              fill="none"
              stroke="#C4704B"
              strokeWidth="3"
              strokeLinecap="square"
            />
          </svg>
          <div>
            <div className="font-heading">RoastCurve / 乐司特</div>
            <div className="font-label-sm text-muted">
              专业咖啡烘焙软件 · 跨平台版
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "var(--lg)",
            marginTop: "var(--sm)",
          }}
        >
          <InfoLabel label="版本" value="1.0.0" />
          <InfoLabel label="框架" value="Tauri 2 + React" />
          <InfoLabel label="平台" value="macOS / Windows / Linux" />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "var(--lg)" }}>
      <h3 className="font-heading" style={{ marginBottom: "var(--sm)" }}>
        {title}
      </h3>
      <div
        style={{
          padding: "var(--md)",
          background: "var(--surface)",
          border: "0.5px solid var(--panel-border)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--md)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <span
        className="font-label text-secondary"
        style={{ width: 120, flexShrink: 0 }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function InfoLabel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-caption text-muted">{label}</div>
      <div className="font-mono-xs text-secondary">{value}</div>
    </div>
  );
}
