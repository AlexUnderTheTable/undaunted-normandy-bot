/**
 * Выбор юнита для пополнения (BOLSTER, `OPEN_QUESTIONS.md` п. 13/18):
 * берём тип с наивысшим приоритетом текущей цели ИИ среди отмеченных как
 * доступные в резерве.
 */

export interface ReinforceInput {
  unitType: string;
  available: boolean;
}

/** Тип юнита с наивысшим приоритетом среди отмеченных «есть в резерве», либо null. */
export function pickReinforceUnit(rows: ReinforceInput[], priorityList: string[]): string | null {
  for (const type of priorityList) {
    const row = rows.find((r) => r.unitType === type);
    if (row?.available) return type;
  }
  return null;
}
