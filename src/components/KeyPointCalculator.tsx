import { useState } from "react";

type Control = "none" | "scouted" | "controlledUnreachable" | "reachable" | "occupied";

interface Row {
  id: number;
  label: string;
  po: string;
  distance: string;
  control: Control;
}

const controlPenalty: Record<Control, number> = {
  none: 0,
  scouted: -0.5,
  controlledUnreachable: 0,
  reachable: -1,
  occupied: -2,
};

const controlLabel: Record<Control, string> = {
  none: "Не под контролем и не разведана игроком",
  scouted: "Только разведана игроком (под контролем не считается)",
  controlledUnreachable: "Под контролем игрока, но дойти туда в этот ход некому",
  reachable: "Под контролем игрока, юнита на ней нет, но игрок может доставить туда юнита в этот ход",
  occupied: "Под контролем игрока, юнит игрока стоит на ней прямо сейчас",
};

let nextId = 1;

function newRow(): Row {
  return { id: nextId++, label: `Точка ${nextId - 1}`, po: "", distance: "", control: "none" };
}

function computeValue(row: Row): number | null {
  const po = parseFloat(row.po);
  const distance = parseFloat(row.distance);
  if (Number.isNaN(po) || Number.isNaN(distance)) return null;
  return po - distance + controlPenalty[row.control];
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

  const values = rows.map((r) => ({ row: r, value: computeValue(r) }));
  const withValue = values.filter((v) => v.value !== null) as { row: Row; value: number }[];
  const best =
    withValue.length > 0
      ? withValue.reduce((a, b) => (b.value > a.value ? b : a))
      : null;

  return (
    <div className="calc">
      {rows.map((row) => {
        const value = computeValue(row);
        const isBest = best !== null && row.id === best.row.id;
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
