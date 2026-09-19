"""Demo ma'lumotlari: bir o'qituvchining 3 ta parallel 5-sinfi (to'qima ismlar), real taqvim-mavzu reja bo'yicha.

Darslar 2-sentabrdan bugungi kunga qadar sinf jadvali bo'yicha yaratiladi (ta'til va bayramlar hisobga olinadi),
mavzular "AHA! Matematika 5-sinf" rejasidan olinadi. Har sinfda: e'tibor jurnali tarixi, ko'nikma ballari,
tezkor tekshiruvlar va bitta baholangan qog'ozli diagnostika (GPT siz, shablon feedback bilan).
"""
import random
import secrets
from datetime import date, datetime, time as dtime, timedelta

from sqlalchemy import func, select

from . import aha_plan, clock, db
from .curriculum import SKILLS
from .models import Attention, Grade, Homework, Lesson, Response, Result, SchoolClass, SkillScore, Student

NAMES_B = [
    "Aziza Karimova", "Bekzod Toshpo'latov", "Dilshod Rahimov", "Farangiz Usmonova", "Jasur Mahmudov",
    "Kamola Saidova", "Laylo Azimova", "Mirjalol Nurmatov", "Nigora Xolmatova", "Otabek Yusupov",
    "Sardor Bobojonov", "Shahzoda Ismoilova", "Umid Qodirov", "Zarina Ergasheva", "Asal Davletova",
    "Behruz Otajonov", "Diyora Matyoqubova", "Elyor Sobirov", "Feruza Nazarova", "G'ayrat Polvonov",
    "Hilola Ruzmetova", "Islom Tojiyev", "Jahongir Vapayev", "Kumush Zaripova", "Lola Atajonova",
    "Muhammadali Bekchanov", "Nodira Kurbonova", "Oybek Lutfullayev", "Parizoda Madaminova",
    "Rustam Hasanov", "Sevara Jumaniyozova",
]
NAMES_A = [
    "Abdulla Sapayev", "Barno Ro'zmetova", "Doniyor Qurbonov", "Dildora Yusupova", "Eldor Masharipov",
    "Firdavs Allaberganov", "Gulnoza Otaboyeva", "Husan Jumaniyozov", "Iroda Bekjonova", "Javohir Sobirov",
    "Kamronbek Davletov", "Madina Egamberganova", "Nurbek Rajabov", "Ozoda Sultonova", "Ravshan Xudoyberganov",
    "Sabina Matchanova", "Temur Ollaberganov", "Umida Qalandarova", "Xurshid Atamuratov", "Yulduz Saparboyeva",
    "Zafar Babajonov", "Aziz Yakubov", "Charos Nurmetova", "Dostonbek Karimov", "Gulshan Ismoilova",
    "Hasan Kuryazov", "Lobar Abdullayeva", "Mansur Ro'zimov", "Nilufar Xudoyorova",
]
NAMES_V = [
    "Anvar Atajonov", "Bahora Rahimova", "Davron Yo'ldoshev", "Durdona Sapayeva", "Eldorbek Qosimov",
    "Fotima Jabbarova", "G'ulom Otamurodov", "Hurshida Bekmetova", "Ibrohim Madraximov", "Jamila Karimberdiyeva",
    "Komil Abdurahmonov", "Maftuna Saidova", "Nodir Ollayorov", "Oysha Qurbonboyeva", "Po'lat Sobirjonov",
    "Robiya Matyakubova", "Sherzod Egamov", "Shoira Yoqubova", "Tohir Bobojonov", "Umidjon Xo'janiyozov",
    "Visola Ro'zimova", "Xolida Otajonova", "Yusuf Masharipov", "Zilola Atabayeva", "Asadbek Ibragimov",
    "Bunyod Kalandarov", "Dilnura Ro'zmetova", "Muslima Yusupova",
]

# sinf: (nomi, ismlar, dars soati, o'zlashtirish oralig'i, e'tiborsizlar {jurnal №: dars})
CLASSES = [
    ("5-A", NAMES_A, 3, (0.5, 0.85), {6: 6, 14: 5}),
    ("5-B", NAMES_B, 2, (0.35, 0.75), {11: 8, 5: 7, 8: 5, 2: 6}),
    ("5-V", NAMES_V, 5, (0.25, 0.65), {3: 7, 9: 6, 17: 5}),
]
STRONG_B, WEAK_B = {4, 7, 13, 12, 22}, {11, 5, 20, 26}
TEACHER = "Sultonboyev Bekzodbek"


def _schedule(today: date, hour: int, off_shift: int) -> list:
    """Dushanba–shanba, haftada 5 dars (matematika 5 soat/hafta); dam kuni bugunga to'g'ri kelmaydi.

    Demo yakshanba kuni ko'rsatilsa, jadvalga yakshanba ham qo'shiladi — aks holda "bugungi darslar" bo'sh qoladi.
    """
    tw = today.weekday()
    off = (tw + off_shift) % 6 if tw < 6 else off_shift % 6
    if off == tw:
        off = (off + 1) % 6
    days = list(range(6)) + ([6] if tw == 6 else [])
    return [{"weekday": d, "hour": hour + (1 if d % 2 and d != tw else 0)} for d in days if d != off]


def _dates(schedule: list, a: date, b: date) -> list:
    """a dan b gacha (ikkalasi ham kiradi) jadvalga va o'quv kalendariga mos sanalar."""
    by_day = {x["weekday"]: x["hour"] for x in schedule}
    out, d = [], a
    while d <= b:
        if d.weekday() in by_day and aha_plan.is_school_day(d):
            out.append((d, by_day[d.weekday()]))
        d += timedelta(days=1)
    return out


# demo uy vazifasi yozuvlari (to'g'ri va xato variantlar)
HOMEWORK_OK = ["24 + 6 * 3 = 42", "(120 - 45) : 5 = 15", "36 : 4 + 18 = 27", "7 * 8 - 14 = 42", "150 - 60 : 6 = 140"]
HOMEWORK_BAD = [("24 + 6 * 3 = 90", "amallar tartibi"), ("(120 - 45) : 5 = 105", "amallar tartibi"),
                ("36 : 4 + 18 = 25", "hisob xatosi"), ("7 * 8 - 14 = 44", "hisob xatosi"),
                ("150 - 60 : 6 = 15", "amallar tartibi")]


def _demo_day_shift(today_index: int) -> int:
    """Demo kuni BSB/ChSB ga tushmasligi uchun ketma-ketlikni necha darsga surish kerakligi.

    Reja haqiqiy (AHA! 170 darslik TMR), sanalar ham haqiqiy — faqat sinf rejada bir-ikki dars
    "orqada" bo'ladi. Shunda demo kuni doim oddiy, shabloni bor dars bo'ladi.
    """
    from . import curriculum_plan

    slots = [r for r in curriculum_plan.default_rows() for _ in range(max(1, r["hours"]))]
    for want_template in (True, False):
        for shift in range(0, 6):
            i = today_index - shift
            if 0 <= i < len(slots) and slots[i]["kind"] == "dars" and (slots[i]["template"] or not want_template):
                return shift
    return 0


def _gap_choice(rng):
    return rng.choices([0, 1, 2, 3, 4], weights=[1, 4, 4, 3, 2])[0]


def seed():
    from . import auth, conveyor, curriculum_plan, service, simulate
    from .models import CurriculumTopic

    auth.ensure_demo_user()                     # landing sahifasidagi demo kirish
    with db.session() as s:
        if s.scalar(select(func.count()).select_from(SchoolClass)):
            return
    today = clock.today()
    start = aha_plan.year_start(today)
    rng = random.Random(2026)
    created = []
    for ci, (name, names, hour, (lo, hi), neglected) in enumerate(CLASSES):
        with db.session() as s:
            cls = SchoolClass(name=name, grade=5, subject="Matematika", teacher=TEACHER,
                              schedule=_schedule(today, hour, ci + 2), diag_every=3)
            s.add(cls)
            s.flush()
            prefix = name.replace("-", "")
            for i, full in enumerate(names, start=1):
                s.add(Student(class_id=cls.id, journal_no=i, full_name=full, code=f"{prefix}-{i:02d}",
                              parent_token=secrets.token_urlsafe(9), parent_consent=rng.random() < 0.6))
            s.flush()

            # darslar: o'quv yili boshidan bugungacha + kelgusi 6 ta
            past = _dates(cls.schedule, start, today)
            rows = past + conveyor.schedule_dates(cls.schedule, today, 6)
            # demo kuni baholash kuniga (BSB/ChSB) tushib qolmasin: boshidagi bir nechta darsni tashlab,
            # butun ketma-ketlikni suramiz — sanalar haqiqiy, faqat sinf rejada shuncha dars "orqada" bo'ladi
            rows = rows[_demo_day_shift(len(past) - 1):]
            for seq, (d, h) in enumerate(rows):
                s.add(Lesson(class_id=cls.id, date=d, hour=h, seq=seq,
                             conducted_at=datetime.combine(d, dtime(8 + h, 0)) if d < today else None))
            s.flush()
            cid = cls.id
        curriculum_plan.ensure_default(cid)
        with db.session() as s:
            cls = s.get(SchoolClass, cid)
            curriculum_plan.assign_topics(s, cid)
            lessons = s.scalars(select(Lesson).where(Lesson.class_id == cid).order_by(Lesson.seq)).all()
            # o'tkazilgan darslar mavzusi ham rejadan (assign_topics ularni o'tkazib yuboradi)
            plan = s.scalars(select(CurriculumTopic).where(CurriculumTopic.class_id == cid).order_by(CurriculumTopic.order)).all()
            slots = [t for t in plan for _ in range(max(1, t.hours))]
            for lesson in lessons:
                if lesson.conducted_at is not None and lesson.seq < len(slots):
                    lesson.curriculum_topic_id = slots[lesson.seq].id
                    lesson.topic = slots[lesson.seq].title
            s.flush()

            # o'tgan qog'ozli diagnostika: shabloni bor va mavzusi tugagan oxirgi dars
            conducted = [x for x in lessons if x.conducted_at is not None]
            by_id = {t.id: t for t in plan}
            diag_lesson = None
            for lesson in conducted[:-1]:
                topic = by_id.get(lesson.curriculum_topic_id)
                if not topic or not topic.template or topic.kind != "dars":
                    continue
                nxt = lessons[lesson.seq + 1] if lesson.seq + 1 < len(lessons) else None
                if nxt and nxt.curriculum_topic_id != lesson.curriculum_topic_id:
                    diag_lesson = lesson
            for lesson in lessons:
                if lesson.conducted_at is None:
                    conveyor.plan_format(s, cls, lesson)
                    continue
                topic = by_id.get(lesson.curriculum_topic_id)
                assessment = bool(topic and topic.kind in aha_plan.ASSESSMENT_KINDS)
                lesson.diagnostic_day = diag_lesson is not None and lesson.id == diag_lesson.id
                lesson.group_work = not lesson.diagnostic_day and not assessment and lesson.seq % 3 == 1
                s.flush()

            students = service.class_students(s, cid)
            ids = [st.id for st in students]
            for lesson in conducted:
                if lesson.diagnostic_day:
                    continue
                n = len(ids)
                red = rng.randint(2, max(3, round(n * (0.75 - lo) / 3)))
                yellow = rng.randint(4, 9)
                lesson.quick_check = {"green": n - red - yellow, "yellow": yellow, "red": red,
                                      "struggled": rng.sample(ids, min(red, 4)), "note": "",
                                      "at": lesson.date.strftime("%d.%m.%Y") + " 13:10"}
            for st in students:
                j = st.journal_no
                gap = neglected.get(j, _gap_choice(rng))
                gap = min(gap, len(conducted) - 1)
                chosen = [conducted[-gap - 1]] + ([] if gap >= len(conducted) - 3 else rng.sample(conducted[: -gap - 1], rng.choice([0, 1, 2])))
                for lesson in {x.id: x for x in chosen}.values():
                    s.add(Attention(student_id=st.id, lesson_id=lesson.id))
                base = rng.uniform(lo, hi)
                if name == "5-B" and j in STRONG_B:
                    base = 0.85
                for skill, _ in SKILLS:
                    v = base + rng.uniform(-0.15, 0.12)
                    if name == "5-B" and j in WEAK_B and skill in ("tayanch", "talqin"):
                        v = rng.uniform(0.15, 0.38)
                    s.add(SkillScore(student_id=st.id, skill=skill, score=round(min(max(v, 0.05), 0.98), 2)))
            # baholar jurnali: o'tkazilgan darslarning ko'pchiligida formativ ball (0–10)
            smap_seed = {st.id: None for st in students}
            for lesson in conducted:
                if lesson.diagnostic_day or rng.random() < 0.25:
                    continue
                for st in students:
                    base = (lo + hi) / 2
                    if name == "5-B" and st.journal_no in STRONG_B:
                        base = 0.88
                    elif name == "5-B" and st.journal_no in WEAK_B:
                        base = 0.35
                    val = max(0, min(10, round((base + rng.uniform(-0.18, 0.18)) * 10)))
                    s.add(Grade(lesson_id=lesson.id, student_id=st.id, points=float(val), max_points=10,
                                kind="formativ", source="qo'lda"))
            _ = smap_seed
            recent_ids = [x.id for x in conducted][-(4 if name == "5-V" else 6):]
            created.append((cid, diag_lesson.id if diag_lesson else None, recent_ids))

    # har sinfda bitta baholangan diagnostika: skaner javoblari + qo'lda yozilgan yechim surati + AI rubrikasi
    from .storage import storage

    for cid, lid, _ in created:
        if not lid:
            continue
        did = service.create_diagnostic(lesson_id=lid, use_llm=False)
        with db.session() as s:
            d, specs, assign = service._load(s, did)
            smap = service.skill_map(s, cid)
            for st in service.class_students(s, cid):
                sk = smap.get(st.id, {})
                if sk.get("tayanch", 1) < 0.4:
                    profile = "tayanch"
                elif sum(sk.values()) / max(1, len(sk)) > 0.8:
                    profile = "kuchli"
                else:
                    profile = rng.choice(simulate.PROFILES)
                marks = simulate.simulate_answers(specs[assign[st.id]], profile, rng)
                conf = rng.choice([1.0, 1.0, 1.0, 1.0, 0.86, 0.71])
                flags = {"q3": "xira belgi"} if conf < 0.9 else {}
                s.add(Response(diagnostic_id=did, student_id=st.id, marks=marks, flags=flags, source="skaner",
                               auto_marks=dict(marks), confidence=conf, corrected=0))
            d.status = "skanerlandi"
        service.grade_diagnostic(did, use_llm=False)
        # feedback reytingi va o'qituvchi tahriri (demo statistikasi uchun)
        with db.session() as s:
            results = s.scalars(select(Result).where(Result.diagnostic_id == did)).all()
            for i, r in enumerate(results):
                if i % 4 == 0:
                    r.feedback_rating = 1
                elif i % 9 == 7:
                    r.feedback_rating = -1
                if i % 13 == 3:
                    r.feedback_edited = True
            # bitta o'quvchida skaner xira o'qigan javobni o'qituvchi tuzatgan
            first = s.scalars(select(Response).where(Response.diagnostic_id == did, Response.confidence < 0.9)).first()
            if first:
                first.corrected, first.source = 1, "qo'lda"
        service.grades_from_diagnostic(did)

    # uy vazifasi: oxirgi ikki darsda daftar suratlari AI tomonidan tekshirilgan (demo mock)
    for cid, _, recent_ids in created:
        with db.session() as s:
            lessons = [s.get(Lesson, x) for x in recent_ids[-2:]]
            students = service.class_students(s, cid)
            smap = service.skill_map(s, cid)
            for li, lesson in enumerate(lessons):
                if not lesson:
                    continue
                topic = s.get(CurriculumTopic, lesson.curriculum_topic_id) if lesson.curriculum_topic_id else None
                ref = topic.workbook if topic else None
                for st in students[: 12 if li == 0 else 8]:
                    score = sum(smap.get(st.id, {}).values()) / max(1, len(smap.get(st.id, {}) or {1: 1}))
                    n = rng.choice([3, 4, 4, 5])
                    tasks = []
                    for k in range(n):
                        ok = rng.random() < max(0.25, min(0.95, score + 0.1))
                        num = str(112 + li * 6 + k)
                        if ok:
                            tasks.append({"nom": num, "togri": True, "xato": None,
                                          "izoh": "To'g'ri bajarilgan.", "yozuv": rng.choice(HOMEWORK_OK)})
                        else:
                            text, err = rng.choice(HOMEWORK_BAD)
                            tasks.append({"nom": num, "togri": False, "xato": err,
                                          "izoh": f"Xato: {err}. Bosqichlarni qayta yoz.", "yozuv": text})
                    correct = sum(1 for t in tasks if t["togri"])
                    key = None
                    if st.journal_no <= 2:                        # bir-ikkitasida daftar surati ham bo'lsin
                        try:
                            storage.put(f"homework/{lesson.id}/{st.id}.jpg",
                                        simulate.make_homework_page(tasks, seed=lesson.id * 10 + st.id), "image/jpeg")
                            key = f"homework/{lesson.id}/{st.id}.jpg"
                        except Exception:
                            key = None
                    s.add(Homework(lesson_id=lesson.id, student_id=st.id, image_key=key, reference=ref,
                                   tasks=[{k2: v for k2, v in t.items() if k2 != "yozuv"} for t in tasks],
                                   correct=correct, total=len(tasks),
                                   comment=("Barcha mashqlar to'g'ri." if correct == len(tasks)
                                            else "Amallar tartibiga e'tibor bering."),
                                   source="ai", confirmed=st.journal_no % 3 == 0))

    # o'tgan darslar ham DarsPilot ssenariysi bilan o'tgan (direktor panelidagi "ssenariy ulushi" uchun)
    for cid, _, recent_ids in created:
        for lid in recent_ids:
            with db.session() as s:
                lesson = s.get(Lesson, lid)
                topic = s.get(CurriculumTopic, lesson.curriculum_topic_id) if lesson.curriculum_topic_id else None
                skip = bool(topic and topic.kind in aha_plan.ASSESSMENT_KINDS)
            if skip:
                continue
            pid = service.create_lesson_plan(lesson_id=lid, use_llm=False)
            service.update_lesson_plan(pid, [], "tasdiqlangan")

    # bugungi darslar: 5-B tayyor (ssenariy tasdiqlangan, varaqlar bor), 5-A ssenariy qoralama, 5-V hali boshlanmagan
    with db.session() as s:
        kinds = {}
        for c in s.scalars(select(SchoolClass)):
            lesson = s.scalars(select(Lesson).where(Lesson.class_id == c.id, Lesson.date == today)).first()
            if not lesson:
                continue
            topic = s.get(CurriculumTopic, lesson.curriculum_topic_id) if lesson.curriculum_topic_id else None
            kinds[c.name] = (lesson.id, topic.kind if topic else "dars", topic.template if topic else None)
    b, a = kinds.get("5-B"), kinds.get("5-A")
    if b:
        lid, kind, template = b
        paper = kind == "dars" and bool(template)
        if paper:
            with db.session() as s:
                lesson = s.get(Lesson, lid)
                lesson.diagnostic_day, lesson.group_work = True, False
        pid = service.create_lesson_plan(lesson_id=lid, use_llm=False)
        service.update_lesson_plan(pid, [], "tasdiqlangan")
        if paper:
            service.create_diagnostic(lesson_id=lid, use_llm=False)
    if a:
        lid, kind, _ = a
        if kind == "dars":
            with db.session() as s:
                lesson = s.get(Lesson, lid)
                lesson.diagnostic_day, lesson.group_work = False, True
            service.create_lesson_plan(lesson_id=lid, use_llm=False)
