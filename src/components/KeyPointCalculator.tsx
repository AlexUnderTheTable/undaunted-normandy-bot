import { useState } from "react";
import {
  computeKeyPointValue,
  controlLabel,
  pickBestKeyPoint,
  type Control,
} from "../logic/keyPoint";

interface Row {
  id: number;
  label: string;
  po: string;
  distance: string;
  control: Control;
}

let nextId = 1;

function newRow(): Row {
  return { id: nextId++, label: `Точка ${nextId - 1}`, po: "", distance: "", control: "none" };
}

export default function KeyPointCalculator() {
  const [rows, setRows] = useState<Row[]>([newRow(), newRow()]);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  function removeRow(id: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }

  const bestIndex = pickBestKeyPoint(rows);

  return (
    <div className="calc">
      {rows.map((row, index) => {
        const value = computeKeyPointValue(row);
        const isBest = bestIndex === index;
        return (
          <div key={row.id} className={"calc-row" + (isBest ? " calc-row-best" : "")}>
            <div className="calc-row-header">
              <input
                className="calc-label"
                value={row.label}
                onChange={(e) => updateRow(row.id, { label: e.target.value })}
              />
              {rows.length > 1 && (
                <button className="calc-remove" onClick={() => removeRow(row.id)}>
                  ✕
                </button>
              )}
            </div>
            <div className="calc-fields">
              <label>
                ПО
                <input
                  type="number"
                  inputMode="decimal"
                  value={row.po}
                  onChange={(e) => updateRow(row.id, { po: e.target.value })}
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
            <select
              value={row.control}
              onChange={(e) => updateRow(row.id, { control: e.target.value as Control })}
            >
              {(Object.keys(controlLabel) as Control[]).map((c) => (
                <option key={c} value={c}>
                  {controlLabel[c]}
                </option>
              ))}
            </select>
            <div className="calc-value">
              {value === null ? "—" : `Ценность: ${value}`}
              {isBest && value !== null && " → идём сюда"}
            </div>
          </div>
        );
      })}
      <button className="calc-add" onClick={addRow}>
        + Добавить точку
      </button>
    </div>
  );
}
