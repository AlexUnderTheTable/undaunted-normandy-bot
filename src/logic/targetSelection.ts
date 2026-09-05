/**
 * Выбор цели атаки: 3 уровня приоритета (§4 bot_script.txt) плюс исключение
 * "защита минимум на 2 ниже" (§5). Защита здесь — итоговая, с учётом
 * расстояния (`OPEN_QUESTIONS.md` п. 9).
 */

export interface TargetInput {
  unitType: string;
  defense: string;
  distance: string;
}

export interface TargetChoice {
  index: number;
  reason: string;
}

interface Scored {
  index: number;
  defense: number;
  distance: number;
  rank: number;
}

function rankOf(unitType: string, priorityList: string[]): number {
  const i = priorityList.indexOf(unitType);
  return i === -1 ? priorityList.length : i;
}

/** §4 №2-3: меньшая защита, при ничьей — ближайшая цель. */
function pickBest(group: Scored[]): Scored {
  const minDefense = Math.min(...group.map((r) => r.defense));
  const byDefense = group.filter((r) => r.defense === minDefense);
  if (byDefense.length === 1) return byDefense[0];

  const withDistance = byDefense.filter((r) => !Number.isNaN(r.distance));
  if (withDistance.length > 0) {
    const minDist = Math.min(...withDistance.map((r) => r.distance));
    return withDistance.filter((r) => r.distance === minDist)[0];
  }
  return byDefense[0];
}

/**
 * Предпочтительная цель среди введённых строк, либо null, если ни у одной
 * не указана защита.
 */
export function chooseTarget(
  rows: TargetInput[],
  priorityList: string[],
): TargetChoice | null {
  const usable: Scored[] = rows
    .map((r, index) => ({
      index,
      defense: parseFloat(r.defense),
      distance: parseFloat(r.distance),
      rank: rankOf(r.unitType, priorityList),
    }))
    .filter((r) => !Number.isNaN(r.defense));

  if (usable.length === 0) return null;

  const minRank = Math.min(...usable.map((r) => r.rank));
  const topGroup = usable.filter((r) => r.rank === minRank);

  // §5: цель более низкого приоритета с защитой на 2+ ниже всех целей выше её по приоритету.
  const exceptionCandidates = usable.filter((r) => {
    if (r.rank <= minRank) return false;
    const higher = usable.filter((h) => h.rank < r.rank);
    if (higher.length === 0) return false;
    const minHigherDefense = Math.min(...higher.map((h) => h.defense));
    return r.defense <= minHigherDefense - 2;
  });

  if (exceptionCandidates.length > 0) {
    return {
      index: pickBest(exceptionCandidates).index,
      reason: "исключение: защита ≥2 ниже всех целей более высокого приоритета",
    };
  }

  return {
    index: pickBest(topGroup).index,
    reason:
      topGroup.length > 1
        ? "по приоритету, тай-брейк по защите/расстоянию"
        : "по приоритету",
  };
}
