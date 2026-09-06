/**
 * Счётчик розыгрышей карты Командира взвода (`OPEN_QUESTIONS.md` п. 19):
 * каждый N-й розыгрыш карты подряд даёт Приказ (Command 2) напрямую,
 * независимо от резерва, — иначе резерв редко пустеет и Приказ почти
 * никогда не случается по буквальному скрипту §12.
 */

export const COMMAND_INTERVAL = 4;

export interface CommandCounterResult {
  /** Порядковый номер этого розыгрыша подряд без Приказа (1..interval). */
  playCount: number;
  /** true, если именно на этом розыгрыше нужно дать Приказ напрямую. */
  triggered: boolean;
  /** Значение, которое нужно сохранить для следующего розыгрыша. */
  nextStored: number;
}

/** `stored` — сколько раз подряд карта уже была разыграна без Приказа (0..interval-1). */
export function advanceCommandCounter(
  stored: number,
  interval: number = COMMAND_INTERVAL,
): CommandCounterResult {
  const playCount = stored + 1;
  const triggered = playCount >= interval;
  return { playCount, triggered, nextStored: triggered ? 0 : playCount };
}
