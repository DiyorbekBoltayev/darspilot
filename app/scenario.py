"""Keyingi dars ssenariysi (docx: 7, 9.5, 10-bo'limlar).

Qarorlar kodda: kim bilan ishlash (ustuvorlik bali), guruhlar, guruh masalasining sonlari va javoblari.
GPT faqat metodlarni tanlaydi va o'qituvchi uchun matn yozadi; natija validatordan o'tadi.
"""
import math
import random
from fractions import Fraction

from .curriculum import ERROR_ACTIONS, ERRORS, SKILL_NAMES
from .methods import METHOD_BY_ID, STAGES, STAGE_BY_KEY, candidates

PREREQ_SKILLS = ["tushunish", "modellashtirish", "talqin", "tayanch"]

# Qog'ozli diagnostika kuni 8 daqiqa varaqqa; boshqa darslarda 4 daqiqalik qog'ozsiz tekshiruv, qolgan vaqt mustahkamlashga.
MINUTES = {True: [2, 5, 3, 4, 12, 9, 8, 2], False: [2, 5, 3, 4, 12, 13, 4, 2]}


def lesson_format(diagnostic_day: bool, group_work: bool) -> dict:
    return {"diagnostika_kuni": bool(diagnostic_day), "guruh_ishi": bool(group_work)}


def lesson_stages(fmt: dict) -> list:
    diag, group = fmt["diagnostika_kuni"], fmt["guruh_ishi"]
    out = []
    for st, minutes in zip(STAGES, MINUTES[diag]):
        st = {**st, "minutes": minutes}
        if st["key"] == "mustahkamlash" and not group:
            st["name"] = "Mustahkamlash: yakka va juftlikda"
            st["goal"] = "Bilimni qo'llash: darajali mashqlar va juftlikda o'zaro tekshirish"
        if st["key"] == "diagnostika" and not diag:
            st["name"] = "Tezkor tekshiruv (qog'ozsiz)"
            st["goal"] = "Chiqish chiptasi yoki mini-doska bilan tushunganlikni tez tekshirish"
        out.append(st)
    return out


def stage_candidates(key: str, fmt: dict, prefs=None) -> list:
    items = candidates(key, prefs)
    if key == "mustahkamlash":
        if fmt["guruh_ishi"]:
            items = sorted(items, key=lambda m: 0 if "Guruh" in m["form"] else 1)
        else:
            items = [m for m in items if "Guruh" not in m["form"]]
    if key == "diagnostika":
        items = [m for m in items if (m["id"] == "bosqichli_varaq") == fmt["diagnostika_kuni"]]
    return items


def _avg(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else 0.5


def hhmm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


# ------------------------------------------------------------------ 1. Kim bilan ishlash (9.5-bo'lim)
def priority(students, skills, gaps, results, alert_gap=5, struggled=None):
    """students: [{id, code, name}], skills: {sid: {skill: score}}, gaps: {sid: int}, results: {sid: grade_result}"""
    rows = []
    for st in students:
        sk = skills.get(st["id"], {})
        gap = gaps.get(st["id"], 0)
        avg = _avg(sk.values())
        o = _avg([sk.get(k) for k in PREREQ_SKILLS])
        res = results.get(st["id"])
        pct = res["correct"] / res["total"] if res else None
        steps = {x["key"]: x for x in res["steps"]} if res else {}
        E = min(gap / 5, 1.5)
        T = 1 if pct is not None and pct < avg - 0.1 else 0
        B = 1 if steps.get("q7") and not steps["q7"]["ok"] else 0
        Y = 1 if avg >= 0.8 and gap >= 3 else 0
        u = 0.35 * E + 0.30 * (1 - o) + 0.15 * T + 0.15 * B + 0.05 * Y
        if struggled and st["id"] in struggled:
            u += 0.1
        weakest = min(PREREQ_SKILLS, key=lambda k: sk.get(k, 0.5))
        reason = []
        if gap >= 3:
            reason.append(f"{gap} darsdan beri e'tiborsiz")
        reason.append(f"{SKILL_NAMES[weakest].lower()} {round(sk.get(weakest, 0.5) * 100)}%")
        if res and res.get("primary_error"):
            reason.append(ERRORS[res["primary_error"]].lower())
        if struggled and st["id"] in struggled:
            reason.append("tezkor tekshiruvda qiynaldi")
        rows.append({**st, "gap": gap, "avg": round(avg, 3), "score": round(u, 3), "mandatory": gap >= alert_gap,
                     "strong": Y == 1, "weakest": weakest, "prereq_gap": bool(B), "reason": "; ".join(reason),
                     "primary_error": res.get("primary_error") if res else None})
    rows.sort(key=lambda r: (-int(r["mandatory"]), -r["score"]))
    return rows


def pick_targets(rows, max_n=6):
    chosen = [r for r in rows if r["mandatory"]]
    for r in rows:
        if len(chosen) >= max_n:
            break
        if r not in chosen:
            chosen.append(r)
    return chosen[:max(max_n, len([r for r in rows if r["mandatory"]]))]


def suggest_task(r, rng, used):
    """Nomli o'quvchi uchun bosqich va vazifa taklifi (GPT ga maslahat va zaxira). Bir bosqichga ko'pi bilan 2 kishi."""
    options = []
    if r["mandatory"]:
        options += [("motivatsiya", "Kun savoliga birinchi taxminni aytadi — sinf oldida muvaffaqiyatli chiqish uchun"),
                    ("kirish", "Masala shartini doskada chizmaga (bar-model) aylantiradi")]
    if r["strong"]:
        options.append(("yangi_mavzu", "Ekspert roli: yechim yo'lini doskada sinfga tushuntiradi"))
    if r["weakest"] == "tayanch" or r["prereq_gap"]:
        options.append(("takrorlash", "Oldingi mavzudan oson tezkor savol — muvaffaqiyat tajribasi uchun"))
    if r["weakest"] == "tushunish":
        options.append(("kirish", "Masala shartini o'z so'zi bilan qayta aytib beradi"))
    if r["weakest"] in ("talqin", "modellashtirish"):
        options.append(("yangi_mavzu", "Javob topilgach: “Bu natija mantiqiymi?” savoliga javob beradi"))
    options += [("takrorlash", "Mini-doskada tezkor savolga javob yozadi"),
                ("uy_vazifasi", "Mashq daftaridagi vazifasi o'qituvchi tomonidan shaxsan ko'riladi"),
                ("refleksiya", "3-2-1 refleksiyasini sinfga o'qib beradi")]
    for stage, task in options:
        if used.get(stage, 0) < 2:
            used[stage] = used.get(stage, 0) + 1
            return stage, task
    return options[0]


# ------------------------------------------------------------------ 2. Guruh masalasi (10.2-bo'lim)
def _group_harakat(rng):
    d, v = rng.choice([(240, 60), (240, 80), (300, 60), (360, 60), (320, 80)])
    t = d // v
    stops = (t - 1) // 2
    close, need = 13 * 60, 90
    arrive = close - need
    travel = t * 60 + stops * 15
    depart = arrive - travel
    text = (f"Sinf Xivadagi muzeyga ekskursiyaga boradi. Masofa {d} km, avtobus soatiga {v} km yuradi va har 2 soat "
            f"yo'ldan keyin 15 daqiqa to'xtaydi. Muzey 13:00 da yopiladi, uni ko'rish uchun kamida 1 soat 30 daqiqa kerak. "
            f"Avtobus eng kechi soat nechada yo'lga chiqishi kerak? Bu vaqt o'quvchilar uchun qulaymi? Yaxshiroq reja taklif qiling.")
    parts = [
        {"id": "a", "text": f"Yo'ldagi harakat vaqti: {d} : {v}", "answer": f"{t} soat", "skill": "v = s : t", "difficulty": 1},
        {"id": "b", "text": "Muzeyga eng kechi kelish vaqti: 13:00 − 1:30", "answer": hhmm(arrive), "skill": "Vaqt amallari", "difficulty": 2},
        {"id": "c", "text": "Yo'lda necha marta to'xtaydi va jami qancha vaqt?", "answer": f"{stops} marta, {stops * 15} daqiqa",
         "skill": "Shartni chuqur tahlil", "difficulty": 3},
        {"id": "d", "text": "Umumiy yo'l vaqti (harakat + to'xtashlar)", "answer": f"{t} soat {stops * 15} daqiqa",
         "skill": "Vaqtni qo'shish", "difficulty": 2},
        {"id": "e", "text": "Chiqish vaqti, uning realligi va yaxshiroq reja", "answer": hhmm(depart),
         "skill": "Talqin va ijod (PISA)", "difficulty": 4},
    ]
    return {"text": text, "parts": parts}


def money(x) -> str:
    return f"{x:,}".replace(",", " ")


def _group_amallar(rng):
    """Ko'p amalli hayotiy masala: to'rt amal va amallar tartibi (AHA! 2-bob)."""
    boxes = rng.choice([12, 15, 18, 20])
    per = rng.choice([10, 12, 20, 25])
    cost = rng.choice([2000, 2500, 3000])
    price = cost + rng.choice([500, 1000, 1500])
    total = boxes * per
    sold = total * rng.choice([2, 3]) // 4
    spent = total * cost
    revenue = sold * price
    profit = revenue - spent
    need = -(-spent // price)
    text = (f"Maktab yarmarkasi uchun {boxes} ta quti daftar olindi, har bir qutida {per} tadan. Bitta daftar "
            f"{money(cost)} so'mdan olindi va {money(price)} so'mdan sotildi. Yarmarkada {sold} ta daftar sotildi. "
            f"Sinf foyda oldimi? Qolgan daftarlarni nima qilish kerak — taklifingizni asoslang.")
    parts = [
        {"id": "a", "text": f"Jami nechta daftar olindi? ({boxes} · {per})", "answer": f"{total} ta",
         "skill": "Ko'paytirish", "difficulty": 1},
        {"id": "b", "text": f"Xaridga qancha pul ketdi? ({total} · {money(cost)})", "answer": f"{money(spent)} so'm",
         "skill": "Ko'paytirish", "difficulty": 2},
        {"id": "c", "text": "Foyda yoki zarar qancha? Ifodani qavs bilan yozing",
         "answer": (f"{money(sold)} · {money(price)} − {money(total)} · {money(cost)} = "
                    + (f"{money(profit)} so'm foyda" if profit >= 0 else f"{money(-profit)} so'm zarar")),
         "skill": "Amallar tartibi", "difficulty": 3},
        {"id": "d", "text": "Nechta daftar sotilmay qoldi?", "answer": f"{total - sold} ta", "skill": "Ayirish", "difficulty": 2},
        {"id": "e", "text": "Xarajatni qoplash uchun kamida nechta daftar sotilishi kerak edi? Javobingizni izohlang",
         "answer": f"{need} ta", "skill": "Talqin va ijod (PISA)", "difficulty": 4},
    ]
    return {"text": text, "parts": parts}


def _group_kasr(rng):
    """Qolgan qismning qismi: oilaviy byudjet (AHA! 3-bob)."""
    total = rng.choice([600, 720, 900, 1200])
    p, q = rng.choice([(3, 4), (4, 3), (5, 2), (3, 3)])
    food = total // p * 2 if p != 5 else total // 5 * 2
    rest = total - food
    util = rest // q
    left = rest - util
    text = (f"Oilaning oylik byudjeti {total} ming so'm. Uning 2/{p} qismi oziq-ovqatga, qolgan pulning 1/{q} qismi "
            f"kommunal to'lovlarga ketdi. Qolgan puldan kitob va sayohatga ajratish kerak. Qanday taqsimlaysiz? "
            f"Javobingizni chizma (bar-model) bilan asoslang.")
    parts = [
        {"id": "a", "text": f"Oziq-ovqatga qancha ketdi? ({total} ning 2/{p} qismi)", "answer": f"{food} ming so'm",
         "skill": "Sonning qismi", "difficulty": 1},
        {"id": "b", "text": "Oziq-ovqatdan keyin qancha pul qoldi?", "answer": f"{rest} ming so'm", "skill": "Ayirish", "difficulty": 2},
        {"id": "c", "text": f"Kommunal to'lovga qancha ketdi? (qolgan pulning 1/{q} qismi)", "answer": f"{util} ming so'm",
         "skill": "Qolgan qismning qismi", "difficulty": 3},
        {"id": "d", "text": "Oxirida qancha pul qoldi?", "answer": f"{left} ming so'm", "skill": "Ayirish", "difficulty": 2},
        {"id": "e", "text": "Qolgan pul butun byudjetning qanday qismi? Taqsimot taklifingizni asoslang",
         "answer": f"{left}/{total} = {Fraction(left, total)}", "skill": "Talqin va ijod (PISA)", "difficulty": 4},
    ]
    return {"text": text, "parts": parts}


GROUP_PROBLEMS = {"qarama_qarshi": _group_harakat, "quvib_yetish": _group_harakat,
                  "amallar_tartibi": _group_amallar, "qolgan_qism": _group_kasr}


def group_problem(rng, template=None):
    return GROUP_PROBLEMS.get(template, _group_amallar)(rng)


# ------------------------------------------------------------------ 3. Guruhlar (10.1-bo'lim)
def form_groups(rows, size=5):
    """"Ilon" tartibida aralash guruhlar: har guruhda kuchli, o'rta va tayanch o'quvchilar. Qaytaradi: [[row, ...], ...]"""
    ordered = sorted(rows, key=lambda r: -r["avg"])
    n_groups = max(1, math.ceil(len(ordered) / size))
    groups = [[] for _ in range(n_groups)]
    for i, r in enumerate(ordered):
        cycle, pos = divmod(i, n_groups)
        idx = pos if cycle % 2 == 0 else n_groups - 1 - pos
        groups[idx].append(r)
    return groups


def describe_groups(groups):
    """Guruh tarkibi bo'yicha shu darsning rollari va masala qismlari."""
    out = []
    order = ["a", "b", "d", "c"]
    for gi, members in enumerate(groups, start=1):
        asc = sorted(members, key=lambda r: r["avg"])
        parts = {}
        for i, r in enumerate(asc):
            parts[r["code"]] = order[i] if i < len(order) else "e"
        desc = list(reversed(asc))
        roles = {}
        if desc:
            roles[desc[0]["code"]] = "murabbiy"
            top = parts.get(desc[0]["code"], "c")
            parts[desc[0]["code"]] = top if top == "e" else f"{top}+e"
        if len(desc) > 1:
            roles[desc[1]["code"]] = "tekshiruvchi"
        if len(desc) > 2:
            roles[desc[2]["code"]] = "hisobchi"
        neglected = [r for r in asc if r["mandatory"] and roles.get(r["code"]) != "murabbiy"]
        presenter = neglected[0] if neglected else (asc[0] if asc and asc[0]["code"] not in roles else None)
        if presenter:
            roles[presenter["code"]] = "taqdimotchi"
        for r in asc:
            roles.setdefault(r["code"], "a'zo")
        out.append({"n": gi, "members": [{"code": r["code"], "name": r["name"], "role": roles[r["code"]],
                                          "part": parts[r["code"]], "avg": r["avg"]} for r in asc]})
    return out


def build_groups(rows, size=5):
    return describe_groups(form_groups(rows, size))


# ------------------------------------------------------------------ 4. GPT uchun kontekst va validator
def build_context(topic, n_students, focus, targets, problem, rng, prefs=None, fmt=None, refs=None):
    fmt = fmt or lesson_format(True, True)
    hints, used = [], {}
    for r in targets:
        stage, task = suggest_task(r, rng, used)
        r["hint_stage"], r["hint_task"] = stage, task
        hints.append({"kod": r["code"], "sabab": r["reason"], "majburiy": r["mandatory"],
                      "taklif_bosqich": stage, "taklif_vazifa": task})
    return {
        "mavzu": topic,
        "sinf": f"5-sinf, {n_students} o'quvchi",
        "darslik": refs or {},
        "dars_formati": fmt,
        "bosqichlar": [{"key": s["key"], "nomi": s["name"], "daqiqa": s["minutes"], "maqsad": s["goal"],
                        "nomzod_metodlar": [{"id": m["id"], "nomi": m["name"], "qisqacha": m["short"]} for m in stage_candidates(s["key"], fmt, prefs)[:8]]}
                       for s in lesson_stages(fmt)],
        "sinf_holati": focus,
        "majburiy_oquvchilar": [h for h in hints if h["majburiy"]],
        "boshqa_nomli_oquvchilar": [h for h in hints if not h["majburiy"]],
        "guruh_masalasi": ({"shart": problem["text"], "qismlar": [{"id": p["id"], "matn": p["text"]} for p in problem["parts"]]}
                           if problem else None),
    }


DEFAULT_METHODS = {"motivatsiya": "kun_savoli", "takrorlash": "mini_doska", "uy_vazifasi": "ozaro_tekshirish",
                   "kirish": "sahnalashtirish", "yangi_mavzu": "bar_model", "mustahkamlash": "raqamli_boshlar",
                   "diagnostika": "bosqichli_varaq", "refleksiya": "3_2_1"}


HOOKS = {
    "amallar_tartibi": "“24 quti daftar, har birida 125 ta. Ularni 10 ta javonga teng terish mumkinmi?”",
    "qolgan_qism": "“Pulimning yarmini ishlatdim, qolganining yarmini ham. Hammasidan qancha qoldi — chorakmi?”",
    "qarama_qarshi": "“Ikki mashina bir-biriga qarab yursa, nega tezroq uchrashadi?”",
    "quvib_yetish": "“Oldinda ketayotganni quvib yetish uchun nima muhim — tezlikmi yoki tezliklar farqimi?”",
}


def fallback_stage(key, topic, focus, fmt=None, template=None):
    fmt = fmt or lesson_format(True, True)
    action = focus.get("tavsiya") or "Oldingi mavzu bo'yicha 5 ta tezkor savol (mini-doska)."
    hook = HOOKS.get(template, f"“{topic} — bu bilim kundalik hayotning qayerida kerak bo'ladi?”")
    texts = {
        "motivatsiya": ([f"Doskaga kun savoli: {hook}",
                         "3 ta taxminni yozib qo'ying, javobni dars oxiriga qoldiring"], ["Taxminini aytadi"]),
        "takrorlash": ([f"Mini-mashq: {action}", "Hamma javobni mini-doskada bir vaqtda ko'rsatadi"],
                       ["Javobni yozib ko'rsatadi"]),
        "uy_vazifasi": (["Kalit masala bo'yicha juftliklar daftarlarni almashadi", "2 ta tipik xatoni doskada muhokama qiling"],
                        ["Juftligining yechimini tekshiradi"]),
        "kirish": (["Shartni predmet yoki harakat bilan modellashtiring (AHA! “Muhokama qiling”)",
                    f"Maqsadni sinf bilan birga shakllantiring: “Men {topic.lower()} bo'yicha masalani yecha olaman”"],
                   ["Kuzatuvdan xulosa chiqaradi"]),
        "yangi_mavzu": (["Bar-model: shartdagi miqdorlarni chizmada tasvirlang (aniq → tasviriy → abstrakt)",
                         "Yo'naltiruvchi savollar: “Avval nimani topamiz?”, “Nega aynan shu amal?”",
                         "Namunaviy yechim → yarim yechim → mustaqil misol"], ["Juftlikda yarim yechimni to'ldiradi"]),
        "mustahkamlash": (["Guruh masalasini tarqating, qismlar ro'yxat bo'yicha taqsimlangan",
                           "Murabbiy yechib bermaydi — faqat savol beradi", "Tasodifiy raqamli a'zo javobni aytadi"],
                          ["O'z qismini yechadi va guruhga tushuntiradi"]),
        "diagnostika": (["Darajasiga mos variantlarni tarqating (B1–B4)", "8 daqiqadan keyin javob chiziqlarini yig'ib, suratga oling"],
                        ["Bosqichli savollarga javob belgilaydi"]),
        "refleksiya": (["3-2-1: 3 ta o'rgandim, 2 ta qiziq, 1 ta savol",
                        "Uy vazifasi: mashq daftaridagi D1–D2, kuchlilarga D3"], ["Refleksiya varag'ini to'ldiradi"]),
    }
    method = DEFAULT_METHODS[key]
    if key == "mustahkamlash" and not fmt["guruh_ishi"]:
        method = "rally_coach"
        texts[key] = (["Juftliklarga B1–B4 darajali 3 ta mashq kartochkasi: navbatma-navbat biri yechadi, ikkinchisi tekshiradi",
                       "Qiynalgan juftliklar oldiga boring, yechimni aytmasdan yo'naltiruvchi savol bering"],
                      ["Juftlikda navbatma-navbat yechadi va tekshiradi"])
    if key == "diagnostika" and not fmt["diagnostika_kuni"]:
        method = "chiqish_chiptasi"
        texts[key] = (["Mini-doskada 2 ta savol: bitta bugungi mavzudan, bitta oldingi mavzudan",
                       "Svetofor: yashil — tushundim, sariq — qisman, qizil — yordam kerak; qizil ko'rsatganlarni belgilang"],
                      ["Javobni mini-doskada ko'rsatadi va svetofor bilan baholaydi"])
    teacher, students = texts[key]
    return {"metod_id": method, "oqituvchi": teacher, "oquvchilar": students, "nomli": [],
            "nega": STAGE_BY_KEY[key]["goal"]}


def _strs(x, limit=4, maxlen=320):
    if not isinstance(x, list):
        return []
    return [str(v).strip()[:maxlen] for v in x if isinstance(v, (str, int, float)) and str(v).strip()][:limit]


def finalize(llm_plan, topic, focus, targets, groups, problem, code_to_name, fmt=None, refs=None, template=None):
    fmt = fmt or lesson_format(True, True)
    refs = refs or {}
    """GPT natijasini tekshiradi va tuzatadi; yo'q bo'lsa shablon ssenariy qaytaradi."""
    by_key = {}
    if llm_plan:
        for st in llm_plan.get("bosqichlar", []):
            if isinstance(st, dict) and st.get("key") in STAGE_BY_KEY:
                by_key[st["key"]] = st

    stages, start = [], 0
    for s in lesson_stages(fmt):
        key = s["key"]
        fb = fallback_stage(key, topic, focus, fmt, template)
        got = by_key.get(key, {})
        allowed = {m["id"] for m in stage_candidates(key, fmt)}
        method_id = got.get("metod_id") if got.get("metod_id") in allowed else fb["metod_id"]
        teacher = _strs(got.get("oqituvchi")) or fb["oqituvchi"]
        students = _strs(got.get("oquvchilar"), 3) or fb["oquvchilar"]
        targeted = []
        for item in got.get("nomli", []) if isinstance(got.get("nomli"), list) else []:
            code = str(item.get("kod", "")).strip() if isinstance(item, dict) else ""
            if code in code_to_name and item.get("vazifa"):
                targeted.append({"code": code, "name": code_to_name[code], "task": str(item["vazifa"])[:300]})
        m = METHOD_BY_ID[method_id]
        stages.append({"key": key, "name": s["name"], "minutes": s["minutes"], "start": start,
                       "method": {"id": m["id"], "name": m["name"], "short": m["short"], "form": m["form"], "steps": m["steps"]},
                       "teacher": teacher, "students": students, "targeted": targeted,
                       "why": str(got.get("nega") or fb["nega"])[:300]})
        start += s["minutes"]

    stage_idx = {s["key"]: s for s in stages}
    present = {t["code"] for s in stages for t in s["targeted"]}
    reasons = {r["code"]: r["reason"] for r in targets}
    for r in targets:
        if r["code"] not in present:
            stage_idx[r["hint_stage"]]["targeted"].append({"code": r["code"], "name": r["name"], "task": r["hint_task"]})
    for s in stages:
        for t in s["targeted"]:
            t["reason"] = reasons.get(t["code"], "")

    goal = llm_plan.get("maqsad") if llm_plan and isinstance(llm_plan.get("maqsad"), dict) else {}
    goal = {
        "talimiy": str(goal.get("talimiy") or f"“{topic}” mavzusidagi bilimni masala yechishda qo'llash")[:300],
        "tarbiyaviy": str(goal.get("tarbiyaviy") or ("Guruhda" if fmt["guruh_ishi"] else "Juftlikda") + " hamkorlik va bir-birini tinglash madaniyati")[:300],
        "rivojlantiruvchi": str(goal.get("rivojlantiruvchi") or "Masalani modellashtirish va natijani talqin qilish ko'nikmasi")[:300],
        "mezonlar": _strs(goal.get("mezonlar"), 3) or ["Men masalada nima so'ralayotganini aniqlay olaman",
                                                       "Men masalaga mos ifoda tuza olaman",
                                                       "Men javobning ma'nosini tushuntira olaman"],
    }
    hw = llm_plan.get("uy_vazifasi") if llm_plan and isinstance(llm_plan.get("uy_vazifasi"), dict) else {}
    wb = refs.get("workbook")
    default_hw = f"Mashq daftari, {wb}-bet: D1 va D2 darajali topshiriqlar" if wb else "Darslikdagi mashqlar (D1–D2 daraja)"
    homework = {"asosiy": str(hw.get("asosiy") or default_hw)[:300],
                "tanlov": _strs(hw.get("tanlov"), 3) or ([f"Mashq daftari, {wb}-bet: D3 (chuqur) topshiriq"] if wb else ["D3 darajali topshiriq"])
                + ["O'zing shu mavzuga bitta masala tuz"]}

    return {
        "topic": topic,
        "goal": goal,
        "stages": stages,
        "alerts": [{"code": r["code"], "name": r["name"], "gap": r["gap"], "reason": r["reason"], "mandatory": r["mandatory"]}
                   for r in targets],
        "format": fmt,
        "groups": groups if fmt["guruh_ishi"] else [],
        "group_problem": problem if fmt["guruh_ishi"] else None,
        "focus": focus,
        "homework": homework,
        "refs": refs,
    }
