"""API orqali dars konveyeri: bugungi dars → skaner → baholash → natijalar → keyingi dars ssenariysi."""
import pytest
from fastapi.testclient import TestClient

from app.curriculum import QUESTION_STEP
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _class(client, name):
    return next(c for c in client.get("/api/classes").json() if c["name"] == name)


def test_full_cycle(client):
    classes = client.get("/api/classes").json()
    assert [c["name"] for c in classes] == ["5-A", "5-B", "5-V"]
    assert [c["students"] for c in classes] == [29, 31, 28]
    b = _class(client, "5-B")
    ov = client.get("/api/overview", params={"class_id": b["id"]}).json()
    assert ov["class"]["name"] == "5-B" and ov["kpi"]["neglected"] >= 4

    today = client.get("/api/today").json()
    assert {x["class_name"] for x in today["lessons"]} == {"5-A", "5-B", "5-V"}
    lesson = next(x for x in today["lessons"] if x["class_name"] == "5-B")
    assert lesson["diagnostic_day"] and not lesson["group_work"]
    assert lesson["steps"][0]["done"] and lesson["current"] == "darsda"

    detail = client.get(f"/api/lessons/{lesson['id']}").json()
    assert detail["plan"]["status"] == "tasdiqlangan" and detail["plan"]["groups"] == []
    did = detail["diagnostic_id"]
    diag = client.get(f"/api/diagnostics/{did}").json()
    assert [lvl["level"] for lvl in diag["levels"]] == ["B1", "B2", "B3", "B4"]
    pdf = client.get(diag["pdf"]["varaqlar"])
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"

    assert client.post(f"/api/lessons/{lesson['id']}/conduct").json()["conducted"]
    matched = 0
    while matched < 31:
        r = client.post(f"/api/diagnostics/{did}/demo-photo").json()
        assert r["matched"] == r["found"] > 0
        matched += r["matched"]
    assert client.post(f"/api/diagnostics/{did}/demo-photo").status_code == 400
    scan = client.get(f"/api/diagnostics/{did}").json()["scans"][0]
    assert client.get(scan["url"]).headers["content-type"] == "image/jpeg"

    graded = client.post(f"/api/diagnostics/{did}/grade").json()
    assert graded["graded"] == 31 and graded["feedback_source"] == "shablon"
    res = client.get(f"/api/diagnostics/{did}/results").json()
    assert [s["name"] for s in res["steps"]] == list(QUESTION_STEP.values())
    counts = [e["count"] for e in res["errors"]]
    assert counts == sorted(counts, reverse=True)
    assert all(s["feedback"]["student"] for s in res["students"])
    assert client.get(f"/api/diagnostics/{did}/export.xlsx").status_code == 200

    steps = {s["key"]: s["done"] for s in client.get(f"/api/lessons/{lesson['id']}").json()["steps"]}
    assert steps == {"tayyorlash": True, "darsda": True, "tekshirish": True, "tahlil": True, "keyingi": False}

    nxt = client.post(f"/api/lessons/{lesson['id']}/next").json()
    plan = client.get(f"/api/lessons/{nxt['next_lesson_id']}").json()["plan"]
    assert len(plan["stages"]) == 8 and sum(s["minutes"] for s in plan["stages"]) == 45
    assert plan["diagnostic_id"] == did
    mandatory = {a["code"] for a in plan["alerts"] if a["mandatory"]}
    targeted = {t["code"] for s in plan["stages"] for t in s["targeted"]}
    assert mandatory and mandatory <= targeted
    assert nxt["lesson"]["steps"][4]["done"] and nxt["lesson"]["current"] == "keyingi"


def test_manual_response_and_attention(client):
    a = _class(client, "5-A")
    did = client.post("/api/diagnostics", json={"template": "quvib_yetish", "class_id": a["id"]}).json()["id"]
    assert client.get("/api/diagnostics", params={"class_id": a["id"]}).json()[0]["id"] == did
    sid = client.get("/api/overview", params={"class_id": a["id"]}).json()["students"][0]["id"]
    marks = {"q1": "A", "q2": "B", "q3": "C", "q4": "D", "q5": "2.5", "q6": "A", "q7": "B"}
    assert client.put(f"/api/diagnostics/{did}/responses/{sid}", json=marks).status_code == 200
    row = next(r for r in client.get(f"/api/diagnostics/{did}").json()["rows"] if r["id"] == sid)
    assert row["marks"]["q5"] == "2,5" and row["source"] == "qo'lda"

    lid = next(x for x in client.get("/api/today").json()["lessons"] if x["class_id"] == a["id"])["id"]
    client.post(f"/api/lessons/{lid}/conduct")
    att = client.put(f"/api/lessons/{lid}/attention", json={"student_ids": [sid]}).json()
    assert next(s for s in att["students"] if s["id"] == sid)["gap"] == 0
    assert [x["id"] for x in client.get(f"/api/lessons/{lid}").json()["attended"]] == [sid]


def test_not_found_and_files_guard(client):
    assert client.get("/api/diagnostics/9999").status_code == 404
    assert client.get("/api/lessons/9999").status_code == 404
    assert client.get("/api/plans/9999").status_code == 404
    assert client.get("/api/overview", params={"class_id": 999}).status_code == 404
    assert client.get("/api/parent/yoq-token").status_code == 404
    assert client.get("/api/unknown").status_code == 404
    assert client.get("/api/files/scans/%2e%2e/%2e%2e/app/config.py").status_code == 404
    assert client.get("/api/files/app/config.py").status_code == 404
