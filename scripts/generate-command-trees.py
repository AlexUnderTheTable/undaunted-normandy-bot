#!/usr/bin/env python3
"""Генерирует sergeant.json, lieutenant.json, commander.json.

Деревья командиров (§12 bot_script.txt) перебирают все 5 типов юнита
при воодушевлении (INSPIRE) и пополнении (BOLSTER), в порядке
приоритета текущей цели ИИ (OPEN_QUESTIONS.md п. 14). Это 5 типов × 2
цели ИИ = до 10 веток на файл — писать и держать в согласованном виде
от руки нереально, поэтому деревья порождаются этим скриптом из
common.json, а не редактируются вручную.

Запуск (из корня проекта): python scripts/generate-command-trees.py
После запуска — `npm test` и `npm run build`, чтобы проверить результат.

Если нужно поменять текст вопроса/действия, порядок шагов командира
или список приоритета — правьте здесь или в common.json, затем
перезапустите скрипт. Ручная правка сгенерированных .json назад в этот
скрипт не переносится и будет потеряна при следующем запуске.
"""
import collections
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "src", "data")

# Родительный падеж — уже используется в "Жетон X есть на поле" по всему проекту.
GENITIVE = {
    "Стрелок": "стрелка",
    "Разведчик": "разведчика",
    "Снайпер": "снайпера",
    "Пулемётчик": "пулемётчика",
    "Миномёт": "миномёта",
}


def load(path):
    return json.load(io.open(path, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)


def save(path, data):
    io.open(path, "w", encoding="utf-8").write(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def action(text, memo=None):
    node = collections.OrderedDict([("type", "action"), ("text", text)])
    if memo:
        node["memo"] = memo
    return node


def question(text, yes, no, memo=None, note=None):
    node = collections.OrderedDict([("type", "question"), ("text", text)])
    if memo:
        node["memo"] = memo
    if note:
        node["note"] = note
    node["yes"] = yes
    node["no"] = no
    return node


def inspire_chain(order, fallback):
    """«Есть сыгранная карта X его отделения?» по всем 5 типам, в порядке
    приоритета текущей цели ИИ. У стрелка — доп. условие из §12
    (может продвинуться к точке); у остальных типов условие только
    одно — карта есть в зоне розыгрыша (это и есть весь эффект INSPIRE
    по правилам игры, без дополнительных условий)."""
    node = fallback
    for unit in reversed(order):
        g = GENITIVE[unit]
        extra = ", и этот стрелок может продвинуться к ключевой точке" if unit == "Стрелок" else ""
        node = question(
            f"В зоне розыгрыша есть уже сыгранная карта {g} его отделения{extra}?",
            action(f"Воодушевить {g}", memo="inspireRule"),
            node,
            memo="inspireRule",
        )
    return node


def reinforce_step(fallback, bolster_note=None):
    """Единый вопрос пополнения (OPEN_QUESTIONS.md п. 17): раньше здесь была
    цепочка «Остались карты X в резерве?» по всем 5 типам подряд — за
    столом это было медленнее, чем прикинуть сразу. Теперь это один вопрос;
    интерфейс сам показывает `ReinforceCalculator` — чекбоксы по всем 5
    типам сразу, который считает приоритет текущей цели ИИ через
    `resolvePriorityList("reinforceUnitChoice", aiGoal)`. Поэтому, в отличие
    от `inspire_chain`, порядок приоритета сюда не передаётся: сам текст
    вопроса от aiGoal не зависит."""
    return question(
        "В резерве есть карты юнита, которым стоит пополниться (см. калькулятор ниже)?",
        action(
            "Пополнить: юнитом, который показал калькулятор выше",
            memo=["reinforceRule", "reinforceUnitChoice"],
        ),
        fallback,
        memo=["reinforceRule", "reinforceUnitChoice"],
        note=bolster_note,
    )


NO_ACTION = action("Нет доступного действия")

SERGEANT_BOLSTER_NOTE = (
    "На карте Командира взвода (Platoon Sergeant) — Bolster 3: можно взять до 3 карт "
    "суммарно, любых типов юнита и любого отделения (у этой карты нет привязки к "
    "отделению). Берите карты по одной, начиная с высшего приоритета в этом списке, "
    "пока не наберёте 3 штуки или не кончится резерв."
)
LIEUTENANT_BOLSTER_NOTE = (
    "На карте Заместителя командира (Platoon Guide) — Bolster 1: только одна карта за "
    "розыгрыш, любого типа и отделения (у этой карты нет привязки к отделению)."
)


def build_sergeant(order):
    # §12 bot_script.txt называет второй шаг «Приказать», но это неточный перевод:
    # по правилам это Command 2 — взять 2 карты из своей колоды в руку и сразу же
    # разыграть их в этот же ход. Выбора юнита тут нет вообще — какая карта
    # вытянулась, та и играется по своему обычному дереву решений.
    command_step = action(
        "Приказ (Command 2): взять 2 карты из своей колоды в руку и сыграть их немедленно",
        memo="commandAction",
    )
    return reinforce_step(command_step, bolster_note=SERGEANT_BOLSTER_NOTE)


def build_lieutenant(order):
    # §12: 1. Направить стрелка к точке, 2. Пополнить, 3. Направить боевой юнит к врагу.
    # У Guide подтверждены только два реальных действия — «двигать юнит» и
    # «пополнить» — Command/Приказ на этой карте не подтверждён (сверьтесь со
    # своей картой, если на ней есть третье действие — см. OPEN_QUESTIONS.md п. 15).
    direct_combat = question(
        "Можно направить боевой юнит к ближайшему врагу?",
        action("Направить боевой юнит к ближайшему врагу"),
        NO_ACTION,
    )
    reinforce = reinforce_step(direct_combat, bolster_note=LIEUTENANT_BOLSTER_NOTE)
    return question(
        "Можно направить стрелка к ключевой точке?",
        action("Направить стрелка к ключевой точке"),
        reinforce,
    )


COMMANDER_BOLSTER_NOTE = (
    "Точное число карт для Bolster на карте Командира отделения (Squad Leader) не "
    "подтверждено — сверьтесь со своей картой. В отличие от Сержанта и Заместителя "
    "здесь есть привязка к отделению: берите только карты своего отделения (A/B/C)."
)


def build_commander(order):
    # §12: 1. Воодушевить, 2. Пополнить (если воодушевлять некого).
    reinforce = reinforce_step(NO_ACTION, bolster_note=COMMANDER_BOLSTER_NOTE)
    return inspire_chain(order, reinforce)


def main():
    common = load(os.path.join(DATA_DIR, "common.json"))
    key_points_order = common["priorityLists"]["keyPoints"]
    suppression_order = common["priorityLists"]["suppression"]

    units = [
        ("sergeant.json", "sergeant", "Командир взвода", build_sergeant),
        ("lieutenant.json", "lieutenant", "Заместитель командира", build_lieutenant),
        ("commander.json", "commander", "Командир отделения", build_commander),
    ]

    for filename, unit_id, name, build in units:
        data = collections.OrderedDict([
            ("id", unit_id),
            ("name", name),
            ("trees", collections.OrderedDict([
                ("keyPoints", build(key_points_order)),
                ("suppression", build(suppression_order)),
            ])),
        ])
        save(os.path.join(DATA_DIR, filename), data)
        print(f"wrote {filename}")


if __name__ == "__main__":
    main()
