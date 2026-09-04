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
import type { AiGoal, CommonData, UnitDef, UnitListEntry } from "./types";

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

export function getUnitTree(id: string, aiGoal: AiGoal) {
  const unit = getUnit(id);
  if (unit.trees) return unit.trees[aiGoal];
  if (unit.tree) return unit.tree;
  throw new Error(`Unit ${id} has no tree defined`);
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
