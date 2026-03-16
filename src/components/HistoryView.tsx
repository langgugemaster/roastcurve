import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RoastSummary, formatDate, formatTime } from "../types/models";

export function HistoryView() {
  const [roasts, setRoasts] = useState<RoastSummary[]>([]);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  useEffect(() => {
    loadRoasts();
  }, []);

  async function loadRoasts() {
    try {
      const data = await invoke<RoastSummary[]>("get_roasts");
      setRoasts(data);
    } catch {
      // Not in Tauri context (dev mode without backend)
      setRoasts([]);
    }
  }

  // All unique tags
  const allTags = Array.from(new Set(roasts.flatMap((r) => r.tags))).sort();

  // Filtered roasts
  const filtered = roasts.filter((r) => {
    if (filterTag && !r.tags.includes(filterTag)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.bean_name.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q)) ||
      (r.roast_degree?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--sm)",
          padding: "var(--sm) var(--md)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--xs)",
            padding: "var(--xs) var(--sm)",
            background: "var(--bg)",
            border: "0.5px solid var(--panel-border)",
            flex: "0 0 300px",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🔍</span>
          <input
            className="input-field"
            style={{ flex: 1, border: "none", padding: 0 }}
            placeholder="搜索烘焙记录..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ fontSize: 11, color: "var(--text-muted)" }}
            >
              ✕
            </button>
          )}
        </div>

        <span className="font-label-sm text-muted">
          {roasts.length} 条记录
        </span>

        <div style={{ flex: 1 }} />
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "var(--xs)",
            padding: "var(--xs) var(--md)",
            overflowX: "auto",
          }}
        >
          <button
            className={filterTag === null ? "btn-primary" : "btn-ghost"}
            onClick={() => setFilterTag(null)}
            style={{ fontSize: 11, padding: "3px 8px" }}
          >
            全部
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                color: filterTag === tag ? "white" : "var(--copper)",
                background:
                  filterTag === tag ? "var(--copper)" : "var(--copper-muted)",
                border: "0.5px solid rgba(196,112,75,0.3)",
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="divider" />

      {/* List */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "var(--md)",
              color: "var(--text-muted)",
            }}
          >
            <span style={{ fontSize: 32 }}>🕐</span>
            <span className="font-heading">
              {roasts.length === 0 ? "暂无烘焙记录" : "未找到匹配的记录"}
            </span>
          </div>
        ) : (
          filtered.map((roast) => (
            <div key={roast.id}>
              <RoastRow roast={roast} />
              <div className="divider" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RoastRow({ roast }: { roast: RoastSummary }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "var(--md) var(--lg)",
        background: "var(--surface)",
        cursor: "pointer",
        gap: "var(--md)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--panel-hover)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "var(--surface)")
      }
    >
      {/* Left: Info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sm)" }}>
          <span className="font-heading">{roast.bean_name}</span>
          {roast.roast_degree && (
            <span
              style={{
                fontSize: 11,
                color: "white",
                padding: "1px 6px",
                background: "var(--primary-hover)",
              }}
            >
              {roast.roast_degree}
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--lg)",
            marginTop: "var(--xs)",
          }}
        >
          <span className="font-label-sm text-muted">
            {formatDate(roast.date)}
          </span>
          {roast.batch_weight > 0 && (
            <span className="font-mono-xs text-secondary">
              {Math.round(roast.batch_weight)}g
            </span>
          )}
          {roast.total_time && (
            <span className="font-mono-xs text-secondary">
              {formatTime(roast.total_time)}
            </span>
          )}
          {roast.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Right: Metrics */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--lg)" }}>
        {roast.charge_temp != null && roast.drop_temp != null && (
          <span className="font-mono-xs" style={{ color: "var(--curve-bean)" }}>
            {Math.round(roast.charge_temp)}℃ → {Math.round(roast.drop_temp)}℃
          </span>
        )}
        {roast.weight_loss != null && (
          <span className="font-mono-xs text-secondary">
            {roast.weight_loss.toFixed(1)}%
          </span>
        )}
        {roast.cupping_score != null && (
          <span className="font-mono-xs" style={{ color: "var(--warning)" }}>
            {Math.round(roast.cupping_score)}分
          </span>
        )}
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>›</span>
      </div>
    </div>
  );
}
