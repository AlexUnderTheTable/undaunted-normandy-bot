import { useEffect, useState } from "react";
import { getUnitTree, resolveMemo, resolvePriorityList, unitsList } from "./data";
import type { AiGoal, TreeNode } from "./data/types";
import KeyPointCalculator from "./components/KeyPointCalculator";
import TargetCalculator from "./components/TargetCalculator";
import MortarCalculator from "./components/MortarCalculator";
import "./App.css";

const AI_GOAL_KEY = "undaunted-ai-goal";
const THEME_KEY = "undaunted-theme";

type Theme = "light" | "dark";

function loadAiGoal(): AiGoal | null {
  const stored = localStorage.getItem(AI_GOAL_KEY);
  return stored === "keyPoints" || stored === "suppression" ? stored : null;
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

function TreeWalker({
  unitId,
  unitName,
  aiGoal,
  onExit,
}: {
  unitId: string;
  unitName: string;
  aiGoal: AiGoal;
  onExit: () => void;
}) {
  const root = getUnitTree(unitId, aiGoal);
  const [stack, setStack] = useState<TreeNode[]>([root]);
  const current = stack[stack.length - 1];

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

      {current.type !== "action" && (
        <p className="question">{current.text}</p>
      )}
      {current.note && <p className="note">{current.note}</p>}
      {current.memo && <MemoBox memoKey={current.memo} aiGoal={aiGoal} />}
      {current.memo === "keyPointValue" && <KeyPointCalculator />}
      {(current.memo === "targetSelection" || current.memo === "targetSelection_sniper") && (
        <TargetCalculator priorityList={resolvePriorityList(current.memo, aiGoal)} />
      )}
      {current.memo === "mortarSquareSelection" && (
        <MortarCalculator priorityList={resolvePriorityList(current.memo, aiGoal)} />
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

  let screen;
  if (pickingGoal || aiGoal === null) {
    screen = <AiGoalPicker current={aiGoal} onPick={handlePickGoal} />;
  } else if (selectedUnitId) {
    const unit = unitsList.find((u) => u.id === selectedUnitId)!;
    screen = (
      <TreeWalker
        unitId={unit.id}
        unitName={unit.name}
        aiGoal={aiGoal}
        onExit={() => setSelectedUnitId(null)}
      />
    );
  } else {
    screen = (
      <UnitPicker
        aiGoal={aiGoal}
        onSelect={setSelectedUnitId}
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
