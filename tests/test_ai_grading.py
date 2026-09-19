"""2-mavzu (avtomatik baholash va feedback) bo'yicha qo'shilgan funksiyalar:

qo'lda yozilgan yechimni rubrika bo'yicha baholash, skaner ishonchliligi, feedback sifati,
BSB/ChSB ni xuddi shu dvigatel bilan o'tkazish, uy vazifasini suratdan tekshirish va ta'sir hisobi.
"""
import random

import pytest
from fastapi.testclient import TestClient

from app import layout as L
from app import db, llm, omr, problems, service, simulate
from app.main import app
from app.models import Diagnostic, Homework, Lesson, Response


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _graded_diagnostic(client):
    return next(d for d in client.get("/api/diagnostics").json() if d["status"] == "baholandi")


# ------------------------------------------------------------------ 1. javobni kod o'qiydi (AI emas)
def test_answers_are_read_by_code_only():
    """Kartochkada qo'lda yoziladigan maydon yo'q: javob faqat doirachalar va son panjarasidan o'qiladi."""
    spec = problems.generate("amallar_tartibi", "B2", 11)
    rng = random.Random(4)
    cards = [{"journal_no": i + 1, "code": f"5B-{i + 1:02d}", "name": "Sinov O'quvchi", "level": "B2", "spec": spec}
             for i in range(4)]
    answers = {}
    for card, profile in zip(cards, ["kuchli", "model", "hisoblash", "tayanch"]):
        answers[card["journal_no"]] = simulate.simulate_answers(spec, profile, rng)

    img = simulate.make_photo(cards, answers, "18.09.2026", "Amallar tartibi", "5-B", seed=9)
    reads, _ = omr.scan_image(img)
    assert len(reads) == 4
    for r in reads:
        assert not hasattr(r, "solution")                 # qo'lyozma tahlili umuman yo'q
        assert r.marks.get("q1") and r.marks.get("q5")     # javoblar o'qildi
    # geometriyada ham yechim maydoni qolmagan
    assert not any(n.startswith("SOLUTION") for n in dir(L))


# ------------------------------------------------------------------ 2. baho faqat kod hisobidan chiqadi
def test_score_comes_from_code_not_ai(client):
    d = _graded_diagnostic(client)
    res = client.get(f"/api/diagnostics/{d['id']}/results").json()
    assert "open_max" not in res and "rubric" not in res
    student = res["students"][0]
    assert "open" not in student
    assert student["correct"] <= student["total"] and student["total"] == 7
    # jurnalga tushgan ball to'g'ri javoblar ulushidan kelib chiqadi
    points = _journal_points(client, res["lesson_id"], student["id"])
    assert points == round(10 * student["correct"] / student["total"])


def _journal_points(client, lesson_id, sid):
    view = client.get(f"/api/classes/{_class_of(lesson_id)}/grades").json()
    row = next(s for s in view["students"] if s["id"] == sid)
    cell = row["grades"].get(str(lesson_id))
    return cell["points"] if cell else None


def _class_of(lesson_id):
    with db.session() as s:
        return s.get(Lesson, lesson_id).class_id


# ------------------------------------------------------------------ 3. ishonch metrikasi va feedback sifati
def test_scan_quality_and_feedback_rating(client):
    d = _graded_diagnostic(client)
    q = client.get(f"/api/diagnostics/{d['id']}/quality").json()
    assert q["cells"] == 7 * q["students"]
    assert 0 <= q["auto_pct"] <= 100 and 0 <= q["accuracy_pct"] <= 100
    assert q["scanned"] > 0 and q["feedback_total"] > 0

    sid = client.get(f"/api/diagnostics/{d['id']}/results").json()["students"][0]["id"]
    rated = client.put(f"/api/diagnostics/{d['id']}/results/{sid}/feedback", json={"rating": -1}).json()
    got = next(s for s in rated["students"] if s["id"] == sid)
    assert got["feedback_rating"] == -1

    edited = client.put(f"/api/diagnostics/{d['id']}/results/{sid}/feedback",
                        json={"text": "Bugun qavsli ifodalarga e'tibor ber."}).json()
    got = next(s for s in edited["students"] if s["id"] == sid)
    assert got["feedback_edited"] and got["feedback"]["student"].startswith("Bugun qavsli")
    assert edited["quality"]["feedback_kept_pct"] < 100


# ------------------------------------------------------------------ 4. o'qituvchi tuzatishi hisoblanadi
def test_manual_correction_is_counted(client):
    d = _graded_diagnostic(client)
    detail = client.get(f"/api/diagnostics/{d['id']}").json()
    row = next(r for r in detail["rows"] if r["marks"])
    marks = dict(row["marks"])
    marks["q1"] = "A" if marks.get("q1") != "A" else "B"
    client.put(f"/api/diagnostics/{d['id']}/responses/{row['id']}", json=marks)
    after = client.get(f"/api/diagnostics/{d['id']}").json()
    assert next(r for r in after["rows"] if r["id"] == row["id"])["corrected"] >= 1
    assert after["quality"]["corrected"] >= 1


# ------------------------------------------------------------------ 5. summativ ish (BSB/ChSB) xuddi shu dvigatel bilan
def test_summative_diagnostic_scales_to_max_points(client):
    with db.session() as s:
        from app.models import CurriculumTopic

        lesson = s.scalars(select_summative()).first()
        assert lesson is not None, "rejada BSB/ChSB darsi topilmadi"
        topic = s.get(CurriculumTopic, lesson.curriculum_topic_id)
        lid, top_points = lesson.id, topic.points
        if lesson.conducted_at is None:                 # summativ ish o'tkazilgan deb belgilaymiz (jurnal ustuni chiqishi uchun)
            from app import clock

            lesson.conducted_at = clock.now()
    did = service.create_diagnostic(lesson_id=lid, use_llm=False)
    with db.session() as s:
        d = s.get(Diagnostic, did)
        assert d.kind in ("bsb", "chsb") and d.max_points == top_points
        assert d.title.upper().startswith(d.kind.upper())
        specs = {p.level: p.spec for p in s.scalars(select_problems(did))}
        for st in service.class_students(s, d.class_id)[:6]:
            level = next(a.level for a in s.scalars(select_assign(did)) if a.student_id == st.id)
            marks = simulate.simulate_answers(specs[level], "kuchli", random.Random(st.id))
            s.add(Response(diagnostic_id=did, student_id=st.id, marks=marks, flags={}, source="skaner",
                           auto_marks=dict(marks), confidence=1.0))
    service.grade_diagnostic(did, use_llm=False)
    view = service.grades_view(_class_of(lid))
    col = next(c for c in view["lessons"] if c["lesson_id"] == lid)
    assert col["kind"] in ("bsb", "chsb") and col["max"] == top_points
    filled = [s_["grades"][str(lid)] for s_ in view["students"] if str(lid) in s_["grades"]]
    assert filled and all(0 <= g["points"] <= top_points and g["source"] == "diagnostika" for g in filled)


def select_summative():
    from sqlalchemy import select

    from app.models import CurriculumTopic

    return (select(Lesson).join(CurriculumTopic, CurriculumTopic.id == Lesson.curriculum_topic_id)
            .where(CurriculumTopic.kind.in_(("bsb", "chsb")), CurriculumTopic.points.is_not(None))
            .order_by(Lesson.date))


def select_problems(did):
    from sqlalchemy import select

    from app.models import DiagProblem

    return select(DiagProblem).where(DiagProblem.diagnostic_id == did)


def select_assign(did):
    from sqlalchemy import select

    from app.models import DiagAssign

    return select(DiagAssign).where(DiagAssign.diagnostic_id == did)


# ------------------------------------------------------------------ 6. uy vazifasi: surat → tekshiruv → tasdiq
def test_homework_photo_flow(client):
    with db.session() as s:
        lesson = s.scalars(select_conducted()).first()
        lid, cid = lesson.id, lesson.class_id
    sid = service.class_students_ids(cid)[0] if hasattr(service, "class_students_ids") else _first_student(cid)
    page = simulate.make_homework_page([{"nom": "118", "yozuv": "24 + 6 * 3 = 42"}], seed=3)
    view = client.post(f"/api/lessons/{lid}/homework", files={"file": ("uy.jpg", page, "image/jpeg")},
                       data={"student_id": str(sid)}).json()
    row = next(x for x in view["students"] if x["id"] == sid)
    assert row["homework"] is not None and row["homework"]["image"]
    # GPT o'chiq: AI javob bera olmaydi, shuning uchun o'qituvchi qo'lda kiritadi
    tasks = [{"nom": "118", "togri": True, "xato": None, "izoh": "To'g'ri"},
             {"nom": "119", "togri": False, "xato": "amallar tartibi", "izoh": "Qavsni unutgan"}]
    done = client.put(f"/api/lessons/{lid}/homework/{sid}", json={"tasks": tasks, "confirmed": True}).json()
    row = next(x for x in done["students"] if x["id"] == sid)
    assert row["homework"]["correct"] == 1 and row["homework"]["total"] == 2
    assert row["homework"]["confirmed"] and row["homework"]["source"] == "o'qituvchi"
    assert any(e["name"] == "amallar tartibi" for e in done["top_errors"])
    assert done["minutes_saved"] > 0


def select_conducted():
    from sqlalchemy import select

    return select(Lesson).where(Lesson.conducted_at.is_not(None)).order_by(Lesson.date.desc())


def _first_student(cid):
    with db.session() as s:
        return service.class_students(s, cid)[0].id


# ------------------------------------------------------------------ 7. ta'sir hisobi
def test_impact_stats(client):
    data = client.get("/api/impact").json()
    for key in ("graded_works", "homework_checked", "cells_read", "minutes_saved",
                "sheets_used", "sheets_if_every_lesson", "feedback_written"):
        assert key in data
    assert data["graded_works"] > 0 and data["minutes_saved"] > 0
    assert data["sheets_if_every_lesson"] > data["sheets_used"]
    assert 0 <= data["accuracy_pct"] <= 100
    with db.session() as s:
        assert s.query(Homework).count() > 0


# ------------------------------------------------------------------ 8. chop etish geometriyasi: qirqishda hech narsa kesilmaydi
def test_print_safety_margins():
    """Old va orqa tomondagi mazmun qirqish chizig'idan yetarlicha uzoqda turishi kerak.

    Ofis printerida ikki tomonlama bosma 1-3 mm siljiydi, qo'lda qirqishda yana 1-2 mm xato bo'ladi,
    ustiga printerning bosa olmaydigan ~5 mm chekkasi qo'shiladi.
    """
    r = L.safety_report()
    assert r["matn"] >= L.CUT_SAFE
    assert min(r["blok_chap"], r["blok_ong"]) >= L.CUT_SAFE
    assert min(r["marker_chap"], r["marker_ong"], r["marker_past"]) >= L.MARKER_SAFE
    # javob bloki kartochka ichiga sig'adi
    assert L.BLOCK_X + L.BLOCK_W <= L.CARD_W - L.CUT_SAFE
    assert L.BLOCK_Y + L.BLOCK_H <= L.CARD_H - L.CUT_SAFE
    # blok ichidagi doirachalar markerlarga tegmaydi
    right_marker_x = L.BLOCK_W - 10.5
    assert L.GRID_COL_X0 + (L.GRID_COLS - 1) * L.GRID_COL_STEP + L.GRID_RADIUS < right_marker_x
    assert L.TEST_COL_X0 - 3.5 > L.MARKER_POS[0][0] + L.MARKER_SIZE
    # old va orqa tomon chekkalari bir xil (duplex siljishi ikkala tomonga teng ta'sir qiladi)
    assert abs(r["blok_chap"] - r["blok_ong"]) < 0.01


# ------------------------------------------------------------------ 9. yuklangan suratlarni boshqarish
def test_scan_list_shows_students_and_can_be_deleted(client):
    """Har surat qaysi o'quvchilarni o'qigani ko'rinadi, takroriy yuklash belgilanadi va surat o'chiriladi."""
    d = _graded_diagnostic(client)
    before = client.get(f"/api/diagnostics/{d['id']}").json()
    client.post(f"/api/diagnostics/{d['id']}/demo-photo")          # bitta surat yuklaymiz
    after = client.get(f"/api/diagnostics/{d['id']}").json()
    assert len(after["scans"]) == len(before["scans"]) + 1
    scan = after["scans"][0]
    assert scan["strips"] > 0 and scan["students"], "suratdan o'qilgan o'quvchilar ro'yxati bo'sh"
    assert all("code" in st and "name" in st for st in scan["students"])
    assert any(st["latest"] for st in scan["students"])

    left = client.delete(f"/api/diagnostics/{d['id']}/scans/{scan['id']}").json()
    assert len(left["scans"]) == len(before["scans"])
    assert left["responses"] == after["responses"]                # javoblar saqlanadi
    assert client.delete(f"/api/diagnostics/{d['id']}/scans/{scan['id']}").status_code == 404


# ------------------------------------------------------------------ 10. uy vazifasi: kartochka surati rad etiladi
def test_homework_rejects_diagnostic_card_photo(client):
    """Uy vazifasi o'rniga diagnostika kartochkasi yuklansa — tizim buni markerlaridan aniqlab rad etadi."""
    import random

    from app import service as svc

    with db.session() as s:
        lesson = s.scalars(select_conducted()).first()
        lid, cid = lesson.id, lesson.class_id
    sid = _first_student(cid)

    spec = problems.generate("amallar_tartibi", "B2", 5)
    cards = [{"journal_no": 1, "code": "5A-01", "name": "Sinov", "level": "B2", "spec": spec}]
    marks = simulate.simulate_answers(spec, "kuchli", random.Random(1))
    photo = simulate.make_photo(cards, {1: marks}, "18.09.2026", "Sinov", "5-A", seed=3)
    ok, buf = simulate.cv2.imencode(".jpg", photo)

    view = client.post(f"/api/lessons/{lid}/homework", files={"file": ("kartochka.jpg", buf.tobytes(), "image/jpeg")},
                       data={"student_id": str(sid)}).json()
    svc.analyze_homework(lid, sid, buf.tobytes())            # fon ishini shu yerda kutamiz
    after = client.get(f"/api/lessons/{lid}/homework").json()
    hw = next(x for x in after["students"] if x["id"] == sid)["homework"]
    assert hw["status"] == "xato"
    assert "kartochka" in hw["comment"].lower()
    assert hw["total"] == 0
    assert view["pending"] >= 0


def test_demo_homework_creates_page(client):
    """Daftar bo'lmaganda: sun'iy sahifa yaratiladi, surat saqlanadi va odatdagi tekshiruv yo'liga tushadi."""
    from sqlalchemy import select as sql_select

    with db.session() as s:
        lesson = s.scalars(sql_select(Lesson).where(Lesson.conducted_at.is_(None))).first()
        lid = lesson.id
    view = client.post(f"/api/lessons/{lid}/homework/demo").json()
    sid = view["demo_student_id"]
    row = next(x for x in view["students"] if x["id"] == sid)
    assert row["homework"]["image"]                      # surat chindan yaratildi va saqlandi
    assert row["homework"]["status"] in ("navbatda", "tayyor", "xato")
