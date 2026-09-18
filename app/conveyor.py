"""Dars konveyeri (docx 6.2 "o'qituvchining bir kuni"): har bir dars 5 qadamdan o'tadi.

Tayyorlash → Darsda → Tekshirish → Tahlil → Keyingi dars. Keyingi darsning tayyorlanishi shu darsning 5-qadami.
"""
import difflib
import math
import re
from datetime import date, datetime, timedelta

from sqlalchemy import func, select

from . import aha_plan, clock, db, llm, service
from .models import Attention, CurriculumTopic, Diagnostic, Lesson, LessonPlan, Response, Result, SchoolClass, Student
from .service import NotFound, fmt_date

STEPS = [("tayyorlash", "Tayyorlash"), ("darsda", "Darsda"), ("tekshirish", "Tekshirish"), ("tahlil", "Tahlil"), ("keyingi", "Keyingi dars")]
WEEKDAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"]


# ------------------------------------------------------------------ jadval
def schedule_dates(schedule: list, start: date, n: int, forward: bool = True) -> list:
    """Haftalik jadval bo'yicha start dan keyingi (yoki oldingi) n ta dars sanasi va soati.

    O'quv yili kalendari (chorak, ta'til, bayram) hisobga olinadi: ta'tilga tushgan kunlarda dars bo'lmaydi.
    """
    by_day = {x["weekday"]: x["hour"] for x in schedule}
    out, d = [], start
    step = timedelta(days=1 if forward else -1)
    guard = 0
    while len(out) < n and guard < 400:
        d += step
        guard += 1
        if d.weekday() in by_day and aha_plan.is_school_day(d):
            out.append((d, by_day[d.weekday()]))
    return out if forward else list(reversed(out))


def topic_of(s, lesson: Lesson):
    return s.get(CurriculumTopic, lesson.curriculum_topic_id) if lesson.curriculum_topic_id else None


def lesson_kind(s, lesson: Lesson) -> str:
    topic = topic_of(s, lesson)
    return topic.kind if topic and topic.kind else "dars"


def plan_format(s, cls: SchoolClass, lesson: Lesson):
    """Yangi dars formati: qog'ozli diagnostika — mavzu oxirida yoki har diag_every darsda; guruh ishi — haftasiga 1–2 marta.

    Summativ baholash (BSB/ChSB) kuni rasmiy yozma ish bo'ladi: guruh ishi bo'lmaydi, lekin ish varaqlari
    xuddi shu dvigatel bilan tayyorlanadi va avtomatik baholanadi (shablon topilsa).
    """
    if lesson_kind(s, lesson) in aha_plan.ASSESSMENT_KINDS:
        lesson.diagnostic_day = bool(service.lesson_template(s, lesson))
        lesson.group_work = False
        return
    template = service.lesson_template(s, lesson)
    last_diag = s.scalar(select(func.max(Lesson.seq)).where(Lesson.class_id == cls.id, Lesson.diagnostic_day.is_(True),
                                                           Lesson.seq < lesson.seq)) if lesson.seq is not None else None
    topic_end = False
    if lesson.curriculum_topic_id:
        nxt = s.scalars(select(Lesson).where(Lesson.class_id == cls.id, Lesson.seq == (lesson.seq or 0) + 1)).first()
        topic_end = not nxt or nxt.curriculum_topic_id != lesson.curriculum_topic_id
    since = (lesson.seq or 0) - (last_diag if last_diag is not None else -99)
    every = cls.diag_every or 3
    # mavzu oxirida ham, chastota bo'yicha ham — lekin ketma-ket ikki dars qog'ozli diagnostika bo'lmaydi
    lesson.diagnostic_day = bool(template) and since >= (2 if topic_end else every)
    lesson.group_work = (not lesson.diagnostic_day) and (lesson.seq or 0) % 3 == 1


def ensure_upcoming(s, cls: SchoolClass, count: int = 6):
    """Jadval bo'yicha kelgusi darslar yetarli bo'lishini ta'minlaydi."""
    from . import curriculum_plan

    future = s.scalars(select(Lesson).where(Lesson.class_id == cls.id, Lesson.date > clock.today())).all()
    if len(future) >= count or not cls.schedule:
        return
    last = s.scalars(select(Lesson).where(Lesson.class_id == cls.id).order_by(Lesson.date.desc())).first()
    start = last.date if last else clock.today() - timedelta(days=1)
    seq = (last.seq if last and last.seq is not None else -1) + 1
    created = []
    for d, hour in schedule_dates(cls.schedule, start, count - len(future)):
        lesson = Lesson(class_id=cls.id, date=d, hour=hour, seq=seq)
        s.add(lesson)
        created.append(lesson)
        seq += 1
    s.flush()
    curriculum_plan.assign_topics(s, cls.id)
    for lesson in created:
        plan_format(s, cls, lesson)


# ------------------------------------------------------------------ qadamlar holati
def _latest_plan(s, lesson_id):
    return s.scalars(select(LessonPlan).where(LessonPlan.lesson_id == lesson_id).order_by(LessonPlan.id.desc())).first()


def _diagnostic(s, lesson_id):
    return s.scalars(select(Diagnostic).where(Diagnostic.lesson_id == lesson_id).order_by(Diagnostic.id.desc())).first()


def _next_lesson(s, lesson):
    return s.scalars(select(Lesson).where(Lesson.class_id == lesson.class_id, Lesson.date > lesson.date).order_by(Lesson.date)).first()


def _steps(s, lesson, cls):
    plan = _latest_plan(s, lesson.id)
    diag = _diagnostic(s, lesson.id)
    n_students = s.scalar(select(func.count()).select_from(Student).where(Student.class_id == cls.id)) or 0
    status = (plan.plan.get("status") if plan else None) or ("qoralama" if plan else None)
    fmt_now = {"diagnostika_kuni": lesson.diagnostic_day, "guruh_ishi": lesson.group_work}
    outdated = bool(plan and plan.plan.get("format") and plan.plan["format"] != fmt_now)

    conducted = lesson.conducted_at is not None
    kind = lesson_kind(s, lesson)
    assessment = kind in aha_plan.ASSESSMENT_KINDS
    prepared = (conducted or (assessment and (not lesson.diagnostic_day or diag is not None))
                or (bool(plan) and status == "tasdiqlangan" and not outdated and (not lesson.diagnostic_day or diag is not None)))
    if assessment and not conducted:
        prep_hint = ("Summativ ish varaqlarini yarating (har o'quvchiga o'z varianti)" if lesson.diagnostic_day and not diag
                     else "Summativ baholash kuni — rasmiy yozma ish, ssenariy shart emas")
    elif conducted:
        prep_hint = "Ssenariy bo'yicha o'tkazildi" if plan else "Ssenariysiz o'tkazilgan"
    elif not plan:
        prep_hint = "Ssenariy hali tuzilmagan"
    elif outdated:
        prep_hint = "Dars formati o'zgardi — ssenariyni qayta tuzing"
    elif status != "tasdiqlangan":
        prep_hint = "Ssenariyni ko'rib chiqib tasdiqlang"
    elif lesson.diagnostic_day and not diag:
        prep_hint = "Diagnostik varaqlarni yarating"
    else:
        prep_hint = "Tayyor · " + ("varaqlar chop etishga tayyor" if lesson.diagnostic_day else "varaq kerak emas")

    named = sum(len(st.get("targeted", [])) for st in plan.plan.get("stages", [])) if plan else 0
    class_hint = "Dars o'tkazildi" if conducted else (f"{named} ta nomli ko'rsatma" if plan else
                                                     ("Yozma ish o'tkaziladi" if assessment else "Ssenariy kerak"))

    responses = graded = 0
    avg_pct = None
    if lesson.diagnostic_day:
        if diag:
            responses = s.scalar(select(func.count()).select_from(Response).where(Response.diagnostic_id == diag.id)) or 0
            res = s.scalars(select(Result).where(Result.diagnostic_id == diag.id)).all()
            graded = len(res)
            if res:
                avg_pct = round(100 * sum(r.correct / r.total for r in res) / len(res))
        checked = responses > 0
        analysed = graded > 0
        check_hint = f"{responses}/{n_students} javob o'qildi" if responses else "Javob chiziqlarini skanerlang"
        analysis_hint = f"O'rtacha {avg_pct}% · feedback tayyor" if analysed else "AI bilan baholash kutilmoqda"
    else:
        qc = lesson.quick_check
        checked = analysed = qc is not None
        check_hint = ("Tezkor tekshiruv kiritildi" if qc else
                      ("Yozma ish natijasini svetofor bilan kiriting" if assessment else "Qog'ozsiz tezkor tekshiruv"))
        analysis_hint = (f"Svetofor: {qc.get('green', 0)} · {qc.get('yellow', 0)} · {qc.get('red', 0)}" if qc else "Tekshiruvdan keyin")

    nxt = _next_lesson(s, lesson)
    next_plan = _latest_plan(s, nxt.id) if nxt else None
    next_ready = next_plan is not None or bool(nxt and nxt.conducted_at is not None)
    next_hint = (f"{fmt_date(nxt.date)} · {'ssenariy tayyor' if next_ready else 'ssenariy tuzilmagan'}" if nxt else "Jadvalda keyingi dars yo'q")

    done = [prepared, conducted, checked, analysed, next_ready]
    hints = [prep_hint, class_hint, check_hint, analysis_hint, next_hint]
    current = next((STEPS[i][0] for i, ok in enumerate(done) if not ok), "keyingi")
    steps = [{"key": k, "label": label, "done": ok, "hint": h} for (k, label), ok, h in zip(STEPS, done, hints)]
    extra = {"kind": kind, "plan_id": plan.id if plan else None, "plan_status": status, "plan_outdated": outdated,
             "diagnostic_id": diag.id if diag else None, "responses": responses, "graded": graded, "avg_pct": avg_pct,
             "next_lesson_id": nxt.id if nxt else None, "students": n_students}
    return steps, current, extra


def _topic_start_seq(s, lesson, topic):
    """Mavzu bir necha soat bo'lsa, shu darsning mavzu ichidagi o'rnini topish uchun birinchi dars seq i."""
    first = s.scalar(select(func.min(Lesson.seq)).where(Lesson.class_id == lesson.class_id,
                                                        Lesson.curriculum_topic_id == topic.id))
    return first if first is not None else lesson.seq


def brief(s, lesson, cls=None):
    cls = cls or s.get(SchoolClass, lesson.class_id)
    steps, current, extra = _steps(s, lesson, cls)
    today = clock.today()
    topic = topic_of(s, lesson)
    return {
        "id": lesson.id, "class_id": cls.id, "class_name": cls.name, "date": fmt_date(lesson.date), "iso": lesson.date.isoformat(),
        "lesson_no": topic.lesson_no + (lesson.seq - _topic_start_seq(s, lesson, topic)) if topic and topic.lesson_no and lesson.seq is not None else None,
        "chapter": topic.chapter_title if topic else None, "textbook": topic.textbook if topic else None,
        "workbook": topic.workbook if topic else None, "points": topic.points if topic else None,
        "weekday": WEEKDAYS[lesson.date.weekday()], "hour": lesson.hour, "seq": lesson.seq, "topic": lesson.topic,
        "diagnostic_day": lesson.diagnostic_day, "group_work": lesson.group_work,
        "template": service.lesson_template(s, lesson), "conducted": lesson.conducted_at is not None,
        "when": "bugun" if lesson.date == today else ("o'tgan" if lesson.date < today else "kelgusi"),
        "quick_check": lesson.quick_check, "steps": steps, "current": current, **extra,
    }


# ------------------------------------------------------------------ ko'rinishlar
def classes_view():
    with db.session() as s:
        out = []
        for cls in s.scalars(select(SchoolClass).order_by(SchoolClass.name)):
            n = s.scalar(select(func.count()).select_from(Student).where(Student.class_id == cls.id)) or 0
            gaps = service.attention_gaps(s, cls.id)
            N = service.gap_alert()
            out.append({"id": cls.id, "name": cls.name, "grade": cls.grade, "subject": cls.subject, "teacher": cls.teacher,
                        "students": n, "diag_every": cls.diag_every, "neglected": sum(1 for g in gaps.values() if g >= N),
                        "schedule": [{"weekday": WEEKDAYS[x["weekday"]], "hour": x["hour"]} for x in sorted(cls.schedule or [], key=lambda x: x["weekday"])]})
        return out


def update_class(cid: int, diag_every: int):
    if not 1 <= diag_every <= 10:
        raise ValueError("Diagnostika chastotasi 1–10 dars oralig'ida bo'lishi kerak")
    with db.session() as s:
        cls = s.get(SchoolClass, cid)
        if not cls:
            raise NotFound
        cls.diag_every = diag_every
        # hali tayyorlanmagan kelgusi darslar formati yangi chastotaga moslanadi
        for lesson in s.scalars(select(Lesson).where(Lesson.class_id == cid, Lesson.date > clock.today()).order_by(Lesson.seq)):
            if not _latest_plan(s, lesson.id) and not _diagnostic(s, lesson.id):
                plan_format(s, cls, lesson)
    return classes_view()


def sheets_for(n_students: int) -> dict:
    """Bitta qog'ozli diagnostika: A4 varaq 4 ta kartochkaga bo'linadi (old-orqa tomoni ishlatiladi)."""
    sheets = math.ceil(n_students / 4)
    return {"sheets": sheets, "cards": n_students, "total": sheets}


def paper_stats(s, classes):
    """Chorak boshidan: qog'ozli diagnostika va qog'ozsiz tezkor tekshiruvlar; har darsda test bo'lganda ketadigan qog'oz bilan solishtirish."""
    from .reports import quarter_start

    today = clock.today()
    q0 = quarter_start(today)
    paper = quick = used = every = 0
    for cls in classes:
        n = s.scalar(select(func.count()).select_from(Student).where(Student.class_id == cls.id)) or 0
        per = sheets_for(n)["total"]
        rows = s.scalars(select(Lesson).where(Lesson.class_id == cls.id, Lesson.date >= q0, Lesson.date <= today)).all()
        for lesson in rows:
            every += per
            if lesson.diagnostic_day:
                paper += 1
                used += per
            else:
                quick += 1
    return {"since": fmt_date(q0), "paper_lessons": paper, "quick_lessons": quick, "sheets_used": used,
            "sheets_if_every_lesson": every, "sheets_saved": every - used}


def upcoming_diagnostics(s, classes, days: int = 14):
    today = clock.today()
    out = []
    for cls in classes:
        n = s.scalar(select(func.count()).select_from(Student).where(Student.class_id == cls.id)) or 0
        rows = s.scalars(select(Lesson).where(Lesson.class_id == cls.id, Lesson.diagnostic_day.is_(True), Lesson.date >= today,
                                              Lesson.date <= today + timedelta(days=days)).order_by(Lesson.date)).all()
        for lesson in rows:
            out.append({"lesson_id": lesson.id, "class_id": cls.id, "class_name": cls.name, "date": fmt_date(lesson.date),
                        "iso": lesson.date.isoformat(), "weekday": WEEKDAYS[lesson.date.weekday()], "topic": lesson.topic,
                        "ready": _diagnostic(s, lesson.id) is not None, **sheets_for(n)})
    return sorted(out, key=lambda x: x["iso"])


def today_view():
    today = clock.today()
    with db.session() as s:
        classes = s.scalars(select(SchoolClass).order_by(SchoolClass.name)).all()
        for cls in classes:
            ensure_upcoming(s, cls)
        lessons = s.scalars(select(Lesson).where(Lesson.date == today)).all()
        label, day = "Bugun", today
        if not lessons:
            nxt = s.scalars(select(Lesson).where(Lesson.date > today).order_by(Lesson.date)).first()
            if nxt:
                day = nxt.date
                lessons = s.scalars(select(Lesson).where(Lesson.date == day)).all()
                label = "Keyingi o'quv kuni"
        by_cls = {c.id: c for c in classes}
        items = [brief(s, x, by_cls[x.class_id]) for x in sorted(lessons, key=lambda x: (x.hour or 0))]
        N = service.gap_alert()
        neglected = {c.id: sum(1 for g in service.attention_gaps(s, c.id).values() if g >= N) for c in classes}
        for it in items:
            it["neglected"] = neglected.get(it["class_id"], 0)
        teacher = classes[0].teacher if classes else None
        return {"label": label, "date": fmt_date(day), "iso": day.isoformat(), "weekday": WEEKDAYS[day.weekday()], "teacher": teacher,
                "lessons": items, "gap_alert": N, "upcoming_diagnostics": upcoming_diagnostics(s, classes),
                "paper": paper_stats(s, classes)}


def class_lessons(class_id: int):
    with db.session() as s:
        cls = service.get_class(s, class_id)
        ensure_upcoming(s, cls)
        today = clock.today()
        past = s.scalars(select(Lesson).where(Lesson.class_id == cls.id, Lesson.date < today).order_by(Lesson.date.desc()).limit(8)).all()
        rest = s.scalars(select(Lesson).where(Lesson.class_id == cls.id, Lesson.date >= today).order_by(Lesson.date).limit(7)).all()
        return {"class": {"id": cls.id, "name": cls.name, "diag_every": cls.diag_every},
                "lessons": [brief(s, x, cls) for x in list(reversed(past)) + rest]}


def lesson_detail(lid: int):
    with db.session() as s:
        lesson = s.get(Lesson, lid)
        if not lesson:
            raise NotFound
        cls = s.get(SchoolClass, lesson.class_id)
        info = brief(s, lesson, cls)
        marked = s.execute(select(Student.id, Student.code).join(Attention, Attention.student_id == Student.id)
                           .where(Attention.lesson_id == lid, Attention.kind == "ishladim")).all()
        group_age = None
        if lesson.group_work:
            row = service.active_group_membership(s, cls.id, [x.id for x in service.class_students(s, cls.id)])
            group_age = "saqlangan guruhlar" if row else "yangi guruhlar tuziladi"
        nxt = _next_lesson(s, lesson)
        next_info = brief(s, nxt, cls) if nxt else None
    plan = service.lesson_plan(info["plan_id"]) if info["plan_id"] else None
    diag = service.diagnostic_detail(info["diagnostic_id"]) if info["diagnostic_id"] else None
    return {**info, "plan": plan, "diagnostic": diag and {k: diag[k] for k in ("id", "status", "responses", "flagged", "graded", "pdf", "title")},
            "attended": [{"id": i, "code": c} for i, c in marked], "groups_note": group_age, "next": next_info,
            "gap_alert": service.gap_alert()}


# ------------------------------------------------------------------ amallar
def update_format(lid: int, diagnostic_day: bool | None, group_work: bool | None):
    with db.session() as s:
        lesson = s.get(Lesson, lid)
        if not lesson:
            raise NotFound
        if lesson_kind(s, lesson) in aha_plan.ASSESSMENT_KINDS and group_work:
            raise ValueError("Bu dars — rasmiy summativ baholash (BSB/ChSB) kuni, guruh ishi bo'lmaydi")
        if diagnostic_day is not None and diagnostic_day != lesson.diagnostic_day:
            if diagnostic_day and not service.lesson_template(s, lesson):
                raise ValueError("Bu mavzu uchun diagnostik shablon hali yo'q — qog'ozsiz tezkor tekshiruv qoladi")
            if not diagnostic_day and _diagnostic(s, lid):
                raise ValueError("Diagnostika allaqachon yaratilgan")
            lesson.diagnostic_day = diagnostic_day
            if diagnostic_day:
                lesson.group_work = False
        if group_work is not None:
            if group_work and lesson.diagnostic_day:
                raise ValueError("Diagnostika kunida guruh ishiga vaqt qolmaydi (8 daqiqa varaqqa ketadi)")
            lesson.group_work = group_work
    return lesson_detail(lid)


def prepare_plan(lid: int, regroup: bool = False):
    service.create_lesson_plan(lesson_id=lid, regroup=regroup)
    return lesson_detail(lid)


def prepare_diagnostic(lid: int):
    with db.session() as s:
        lesson = s.get(Lesson, lid)
        if not lesson:
            raise NotFound
        existing = _diagnostic(s, lid)
    if not existing:
        service.create_diagnostic(lesson_id=lid)
    return lesson_detail(lid)


def conduct(lid: int):
    with db.session() as s:
        lesson = s.get(Lesson, lid)
        if not lesson:
            raise NotFound
        if lesson.date > clock.today():
            raise ValueError("Kelgusi darsni o'tkazilgan deb belgilab bo'lmaydi")
        if lesson.conducted_at is None:
            lesson.conducted_at = clock.now()
    return lesson_detail(lid)


def save_quick_check(lid: int, green: int, yellow: int, red: int, struggled: list, note: str | None):
    with db.session() as s:
        lesson = s.get(Lesson, lid)
        if not lesson:
            raise NotFound
        ids = {x.id for x in service.class_students(s, lesson.class_id)}
        lesson.quick_check = {"green": max(0, int(green)), "yellow": max(0, int(yellow)), "red": max(0, int(red)),
                              "struggled": [i for i in struggled if i in ids], "note": (note or "")[:300],
                              "at": clock.now().strftime("%d.%m.%Y %H:%M")}
        if lesson.conducted_at is None and lesson.date <= clock.today():
            lesson.conducted_at = clock.now()
    return lesson_detail(lid)


def prepare_next(lid: int):
    with db.session() as s:
        lesson = s.get(Lesson, lid)
        if not lesson:
            raise NotFound
        cls = s.get(SchoolClass, lesson.class_id)
        ensure_upcoming(s, cls)
        nxt = _next_lesson(s, lesson)
        if not nxt:
            raise ValueError("Jadvalda keyingi dars topilmadi")
        nid = nxt.id
    service.create_lesson_plan(lesson_id=nid)
    return {"next_lesson_id": nid, "lesson": lesson_detail(lid)}


# ------------------------------------------------------------------ ovozli va matnli e'tibor (docx 9.4)
CYR = dict(zip("абвгдеёжзийклмнопрстуфхцчшъыьэюяқғҳў",
               ["a", "b", "v", "g", "d", "e", "yo", "j", "z", "i", "y", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", "f", "x",
                "ts", "ch", "sh", "'", "i", "", "e", "yu", "ya", "q", "g'", "h", "o'"]))
SUFFIXES = ["larning", "larga", "lardan", "ning", "dan", "bilan", "ga", "ka", "qa", "ni", "da", "jon", "xon", "lar"]
STOP = {"bugun", "bilan", "va", "ham", "men", "biz", "ishladim", "ishladik", "o'quvchi", "o'quvchilar", "darsda", "yordam", "berdim",
        "savol", "doskaga", "chiqdi", "chiqardim", "hamda", "yana", "keyin", "bir", "bu", "shu"}


def _norm(text: str) -> str:
    t = text.lower()
    t = "".join(CYR.get(ch, ch) for ch in t)
    t = re.sub(r"[‘’ʻʼ`´]", "'", t)
    return re.sub(r"[^a-z' ]+", " ", t)


def _variants(word: str):
    out = {word}
    for _ in range(2):
        for w in list(out):
            for suf in SUFFIXES:
                if w.endswith(suf) and len(w) - len(suf) >= 3:
                    out.add(w[: -len(suf)])
    return out


def match_names(text: str, students: list) -> dict:
    """Matndagi ismlarni sinf ro'yxatiga moslaydi (kod ichida, AI siz). students: [{id, code, name}]"""
    words = [w.strip("'") for w in _norm(text).split() if w.strip("'")]
    people = []
    for st in students:
        parts = _norm(st["name"]).split()
        people.append({**st, "first": parts[0] if parts else "", "last": parts[1] if len(parts) > 1 else ""})
    matches, ambiguous = {}, []
    for i, w in enumerate(words):
        if w in STOP or len(w) < 3:
            continue
        cands = []
        for p in people:
            score = max(difflib.SequenceMatcher(None, v, p["first"]).ratio() for v in _variants(w))
            if score >= 0.84:
                cands.append((score, p))
        if not cands:
            continue
        best = max(c[0] for c in cands)
        cands = [p for sc, p in cands if sc >= best - 0.02]
        if len(cands) > 1 and i + 1 < len(words):  # familiya yoki bosh harf bilan aniqlash
            nxt = words[i + 1]
            narrowed = [p for p in cands if p["last"] and (p["last"].startswith(nxt[:1]) and (len(nxt) <= 2 or
                        difflib.SequenceMatcher(None, nxt, p["last"]).ratio() >= 0.7))]
            cands = narrowed or cands
        if len(cands) == 1:
            p = cands[0]
            matches[p["id"]] = {"id": p["id"], "code": p["code"], "name": p["name"], "heard": w}
        else:
            ambiguous.append({"heard": w, "options": [{"id": p["id"], "code": p["code"], "name": p["name"]} for p in cands]})
    ambiguous = [a for a in ambiguous if not any(o["id"] in matches for o in a["options"])]
    return {"matches": list(matches.values()), "ambiguous": ambiguous}


def _class_roster(lid):
    with db.session() as s:
        lesson = s.get(Lesson, lid)
        if not lesson:
            raise NotFound
        return [service.student_brief(x) for x in service.class_students(s, lesson.class_id)]


def attention_from_text(lid: int, text: str) -> dict:
    roster = _class_roster(lid)
    return {"transcript": text, **match_names(text or "", roster)}


def attention_from_voice(lid: int, audio: bytes, filename: str) -> dict:
    roster = _class_roster(lid)
    firsts = sorted({r["name"].split()[0] for r in roster})
    text = llm.transcribe(audio, filename, firsts)
    if not text:
        raise ValueError("Ovozni matnga aylantirib bo'lmadi — ismlarni matn bilan kiriting")
    return {"transcript": text, **match_names(text, roster)}
