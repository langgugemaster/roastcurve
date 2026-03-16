import { useState } from "react";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";
import { StatsView } from "./components/StatsView";
import { ComparisonView } from "./components/ComparisonView";
import { InventoryView } from "./components/InventoryView";
import { RoastDetailView } from "./components/RoastDetailView";

type Tab = "烘焙" | "历史" | "对比" | "统计" | "库存" | "设置";

const TABS: { name: Tab; icon: string }[] = [
  { name: "烘焙", icon: "🔥" },
  { name: "历史", icon: "🕐" },
  { name: "对比", icon: "⇄" },
  { name: "统计", icon: "📊" },
  { name: "库存", icon: "📦" },
  { name: "设置", icon: "⚙" },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("历史");
  const [detailId, setDetailId] = useState<string | null>(null);

  // When viewing a roast detail, show it instead of history
  if (detailId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header activeTab="历史" onTabChange={(tab) => { setDetailId(null); setActiveTab(tab); }} />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <RoastDetailView roastId={detailId} onBack={() => setDetailId(null)} />
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "历史" && <HistoryView onSelectRoast={setDetailId} />}
        {activeTab === "设置" && <SettingsView />}
        {activeTab === "统计" && <StatsView />}
        {activeTab === "对比" && <ComparisonView />}
        {activeTab === "库存" && <InventoryView />}
        {activeTab === "烘焙" && <Placeholder text="烘焙面板 — 待实现" />}
      </main>
    </div>
  );
}

function Header({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        padding: "var(--sm) var(--lg)",
        background: "var(--surface)",
        borderBottom: "0.5px solid var(--panel-border)",
        gap: "var(--md)",
      }}
    >
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
        <span className="font-mono-sm" style={{ letterSpacing: 2 }}>
          ROASTCURVE
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: "flex",
          border: "0.5px solid var(--panel-border)",
          background: "var(--panel-hover)",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.name}
            onClick={() => onTabChange(tab.name)}
            style={{
              width: 90,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--sm)",
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === tab.name ? "white" : "var(--text-secondary)",
              background:
                activeTab === tab.name ? "var(--primary)" : "transparent",
            }}
          >
            <span style={{ fontSize: 12 }}>{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />
    </header>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "var(--text-muted)",
        fontSize: 16,
        fontWeight: 500,
      }}
    >
      {text}
    </div>
  );
}

export default App;
