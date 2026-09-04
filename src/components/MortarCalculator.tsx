import { useState } from "react";

interface Row {
  id: number;
  label: string;
  enemyCount: string;
  bestEnemyType: string;
  ownCount: string;
}

let nextId = 1;

function newRow(defaultType: string): Row {
  return {
    id: nextId++,
    label: `Квадрат ${nextId - 1}`,
    enemyCount: "",
    bestEnemyType: defaultType,
    ownCount: "0",
  };
}

interface Props {
  priorityList: string[];
}

export default function MortarCalculator({ priorityList }: Props) {
  const [rows, setRows] = useState<Row[]>([newRow(priorityList[0] ?? ""), newRow(priorityList[0] ?? "")]);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow(priorityList[0] ?? "")]);
  }

  function removeRow(id: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }

  const rank = (type: string) => {
    const i = priorityList.indexOf(type);
    return i === -1 ? priorityList.length : i;
  };

  const usable = rows
    .map((r) => ({
      row: r,
      enemyCount: parseFloat(r.enemyCount),
      ownCount: parseFloat(r.ownCount || "0"),
      rank: rank(r.bestEnemyType),
    }))
    .filter((r) => !Number.isNaN(r.enemyCount) && r.enemyCount > 0);

  let bestId: number | null = null;
  let reason = "";

  if (usable.length > 0) {
    const maxEnemies = Math.max(...usable.map((r) => r.enemyCount));
    let group = usable.filter((r) => r.enemyCount === maxEnemies);
    reason = "больше врагов в квадрате";

    if (group.length > 1) {
      const minRank = Math.min(...group.map((r) => r.rank));
      const byRank = group.filter((r) => r.rank === minRank);
      if (byRank.length < group.length) reason += ", приоритетнее цель";
      group = byRank;
    }

    if (group.length > 1) {
      const minOwn = Math.min(...group.map((r) => r.ownCount));
      const byOwn = group.filter((r) => r.ownCount === minOwn);
      if (byOwn.length < group.length) reason += ", меньше своих в квадрате";
      group = byOwn;
    }

    if (group.length > 1) reason += " — при ничьей выбирайте случайно";

    bestId = group[0].row.id;
  }

  return (
    <div className="calc">
      {rows.map((row) => {
        const isBest = row.id === bestId;
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
                Врагов в квадрате
                <input
                  type="number"
                  inputMode="decimal"
                  value={row.enemyCount}
                  onChange={(e) => updateRow(row.id, { enemyCount: e.target.value })}
                />
              </label>
              <label>
                Своих в квадрате
                <input
                  type="number"
                  inputMode="decimal"
                  value={row.ownCount}
                  onChange={(e) => updateRow(row.id, { ownCount: e.target.value })}
                />
              </label>
            </div>
            <select
              value={row.bestEnemyType}
              onChange={(e) => updateRow(row.id, { bestEnemyType: e.target.value })}
            >
              {priorityList.map((t) => (
                <option key={t} value={t}>
                  Лучшая цель в квадрате: {t}
                </option>
              ))}
            </select>
            {isBest && <div className="calc-value">→ Обстрелять этот квадрат ({reason})</div>}
          </div>
        );
      })}
      <button className="calc-add" onClick={addRow}>
        + Добавить квадрат
      </button>
    </div>
  );
}
