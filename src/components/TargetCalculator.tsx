import { useState } from "react";
import { chooseTarget } from "../logic/targetSelection";

interface Row {
  id: number;
  unitType: string;
  defense: string;
  distance: string;
}

let nextId = 1;

function newRow(defaultType: string): Row {
  return { id: nextId++, unitType: defaultType, defense: "", distance: "" };
}

interface Props {
  priorityList: string[];
}

export default function TargetCalculator({ priorityList }: Props) {
  const [rows, setRows] = useState<Row[]>([newRow(priorityList[0] ?? "")]);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow(priorityList[0] ?? "")]);
  }

  function removeRow(id: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }

  const choice = chooseTarget(rows, priorityList);
  const bestId = choice === null ? null : rows[choice.index].id;
  const reason = choice?.reason ?? "";

  return (
    <div className="calc">
      {rows.map((row) => {
        const isBest = row.id === bestId;
        return (
          <div key={row.id} className={"calc-row" + (isBest ? " calc-row-best" : "")}>
            <div className="calc-row-header">
              <select
                className="calc-label"
                value={row.unitType}
                onChange={(e) => updateRow(row.id, { unitType: e.target.value })}
              >
                {priorityList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {rows.length > 1 && (
                <button className="calc-remove" onClick={() => removeRow(row.id)}>
                  ✕
                </button>
              )}
            </div>
            <div className="calc-fields">
              <label>
                Итоговая защита
                <input
                  type="number"
                  inputMode="decimal"
                  value={row.defense}
                  onChange={(e) => updateRow(row.id, { defense: e.target.value })}
                />
              </label>
              <label>
                Расстояние
                <input
                  type="number"
                  inputMode="decimal"
                  value={row.distance}
                  onChange={(e) => updateRow(row.id, { distance: e.target.value })}
                />
              </label>
            </div>
            {isBest && <div className="calc-value">→ Атаковать эту цель ({reason})</div>}
          </div>
        );
      })}
      <button className="calc-add" onClick={addRow}>
        + Добавить цель
      </button>
    </div>
  );
}
