"""GPT (OpenAI API) bilan ishlash: masala matni, o'quvchilarga feedback, sinf xulosasi.

Tamoyillar:
- LLM hech qachon sonlarni va to'g'ri javobni hal qilmaydi (bular kodda). U faqat matn yozadi.
- LLM ga o'quvchi ismlari yuborilmaydi — faqat kodlar (5B-17) va agregat ma'lumot.
- Har bir javob tekshiriladi (validatsiya); mos kelmasa, shablon matn ishlatiladi.
- Barcha chaqiruvlar llm_calls jadvaliga yoziladi (model, vaqt, tokenlar, xato).
"""
import base64
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor

from . import config
from .curriculum import ERRORS, ERROR_ACTIONS

_client = None
last_error = None


def enabled() -> bool:
    return bool(config.OPENAI_API_KEY)


def _get_client():
    global _client
    if _client is None:
        from openai import OpenAI
        _client = OpenAI(api_key=config.OPENAI_API_KEY, timeout=config.OPENAI_TIMEOUT, max_retries=1)
    return _client


def _log(entry: dict):
    try:
        from . import db
        from .models import LlmCall

        with db.session() as s:
            s.add(LlmCall(**entry))
    except Exception:
        pass  # jurnalga yozolmaslik asosiy ishni to'xtatmasligi kerak


def call_json(system: str, user: dict, purpose: str, model: str = None):
    """JSON javob qaytaradigan chaqiruv. Xato bo'lsa None."""
    return _chat_json(system, json.dumps(user, ensure_ascii=False), purpose, model or config.OPENAI_MODEL)


def call_json_vision(system: str, user: dict, images: list, purpose: str, model: str = None):
    """Suratli (vizual) JSON chaqiruv: qo'lyozma yechim yoki mashq daftari sahifasi."""
    content = [{"type": "text", "text": json.dumps(user, ensure_ascii=False)}]
    for img in images:
        b64 = base64.b64encode(img).decode()
        content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "high"}})
    return _chat_json(system, content, purpose, model or config.OPENAI_MODEL_VISION)


def _chat_json(system: str, user_content, purpose: str, model: str):
    global last_error
    if not enabled():
        return None
    t0 = time.time()
    try:
        kwargs = dict(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
        )
        if config.OPENAI_REASONING_EFFORT:
            kwargs["reasoning_effort"] = config.OPENAI_REASONING_EFFORT
        from openai import BadRequestError

        try:
            resp = _get_client().chat.completions.create(**kwargs)
        except BadRequestError as e:
            if "reasoning" not in str(e).lower() or "reasoning_effort" not in kwargs:
                raise
            kwargs.pop("reasoning_effort")  # model bu parametrni qo'llamasa, usiz qayta so'raymiz
            resp = _get_client().chat.completions.create(**kwargs)
        content = resp.choices[0].message.content
        data = json.loads(content)
        usage = getattr(resp, "usage", None)
        _log({"purpose": purpose, "model": model, "ok": True, "seconds": round(time.time() - t0, 2),
              "prompt_tokens": getattr(usage, "prompt_tokens", None),
              "completion_tokens": getattr(usage, "completion_tokens", None)})
        return data
    except Exception as e:  # tarmoq, limit, noto'g'ri model nomi, JSON xatosi — hammasida shablonga o'tamiz
        last_error = f"{type(e).__name__}: {e}"[:300]
        _log({"purpose": purpose, "model": model, "ok": False, "seconds": round(time.time() - t0, 2),
              "error": last_error})
        return None


# ------------------------------------------------------------------ 1. Masala matni

STORY_SYSTEM = (
    "Sen O'zbekistondagi 5-sinf matematika darsliklari uchun masala shartlarini yozadigan tajribali metodistsan. "
    "Faqat o'zbek tilida, lotin yozuvida, 5-sinf o'quvchisi tushunadigan sodda va aniq gaplar bilan yozasan. "
    "Javobni faqat JSON ko'rinishida qaytarasan."
)

NUM_RE = re.compile(r"\d+(?:,\d+)?")
PLACE_RE = re.compile(r"^[A-ZʻʼO'G'][A-Za-z'ʻʼ‘’]{1,19}$")


# Masala masofasiga yaqin real yo'l masofali shaharlar juftlari: 300 km ni "Urganch – Xiva" (35 km) deb yozmaslik uchun.
# Ro'yxatdagi nomlar -dan/-ga qo'shimchasi bilan to'g'ri qo'shiladi (q/k/g bilan tugamaydi).
PLACE_PAIRS = [
    (200, [("Urganch", "Nukus"), ("Xiva", "Nukus")]),
    (330, [("Urganch", "Qo'ng'irot"), ("Xiva", "Qo'ng'irot")]),
    (480, [("Urganch", "Buxoro"), ("Xiva", "Buxoro")]),
    (10 ** 6, [("Urganch", "Navoiy"), ("Xiva", "Navoiy")]),
]


def place_pairs(distance_km) -> list:
    return next(pairs for limit, pairs in PLACE_PAIRS if float(distance_km) < limit)


def write_story(spec: dict):
    """Masala shartini hayotiy kontekstda qayta yozadi. Qaytaradi: (story, ask, places) yoki None."""
    with_places = spec["template"] == "qarama_qarshi"
    keep_words = spec["params"].get("keep_words") or []
    if keep_words:
        context_rule = ("Kontekst Xorazm maktabi yoki bozoridagi kundalik vaziyat bo'lsin. "
                        f"Quyidagi so'zlarni saqlab qol (savollar shularga bog'langan): {', '.join(keep_words)}.")
    else:
        context_rule = (f"Harakatlanuvchilar: {spec['params'].get('veh1')} va {spec['params'].get('veh2')} — ularni saqlab qol. "
                        "Kontekst Xorazmdan boshlanadigan sayohat bo'lsin. Masofa haqida 'taxminan' kabi izoh qo'shma.")
    user = {
        "vazifa": "Quyidagi masala shartini qiziqarli va hayotiy qilib qayta yoz.",
        "qoidalar": [
            f"Shu sonlarni aynan o'zgartirmasdan ishlat: {', '.join(spec['numbers_required'])}.",
            "Sonlarni faqat raqam bilan yoz (masalan 1, 'bir' emas). Boshqa hech qanday son qo'shma (yil, soat, sana ham yo'q).",
            "Masala javobini va yechim yo'lini yozma.",
            context_rule,
            "Shart 2–3 gapdan, 50 so'zdan oshmasin. Savol gapini alohida 'ask' maydoniga yoz.",
        ] + ([
            "Shaharlar juftini faqat shu ro'yxatdan tanla (masofaga mos): "
            + "; ".join(f"{a} – {b}" for a, b in place_pairs(spec["params"]["d"]))
            + ". 'place_a' (A shahar o'rnida) va 'place_b' (B shahar o'rnida) maydonlariga bitta so'z bilan yoz.",
        ] if with_places else []),
        "asl_shart": spec["story_fallback"],
        "asl_savol": spec["ask"],
        "javob_formati": {"story": "...", "ask": "...", **({"place_a": "...", "place_b": "..."} if with_places else {})},
    }
    data = call_json(STORY_SYSTEM, user, purpose=f"masala_matni_{spec['level']}")
    if not data or not isinstance(data.get("story"), str) or not isinstance(data.get("ask"), str):
        return None
    story, ask = data["story"].strip(), data["ask"].strip()
    allowed = set(spec["numbers_required"])
    found = NUM_RE.findall(story + " " + ask)
    if not allowed.issubset(set(found)) or not set(found).issubset(allowed):
        return None
    if spec["answer"] in NUM_RE.findall(story) and spec["answer"] not in allowed:
        return None
    if keep_words:
        # savollar shartdagi predmetlarga bog'langan: matnni GPT yozadi, savol gapi o'zgarmaydi
        if any(w.lower() not in story.lower() for w in keep_words):
            return None
        ask = spec["ask"]
    places = None
    if with_places:
        a, b = str(data.get("place_a", "")).strip(), str(data.get("place_b", "")).strip()
        if not (PLACE_RE.match(a) and PLACE_RE.match(b)) or a == b or a not in story or b not in story:
            return None
        norm = lambda x: re.sub("[‘’ʻʼ]", "'", x)  # noqa: E731
        if {norm(a), norm(b)} not in [set(p) for p in place_pairs(spec["params"]["d"])]:
            return None
        places = (a, b)
    return story, ask, places


def apply_places(spec: dict, places):
    """Savol matnlaridagi 'A shahar'/'B shahar' iboralarini LLM tanlagan joy nomlariga almashtiradi."""
    if not places:
        return
    a, b = places
    reps = [("A shahardan", f"{a}dan"), ("B shahardan", f"{b}dan"), ("A shaharga", f"{a}ga"),
            ("B shaharga", f"{b}ga"), ("A shahar", a), ("B shahar", b)]

    def fix(text):
        for old, new in reps:
            text = text.replace(old, new)
        return text

    spec["ask"] = fix(spec["ask"])
    for q in spec["questions"]:
        q["text"] = fix(q["text"])
        for o in q.get("options", []):
            o["text"] = fix(o["text"])


def enrich_problems(specs: dict) -> dict:
    """4 ta darajaning matnlarini parallel yozdiradi. Qaytaradi: {level: 'gpt'|'shablon'}."""
    sources = {lvl: "shablon" for lvl in specs}
    if not enabled():
        return sources
    with ThreadPoolExecutor(max_workers=4) as ex:
        results = dict(zip(specs, ex.map(write_story, specs.values())))
    for lvl, res in results.items():
        if res:
            story, ask, places = res
            specs[lvl]["story"], specs[lvl]["ask"] = story, ask
            apply_places(specs[lvl], places)
            specs[lvl]["story_source"] = "gpt"
            sources[lvl] = "gpt"
    return sources


# ------------------------------------------------------------------ 2. O'quvchilarga feedback

FEEDBACK_SYSTEM = (
    "Sen tajribali matematika o'qituvchisi va metodistsan. O'quvchilarning bosqichli diagnostika natijalariga "
    "qarab qisqa, aniq va rag'batlantiruvchi izohlar yozasan. Faqat o'zbek tilida (lotin). O'quvchi ismlarini "
    "bilmaysan — faqat kodlar bilan ishlaysan. Bahoni emas, keyingi aniq qadamni ayt. Faktlarni to'qima. "
    "Javobni faqat JSON ko'rinishida qaytar."
)


def _feedback_payload(topic: str, items: list) -> dict:
    return {
        "mavzu": topic,
        "qoidalar": [
            "oquvchiga: 1-2 gap, BETARAF ohangda - 'sen', 'siz', 'sening' kabi murojaat ishlatma. "
            "Bu matn o'quvchining keyingi topshiriq varaqasiga \u00abO'tgan topshiriq bo'yicha xulosa\u00bb deb bosiladi, "
            "shuning uchun shaxssiz fe'llar bilan yoz: 'to'g'ri bajarilgan', 'tekshirish kerak', 'keyingi qadam - ...'. "
            "Avval nima to'g'ri bajarilganini, keyin bitta aniq keyingi qadamni ayt. Gaplar bir-biriga mos bo'lsin: "
            "xato ta'rifini ko'chirib yozma, uni xulosa gapiga moslab qayta yoz.",
            "ota_onaga: 1–2 gap, 'siz' deb murojaat, uyda 5 daqiqada qilinadigan aniq ish.",
            "oqituvchiga: 1 gap, darsda shu o'quvchi bilan nima qilish kerak.",
            "Har bir kod uchun albatta bitta element qaytar.",
        ],
        "oquvchilar": items,
        "namuna_oquvchiga": "7 bosqichdan 5 tasi to'g'ri bajarilgan. Asosiy muammo - amallar tartibi: qavs qo'yilmagan. "
                            "Keyingi qadam: ifodani bosqichma-bosqich yozib, avval qavs ichini hisoblash.",
        "javob_formati": {"feedback": [{"code": "5B-01", "oquvchiga": "...", "ota_onaga": "...", "oqituvchiga": "..."}]},
    }


# Xato kodi → o'quvchi varaqasiga bosiladigan betaraf xulosa: (muammo, keyingi qadam) — murojaatsiz, 3-shaxsda
STUDENT_NOTE = {
    "tushunish": ("masalada nima so'ralayotgani aniqlanmagan", "shartni o'qib, savolni tagiga chizish"),
    "malumot": ("berilgan ma'lumotlar to'liq ajratilmagan", "\u00abBerilgan / Topish kerak\u00bb jadvalini to'ldirish"),
    "model_obyekt": ("faqat bitta harakatlanuvchi hisobga olingan", "ikkala ob'ektni chizmada ko'rsatish"),
    "model_yonalish": ("harakat yo'nalishi adashtirilgan", "chizmada yo'nalishni strelka bilan belgilash"),
    "model_amal": ("amal noto'g'ri tanlangan", "\u00abnega aynan shu amal?\u00bb savoliga javob yozish"),
    "model_tartib": ("amallar tartibi buzilgan: qavs qo'yilmagan", "ifodani bosqichma-bosqich yozib, avval qavs ichini hisoblash"),
    "model_butun": ("butunning qismi o'rniga qolgan qismning qismi olingan", "chizmada butunni bo'lib, qolgan qismni bo'yash"),
    "oraliq_javob": ("oraliq natija javob deb yozilgan", "javobdan oldin savolni qayta o'qish"),
    "model_kechikish": ("kechikish sharti hisobga olinmagan", "vaqt o'qida bosqichlarni chizish"),
    "hisoblash": ("hisoblashda xato bor", "javobni teskari amal bilan tekshirish"),
    "talqin_vaqt": ("o'nli kasrdagi soat minut deb o'qilgan", "0,1 soat = 6 minut ekanini yodda saqlash"),
    "talqin": ("natijaning ma'nosi noto'g'ri talqin qilingan", "\u00abjavob mantiqiymi?\u00bb savolini berish"),
    "tayanch_vaqt": ("vaqt birliklarini aylantirishda bo'shliq bor", "birliklar jadvalini takrorlash"),
    "tayanch_xona": ("10, 100, 1000 ga ko'paytirish-bo'lishda xona xatosi", "xona jadvali bilan 3 daqiqalik mashq"),
    "tayanch_kasr": ("sonning qismini topishda bo'shliq bor", "qismni topish qoidasini takrorlash"),
    "javob_yoq": ("javob belgilanmagan", "har bir savolga javob belgilanganini tekshirish"),
}


def fallback_feedback(item: dict) -> dict:
    """Shablon matnlar (GPT ishlamaganda). O'quvchiga mo'ljallangani — murojaatsiz xulosa ohangida."""
    err = item.get("asosiy_xato_kodi")
    done, total = item["togri"].split("/")
    if not err:
        return {"oquvchiga": f"Barcha {total} bosqich to'g'ri bajarilgan. Keyingi qadam: shunga o'xshash masalani mustaqil tuzib ko'rish.",
                "ota_onaga": "Farzandingiz mavzuni yaxshi o'zlashtirgan. Uyda undan kundalik hayotdan shu mavzuga bitta masala tuzib berishini so'rang.",
                "oqituvchiga": "Keyingi darsda murakkabroq (B3–B4) topshiriq va guruhda murabbiy roli bering."}
    muammo, qadam = STUDENT_NOTE.get(err, (ERRORS[err].lower(), "shu bosqichni qayta ishlab chiqish"))
    return {"oquvchiga": f"{total} bosqichdan {done} tasi to'g'ri bajarilgan. Asosiy muammo — {muammo}. Keyingi qadam: {qadam}.",
            "ota_onaga": f"Diagnostika ko'rsatdiki, farzandingizga shu yo'nalishda yordam kerak: {ERRORS[err].lower()}. "
                         f"Uyda tavsiya: {ERROR_ACTIONS[err]}",
            "oqituvchiga": ERROR_ACTIONS[err]}


def student_feedback(topic: str, items: list) -> tuple:
    """items: [{code, variant, togri, bosqichlar, asosiy_xato, asosiy_xato_kodi, izoh}].
    Qaytaradi: ({code: {oquvchiga, ota_onaga, oqituvchiga}}, manba)."""
    out = {it["code"]: fallback_feedback(it) for it in items}
    if not enabled() or not items:
        return out, "shablon"
    chunks = [items[i:i + 10] for i in range(0, len(items), 10)]

    def run(chunk):
        clean = [{k: v for k, v in it.items() if k != "asosiy_xato_kodi"} for it in chunk]
        return call_json(FEEDBACK_SYSTEM, _feedback_payload(topic, clean), "feedback", model=config.OPENAI_MODEL_FAST)

    got_any = False
    with ThreadPoolExecutor(max_workers=4) as ex:
        for data in ex.map(run, chunks):
            for fb in (data or {}).get("feedback", []) if isinstance(data, dict) else []:
                code = fb.get("code")
                if code in out and all(isinstance(fb.get(k), str) and fb[k].strip() for k in ("oquvchiga", "ota_onaga", "oqituvchiga")):
                    out[code] = {k: fb[k].strip() for k in ("oquvchiga", "ota_onaga", "oqituvchiga")}
                    got_any = True
    return out, ("gpt" if got_any else "shablon")


# ------------------------------------------------------------------ 3. Sinf xulosasi

SUMMARY_SYSTEM = (
    "Sen maktab metodistisan. Sinf bo'yicha diagnostika statistikasidan o'qituvchi uchun qisqa xulosa va keyingi "
    "darsga amaliy tavsiyalar tayyorlaysan. Faqat berilgan raqamlarga tayan, o'zbek tilida (lotin), JSON qaytar."
)


def class_summary(stats: dict) -> tuple:
    fallback = {
        "xulosa": stats.get("fallback_xulosa", []),
        "keyingi_dars": stats.get("fallback_keyingi", []),
    }
    if not enabled():
        return fallback, "shablon"
    user = {
        "statistika": {k: v for k, v in stats.items() if not k.startswith("fallback")},
        "qoidalar": [
            "xulosa: 3–4 ta qisqa band, har birida raqam bo'lsin.",
            "keyingi_dars: 3 ta amaliy tavsiya — takrorlash bosqichi uchun, guruh ishi uchun, kim bilan alohida ishlash uchun (kodlar bilan).",
        ],
        "javob_formati": {"xulosa": ["..."], "keyingi_dars": ["..."]},
    }
    data = call_json(SUMMARY_SYSTEM, user, "sinf_xulosasi")
    if (isinstance(data, dict) and isinstance(data.get("xulosa"), list) and isinstance(data.get("keyingi_dars"), list)
            and data["xulosa"] and data["keyingi_dars"]):
        return {"xulosa": [str(x) for x in data["xulosa"]][:5], "keyingi_dars": [str(x) for x in data["keyingi_dars"]][:4]}, "gpt"
    return fallback, "shablon"


# ------------------------------------------------------------------ 4. Dars ssenariysi (docx, 7-bo'lim)

LESSON_SYSTEM = (
    "Sen O'zbekistondagi 5-sinf matematika o'qituvchisi uchun 45 daqiqalik dars ssenariysini tuzadigan tajribali "
    "metodistsan. Singapur yondashuvi (aniq → tasviriy → abstrakt), faol metodlar va farqlangan ta'limga tayanasan. "
    "O'qituvchi ma'ruzachi emas, yo'naltiruvchi bo'lishi kerak. Faqat o'zbek tilida (lotin). O'quvchi ismlarini "
    "bilmaysan — faqat kodlar bilan ishlaysan. Javobni faqat JSON ko'rinishida qaytar."
)


def compose_lesson(context: dict):
    """context: scenario.py tayyorlagan anonim ma'lumot. Qaytaradi: dict yoki None."""
    user = {
        "vazifa": "Keyingi dars uchun 8 bosqichli ssenariy tuz.",
        "qoidalar": [
            "bosqichlar ro'yxatidagi 8 ta bosqichni aynan shu tartibda va shu 'key' lar bilan qaytar.",
            "Har bosqich uchun metod_id ni faqat shu bosqichning 'nomzod_metodlar' ro'yxatidan tanla.",
            "oqituvchi: 2–3 ta qisqa, aniq harakat (savollar matni bilan). oquvchilar: 1–2 ta harakat.",
            "majburiy_oquvchilar ro'yxatidagi har bir kodni kamida bitta bosqichning 'nomli' maydoniga aniq vazifa bilan kirit.",
            "takrorlash bosqichida sinfning eng zaif bosqichi va asosiy xatosiga qaratilgan mini-mashq bo'lsin.",
            "dars_formati.guruh_ishi true bo'lsa: mustahkamlash bosqichida berilgan guruh masalasidan foydalan, sonlarni o'zgartirma. "
            "false bo'lsa: guruh ishi YO'Q — mustahkamlash yakka yoki juftlikda darajali mashqlar bilan, guruhlarga bo'lish haqida yozma.",
            "dars_formati.diagnostika_kuni false bo'lsa: diagnostika bosqichi qog'ozsiz tezkor tekshiruv (mini-doska, chiqish chiptasi, "
            "svetofor), varaq tarqatish haqida yozma.",
            "Sonlarni o'ylab topma: faqat kontekstdagi sonlardan foydalan.",
            "uy_vazifasi.asosiy da kontekstdagi 'darslik' maydonidagi mashq daftari betini ko'rsat (bor bo'lsa).",
        ],
        "kontekst": context,
        "javob_formati": {
            "maqsad": {"talimiy": "...", "tarbiyaviy": "...", "rivojlantiruvchi": "...", "mezonlar": ["Men ... qila olaman"]},
            "bosqichlar": [{"key": "motivatsiya", "metod_id": "...", "oqituvchi": ["..."], "oquvchilar": ["..."],
                            "nomli": [{"kod": "5B-11", "vazifa": "..."}], "nega": "..."}],
            "uy_vazifasi": {"asosiy": "...", "tanlov": ["..."]},
        },
    }
    data = call_json(LESSON_SYSTEM, user, "dars_ssenariysi")
    return data if isinstance(data, dict) and isinstance(data.get("bosqichlar"), list) else None


# ------------------------------------------------------------------ 5. O'qituvchi metodi → kartochka (FR-10)

METHOD_SYSTEM = (
    "Sen metodistsan. O'qituvchi o'z so'zlari bilan tasvirlagan dars metodini standart kartochkaga aylantirasan. "
    "Faqat o'zbek tilida (lotin), qisqa va aniq. Javob faqat JSON."
)


def method_card(text: str, stages: list) -> dict | None:
    user = {
        "matn": text[:2000],
        "bosqichlar": [{"key": s["key"], "nomi": s["name"]} for s in stages],
        "qoidalar": [
            "stages: faqat berilgan bosqich key laridan 1–3 tasi.",
            "form: Sinf, Guruh, Juftlik yoki Yakka.",
            "minutes: masalan '3–5'.",
            "steps: 3–5 ta qisqa qadam.",
        ],
        "javob_formati": {"name": "...", "short": "...", "stages": ["takrorlash"], "form": "Juftlik", "minutes": "3–5", "steps": ["..."]},
    }
    data = call_json(METHOD_SYSTEM, user, "metod_kartochkasi", model=config.OPENAI_MODEL_FAST)
    return data if isinstance(data, dict) else None


# ------------------------------------------------------------------ 6. Haftalik AI-xulosa (FR-22)

WEEKLY_SYSTEM = (
    "Sen maktab metodistisan. Sinfning bir haftalik ma'lumotidan o'qituvchi va metodbirlashma uchun haftalik xulosa "
    "yozasan. Faqat berilgan raqamlarga tayan, o'quvchilarni faqat kod bilan ata, o'zbek tilida (lotin). Javob faqat JSON."
)


def weekly_summary(stats: dict, fallback: dict) -> tuple:
    if not enabled():
        return fallback, "shablon"
    user = {
        "statistika": stats,
        "qoidalar": [
            "bandlar: 4–5 ta band; har birida raqam; mavzular: o'zlashtirish, tizimli xato, e'tibor, metodlar, ilg'or guruh.",
            "keyingi_hafta: 3 ta aniq reja.",
        ],
        "javob_formati": {"sarlavha": "...", "bandlar": ["..."], "keyingi_hafta": ["..."]},
    }
    data = call_json(WEEKLY_SYSTEM, user, "haftalik_xulosa")
    if isinstance(data, dict) and isinstance(data.get("bandlar"), list) and data["bandlar"]:
        return {
            "sarlavha": str(data.get("sarlavha") or fallback["sarlavha"])[:160],
            "bandlar": [str(x)[:400] for x in data["bandlar"][:6]],
            "keyingi_hafta": [str(x)[:300] for x in (data.get("keyingi_hafta") or [])[:4]] or fallback["keyingi_hafta"],
        }, "gpt"
    return fallback, "shablon"


# ------------------------------------------------------------------ 7. Taqvim-mavzu rejani mavzularga ajratish (FR-04)

CURRICULUM_SYSTEM = (
    "Sen matematika metodistisan. O'qituvchi yuklagan taqvim-mavzu reja matnidan mavzular ro'yxatini ajratasan va har "
    "bir mavzuni ko'nikmalarga bog'laysan. Faqat o'zbek tilida (lotin). Javob faqat JSON."
)


def split_curriculum(text: str, skills: list) -> list | None:
    user = {
        "matn": text[:12000],
        "konikmalar": [{"key": k, "nomi": n} for k, n in skills],
        "qoidalar": [
            "Har bir mavzu: title, week (hafta raqami yoki null), hours (soat), skills va prerequisites — faqat berilgan key lardan.",
            "Matnda bo'lmagan mavzuni qo'shma. Ko'pi bilan 40 ta mavzu.",
        ],
        "javob_formati": {"mavzular": [{"title": "...", "week": 1, "hours": 2, "skills": ["hisoblash"], "prerequisites": ["tayanch"]}]},
    }
    data = call_json(CURRICULUM_SYSTEM, user, "oquv_dasturi")
    items = data.get("mavzular") if isinstance(data, dict) else None
    return items if isinstance(items, list) else None


# ------------------------------------------------------------------ 8. Ovozli e'tibor jurnali (docx 9.4)

def transcribe(audio: bytes, filename: str, names_hint: list) -> str | None:
    """O'qituvchining ovozli xabarini matnga aylantiradi. Ismlar ro'yxati tanib olishni yaxshilash uchun prompt sifatida beriladi."""
    if not enabled() or not audio:
        return None
    t0 = time.time()
    model = config.OPENAI_TRANSCRIBE_MODEL
    try:
        resp = _get_client().audio.transcriptions.create(
            model=model,
            file=(filename or "ovoz.webm", audio),
            # transkripsiya API "uz" kodini qabul qilmaydi — til prompt orqali beriladi
            prompt="O'zbek tilida (lotin yozuvida) yozing. O'qituvchi bugun qaysi o'quvchilar bilan ishlaganini aytadi. "
                   "Sinfdagi ismlar: " + ", ".join(names_hint[:80]) + ".",
        )
        text = getattr(resp, "text", None) or ""
        _log({"purpose": "ovozli_etibor", "model": model, "ok": True, "seconds": round(time.time() - t0, 2)})
        return text.strip()
    except Exception as e:
        global last_error
        last_error = f"{type(e).__name__}: {e}"[:300]
        _log({"purpose": "ovozli_etibor", "model": model, "ok": False, "seconds": round(time.time() - t0, 2), "error": last_error})
        return None


# ------------------------------------------------------------------ 8. Vizual baholash: qo'lyozma yechim (rubrika)

RUBRIC = [
    {"key": "model", "nom": "Amal/ifoda to'g'ri tuzilgan", "max": 2},
    {"key": "hisob", "nom": "Hisob-kitob to'g'ri bajarilgan", "max": 2},
    {"key": "javob", "nom": "Javob aniq va birligi bilan yozilgan", "max": 2},
]
OPEN_MAX = sum(c["max"] for c in RUBRIC)

SOLUTION_SYSTEM = (
    "Sen 5-sinf matematika o'qituvchisisan va o'quvchining QO'LDA yozgan yechimini rubrika bo'yicha baholaysan. "
    "Suratda o'quvchining yechim maydoni berilgan. Faqat suratda ko'ringan narsaga tayan - o'zingdan qo'shma. "
    "Agar maydon bo'sh bo'lsa, barcha mezonlarga 0 ball qo'y va 'bosh' ni true qil. "
    "Har mezonga 0, 1 yoki 2 ball. Izohlar o'zbek tilida (lotin), qisqa. Javobni faqat JSON qaytar."
)


def _valid_open(data) -> dict | None:
    if not isinstance(data, dict) or not isinstance(data.get("mezonlar"), list):
        return None
    by_key = {}
    for m in data["mezonlar"]:
        if not isinstance(m, dict):
            continue
        key = str(m.get("key", "")).strip()
        rub = next((c for c in RUBRIC if c["key"] == key), None)
        if not rub:
            continue
        try:
            ball = int(round(float(m.get("ball", 0))))
        except (TypeError, ValueError):
            return None
        by_key[key] = {"key": key, "nom": rub["nom"], "ball": max(0, min(ball, rub["max"])), "max": rub["max"],
                       "izoh": str(m.get("izoh", ""))[:160]}
    if len(by_key) != len(RUBRIC):
        return None
    mezonlar = [by_key[c["key"]] for c in RUBRIC]
    return {"mezonlar": mezonlar, "ball": sum(m["ball"] for m in mezonlar), "max": OPEN_MAX,
            "bosh": bool(data.get("bosh")), "izoh": str(data.get("izoh", ""))[:300]}


def grade_solution(problem: dict, image: bytes) -> dict | None:
    """Bitta o'quvchining yechim surati. problem: {shart, savol, etalon_ifoda, togri_javob, birlik}."""
    user = {
        "masala": problem,
        "rubrika": RUBRIC,
        "qoidalar": [
            "Har mezonga 0-2 ball: 2 - to'liq, 1 - qisman, 0 - yo'q yoki xato.",
            "Etalon ifodadan farq qilsa ham, matematik jihatdan to'g'ri yo'l bo'lsa 'model' ga to'liq ball ber.",
            "izoh: o'quvchiga 1 gap - nimani to'g'ri qilgani va keyingi qadam.",
            "Yozuvni o'qib bo'lmasa, 'izoh' da shuni ayt.",
        ],
        "javob_formati": {"mezonlar": [{"key": "model", "ball": 2, "izoh": "..."}], "bosh": False, "izoh": "..."},
    }
    return _valid_open(call_json_vision(SOLUTION_SYSTEM, user, [image], "yechim_baho"))


def grade_solutions(items: list) -> tuple:
    """items: [{code, problem, image}]. Qaytaradi: ({code: natija}, manba)."""
    out = {}
    if not enabled() or not items:
        return out, "yo'q"

    def run(it):
        return it["code"], grade_solution(it["problem"], it["image"])

    with ThreadPoolExecutor(max_workers=6) as ex:
        for code, res in ex.map(run, items):
            if res:
                out[code] = res
    return out, ("gpt" if out else "yo'q")


# ------------------------------------------------------------------ 9. Vizual baholash: uy vazifasi (mashq daftari)

HOMEWORK_SYSTEM = (
    "Sen 5-sinf matematika o'qituvchisisan. Suratda o'quvchining mashq daftari sahifasi bor. "
    "Har bir bajarilgan mashqni raqami bo'yicha ajrat va to'g'ri/xato ekanini aniqla; xato bo'lsa sababini ayt "
    "(masalan: amallar tartibi, hisob xatosi, shartni noto'g'ri tushunish). Faqat suratda ko'ringaniga tayan. "
    "O'zbek tilida (lotin), qisqa. Javobni faqat JSON qaytar."
)


def check_homework(image: bytes, context: dict) -> dict | None:
    """context: {mavzu, manba (mashq daftari sahifasi), kutilgan_mashqlar}."""
    user = {
        "kontekst": context,
        "qoidalar": [
            "Har mashq uchun: nom (raqami), togri (true/false), xato (qisqa tur nomi yoki null), izoh (1 gap).",
            "O'qib bo'lmaydigan mashqni ro'yxatga qo'shma.",
            "izoh (umumiy): o'qituvchiga 1 gap - nimaga e'tibor berish kerak.",
        ],
        "javob_formati": {"masalalar": [{"nom": "12", "togri": True, "xato": None, "izoh": "..."}], "izoh": "..."},
    }
    data = call_json_vision(HOMEWORK_SYSTEM, user, [image], "uy_vazifasi")
    if not isinstance(data, dict) or not isinstance(data.get("masalalar"), list):
        return None
    tasks = []
    for t in data["masalalar"][:20]:
        if not isinstance(t, dict) or not str(t.get("nom", "")).strip():
            continue
        tasks.append({"nom": str(t["nom"])[:10], "togri": bool(t.get("togri")),
                      "xato": (str(t["xato"])[:60] if t.get("xato") else None), "izoh": str(t.get("izoh", ""))[:160]})
    if not tasks:
        return None
    return {"masalalar": tasks, "correct": sum(1 for t in tasks if t["togri"]), "total": len(tasks),
            "izoh": str(data.get("izoh", ""))[:300]}
