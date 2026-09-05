/**
 * Выбор квадрата для обстрела миномётом (§11 bot_script.txt):
 * больше врагов → приоритетнее цель → меньше своих → случайный выбор.
 */

export interface MortarInput {
  enemyCount: string;
  bestEnemyType: string;
  ownCount: string;
}

export interface MortarChoice {
  index: number;
  reason: string;
}

interface Scored {
  index: number;
  enemyCount: number;
  ownCount: number;
  rank: number;
}

/**
 * Предпочтительный квадрат, либо null, если ни в одном не указано врагов.
 * Квадраты без врагов миномёту не интересны и в расчёт не идут.
 */
export function chooseMortarSquare(
  rows: MortarInput[],
  priorityList: string[],
): MortarChoice | null {
  const usable: Scored[] = rows
    .map((r, index) => ({
      index,
      enemyCount: parseFloat(r.enemyCount),
      ownCount: parseFloat(r.ownCount || "0"),
      rank: (() => {
        const i = priorityList.indexOf(r.bestEnemyType);
        return i === -1 ? priorityList.length : i;
      })(),
    }))
    .filter((r) => !Number.isNaN(r.enemyCount) && r.enemyCount > 0);

  if (usable.length === 0) return null;

  const maxEnemies = Math.max(...usable.map((r) => r.enemyCount));
  let group = usable.filter((r) => r.enemyCount === maxEnemies);
  let reason = "больше врагов в квадрате";

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

  return { index: group[0].index, reason };
}
