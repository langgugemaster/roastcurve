import { useState } from "react";
import { CuppingRecord } from "../types/models";

const ATTRS: { key: keyof Omit<CuppingRecord, "defects">; name: string }[] = [
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
];

interface Props {
  initial?: CuppingRecord | null;
  onSave: (record: CuppingRecord) => void;
  onCancel: () => void;
}

function defaultRecord(): CuppingRecord {
  return {
    fragrance: 6, flavor: 6, aftertaste: 6, acidity: 6, body: 6,
    uniformity: 6, balance: 6, clean_cup: 6, sweetness: 6, overall: 6,
    defects: 0,
  };
}

export function CuppingForm({ initial, onSave, onCancel }: Props) {
  const [record, setRecord] = useState<CuppingRecord>(initial || defaultRecord());

  const totalScore = ATTRS.reduce((s, a) => s + record[a.key], 0) - record.defects;

  function setAttr(key: keyof CuppingRecord, value: number) {
    setRecord(prev => ({ ...prev, [key]: value }));
  }

  const qualityLevel = totalScore >= 90 ? "Outstanding" :
    totalScore >= 85 ? "Excellent" :
    totalScore >= 80 ? "Very Good" :
    totalScore >= 75 ? "Good" :
    totalScore >= 70 ? "Fair" : "Below";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--lg)" }}>
        <h2 className="font-title">SCA 杯测评分</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--md)" }}>
          <div style={{ textAlign: "right" }}>
            <div className="font-mono-lg" style={{ color: "var(--warning)" }}>{totalScore.toFixed(1)}</div>
            <div className="font-caption text-muted">{qualityLevel}</div>
          </div>
          <button className="btn-ghost" onClick={onCancel}>取消</button>
          <button className="btn-primary" onClick={() => onSave(record)}>保存评分</button>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "0.5px solid var(--panel-border)", padding: "var(--md)" }}>
        {ATTRS.map(attr => (
          <div key={attr.key} style={{
            display: "flex", alignItems: "center", gap: "var(--md)",
            padding: "var(--sm) 0", borderBottom: "0.5px solid var(--panel-border)",
          }}>
            <span className="font-label" style={{ width: 80, flexShrink: 0 }}>{attr.name}</span>
            <ScoreBar value={record[attr.key]} onChange={v => setAttr(attr.key, v)} />
            <span className="font-mono-sm" style={{ width: 40, textAlign: "right" }}>
              {record[attr.key].toFixed(1)}
            </span>
          </div>
        ))}

        {/* Defects */}
        <div style={{
          display: "flex", alignItems: "center", gap: "var(--md)",
          padding: "var(--sm) 0", marginTop: "var(--sm)",
        }}>
          <span className="font-label" style={{ width: 80, flexShrink: 0, color: "var(--danger)" }}>缺陷扣分</span>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sm)" }}>
            <button className="btn-ghost" onClick={() => setAttr("defects", Math.max(0, record.defects - 2))}
              style={{ width: 28, height: 28, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <span className="font-mono-sm" style={{ color: "var(--danger)", width: 30, textAlign: "center" }}>
              {record.defects}
            </span>
            <button className="btn-ghost" onClick={() => setAttr("defects", record.defects + 2)}
              style={{ width: 28, height: 28, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 20-segment score bar (0-10, step 0.5) */
function ScoreBar({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const segments = 20;
  const filled = Math.round(value * 2);

  return (
    <div style={{ display: "flex", gap: 1, flex: 1, height: 20, cursor: "pointer" }}>
      {Array.from({ length: segments }, (_, i) => {
        const segValue = (i + 1) / 2;
        const active = i < filled;
        return (
          <div
            key={i}
            onClick={() => onChange(segValue)}
            style={{
              flex: 1,
              background: active ? scoreColor(segValue) : "var(--panel-hover)",
              border: "0.5px solid var(--panel-border)",
              transition: "background 0.1s",
            }}
          />
        );
      })}
    </div>
  );
}

function scoreColor(value: number): string {
  if (value <= 3) return "var(--danger)";
  if (value <= 5) return "var(--warning)";
  if (value <= 7) return "var(--copper)";
  if (value <= 8.5) return "var(--success)";
  return "var(--info)";
}
