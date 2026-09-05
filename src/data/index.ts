import commonData from "./common.json";
import unitsListData from "./units.json";
import shooter from "./shooter.json";
import scout from "./scout.json";
import machinegunner from "./machinegunner.json";
import sniper from "./sniper.json";
import mortar from "./mortar.json";
import sergeant from "./sergeant.json";
import lieutenant from "./lieutenant.json";
import commander from "./commander.json";
import type { AiGoal, CommonData, TreeNode, UnitDef, UnitListEntry } from "./types";

export const common = commonData as CommonData;
export const unitsList = unitsListData as UnitListEntry[];

const unitData: Record<string, UnitDef> = {
  shooter: shooter as UnitDef,
  scout: scout as UnitDef,
  machinegunner: machinegunner as UnitDef,
  sniper: sniper as UnitDef,
  mortar: mortar as UnitDef,
  sergeant: sergeant as UnitDef,
  lieutenant: lieutenant as UnitDef,
  commander: commander as UnitDef,
};

export function getUnit(id: string): UnitDef {
  const unit = unitData[id];
  if (!unit) throw new Error(`Unknown unit: ${id}`);
  return unit;
}

// Боевые юниты, для которых действует правило эндшпиля (см. OPEN_QUESTIONS.md п. 12).
// Командиры (sergeant/lieutenant/commander) намеренно не входят — правило про
// личный бой юнита на поле, координацию оно не трогает.
const AGGRESSION_UNITS = new Set(["shooter", "scout", "machinegunner", "sniper", "mortar"]);

/**
 * Вставляет вопрос про эндшпиль сразу после гейта «жетон на поле» (п. 8).
 * Обе ветки — «да» и «впереди бот/ровно» — ведут в один и тот же исходный
 * скрипт юнита (одна и та же ссылка на объект, без дублирования в JSON):
 * это не меняет сам скрипт, а даёт игроку разовую подсказку-памятку.
 */
function withEndgameGate(tree: TreeNode): TreeNode {
  if (tree.type !== "question") return tree;
  return {
    ...tree,
    yes: {
      type: "question",
      text: "Игрок сейчас впереди по очкам сценария?",
      memo: "endgameAggression",
      yes: tree.yes,
      no: tree.yes,
    },
  };
}

export function getUnitTree(id: string, aiGoal: AiGoal): TreeNode {
  const unit = getUnit(id);
  const tree = unit.trees ? unit.trees[aiGoal] : unit.tree;
  if (!tree) throw new Error(`Unit ${id} has no tree defined`);
  return AGGRESSION_UNITS.has(id) ? withEndgameGate(tree) : tree;
}

export function resolveMemo(memoKey: string, aiGoal: AiGoal): string {
  const key = memoKey === "targetSelection" ? `targetSelection_${aiGoal}` : memoKey;
  return common.memos[key] ?? "";
}

export function resolvePriorityList(memoKey: string, aiGoal: AiGoal): string[] {
  const listKey =
    memoKey === "targetSelection" || memoKey === "mortarSquareSelection"
      ? aiGoal
      : memoKey === "targetSelection_sniper"
        ? "sniper"
        : null;
  if (!listKey) return [];
  return common.priorityLists[listKey] ?? [];
}
