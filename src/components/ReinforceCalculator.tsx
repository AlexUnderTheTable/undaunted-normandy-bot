import { useState } from "react";
import { pickReinforceUnit } from "../logic/reinforce";

interface Props {
  priorityList: string[];
}

export default function ReinforceCalculator({ priorityList }: Props) {
  const [available, setAvailable] = useState<Record<string, boolean>>({});

  function toggle(unitType: string) {
    setAvailable((a) => ({ ...a, [unitType]: !a[unitType] }));
  }

  const rows = priorityList.map((unitType) => ({ unitType, available: !!available[unitType] }));
  const pick = pickReinforceUnit(rows, priorityList);

  return (
    <div className="calc">
      {priorityList.map((unitType) => {
        const isBest = unitType === pick;
        return (
          <label key={unitType} className={"calc-row calc-row-checkbox" + (isBest ? " calc-row-best" : "")}>
            <input
              type="checkbox"
              checked={!!available[unitType]}
              onChange={() => toggle(unitType)}
            />
            Есть в резерве: {unitType}
            {isBest && " → пополниться этим"}
          </label>
        );
      })}
      <div className="calc-value">
        {pick ? `Пополнить: ${pick}` : "В резерве нет ни одного отмеченного типа — переходите к следующему действию по скрипту"}
      </div>
    </div>
  );
}
