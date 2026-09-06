import { useEffect, useState } from "react";
import { getSergeantCommandNode, getUnitTree, resolveMemo, resolvePriorityList, unitsList } from "./data";
import type { AiGoal, TreeNode } from "./data/types";
import { advanceCommandCounter, COMMAND_INTERVAL, type CommandCounterResult } from "./logic/commandCounter";
import KeyPointCalculator from "./components/KeyPointCalculator";
import TargetCalculator from "./components/TargetCalculator";
import MortarCalculator from "./components/MortarCalculator";
import ReinforceCalculator from "./components/ReinforceCalculator";
import "./App.css";

const AI_GOAL_KEY = "undaunted-ai-goal";
const THEME_KEY = "undaunted-theme";
const SERGEANT_COUNTER_KEY = "undaunted-sergeant-command-counter";

type Theme = "light" | "dark";

function loadAiGoal(): AiGoal | null {
  const stored = localStorage.getItem(AI_GOAL_KEY);
  return stored === "keyPoints" || stored === "suppression" ? stored : null;
}

function loadSergeantCounter(): number {
  const stored = parseInt(localStorage.getItem(SERGEANT_COUNTER_KEY) ?? "0", 10);
  return Number.isFinite(stored) && stored >= 0 && stored < COMMAND_INTERVAL ? stored : 0;
}

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button className="theme-toggle" onClick={onToggle} aria-label="Сменить тему">
      {theme === "dark" ? "☀ Светлая" : "☾ Тёмная"}
    </button>
  );
}

function AiGoalPicker({
  onPick,
  current,
}: {
  onPick: (goal: AiGoal) => void;
  current: AiGoal | null;
}) {
  return (
    <div className="screen">
      <h1>Цель ИИ в этом сценарии</h1>
      <p className="hint">
        Смотрите в описании разыгрываемого сценария/миссии. Сценарии на очки
        победы (контроль зон) → «Ключевые точки». Сценарии на уничтожение
        отрядов → «Подавление».
      </p>
      <div className="options">
        <button
          className={current === "keyPoints" ? "primary" : ""}
          onClick={() => onPick("keyPoints")}
        >
          Ключевые точки
        </button>
        <button
          className={current === "suppression" ? "primary" : ""}
          onClick={() => onPick("suppression")}
        >
          Подавление
        </button>
      </div>
    </div>
  );
}

function UnitPicker({
  aiGoal,
  onSelect,
  onChangeGoal,
}: {
  aiGoal: AiGoal;
  onSelect: (unitId: string) => void;
  onChangeGoal: () => void;
}) {
  const goalLabel = aiGoal === "keyPoints" ? "Ключевые точки" : "Подавление";
  return (
    <div className="screen">
      <h1>Какая карта выпала?</h1>
      <MemoBox memoKey="generalRule" aiGoal={aiGoal} />
      <MemoBox memoKey="initiativeRule" aiGoal={aiGoal} />
      <div className="options">
        {unitsList.map((u) => (
          <button key={u.id} onClick={() => onSelect(u.id)}>
            {u.name}
          </button>
        ))}
      </div>
      <button className="link" onClick={onChangeGoal}>
        Цель ИИ: {goalLabel} — изменить
      </button>
    </div>
  );
}

function MemoBox({ memoKey, aiGoal }: { memoKey: string; aiGoal: AiGoal }) {
  const text = resolveMemo(memoKey, aiGoal);
  if (!text) return null;
  return (
    <div className="memo">
      {text.split("\n").map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}

/** Узел дерева может нести несколько памяток разом (например, формулу точки и правило маршрута). */
function memoKeys(node: TreeNode): string[] {
  if (!node.memo) return [];
  return Array.isArray(node.memo) ? node.memo : [node.memo];
}

function TreeWalker({
  unitId,
  unitName,
  aiGoal,
  onExit,
  rootOverride,
  commandCounter,
}: {
  unitId: string;
  unitName: string;
  aiGoal: AiGoal;
  onExit: () => void;
  rootOverride?: TreeNode;
  commandCounter?: CommandCounterResult;
}) {
  const root = rootOverride ?? getUnitTree(unitId, aiGoal);
  const [stack, setStack] = useState<TreeNode[]>([root]);
  const current = stack[stack.length - 1];
  const memos = memoKeys(current);

  function goTo(next: TreeNode) {
    setStack((s) => [...s, next]);
  }

  function goBack() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  function restart() {
    setStack([root]);
  }

  return (
    <div className="screen">
      <h1>{unitName}</h1>

      {commandCounter && (
        <>
          <div className="note">
            {commandCounter.triggered
              ? `Это ${COMMAND_INTERVAL}-й розыгрыш карты подряд — Приказ (Command 2) выполняется напрямую.`
              : `Розыгрыш подряд без Приказа: ${commandCounter.playCount} из ${COMMAND_INTERVAL}.`}
          </div>
          <MemoBox memoKey="commandCounterRule" aiGoal={aiGoal} />
        </>
      )}

      {current.type !== "action" && (
        <p className="question">{current.text}</p>
      )}
      {current.note && <p className="note">{current.note}</p>}
      {memos.map((key) => (
        <MemoBox key={key} memoKey={key} aiGoal={aiGoal} />
      ))}
      {memos.includes("keyPointValue") && <KeyPointCalculator />}
      {(memos.includes("targetSelection") || memos.includes("targetSelection_sniper")) && (
        <TargetCalculator
          priorityList={resolvePriorityList(
            memos.includes("targetSelection_sniper") ? "targetSelection_sniper" : "targetSelection",
            aiGoal,
          )}
        />
      )}
      {memos.includes("mortarSquareSelection") && (
        <MortarCalculator priorityList={resolvePriorityList("mortarSquareSelection", aiGoal)} />
      )}
      {memos.includes("reinforceUnitChoice") && (
        <ReinforceCalculator priorityList={resolvePriorityList("reinforceUnitChoice", aiGoal)} />
      )}

      {current.type === "question" && (
        <div className="options">
          <button className="primary" onClick={() => goTo(current.yes)}>
            Да
          </button>
          <button onClick={() => goTo(current.no)}>Нет</button>
        </div>
      )}

      {current.type === "choice" && (
        <div className="options">
          {current.options.map((opt, i) => (
            <button key={i} onClick={() => goTo(opt.next)}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {current.type === "action" && (
        <div className="action-result">
          <p className="action-text">{current.text}</p>
          <div className="options">
            <button className="primary" onClick={onExit}>
              Готово, выбрать другого юнита
            </button>
            <button onClick={restart}>Начать заново для этого юнита</button>
          </div>
        </div>
      )}

      {stack.length > 1 && current.type !== "action" && (
        <button className="link" onClick={goBack}>
          ← Назад
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [aiGoal, setAiGoal] = useState<AiGoal | null>(loadAiGoal());
  const [pickingGoal, setPickingGoal] = useState(aiGoal === null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(loadTheme());
  const [sergeantCounter, setSergeantCounter] = useState<CommandCounterResult | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function handlePickGoal(goal: AiGoal) {
    localStorage.setItem(AI_GOAL_KEY, goal);
    setAiGoal(goal);
    setPickingGoal(false);
  }

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
  }

  function handleSelectUnit(unitId: string) {
    if (unitId === "sergeant") {
      const result = advanceCommandCounter(loadSergeantCounter());
      localStorage.setItem(SERGEANT_COUNTER_KEY, String(result.nextStored));
      setSergeantCounter(result);
    } else {
      setSergeantCounter(null);
    }
    setSelectedUnitId(unitId);
  }

  let screen;
  if (pickingGoal || aiGoal === null) {
    screen = <AiGoalPicker current={aiGoal} onPick={handlePickGoal} />;
  } else if (selectedUnitId) {
    const unit = unitsList.find((u) => u.id === selectedUnitId)!;
    const rootOverride =
      unit.id === "sergeant" && sergeantCounter?.triggered ? getSergeantCommandNode(aiGoal) : undefined;
    screen = (
      <TreeWalker
        unitId={unit.id}
        unitName={unit.name}
        aiGoal={aiGoal}
        onExit={() => setSelectedUnitId(null)}
        rootOverride={rootOverride}
        commandCounter={unit.id === "sergeant" ? (sergeantCounter ?? undefined) : undefined}
      />
    );
  } else {
    screen = (
      <UnitPicker
        aiGoal={aiGoal}
        onSelect={handleSelectUnit}
        onChangeGoal={() => setPickingGoal(true)}
      />
    );
  }

  return (
    <>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      {screen}
    </>
  );
}
