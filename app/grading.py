"""Baholash, tashxis va o'quvchi modelini yangilash (deterministik — LLM ishtirokisiz)."""
from .curriculum import ERRORS, ERROR_ACTIONS, QUESTION_SKILL, QUESTION_STEP
from .problems import fmt, parse_num

KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"]
LEVEL_WEIGHT = {"B1": 0.8, "B2": 1.0, "B3": 1.1, "B4": 1.2}


def grade(spec: dict, marks: dict) -> dict:
    """Bitta o'quvchi javoblarini tekshiradi.

    Qaytaradi: {correct, total, steps: [{key, step, ok, given, expected, error}], primary_error, errors, action}
    """
    qs = {q["key"]: q for q in spec["questions"]}
    steps = []
    for key in KEYS:
        q = qs[key]
        given = marks.get(key)
        if key == "q5":
            expected = q["answer"]
            g = parse_num(given) if given else None
            ok = g is not None and g == parse_num(expected)
            error = None
            if not ok:
                norm = fmt(g) if g is not None and g > 0 else given
                error = "javob_yoq" if not given else q.get("numeric_errors", {}).get(norm, "hisoblash")
        else:
            opt = next((o for o in q["options"] if o["letter"] == given), None)
            expected = next(o["letter"] for o in q["options"] if o["correct"])
            ok = bool(opt and opt["correct"])
            error = None if ok else ("javob_yoq" if not opt else opt["error"])
        steps.append({"key": key, "step": QUESTION_STEP[key], "skill": QUESTION_SKILL[key], "ok": ok,
                      "given": given, "expected": expected, "error": error})

    by_key = {s["key"]: s for s in steps}
    primary = None
    if not by_key["q1"]["ok"] or not by_key["q2"]["ok"]:
        primary = by_key["q1"]["error"] if not by_key["q1"]["ok"] else by_key["q2"]["error"]
    elif not by_key["q3"]["ok"]:
        primary = by_key["q3"]["error"]
    elif not by_key["q4"]["ok"] or not by_key["q5"]["ok"]:
        primary = by_key["q5"]["error"] if not by_key["q5"]["ok"] else by_key["q4"]["error"]
    elif not by_key["q6"]["ok"]:
        primary = by_key["q6"]["error"]
    elif not by_key["q7"]["ok"]:
        primary = by_key["q7"]["error"] or "tayanch_xona"

    errors = sorted({s["error"] for s in steps if s["error"]})
    linked = not by_key["q6"]["ok"] and not by_key["q7"]["ok"]
    link_note = {"talqin_vaqt": "muammo bugungi mavzuda emas, vaqt birliklarida.",
                 "tayanch_xona": "muammo bugungi mavzuda emas, xona birliklarida (10, 100, 1000 ga amallar).",
                 "tayanch_kasr": "muammo bugungi mavzuda emas, sonning qismini topishda."}.get(
                     by_key["q7"]["error"] or "", "muammo bugungi mavzuda emas, tayanch bilimda.")
    correct = sum(s["ok"] for s in steps)
    return {
        "correct": correct, "total": len(steps), "steps": steps,
        "primary_error": primary, "errors": errors,
        "primary_text": ERRORS.get(primary, "Mavzu o'zlashtirilgan") if primary else "Mavzu o'zlashtirilgan",
        "action": ERROR_ACTIONS.get(primary, "Keyingi safar yuqoriroq daraja (B3–B4) va “masala tuzish” topshirig'i."),
        "root_cause_note": ("Talqindagi xato va oldingi mavzu savolidagi xato bir-biriga bog'liq: " + link_note) if linked else None,
    }


def total_ratio(correct: int, total: int, open_score=None, open_max=None) -> float:
    """Yopiq javoblar + qo'lda yozilgan yechim bahosining umumiy ulushi (0–1)."""
    if open_score is not None and open_max:
        return (correct + float(open_score)) / (total + int(open_max))
    return correct / total if total else 0.0


def formative_points(correct: int, total: int, open_score=None, open_max=None) -> int:
    """100 ballik tizimdagi formativ baholash (0–10) uchun taklif."""
    return round(10 * total_ratio(correct, total, open_score, open_max))


def update_skills(old: dict, result: dict, level: str) -> dict:
    """Ko'nikma ballarini yangilash: new = old + k·(natija − old)."""
    k = 0.35 * LEVEL_WEIGHT.get(level, 1.0)
    per_skill = {}
    for s in result["steps"]:
        per_skill.setdefault(s["skill"], []).append(1.0 if s["ok"] else 0.0)
    new = dict(old)
    for skill, vals in per_skill.items():
        observed = sum(vals) / len(vals)
        prev = old.get(skill, 0.5)
        new[skill] = round(min(max(prev + min(k, 0.5) * (observed - prev), 0.02), 0.99), 3)
    return new
