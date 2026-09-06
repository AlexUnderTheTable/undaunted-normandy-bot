/**
 * Ценность ключевой точки (§6 bot_script.txt): ПО − расстояние + штраф за
 * контроль игроком. Случай "под контролем, но дойти некому" (`OPEN_QUESTIONS.md`
 * п. 5) даёт тот же штраф 0, что и "не под контролем", поэтому объединён с
 * "none" в один пункт выбора — см. `OPEN_QUESTIONS.md` п. 16.
 */

export type Control = "none" | "scouted" | "reachable" | "occupied";

export const controlPenalty: Record<Control, number> = {
  none: 0,
  scouted: -0.5,
  reachable: -1,
  occupied: -2,
};

export const controlLabel: Record<Control, string> = {
  none: "Не под контролем игрока (или под контролем, но дойти туда в этот ход некому)",
  scouted: "Только разведана игроком (под контролем не считается)",
  reachable:
    "Под контролем игрока, юнита на ней нет, но игрок может доставить туда юнита в этот ход",
  occupied: "Под контролем игрока, юнит игрока стоит на ней прямо сейчас",
};

export interface KeyPointInput {
  po: string;
  distance: string;
  control: Control;
}

/** Ценность точки, либо null, если игрок ещё не ввёл ПО/расстояние. */
export function computeKeyPointValue(input: KeyPointInput): number | null {
  const po = parseFloat(input.po);
  const distance = parseFloat(input.distance);
  if (Number.isNaN(po) || Number.isNaN(distance)) return null;
  return po - distance + controlPenalty[input.control];
}

/**
 * Индекс предпочтительной точки (наибольшая ценность) среди строк, либо null,
 * если ни одна строка не заполнена. При равенстве побеждает первая введённая.
 */
export function pickBestKeyPoint(rows: KeyPointInput[]): number | null {
  let bestIndex: number | null = null;
  let bestValue = -Infinity;
  rows.forEach((row, i) => {
    const value = computeKeyPointValue(row);
    if (value === null) return;
    if (value > bestValue) {
      bestValue = value;
      bestIndex = i;
    }
  });
  return bestIndex;
}
