import { useState } from "react";

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

  const rank = (unitType: string) => {
    const i = priorityList.indexOf(unitType);
    return i === -1 ? priorityList.length : i;
  };

  const usable = rows
    .map((r) => ({
      row: r,
      defense: parseFloat(r.defense),
      distance: parseFloat(r.distance),
      rank: rank(r.unitType),
    }))
    .filter((r) => !Number.isNaN(r.defense));

  let bestId: number | null = null;
  let reason = "";

  if (usable.length > 0) {
    const minRank = Math.min(...usable.map((r) => r.rank));
    const topGroup = usable.filter((r) => r.rank === minRank);

    function pickBest(group: typeof usable) {
      const minDefense = Math.min(...group.map((r) => r.defense));
      const byDefense = group.filter((r) => r.defense === minDefense);
      if (byDefense.length === 1) return byDefense[0];
      const withDistance = byDefense.filter((r) => !Number.isNaN(r.distance));
      if (withDistance.length > 0) {
        const minDist = Math.min(...withDistance.map((r) => r.distance));
        const byDist = withDistance.filter((r) => r.distance === minDist);
        return byDist[0];
      }
      return byDefense[0];
    }

    const normalBest = pickBest(topGroup);

    const exceptionCandidates = usable.filter((r) => {
      if (r.rank <= minRank) return false;
      const higher = usable.filter((h) => h.rank < r.rank);
      if (higher.length === 0) return false;
      const minHigherDefense = Math.min(...higher.map((h) => h.defense));
      return r.defense <= minHigherDefense - 2;
    });

    if (exceptionCandidates.length > 0) {
      const best = pickBest(exceptionCandidates);
      bestId = best.row.id;
      reason = "исключение: защита ≥2 ниже всех целей более высокого приоритета";
    } else {
      bestId = normalBest.row.id;
      reason = topGroup.length > 1 ? "по приоритету, тай-брейк по защите/расстоянию" : "по приоритету";
    }
  }

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
                Защита
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
