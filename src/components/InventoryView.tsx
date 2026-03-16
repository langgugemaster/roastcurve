import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { GreenBean } from "../types/models";

function newBean(): GreenBean {
  return {
    id: crypto.randomUUID(),
    name: "",
    origin: "",
    process: "",
    variety: "",
    purchase_date: null,
    quantity_kg: 0,
    price_per_kg: null,
    notes: "",
  };
}

export function InventoryView() {
  const [beans, setBeans] = useState<GreenBean[]>([]);
  const [editing, setEditing] = useState<GreenBean | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadBeans();
  }, []);

  async function loadBeans() {
    try {
      const data = await invoke<GreenBean[]>("get_beans");
      setBeans(data);
    } catch {
      setBeans([]);
    }
  }

  async function saveCurrent() {
    if (!editing || !editing.name.trim()) return;
    try {
      await invoke("save_bean", { bean: editing });
      setEditing(null);
      loadBeans();
    } catch (e) {
      console.error("Save failed:", e);
    }
  }

  async function deleteCurrent(id: string) {
    try {
      await invoke("delete_bean", { id });
      if (editing?.id === id) setEditing(null);
      loadBeans();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }

  const filtered = beans.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.origin.toLowerCase().includes(q) || b.variety.toLowerCase().includes(q);
  });

  const totalWeight = beans.reduce((s, b) => s + b.quantity_kg, 0);
  const totalValue = beans.reduce((s, b) => s + b.quantity_kg * (b.price_per_kg || 0), 0);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Left: List */}
      <div style={{ width: 360, borderRight: "0.5px solid var(--panel-border)", display: "flex", flexDirection: "column" }}>
        {/* Toolbar */}
        <div style={{ padding: "var(--sm) var(--md)", display: "flex", alignItems: "center", gap: "var(--sm)" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "var(--xs)",
            padding: "var(--xs) var(--sm)", background: "var(--bg)",
            border: "0.5px solid var(--panel-border)", flex: 1,
          }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🔍</span>
            <input
              className="input-field"
              style={{ flex: 1, border: "none", padding: 0 }}
              placeholder="搜索生豆..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-copper" onClick={() => setEditing(newBean())}>+ 新增</button>
        </div>

        {/* Summary */}
        <div style={{ padding: "var(--xs) var(--md)", display: "flex", gap: "var(--lg)" }}>
          <span className="font-caption text-muted">{beans.length} 种豆</span>
          <span className="font-caption text-muted">{totalWeight.toFixed(1)} kg</span>
          {totalValue > 0 && <span className="font-caption text-muted">${totalValue.toFixed(0)}</span>}
        </div>

        <div className="divider" />

        {/* Bean list */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "var(--lg)", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
              {beans.length === 0 ? "暂无库存，点击「+ 新增」添加" : "未找到匹配的豆种"}
            </div>
          ) : (
            filtered.map(b => (
              <div key={b.id}>
                <div
                  onClick={() => setEditing({ ...b })}
                  style={{
                    padding: "var(--sm) var(--md)",
                    cursor: "pointer",
                    background: editing?.id === b.id ? "var(--copper-muted)" : "var(--surface)",
                    borderLeft: editing?.id === b.id ? "3px solid var(--copper)" : "3px solid transparent",
                  }}
                  onMouseEnter={e => { if (editing?.id !== b.id) e.currentTarget.style.background = "var(--panel-hover)"; }}
                  onMouseLeave={e => { if (editing?.id !== b.id) e.currentTarget.style.background = "var(--surface)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="font-heading">{b.name}</span>
                    <span className="font-mono-xs text-copper">{b.quantity_kg.toFixed(1)} kg</span>
                  </div>
                  <div style={{ display: "flex", gap: "var(--md)", marginTop: "var(--xs)" }}>
                    {b.origin && <span className="font-caption text-muted">{b.origin}</span>}
                    {b.process && <span className="font-caption text-muted">{b.process}</span>}
                    {b.variety && <span className="font-caption text-muted">{b.variety}</span>}
                  </div>
                </div>
                <div className="divider" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Edit form */}
      <div style={{ flex: 1, overflow: "auto", padding: "var(--lg)" }}>
        {editing ? (
          <BeanForm
            bean={editing}
            onChange={setEditing}
            onSave={saveCurrent}
            onDelete={() => deleteCurrent(editing.id)}
            isNew={!beans.some(b => b.id === editing.id)}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: "var(--md)" }}>📦</div>
              <div className="font-heading">选择或新增生豆</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BeanForm({
  bean, onChange, onSave, onDelete, isNew,
}: {
  bean: GreenBean;
  onChange: (b: GreenBean) => void;
  onSave: () => void;
  onDelete: () => void;
  isNew: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--lg)" }}>
        <h2 className="font-title">{isNew ? "新增生豆" : "编辑生豆"}</h2>
        <div style={{ display: "flex", gap: "var(--sm)" }}>
          {!isNew && (
            <button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={onDelete}>删除</button>
          )}
          <button
            className="btn-primary"
            onClick={onSave}
            style={{ opacity: bean.name.trim() ? 1 : 0.5 }}
            disabled={!bean.name.trim()}
          >
            保存
          </button>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "0.5px solid var(--panel-border)", padding: "var(--md)", display: "flex", flexDirection: "column", gap: "var(--md)" }}>
        <FormRow label="豆名 *">
          <input className="input-field" style={{ flex: 1 }} value={bean.name}
            onChange={e => onChange({ ...bean, name: e.target.value })} placeholder="例：耶加雪菲 果丁丁" />
        </FormRow>
        <FormRow label="产地">
          <input className="input-field" style={{ flex: 1 }} value={bean.origin}
            onChange={e => onChange({ ...bean, origin: e.target.value })} placeholder="例：埃塞俄比亚" />
        </FormRow>
        <FormRow label="处理法">
          <input className="input-field" style={{ flex: 1 }} value={bean.process}
            onChange={e => onChange({ ...bean, process: e.target.value })} placeholder="例：水洗 / 日晒 / 蜜处理" />
        </FormRow>
        <FormRow label="品种">
          <input className="input-field" style={{ flex: 1 }} value={bean.variety}
            onChange={e => onChange({ ...bean, variety: e.target.value })} placeholder="例：74158 / Gesha / Bourbon" />
        </FormRow>
        <FormRow label="库存 (kg)">
          <input className="input-field" type="number" step="0.1" min="0" style={{ width: 120 }}
            value={bean.quantity_kg || ""}
            onChange={e => onChange({ ...bean, quantity_kg: parseFloat(e.target.value) || 0 })} />
        </FormRow>
        <FormRow label="单价 ($/kg)">
          <input className="input-field" type="number" step="0.01" min="0" style={{ width: 120 }}
            value={bean.price_per_kg ?? ""}
            onChange={e => onChange({ ...bean, price_per_kg: e.target.value ? parseFloat(e.target.value) : null })} />
        </FormRow>
        <FormRow label="采购日期">
          <input className="input-field" type="date" style={{ width: 160 }}
            value={bean.purchase_date || ""}
            onChange={e => onChange({ ...bean, purchase_date: e.target.value || null })} />
        </FormRow>
        <FormRow label="备注">
          <textarea className="input-field" style={{ flex: 1, minHeight: 60, resize: "vertical" }}
            value={bean.notes}
            onChange={e => onChange({ ...bean, notes: e.target.value })} placeholder="备注信息..." />
        </FormRow>
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <span className="font-label text-secondary" style={{ width: 100, flexShrink: 0, paddingTop: "var(--xs)" }}>{label}</span>
      {children}
    </div>
  );
}
