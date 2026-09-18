"""Parametrik masala generatori.

Sonlar va to'g'ri javoblar faqat shu yerda (kod bilan) hisoblanadi. LLM keyinroq faqat
masala matnini chiroyli qilib qayta yozadi, sonlarga tegmaydi.
Har bir noto'g'ri variant (distraktor) aniq xato turiga bog'langan — tashxis shunga asoslanadi.
"""
import random
from fractions import Fraction

TEMPLATES = {
    "amallar_tartibi": "Amallar tartibi va matnli masala (AHA! 2-bob)",
    "qolgan_qism": "Qolgan qismning qismi (AHA! 3-bob)",
    "qarama_qarshi": "Qarama-qarshi harakatga doir masala",
    "quvib_yetish": "Bir yo'nalishdagi harakat (quvib yetish)",
}


def fmt(x) -> str:
    """Sonni o'zbekcha ko'rinishda yozish: 2.4 -> '2,4', 12.0 -> '12'."""
    x = Fraction(x).limit_denominator(1000)
    if x.denominator == 1:
        return str(x.numerator)
    s = f"{float(x):.2f}".rstrip("0").rstrip(".")
    return s.replace(".", ",")


def parse_num(s: str):
    try:
        return Fraction(s.replace(",", ".").strip())
    except (ValueError, ZeroDivisionError):
        return None


def nice(x, max_decimals=1) -> bool:
    x = Fraction(x)
    return (x * 10 ** max_decimals).denominator == 1


def fits_grid(x) -> bool:
    """Javob son panjarasiga (4 ustun: raqamlar va vergul) sig'adimi."""
    return len(fmt(x)) <= 4 and x > 0


def _mc(rng, correct: str, distractors, extra=()):
    """4 variantli test savoli. distractors/extra: [(matn, xato_turi)]."""
    seen = {correct}
    opts = [{"text": correct, "correct": True, "error": None}]
    for text, err in list(distractors) + list(extra):
        if len(opts) == 4:
            break
        if text in seen:
            continue
        seen.add(text)
        opts.append({"text": text, "correct": False, "error": err})
    rng.shuffle(opts)
    for letter, o in zip("ABCD", opts):
        o["letter"] = letter
    return opts


def _hours_minutes(t: Fraction) -> str:
    h = int(t)
    m = int((t - h) * 60)
    return f"{h} soat {m} minut" if m else f"{h} soat"


def _q6_time(rng, t: Fraction):
    h = int(t)
    frac = t - h
    tenths = int(frac * 10)
    return {
        "key": "q6",
        "text": f"{fmt(t)} soat — bu necha soat necha minut?",
        "options": _mc(rng, _hours_minutes(t), [
            (f"{h} soat {int(frac * 100)} minut", "talqin_vaqt"),
            (f"{h} soat {tenths} minut", "talqin"),
            (f"{h + 1} soat", "talqin"),
        ], extra=[(f"{h} soat {int(frac * 100) + 10} minut", "talqin_vaqt")]),
    }


def _q7(rng):
    a = rng.choice([1, 2, 3, 4])
    b = rng.choice([15, 20, 25, 35, 40, 45, 50])
    return {
        "key": "q7",
        "text": f"Oldingi mavzu: {a} soat {b} minut necha minut bo'ladi?",
        "options": _mc(rng, str(a * 60 + b), [
            (f"{a}{b}", "tayanch_vaqt"),
            (str(a * 60), "tayanch_vaqt"),
            (str(a + b), "tayanch_vaqt"),
        ], extra=[(str(a * 60 + b + 10), "tayanch_vaqt")]),
    }


def _numeric_errors(candidates, answer):
    out = {}
    for value, err in candidates:
        if value is None or value <= 0 or not nice(value, 2) or value == answer:
            continue
        out.setdefault(fmt(value), err)
    return out


VEHICLES_OPPOSITE = [("avtobus", "yengil mashina"), ("yuk mashinasi", "avtobus"), ("velosipedchi", "mototsiklchi")]


def gen_qarama_qarshi(level: str, rng: random.Random) -> dict:
    veh1, veh2 = rng.choice(VEHICLES_OPPOSITE)
    for _ in range(500):
        h = 0
        if level == "B1":
            v1 = rng.choice([20, 30, 40]); v2 = v1 + rng.choice([10, 20, 30])
            t = Fraction(rng.choice([2, 3, 4]))
            d = (v1 + v2) * t
        elif level == "B2":
            v1 = rng.choice([40, 50, 60]); v2 = rng.choice([70, 80, 90])
            t = Fraction(rng.choice(["1.2", "1.5", "1.8", "2.4", "2.5", "3.2"]))
            d = (v1 + v2) * t
        elif level == "B3":
            v1 = rng.choice([40, 50, 60]); v2 = rng.choice([70, 80, 90]); h = 1
            t = Fraction(rng.choice(["1.5", "2", "2.5", "3", "2.4"]))
            d = v1 * h + (v1 + v2) * t
        else:  # B4
            v1 = rng.choice([40, 50, 60]); v2 = rng.choice([70, 80, 90])
            t = Fraction(rng.choice(["1.5", "2", "2.5", "3"]))
            d = (v1 + v2) * t
        if d.denominator == 1 and (v1 * t).denominator == 1:
            break
    d = int(d)
    ans = v1 * t if level == "B4" else t
    unit = "km" if level == "B4" else "soat"

    if level == "B3":
        story = (f"A shahardan B shaharga qarab {veh1} soatiga {v1} km tezlik bilan yo'lga chiqdi. "
                 f"Oradan {h} soat o'tgach, B shahardan A shaharga qarab {veh2} soatiga {v2} km tezlik bilan yo'lga chiqdi. "
                 f"Shaharlar orasidagi masofa {d} km.")
        ask = f"{veh2.capitalize()} yo'lga chiqqanidan necha soat keyin ular uchrashadi?"
        required = [d, v1, v2, h]
    else:
        story = (f"Ikki shahar orasidagi masofa {d} km. Bir vaqtning o'zida A shahardan {veh1} soatiga {v1} km, "
                 f"B shahardan {veh2} soatiga {v2} km tezlik bilan bir-biriga qarab yo'lga chiqdi.")
        ask = ("Uchrashuv joyi A shahardan necha km uzoqlikda bo'ladi?" if level == "B4"
               else "Ular necha soatdan keyin uchrashadi?")
        required = [d, v1, v2]

    asked = {"B3": f"{veh2} chiqqanidan keyin uchrashuvgacha o'tadigan vaqt",
             "B4": "uchrashuv joyining A shahardan uzoqligi"}.get(level, "uchrashguncha o'tadigan vaqt")
    q1 = {"key": "q1", "text": "Masalada nima so'ralmoqda?", "options": _mc(rng, asked, [
        ("transportlarning tezligi", "tushunish"),
        ("shaharlar orasidagi masofa", "tushunish"),
        ("uchrashguncha o'tadigan vaqt" if level == "B4" else "qaysi transport tezroq ekanligi", "tushunish"),
    ])}
    given = "masofa, ikkala tezlik va kechikish vaqti" if level == "B3" else "masofa va ikkala tezlik"
    q2 = {"key": "q2", "text": "Masalada qaysi ma'lumotlar berilgan?", "options": _mc(rng, given, [
        ("vaqt va ikkala tezlik", "malumot"),
        ("faqat masofa", "malumot"),
        ("masofa va uchrashuv vaqti", "malumot"),
    ], extra=[("masofa va ikkala tezlik", "malumot")])}

    if level == "B3":
        q3 = {"key": "q3", "text": "Qaysi ifoda masalani to'g'ri modellashtiradi?", "options": _mc(rng,
              f"({d} − {v1}) : ({v1} + {v2})", [
                  (f"{d} : ({v1} + {v2})", "model_kechikish"),
                  (f"({d} − {v1}) : ({v2} − {v1})", "model_yonalish"),
                  (f"({d} − {v1}) · ({v1} + {v2})", "model_amal"),
              ])}
    else:
        text = ("Avval uchrashuv vaqtini topish uchun qaysi ifoda to'g'ri?" if level == "B4"
                else "Qaysi ifoda masalani to'g'ri modellashtiradi?")
        q3 = {"key": "q3", "text": text, "options": _mc(rng, f"{d} : ({v1} + {v2})", [
            (f"{d} : {v2}", "model_obyekt"),
            (f"{d} : ({v2} − {v1})", "model_yonalish"),
            (f"({v1} + {v2}) · {d}", "model_amal"),
        ])}

    q4 = {"key": "q4", "text": "Ikkalasi bir soatda bir-biriga necha km yaqinlashadi?", "options": _mc(rng, f"{v1 + v2} km", [
        (f"{v2 - v1} km", "model_yonalish"),
        (f"{v1 * v2} km", "model_amal"),
        (f"{v1 + v2 + 10} km", "hisoblash"),
    ])}

    if level == "B4":
        numeric = _numeric_errors([(t, "talqin"), (v2 * t, "model_obyekt"), (Fraction(d), "talqin")], ans)
    elif level == "B3":
        numeric = _numeric_errors([(Fraction(d, v1 + v2), "model_kechikish"),
                                   (Fraction(d - v1, v2 - v1), "model_yonalish")], ans)
    else:
        numeric = _numeric_errors([(Fraction(d, v2 - v1), "model_yonalish"), (Fraction(d, v2), "model_obyekt"),
                                   (Fraction(d, v1), "model_obyekt")], ans)
    q5 = {"key": "q5", "text": f"Masala javobini hisoblang va son panjarasiga yozing ({unit}da).",
          "answer": fmt(ans), "unit": unit, "numeric_errors": numeric}

    if level == "B4":
        q6 = {"key": "q6", "text": "Uchrashuv joyi B shahardan necha km uzoqlikda?", "options": _mc(rng, f"{fmt(v2 * t)} km", [
            (f"{fmt(v1 * t)} km", "talqin"), (f"{d} km", "talqin"), (f"{v1 + v2} km", "talqin"),
        ], extra=[(f"{fmt(v2 * t + 10)} km", "talqin"), (f"{fmt(v2 * t - 10)} km", "talqin")])}
    elif t.denominator != 1:
        q6 = _q6_time(rng, t)
    else:
        total = t + h
        q6 = {"key": "q6", "text": f"Uchrashguncha {veh1} necha km yo'l bosadi?", "options": _mc(rng, f"{fmt(v1 * total)} km", [
            (f"{d} km", "talqin"), (f"{fmt(v2 * t)} km", "talqin"), (f"{v1 + v2} km", "talqin"),
        ], extra=[(f"{fmt(v1 * t + 10)} km", "talqin")])}

    return {
        "template": "qarama_qarshi", "level": level,
        "params": {"d": d, "v1": v1, "v2": v2, "h": h, "t": fmt(t), "veh1": veh1, "veh2": veh2},
        "story": story, "story_fallback": story, "ask": ask, "story_source": "shablon",
        "numbers_required": [fmt(x) for x in required if x],
        "answer": fmt(ans), "unit": unit,
        "questions": [q1, q2, q3, q4, q5, q6, _q7(rng)],
    }


def gen_quvib_yetish(level: str, rng: random.Random) -> dict:
    veh1, veh2 = "velosipedchi", "mototsiklchi"
    for _ in range(1000):
        h = 0
        v1 = rng.choice([12, 14, 15, 16, 18, 20])
        if level == "B3":
            h = rng.choice([1, 2])
            v2 = v1 + rng.choice([6, 8, 10, 12, 15, 20, 24, 30])
            t = Fraction(v1 * h, v2 - v1)
            d = 0
        else:
            diff = rng.choice([20, 24, 25, 30, 40])
            v2 = v1 + diff
            t = Fraction(rng.choice(["2", "3"])) if level == "B1" else Fraction(rng.choice(["1.5", "2.5", "1.2", "2.4"]))
            d = diff * t
        ans = v2 * t if level == "B4" else t
        ok = nice(t, 1) and Fraction(1, 2) <= t <= 5 and Fraction(d).denominator == 1 and nice(ans, 1) and fits_grid(ans)
        if level == "B1":
            ok = ok and t.denominator == 1
        if level == "B2":
            ok = ok and t.denominator != 1
        if ok:
            break
    d = int(d)
    unit = "km" if level == "B4" else "soat"

    if level == "B3":
        story = (f"Qishloqdan {veh1} soatiga {v1} km tezlik bilan yo'lga chiqdi. {h} soatdan keyin xuddi shu joydan "
                 f"shu yo'nalishda {veh2} soatiga {v2} km tezlik bilan yo'lga chiqdi.")
        ask = f"{veh2.capitalize()} {veh1}ga necha soatda yetib oladi?"
        required = [v1, h, v2]
    else:
        story = (f"Oralaridagi masofa {d} km bo'lgan ikki nuqtadan bir vaqtda bir xil yo'nalishda harakat boshlandi: "
                 f"oldinda {veh1} soatiga {v1} km, orqada {veh2} soatiga {v2} km tezlik bilan harakatlanmoqda.")
        ask = (f"{veh2.capitalize()} yetib olguncha necha km yo'l bosadi?" if level == "B4"
               else f"{veh2.capitalize()} {veh1}ga necha soatda yetib oladi?")
        required = [d, v1, v2]

    asked = f"{veh2} yetib olguncha bosadigan yo'l" if level == "B4" else "yetib olish uchun ketadigan vaqt"
    q1 = {"key": "q1", "text": "Masalada nima so'ralmoqda?", "options": _mc(rng, asked, [
        ("ikkalasining tezligi", "tushunish"),
        ("ular orasidagi dastlabki masofa", "tushunish"),
        ("yetib olish uchun ketadigan vaqt" if level == "B4" else "kim tezroq harakatlanishi", "tushunish"),
    ])}
    given = "ikkala tezlik va kechikish vaqti" if level == "B3" else "dastlabki masofa va ikkala tezlik"
    q2 = {"key": "q2", "text": "Masalada qaysi ma'lumotlar berilgan?", "options": _mc(rng, given, [
        ("yetib olish vaqti va tezlik", "malumot"),
        ("faqat tezliklar", "malumot"),
        ("masofa va vaqt", "malumot"),
    ], extra=[("dastlabki masofa va ikkala tezlik", "malumot")])}

    if level == "B3":
        q3 = {"key": "q3", "text": "Qaysi ifoda masalani to'g'ri modellashtiradi?", "options": _mc(rng,
              f"({v1} · {h}) : ({v2} − {v1})", [
                  (f"({v1} · {h}) : ({v1} + {v2})", "model_yonalish"),
                  (f"({v1} · {h}) : {v2}", "model_obyekt"),
                  (f"({v2} − {v1}) · {h}", "model_amal"),
              ])}
    else:
        text = ("Avval yetib olish vaqtini topish uchun qaysi ifoda to'g'ri?" if level == "B4"
                else "Qaysi ifoda masalani to'g'ri modellashtiradi?")
        q3 = {"key": "q3", "text": text, "options": _mc(rng, f"{d} : ({v2} − {v1})", [
            (f"{d} : ({v1} + {v2})", "model_yonalish"),
            (f"{d} : {v2}", "model_obyekt"),
            (f"({v2} − {v1}) · {d}", "model_amal"),
        ])}

    q4 = {"key": "q4", "text": f"{veh2.capitalize()} {veh1}ga bir soatda necha km yaqinlashadi?", "options": _mc(rng,
          f"{v2 - v1} km", [
              (f"{v1 + v2} km", "model_yonalish"),
              (f"{v2} km", "model_obyekt"),
              (f"{v2 - v1 + 5} km", "hisoblash"),
          ])}

    if level == "B3":
        numeric = _numeric_errors([(Fraction(v1 * h, v1 + v2), "model_yonalish"), (Fraction(v1 * h, v2), "model_obyekt")], ans)
    elif level == "B4":
        numeric = _numeric_errors([(t, "talqin"), (v1 * t, "talqin"), (Fraction(d), "talqin")], ans)
    else:
        numeric = _numeric_errors([(Fraction(d, v1 + v2), "model_yonalish"), (Fraction(d, v2), "model_obyekt")], ans)
    q5 = {"key": "q5", "text": f"Masala javobini hisoblang va son panjarasiga yozing ({unit}da).",
          "answer": fmt(ans), "unit": unit, "numeric_errors": numeric}

    if level == "B4":
        q6 = {"key": "q6", "text": f"Yetib olgan paytda {veh1} necha km yo'l bosgan bo'ladi?", "options": _mc(rng,
              f"{fmt(v1 * t)} km", [(f"{fmt(v2 * t)} km", "talqin"), (f"{d} km", "talqin"), (f"{v2 - v1} km", "talqin")],
              extra=[(f"{fmt(v1 * t + 10)} km", "talqin"), (f"{fmt(v1 * t + 20)} km", "talqin")])}
    elif t.denominator != 1:
        q6 = _q6_time(rng, t)
    else:
        q6 = {"key": "q6", "text": f"Yetib olgan paytda {veh2} necha km yo'l bosgan bo'ladi?", "options": _mc(rng,
              f"{fmt(v2 * t)} km", [(f"{fmt(v1 * t)} km", "talqin"), (f"{v2 - v1} km", "talqin"), (f"{v1 + v2} km", "talqin")],
              extra=[(f"{fmt(v2 * t + 10)} km", "talqin")])}

    return {
        "template": "quvib_yetish", "level": level,
        "params": {"d": d, "v1": v1, "v2": v2, "h": h, "t": fmt(t), "veh1": veh1, "veh2": veh2},
        "story": story, "story_fallback": story, "ask": ask, "story_source": "shablon",
        "numbers_required": [fmt(x) for x in required if x],
        "answer": fmt(ans), "unit": unit,
        "questions": [q1, q2, q3, q4, q5, q6, _q7(rng)],
    }


# ------------------------------------------------------------------ AHA! 2-bob: sonlar ustida to'rt amal
def _q7_xona(rng):
    """Oldingi mavzu: 10, 100, 1000 ga ko'paytirish va bo'lish (xona birliklari)."""
    if rng.random() < 0.5:
        x = rng.choice([12, 24, 36, 45, 58, 63, 74])
        mult = rng.choice([100, 1000])
        return {"key": "q7", "text": f"Oldingi mavzu: {x} · {mult} nechaga teng?",
                "options": _mc(rng, str(x * mult), [
                    (str(x * mult // 10), "tayanch_xona"),
                    (str(x * mult * 10), "tayanch_xona"),
                    (str(x + mult), "tayanch_xona"),
                ])}
    x = rng.choice([1200, 2400, 3600, 4800, 7200])
    div = rng.choice([100, 10])
    return {"key": "q7", "text": f"Oldingi mavzu: {x} : {div} nechaga teng?",
            "options": _mc(rng, str(x // div), [
                (str(x // div // 10), "tayanch_xona"),
                (str(x // div * 10), "tayanch_xona"),
                (str(x - div), "tayanch_xona"),
            ])}


def gen_amallar_tartibi(level: str, rng: random.Random) -> dict:
    """Ko'p amalli matnli masala: ifodani qavs bilan to'g'ri tuzish va amallar tartibi (AHA! I qism, 29–44-betlar)."""
    for _ in range(600):
        a = rng.choice([12, 14, 15, 16, 18, 20, 24, 25])
        b = rng.choice([25, 30, 40, 50, 60, 80, 100, 125])
        c = rng.choice([100, 150, 200, 250, 300, 400])
        d = rng.choice([20, 25, 40, 50])
        e = rng.choice([8, 10, 12, 15])
        k = rng.choice([4, 5, 6, 8, 10])
        total = a * b if level in ("B1", "B2") else a * b + e * d
        rest = total - c
        ans = rest if level == "B1" else (rest if level == "B4" else (total if level == "B3" else rest))
        if level == "B2":
            ans = rest
        if level == "B3":
            ans = total
        if level in ("B2", "B3", "B4"):
            if ans % k:
                continue
            ans //= k
        if 10 <= ans <= 9999 and rest > 0 and total <= 9999 and c < total:
            break
    else:
        a, b, c, d, e, k = 20, 50, 200, 25, 8, 4
        total = a * b if level in ("B1", "B2") else a * b + e * d
        rest = total - c
        ans = rest if level == "B1" else ((total if level == "B3" else rest) // k)

    if level == "B1":
        story = (f"Maktab kutubxonasiga {a} ta quti daftar keltirildi, har bir qutida {b} tadan daftar bor. "
                 f"Birinchi kuni {c} ta daftar sinflarga tarqatildi.")
        ask = "Kutubxonada nechta daftar qoldi?"
        required, expr = [a, b, c], f"{a} · {b} − {c}"
        wrong_exprs = [(f"{a} + {b} − {c}", "model_amal"), (f"{a} · ({b} − {c})", "model_tartib"), (f"{a} · {b} + {c}", "model_amal")]
        asked = "kutubxonada qolgan daftarlar soni"
        given = "qutilar soni, bir qutidagi daftarlar soni va tarqatilgan daftarlar soni"
    elif level == "B2":
        story = (f"Maktab kutubxonasiga {a} ta quti daftar keltirildi, har bir qutida {b} tadan daftar bor. "
                 f"Ulardan {c} tasi sinflarga tarqatildi, qolganlari {k} ta javonga teng taqsimlandi.")
        ask = "Har bir javonga nechtadan daftar joylandi?"
        required, expr = [a, b, c, k], f"({a} · {b} − {c}) : {k}"
        wrong_exprs = [(f"{a} · {b} − {c} : {k}", "model_tartib"), (f"{a} · {b} : {k} − {c}", "model_tartib"),
                       (f"({a} · {b} + {c}) : {k}", "model_amal")]
        asked = "bitta javondagi daftarlar soni"
        given = "qutilar soni, bir qutidagi daftarlar, tarqatilgani va javonlar soni"
    elif level == "B3":
        story = (f"Do'konga {a} ta quti daftar keltirildi, har birida {b} tadan; yana {e} ta quti keltirildi, "
                 f"har birida {d} tadan daftar bor. Hamma daftarlar {k} ta javonga teng taqsimlandi.")
        ask = "Har bir javonga nechtadan daftar joylandi?"
        required, expr = [a, b, e, d, k], f"({a} · {b} + {e} · {d}) : {k}"
        wrong_exprs = [(f"{a} · {b} + {e} · {d} : {k}", "model_tartib"), (f"({a} + {e}) · ({b} + {d}) : {k}", "model_amal"),
                       (f"({a} · {b} + {e} · {d}) · {k}", "model_amal")]
        asked = "bitta javondagi daftarlar soni"
        given = "ikkala partiyadagi qutilar va daftarlar soni hamda javonlar soni"
    else:  # B4
        story = (f"Do'konga {a} ta quti daftar keltirildi, har birida {b} tadan; yana {e} ta quti keltirildi, "
                 f"har birida {d} tadan daftar bor. Ulardan {c} tasi sotildi, qolganlari {k} ta javonga teng taqsimlandi.")
        ask = "Har bir javonga nechtadan daftar joylandi?"
        required, expr = [a, b, e, d, c, k], f"({a} · {b} + {e} · {d} − {c}) : {k}"
        wrong_exprs = [(f"{a} · {b} + {e} · {d} − {c} : {k}", "model_tartib"),
                       (f"({a} · {b} + {e} · {d}) : {k} − {c}", "model_tartib"),
                       (f"({a} · {b} + {e} · {d} + {c}) : {k}", "model_amal")]
        asked = "bitta javondagi daftarlar soni"
        given = "ikkala partiyadagi qutilar va daftarlar, sotilgani va javonlar soni"

    q1 = {"key": "q1", "text": "Masalada nima so'ralmoqda?", "options": _mc(rng, asked, [
        ("jami keltirilgan daftarlar soni", "tushunish"),
        ("sotilgan yoki tarqatilgan daftarlar soni", "tushunish"),
        ("qutilar soni", "tushunish"),
    ])}
    q2 = {"key": "q2", "text": "Masalada qaysi ma'lumotlar berilgan?", "options": _mc(rng, given, [
        ("jami daftarlar soni va javonlar soni", "malumot"),
        ("bitta javondagi daftarlar soni", "malumot"),
        ("faqat qutilar soni va javonlar soni", "malumot"),
    ])}
    q3 = {"key": "q3", "text": "Qaysi ifoda masalani to'g'ri modellashtiradi?", "options": _mc(rng, expr, wrong_exprs)}

    partial = [(str(a + b), "model_amal")] if level in ("B1", "B2") else [(str(a * b), "oraliq_javob")]
    q4 = {"key": "q4", "text": "Jami nechta daftar keltirildi?", "options": _mc(rng, str(total), partial + [
        (str(total * 10), "tayanch_xona"),
        (str(total // 10), "tayanch_xona"),
    ], extra=[(str(total + b), "hisoblash"), (str(total - b), "hisoblash")])}

    numeric = {}
    if level == "B1":
        numeric = {fmt(total): "oraliq_javob", fmt(total + c): "model_amal"}
    elif level == "B2":
        numeric = {fmt(rest): "oraliq_javob", fmt(total): "oraliq_javob"}
        if total % k == 0:
            numeric[fmt(total // k)] = "model_amal"
    elif level == "B3":
        numeric = {fmt(total): "oraliq_javob", fmt(a * b): "oraliq_javob"}
    else:
        numeric = {fmt(rest): "oraliq_javob", fmt(total): "oraliq_javob"}
        if total % k == 0:
            numeric[fmt(total // k)] = "model_amal"
    numeric = {key: val for key, val in numeric.items() if key != fmt(ans)}

    q5 = {"key": "q5", "text": "Masala javobini hisoblang va son panjarasiga yozing.",
          "answer": fmt(ans), "unit": "ta", "numeric_errors": numeric}

    if level in ("B1", "B2"):
        check = f"javob + {c} = {a} · {b}" if level == "B1" else f"javob · {k} + {c} = {a} · {b}"
        q6 = {"key": "q6", "text": "Javob to'g'riligini qaysi tekshiruv ko'rsatadi?", "options": _mc(rng, check, [
            (f"javob · {c} = {a} · {b}", "talqin"),
            (f"javob − {c} = {a} · {b}", "talqin"),
            (f"javob : {b} = {a}", "talqin"),
        ])}
    else:
        q6 = {"key": "q6", "text": f"Agar javonlar soni {k} emas, {k * 2} ta bo'lsa, har javondagi daftar soni qanday o'zgaradi?",
              "options": _mc(rng, "2 marta kamayadi", [
                  ("2 marta ko'payadi", "talqin"),
                  ("o'zgarmaydi", "talqin"),
                  ("2 taga kamayadi", "talqin"),
              ])}

    return {
        "template": "amallar_tartibi", "level": level,
        "params": {"a": a, "b": b, "c": c, "d": d, "e": e, "k": k, "total": total,
                   "keep_words": ["daftar", "quti", "javon"]},
        "story": story, "story_fallback": story, "ask": ask, "story_source": "shablon",
        "numbers_required": [fmt(x) for x in required],
        "answer": fmt(ans), "unit": "ta",
        "questions": [q1, q2, q3, q4, q5, q6, _q7_xona(rng)],
    }


# ------------------------------------------------------------------ AHA! 3-bob: oddiy kasrlar, "qolgan qismning qismi"
def _q7_kasr(rng):
    n = rng.choice([120, 180, 240, 300, 360, 480])
    q = rng.choice([3, 4, 5, 6])
    r = rng.choice([x for x in range(1, q) if (n * x) % q == 0]) if any((n * x) % q == 0 for x in range(1, q)) else 1
    correct = n * r // q
    return {"key": "q7", "text": f"Oldingi mavzu: {n} ning {r}/{q} qismi nechaga teng?",
            "options": _mc(rng, str(correct), [
                (str(n // q), "tayanch_kasr"),
                (str(n * q // r) if (n * q) % r == 0 else str(n * q), "tayanch_kasr"),
                (str(n - q), "tayanch_kasr"),
            ], extra=[(str(correct + q), "hisoblash")])}


def gen_qolgan_qism(level: str, rng: random.Random) -> dict:
    """"Qolgan qismning qismi" (AHA! I qism, 82–88-betlar): butunning emas, qoldiqning qismini olish."""
    for _ in range(800):
        p = rng.choice([2, 3, 4, 5])
        q = rng.choice([2, 3, 4, 5])
        r = rng.choice([x for x in range(1, q)])
        s = rng.choice([120, 180, 240, 300, 360, 420, 480, 540, 600, 720])
        if s % p:
            continue
        rest = s - s // p
        if rest % q or (rest * r) % q:
            continue
        part2 = rest * r // q
        left = rest - part2
        if level == "B1":
            ans = rest
        elif level == "B2":
            ans = part2
        elif level == "B3":
            ans = left
        else:
            if left % 2:
                continue
            ans = left // 2
        if 10 <= ans <= 9999 and part2 > 0 and left > 0:
            break
    else:
        p, q, r, s = 3, 4, 3, 240
        rest = s - s // p
        part2 = rest * r // q
        left = rest - part2
        ans = {"B1": rest, "B2": part2, "B3": left, "B4": left // 2}[level]

    base = (f"Aziza bozorga {s} ming so'm pul bilan bordi. Pulining 1/{p} qismiga kitob oldi.")
    if level == "B1":
        story, ask = base, "Azizada necha ming so'm pul qoldi?"
        required, expr = [s, 1, p], f"{s} − {s} : {p}"
        wrong_exprs = [(f"{s} : {p}", "oraliq_javob"), (f"{s} − {p}", "model_amal"), (f"{s} · {p}", "model_amal")]
        asked = "kitobdan keyin qolgan pul"
    elif level == "B2":
        story = base + f" Qolgan pulining {r}/{q} qismiga daftar oldi."
        ask = "Daftarga necha ming so'm sarfladi?"
        required, expr = [s, 1, p, r, q], f"({s} − {s} : {p}) · {r} : {q}"
        wrong_exprs = [(f"{s} · {r} : {q}", "model_butun"), (f"({s} − {s} : {p}) : {q}", "model_amal"),
                       (f"{s} : {p} · {r} : {q}", "model_butun")]
        asked = "daftarga sarflangan pul"
    elif level == "B3":
        story = base + f" Qolgan pulining {r}/{q} qismiga daftar oldi."
        ask = "Azizada necha ming so'm pul qoldi?"
        required, expr = [s, 1, p, r, q], f"({s} − {s} : {p}) − ({s} − {s} : {p}) · {r} : {q}"
        wrong_exprs = [(f"{s} − {s} : {p} − {s} · {r} : {q}", "model_butun"),
                       (f"({s} − {s} : {p}) · {r} : {q}", "oraliq_javob"),
                       (f"{s} − {s} : {p} · {r} : {q}", "model_tartib")]
        asked = "ikkala xariddan keyin qolgan pul"
    else:
        story = base + f" Qolgan pulining {r}/{q} qismiga daftar, undan keyin qolgan pulning 1/2 qismiga ruchka oldi."
        ask = "Ruchkaga necha ming so'm sarfladi?"
        required, expr = [s, 1, p, r, q, 2], f"(({s} − {s} : {p}) − ({s} − {s} : {p}) · {r} : {q}) : 2"
        wrong_exprs = [(f"({s} − {s} : {p}) : 2", "model_butun"),
                       (f"({s} − {s} : {p}) − ({s} − {s} : {p}) · {r} : {q}", "oraliq_javob"),
                       (f"{s} : {p} : 2", "model_butun")]
        asked = "ruchkaga sarflangan pul"

    q1 = {"key": "q1", "text": "Masalada nima so'ralmoqda?", "options": _mc(rng, asked, [
        ("kitobga sarflangan pul", "tushunish"),
        ("boshlang'ich pul miqdori", "tushunish"),
        ("jami sarflangan pul", "tushunish"),
    ])}
    given = "boshlang'ich pul va kitobga ketgan qism" if level == "B1" else "boshlang'ich pul, kitobga ketgan qism va qolgan puldan daftarga ketgan qism"
    q2 = {"key": "q2", "text": "Masalada qaysi ma'lumotlar berilgan?", "options": _mc(rng, given, [
        ("kitob va daftarning narxi", "malumot"),
        ("faqat boshlang'ich pul", "malumot"),
        ("qolgan pul miqdori", "malumot"),
    ])}
    q3 = {"key": "q3", "text": "Qaysi ifoda masalani to'g'ri modellashtiradi?", "options": _mc(rng, expr, wrong_exprs)}
    if level == "B1":
        q4 = {"key": "q4", "text": "Kitobga necha ming so'm sarfladi?", "options": _mc(rng, str(s // p), [
            (str(rest), "oraliq_javob"), (str(s - p), "model_amal"), (str(s * p), "model_amal"),
        ], extra=[(str(s // p + 10), "hisoblash")])}
    else:
        q4 = {"key": "q4", "text": "Kitob olgandan keyin necha ming so'm qoldi?", "options": _mc(rng, str(rest), [
            (str(s // p), "oraliq_javob"), (str(s - p), "model_amal"), (str(s * (p - 1)), "hisoblash"),
        ], extra=[(str(rest + 10), "hisoblash")])}

    whole_part = s * r // q if (s * r) % q == 0 else s // p
    numeric = {fmt(rest): "oraliq_javob", fmt(whole_part): "model_butun", fmt(s // p): "oraliq_javob"}
    if level in ("B3", "B4"):
        numeric[fmt(part2)] = "oraliq_javob"
    numeric = {key: val for key, val in numeric.items() if key != fmt(ans)}
    q5 = {"key": "q5", "text": "Masala javobini hisoblang va son panjarasiga yozing (ming so'mda).",
          "answer": fmt(ans), "unit": "ming so'm", "numeric_errors": numeric}

    share = Fraction(ans, s)
    q6 = {"key": "q6", "text": "Topilgan pul boshlang'ich pulning qanday qismi?", "options": _mc(rng,
          f"{share.numerator}/{share.denominator}", [
              (f"{r}/{q}", "model_butun"),
              (f"1/{p}", "talqin"),
              (f"{q - r}/{q}", "talqin"),
          ], extra=[(f"{share.numerator}/{share.denominator + 1}", "talqin"),
                    (f"{share.numerator + 1}/{share.denominator}", "talqin"),
                    (f"{share.denominator}/{share.numerator + share.denominator}", "talqin"),
                    (f"1/{share.denominator}", "talqin")])}

    return {
        "template": "qolgan_qism", "level": level,
        "params": {"s": s, "p": p, "r": r, "q": q, "rest": rest, "keep_words": ["kitob", "daftar", "pul"]},
        "story": story, "story_fallback": story, "ask": ask, "story_source": "shablon",
        "numbers_required": [fmt(x) for x in required],
        "answer": fmt(ans), "unit": "ming so'm",
        "questions": [q1, q2, q3, q4, q5, q6, _q7_kasr(rng)],
    }


GENERATORS = {"amallar_tartibi": gen_amallar_tartibi, "qolgan_qism": gen_qolgan_qism,
              "qarama_qarshi": gen_qarama_qarshi, "quvib_yetish": gen_quvib_yetish}


def generate(template: str, level: str, seed: int) -> dict:
    rng = random.Random(f"{template}-{level}-{seed}")
    return GENERATORS[template](level, rng)


def correct_letter(question: dict):
    for o in question.get("options", []):
        if o["correct"]:
            return o["letter"]
    return None


def reference_solution(spec: dict) -> dict:
    """Etalon yechim: to'g'ri ifoda, javob va birlik — AI rubrikasi hamda demo qo'lyozmasi uchun."""
    expr = None
    for q in spec["questions"]:
        if q["key"] == "q3":
            expr = next((o["text"] for o in q.get("options", []) if o.get("correct")), None)
    return {"ifoda": expr, "javob": spec.get("answer"), "birlik": spec.get("unit") or ""}
