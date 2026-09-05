/**
 * Ценность ключевой точки (§6 bot_script.txt): ПО − расстояние + штраф за
 * контроль игроком. Разбор случая "controlledUnreachable" — `OPEN_QUESTIONS.md` п. 5.
 */

export type Control =
  | "none"
  | "scouted"
  | "controlledUnreachable"
  | "reachable"
  | "occupied";

export const controlPenalty: Record<Control, number> = {
  none: 0,
  scouted: -0.5,
  controlledUnreachable: 0,
  reachable: -1,
  occupied: -2,
};

export const controlLabel: Record<Control, string> = {
  none: "Не под контролем и не разведана игроком",
  scouted: "Только разведана игроком (под контролем не считается)",
  controlledUnreachable: "Под контролем игрока, но дойти туда в этот ход некому",
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
