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


def reinforce_chain(order, fallback):
    """«Остались карты X в резерве?» по всем 5 типам, в том же порядке
    приоритета. Заменяет прежний общий вопрос «Можно пополнить?» —
    присутствие карты нужного типа в резерве и есть точная проверка
    «можно ли пополнить с пользой» (OPEN_QUESTIONS.md п. 13)."""
    node = fallback
    for unit in reversed(order):
        g = GENITIVE[unit]
        node = question(
            f"В вашем личном резерве ещё остались карты {g}?",
            action(f"Пополнить: карта {g}", memo=["reinforceRule", "reinforceUnitChoice"]),
            node,
            memo=["reinforceRule", "reinforceUnitChoice"],
        )
    return node


NO_ACTION = action("Нет доступного действия")


def build_sergeant(order):
    # §12: 1. Пополнить, 2. Приказать.
    order_step = question(
        "Есть юнит, который прямо сейчас может атаковать или захватить ключевую точку?",
        action("Приказать этому юниту атаковать/захватить точку"),
        NO_ACTION,
        note="Приказ отдаётся ближайшему такому юниту; если подходит несколько — тому, у кого выше приоритет атаки.",
    )
    return reinforce_chain(order, order_step)


def build_lieutenant(order):
    # §12: 1. Направить стрелка к точке, 2. Пополнить, 3. Направить боевой юнит к врагу.
    direct_combat = question(
        "Можно направить боевой юнит к ближайшему врагу?",
        action("Направить боевой юнит к ближайшему врагу"),
        NO_ACTION,
    )
    reinforce = reinforce_chain(order, direct_combat)
    return question(
        "Можно направить стрелка к ключевой точке?",
        action("Направить стрелка к ключевой точке"),
        reinforce,
    )


def build_commander(order):
    # §12: 1. Воодушевить, 2. Пополнить (если воодушевлять некого).
    reinforce = reinforce_chain(order, NO_ACTION)
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
