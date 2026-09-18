"""Hisobotlar (docx 12, 21.1): haftalik AI-xulosa, direktor paneli (barcha sinflar), ota-ona kabineti."""
from datetime import date, timedelta

from sqlalchemy import select

from . import aha_plan, clock, db, llm, service
from .curriculum import SKILLS
from .models import Attention, DiagSummary, Diagnostic, Lesson, LessonPlan, Result, SchoolClass, Student, WeeklyReport

LEVEL_WORDS = [(0.75, "yaxshi"), (0.5, "o'rtacha"), (0.0, "yordam kerak")]


def _pct(x):
    return round(100 * x)


def _level_word(v):
    return next(w for t, w in LEVEL_WORDS if (v or 0) >= t)


def quarter_start(today: date) -> date:
    """Joriy chorak boshlanishi (o'quv yili kalendari: aha_plan)."""
    return aha_plan.quarter_of(today)[1]


# ------------------------------------------------------------------ haftalik AI-xulosa (FR-22)
def weekly_stats(class_id=None):
    N = service.gap_alert()
    today = clock.today()
    since = today - timedelta(days=7)
    with db.session() as s:
        cls = service.get_class(s, class_id)
        sts = service.class_students(s, cls.id)
        codes = {st.id: st.code for st in sts}
        smap = service.skill_map(s, cls.id)
        gaps = service.attention_gaps(s, cls.id)
        lessons = s.scalars(select(Lesson).where(Lesson.class_id == cls.id, Lesson.date > since, Lesson.conducted_at.is_not(None))).all()
        lesson_ids = [x.id for x in lessons]
        worked = set(s.scalars(select(Attention.student_id).where(Attention.lesson_id.in_(lesson_ids), Attention.kind == "ishladim"))) if lesson_ids else set()
        diag_rows = []
        for d in s.scalars(select(Diagnostic).where(Diagnostic.class_id == cls.id, Diagnostic.date > since)):
            res = s.scalars(select(Result).where(Result.diagnostic_id == d.id)).all()
            if not res:
                continue
            summ = s.get(DiagSummary, d.id)
            stats = summ.summary.get("stats", {}) if summ else {}
            diag_rows.append({"mavzu": d.title, "sana": d.date.strftime("%d.%m"), "baholangan": len(res),
                              "ortacha_foiz": _pct(sum(r.correct / r.total for r in res) / len(res)),
                              "bosqichlar_foizi": stats.get("bosqichlar_boyicha_togri_foiz", {}),
                              "asosiy_xatolar": stats.get("asosiy_xatolar", {})})
        quick = [x.quick_check for x in lessons if x.quick_check]
        methods = {}
        for p in s.scalars(select(LessonPlan).where(LessonPlan.class_id == cls.id, LessonPlan.lesson_id.in_(lesson_ids))) if lesson_ids else []:
            for st in p.plan.get("stages", []):
                methods[st["method"]["name"]] = methods.get(st["method"]["name"], 0) + 1
        skill_avg = {name: _pct(sum(smap.get(st.id, {}).get(k, 0) for st in sts) / max(1, len(sts))) for k, name in SKILLS}
        strong = [codes[st.id] for st in sts if smap.get(st.id) and sum(smap[st.id].values()) / len(smap[st.id]) >= 0.85]
        neglected = sorted(((codes[sid], g) for sid, g in gaps.items() if g >= N), key=lambda x: -x[1])
        return cls, {
            "sinf": cls.name,
            "davr": f"{(since + timedelta(days=1)).strftime('%d.%m')}–{today.strftime('%d.%m.%Y')}",
            "oquvchilar": len(sts), "darslar": len(lessons),
            "guruh_ishi_darslari": sum(1 for x in lessons if x.group_work),
            "etibor_qamrovi_foiz": _pct(len(worked) / max(1, len(sts))),
            "etiborsiz_oquvchilar": [{"kod": c, "dars": g} for c, g in neglected],
            "diagnostikalar": diag_rows,
            "tezkor_tekshiruvlar": [{"yashil": q.get("green"), "sariq": q.get("yellow"), "qizil": q.get("red")} for q in quick],
            "konikmalar_ortacha_foiz": skill_avg,
            "ilgor_oquvchilar": strong,
            "ssenariylardagi_metodlar": dict(sorted(methods.items(), key=lambda x: -x[1])[:6]),
        }


def _fallback_weekly(st):
    bands = [f"Hafta davomida {st['darslar']} ta dars o'tkazildi, e'tibor qamrovi {st['etibor_qamrovi_foiz']}% "
             f"({st['oquvchilar']} o'quvchidan)."]
    if st["diagnostikalar"]:
        d = st["diagnostikalar"][-1]
        bands.append(f"“{d['mavzu']}” diagnostikasi: {d['baholangan']} o'quvchi, o'rtacha {d['ortacha_foiz']}%.")
        if d["asosiy_xatolar"]:
            name, cnt = max(d["asosiy_xatolar"].items(), key=lambda x: x[1])
            bands.append(f"Tizimli muammo: {cnt} o'quvchida — {name.lower()}.")
    weakest = min(st["konikmalar_ortacha_foiz"].items(), key=lambda x: x[1])
    bands.append(f"Eng zaif ko'nikma: {weakest[0].lower()} ({weakest[1]}%).")
    if st["etiborsiz_oquvchilar"]:
        bands.append("E'tibor: " + ", ".join(f"{x['kod']} ({x['dars']} dars)" for x in st["etiborsiz_oquvchilar"][:5])
                     + " — keyingi ssenariyga kiritiladi.")
    return {
        "sarlavha": f"{st['sinf']} sinf · {st['davr']}",
        "bandlar": bands,
        "keyingi_hafta": [f"Takrorlash bosqichida {weakest[0].lower()} bo'yicha 3 daqiqalik mashq",
                          "E'tiborsiz o'quvchilarga birinchi darsda nomli vazifa",
                          "Mavzu oxirida bosqichli diagnostika, qolgan darslarda qog'ozsiz tezkor tekshiruv"],
    }


def create_weekly(class_id=None):
    cls, stats = weekly_stats(class_id)
    report, source = llm.weekly_summary(stats, _fallback_weekly(stats))
    report["stats"] = {"davr": stats["davr"], "darslar": stats["darslar"], "etibor_qamrovi_foiz": stats["etibor_qamrovi_foiz"],
                       "diagnostikalar": len(stats["diagnostikalar"]), "etiborsizlar": len(stats["etiborsiz_oquvchilar"])}
    with db.session() as s:
        s.add(WeeklyReport(class_id=cls.id, period=stats["davr"], report=report, source=source))
    return latest_weekly(cls.id)


def latest_weekly(class_id=None):
    with db.session() as s:
        cls = service.get_class(s, class_id)
        row = s.scalars(select(WeeklyReport).where(WeeklyReport.class_id == cls.id).order_by(WeeklyReport.id.desc())).first()
        if not row:
            return None
        return {"id": row.id, "class_id": cls.id, "period": row.period, "source": row.source,
                "created_at": row.created_at.strftime("%d.%m.%Y %H:%M"), **row.report}


# ------------------------------------------------------------------ direktor paneli (FR-24)
def director_panel():
    today = clock.today()
    q_start = quarter_start(today)
    weeks = max(1, (today - q_start).days // 7 + 1)
    expected = min(4, round(4 * weeks / 9, 1))  # chorakda kamida 4 formativ baholash, 9 haftaga taqsimlangan
    N = service.gap_alert()
    classes, trend, alerts = [], [], []
    with db.session() as s:
        cls_rows = s.scalars(select(SchoolClass).order_by(SchoolClass.name)).all()
        for cls in cls_rows:
            sts = service.class_students(s, cls.id)
            smap = service.skill_map(s, cls.id)
            gaps = service.attention_gaps(s, cls.id)
            skills = {k: _pct(sum(smap.get(st.id, {}).get(k, 0) for st in sts) / max(1, len(sts))) for k, _ in SKILLS}
            avg_all = round(sum(skills.values()) / len(skills))
            conducted = s.scalars(select(Lesson).where(Lesson.class_id == cls.id, Lesson.conducted_at.is_not(None))
                                  .order_by(Lesson.date.desc())).all()
            recent = conducted[:N]
            covered = set(s.scalars(select(Attention.student_id).where(Attention.lesson_id.in_([x.id for x in recent]),
                                                                       Attention.kind == "ishladim"))) if recent else set()
            diags = s.scalars(select(Diagnostic).where(Diagnostic.class_id == cls.id, Diagnostic.status == "baholandi",
                                                       Diagnostic.date >= q_start).order_by(Diagnostic.date)).all()
            points = []
            for d in diags:
                res = s.scalars(select(Result).where(Result.diagnostic_id == d.id)).all()
                if res:
                    points.append({"date": d.date.strftime("%d.%m"), "title": d.title, "avg": _pct(sum(r.correct / r.total for r in res) / len(res))})
            two_weeks = [x for x in conducted if x.date >= today - timedelta(days=14)]
            with_plan = sum(1 for x in two_weeks if s.scalars(select(LessonPlan.id).where(LessonPlan.lesson_id == x.id)).first())
            neglected = sum(1 for g in gaps.values() if g >= N)
            consent = sum(1 for st in sts if st.parent_consent)
            row = {
                "id": cls.id, "name": cls.name, "teacher": cls.teacher, "students": len(sts), "avg": avg_all, "skills": skills,
                "neglected": neglected, "coverage": _pct(len(covered) / max(1, len(sts))),
                "formative": len(points), "formative_expected": expected,
                "lessons_quarter": sum(1 for x in conducted if x.date >= q_start),
                "plan_share": _pct(with_plan / len(two_weeks)) if two_weeks else None,
                "last_diag": points[-1] if points else None, "consent": _pct(consent / max(1, len(sts))),
            }
            classes.append(row)
            trend.append({"class": cls.name, "points": points})
            if neglected >= 3:
                alerts.append(f"{cls.name}: {neglected} o'quvchi {N}+ darsdan beri e'tiborsiz")
            if len(points) + 0.5 < expected:
                alerts.append(f"{cls.name}: formativ baholash rejadan orqada ({len(points)} / {expected})")
        skill_school = {k: round(sum(c["skills"][k] for c in classes) / max(1, len(classes))) for k, _ in SKILLS}
        weakest_key = min(skill_school, key=skill_school.get) if classes else None
        total = sum(c["students"] for c in classes)
    names = dict(SKILLS)
    return {
        "school": {"classes": len(classes), "students": total, "teachers": len({c["teacher"] for c in classes}),
                   "avg": round(sum(c["avg"] * c["students"] for c in classes) / max(1, total)),
                   "neglected": sum(c["neglected"] for c in classes),
                   "formative": sum(c["formative"] for c in classes), "quarter_start": q_start.strftime("%d.%m.%Y"), "weeks": weeks},
        "skills": [{"key": k, "name": n} for k, n in SKILLS],
        "skill_school": skill_school,
        "classes": classes,
        "trend": trend,
        "alerts": alerts,
        "insight": (f"Parallel bo'yicha eng zaif ko'nikma — {names[weakest_key].lower()} ({skill_school[weakest_key]}%). "
                    "Metodbirlashmada shu mavzu bo'yicha tajriba almashish tavsiya etiladi.") if weakest_key else "",
        "gap_alert": N,
    }


# ------------------------------------------------------------------ ota-ona (FR-25)
def parent_report(sid: int):
    """O'qituvchi yuboradigan qisqa Telegram xabari."""
    d = service.student_detail(sid)
    first = d["name"].split()[0]
    skills = [x for x in d["skills"] if x["score"] is not None]
    good = [x["name"] for x in sorted(skills, key=lambda x: -x["score"]) if x["score"] >= 0.75][:2]
    weak = [x["name"] for x in sorted(skills, key=lambda x: x["score"]) if x["score"] < 0.5][:2]
    last = d["history"][0] if d["history"] else None
    lines = [f"Assalomu alaykum! {first}ning matematika bo'yicha hisoboti ({clock.today().strftime('%d.%m.%Y')})."]
    if good:
        lines.append("✅ Yaxshi: " + ", ".join(n.lower() for n in good) + ".")
    if weak:
        lines.append("📌 Yordam kerak: " + ", ".join(n.lower() for n in weak) + ".")
    if last:
        lines.append(f"📝 Oxirgi diagnostika — “{last['title']}”: {last['correct']}/{last['total']}.")
        if last["feedback"]["parent"]:
            lines.append("🏠 Uyda: " + last["feedback"]["parent"])
    with db.session() as s:
        st = s.get(Student, sid)
        token, consent = st.parent_token, st.parent_consent
    lines.append(f"Batafsil: /ota-ona/{token}")
    return {"student": {"id": d["id"], "name": d["name"], "code": d["code"]},
            "skills": [{"name": x["name"], "score": x["score"], "word": _level_word(x["score"])} for x in d["skills"]],
            "text": "\n".join(lines), "channel": "Telegram", "consent": consent, "token": token}


def _student_by_token(s, token):
    st = s.scalars(select(Student).where(Student.parent_token == token)).first()
    if not st:
        raise service.NotFound
    return st


def parent_portal(token: str):
    """Ota-ona kabineti: faqat o'z farzandi, sodda tilda. Havola orqali (login siz) ochiladi."""
    with db.session() as s:
        st = _student_by_token(s, token)
        sid, consent = st.id, st.parent_consent
        cls = s.get(SchoolClass, st.class_id)
        nxt = s.scalars(select(Lesson).where(Lesson.class_id == cls.id, Lesson.date >= clock.today()).order_by(Lesson.date)).first()
        next_diag = s.scalars(select(Lesson).where(Lesson.class_id == cls.id, Lesson.date >= clock.today(),
                                                   Lesson.diagnostic_day.is_(True)).order_by(Lesson.date)).first()
        cls_info = {"name": cls.name, "teacher": cls.teacher, "subject": cls.subject}
        from .models import CurriculumTopic
        topic = s.get(CurriculumTopic, nxt.curriculum_topic_id) if nxt and nxt.curriculum_topic_id else None
        upcoming = {"topic": nxt.topic if nxt else None, "date": nxt.date.strftime("%d.%m") if nxt else None,
                    "diagnostic": next_diag.date.strftime("%d.%m") if next_diag else None,
                    "textbook": topic.textbook if topic else None, "workbook": topic.workbook if topic else None,
                    "assessment": (f"{topic.title} ({topic.points} ball)" if topic and topic.points else None)}
    d = service.student_detail(sid)
    history = [{"title": h["title"], "date": h["date"], "correct": h["correct"], "total": h["total"],
                "pct": _pct(h["correct"] / h["total"]), "parent": h["feedback"]["parent"], "student": h["feedback"]["student"],
                "steps": h["steps"]} for h in d["history"]]
    skills = [{"name": x["name"], "score": x["score"], "word": _level_word(x["score"])} for x in d["skills"]]
    good = [x["name"] for x in skills if x["word"] == "yaxshi"]
    weak = [x["name"] for x in skills if x["word"] == "yordam kerak"]
    return {
        "student": {"first_name": d["name"].split()[0], "name": d["name"], "code": d["code"]},
        "class": cls_info, "consent": consent, "skills": skills, "good": good, "weak": weak,
        "history": history, "upcoming": upcoming,
        "tip": history[0]["parent"] if history else "Farzandingiz bilan uyda kuniga 5 daqiqa masala shartini birga o'qing va “Nima so'ralyapti?” deb so'rang.",
    }


def set_consent(token: str, consent: bool):
    with db.session() as s:
        _student_by_token(s, token).parent_consent = bool(consent)
    return parent_portal(token)


def parent_links(class_id=None):
    with db.session() as s:
        cls = service.get_class(s, class_id)
        return [{"id": st.id, "code": st.code, "name": st.full_name, "token": st.parent_token, "consent": st.parent_consent}
                for st in service.class_students(s, cls.id)]
