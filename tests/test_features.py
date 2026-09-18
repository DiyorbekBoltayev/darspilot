"""Docx FR ro'yxatidagi qo'shimcha funksiyalar: ssenariyni tahrirlash, eksport, metod qo'shish, hisobotlar, o'quv dasturi."""
import io

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _cid(client, name):
    return next(c["id"] for c in client.get("/api/classes").json() if c["name"] == name)


def test_plan_edit_export_and_attention(client):
    lesson = next(x for x in client.get("/api/today").json()["lessons"] if x["class_name"] == "5-A")
    pid = client.post(f"/api/lessons/{lesson['id']}/plan", json={}).json()["plan_id"]
    plan = client.get(f"/api/plans/{pid}").json()
    assert plan["lesson_id"] == lesson["id"]
    stage = plan["stages"][1]
    other = next(c for c in stage["candidates"] if c["id"] != stage["method"]["id"])
    code = next((t["code"] for s in plan["stages"] for t in s["targeted"]), None)
    target_stage = next(s for s in plan["stages"] if any(t["code"] == code for t in s["targeted"]))

    edited = client.put(f"/api/plans/{pid}", json={"status": "tasdiqlangan", "stages": [
        {"key": stage["key"], "method_id": other["id"], "minutes": 7},
        {"key": target_stage["key"], "removed_codes": [code]},
    ]}).json()
    new_stage = next(s for s in edited["stages"] if s["key"] == stage["key"])
    assert new_stage["method"]["id"] == other["id"] and new_stage["minutes"] == 7
    assert edited["status"] == "tasdiqlangan" and edited["total_minutes"] == 47
    assert code not in {t["code"] for s in edited["stages"] if s["key"] == target_stage["key"] for t in s["targeted"]}
    assert [s["start"] for s in edited["stages"]] == sorted(s["start"] for s in edited["stages"])
    # afzallik: tanlangan metod endi birinchi nomzod
    again = client.get(f"/api/plans/{pid}").json()
    assert next(s for s in again["stages"] if s["key"] == stage["key"])["candidates"][0]["id"] == other["id"]
    bad = client.put(f"/api/plans/{pid}", json={"stages": [{"key": "motivatsiya", "method_id": "bosqichli_varaq"}]})
    assert bad.status_code == 400
    assert client.get(f"/api/lessons/{lesson['id']}").json()["steps"][0]["done"]

    pdf = client.get(f"/api/plans/{pid}/pdf")
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"

    assert client.post("/api/attention/toggle", json={"code": code, "on": True, "lesson_id": lesson["id"]}).status_code == 200
    assert code in client.get(f"/api/plans/{pid}").json()["attended_today"]
    assert client.post("/api/attention/toggle", json={"code": code, "on": False, "lesson_id": lesson["id"]}).status_code == 200


def test_settings_students_and_confirm(client):
    cid = _cid(client, "5-V")
    assert client.put("/api/settings", json={"gap_alert": 4}).json()["gap_alert"] == 4
    assert client.get("/api/overview", params={"class_id": cid}).json()["gap_alert"] == 4
    assert client.put("/api/settings", json={"gap_alert": 40}).status_code == 400
    client.put("/api/settings", json={"gap_alert": 5})

    before = client.get("/api/overview", params={"class_id": cid}).json()["kpi"]["students"]
    added = client.post("/api/students", params={"class_id": cid}, json={"names": ["Yangi O'quvchi"]}).json()["added"]
    wb = Workbook()
    wb.active.append(["F.I.Sh"])
    wb.active.append(["Ikkinchi Yangi"])
    buf = io.BytesIO()
    wb.save(buf)
    imported = client.post("/api/students/import", params={"class_id": cid},
                           files={"file": ("sinf.xlsx", buf.getvalue())}).json()["added"]
    ov = client.get("/api/overview", params={"class_id": cid}).json()
    assert ov["kpi"]["students"] == before + 2 and imported[0]["name"] == "Ikkinchi Yangi"
    assert imported[0]["code"].startswith("5V-")
    new_row = next(s for s in ov["students"] if s["id"] == added[0]["id"])
    assert new_row["gap"] == 0

    did = client.post("/api/diagnostics", json={"template": "qarama_qarshi", "class_id": cid}).json()["id"]
    client.post(f"/api/diagnostics/{did}/demo-photo")
    row = next(r for r in client.get(f"/api/diagnostics/{did}").json()["rows"] if r["marks"])
    assert client.post(f"/api/diagnostics/{did}/responses/{row['id']}/confirm").status_code == 200


def test_methods_reports_and_curriculum(client):
    draft = client.post("/api/methods/draft", json={"text": "Guruhlarga bo'lib har guruh bitta masalani yechadi. Keyin guruhlar javobni almashtirib tekshiradi."}).json()
    card = draft["card"]
    assert card["name"] and card["stages"]
    saved = client.post("/api/methods", json={"card": card, "source_text": "test"}).json()
    catalog = client.get("/api/methods").json()["methods"]
    assert any(m["id"] == saved["id"] and m["custom"] for m in catalog)

    cid = _cid(client, "5-B")
    weekly = client.post("/api/reports/weekly", params={"class_id": cid}).json()["report"]
    assert weekly["bandlar"] and weekly["class_id"] == cid
    assert client.get("/api/reports/weekly", params={"class_id": cid}).json()["report"]["id"] == weekly["id"]
    sid = client.get("/api/overview", params={"class_id": cid}).json()["students"][0]["id"]
    parent = client.get(f"/api/students/{sid}/parent-report").json()
    assert "Assalomu alaykum" in parent["text"] and parent["token"]

    cur = client.get("/api/curriculum", params={"class_id": cid}).json()
    assert cur["class_id"] == cid and sum(t["hours"] for t in cur["topics"]) == 170
    assert cur["calendar"]["current_quarter"] == 1 and cur["calendar"]["year"] == "2026–2027"
    assert any(t["kind"] == "bsb" and t["points"] == 15 for t in cur["topics"])
    assert any(t["template"] == "amallar_tartibi" and t["passed"] for t in cur["topics"])
    assert next(t for t in cur["topics"] if t["lesson_no"] == 12)["textbook"] == "I: 29"
    preview = client.post("/api/curriculum/import", files={"file": ("reja.txt", "1. Vaqt birliklari 2 soat\n2. Harakatga doir masalalar 3 soat\n".encode())}).json()
    assert len(preview["topics"]) == 2 and preview["topics"][1]["hours"] == 3
    confirmed = client.post("/api/curriculum/confirm", params={"class_id": cid}, json={"topics": preview["topics"]}).json()
    assert [t["source"] for t in confirmed["topics"]] == ["yuklangan", "yuklangan"]
    assert len(client.get("/api/curriculum", params={"class_id": _cid(client, "5-A")}).json()["topics"]) == 106
    assert len(client.post("/api/curriculum/reset", params={"class_id": cid}).json()["topics"]) == 106


def test_demo_reset(client):
    assert client.post("/api/demo/reset").status_code == 200
    classes = client.get("/api/classes").json()
    assert [c["students"] for c in classes] == [29, 31, 28]
    ov = client.get("/api/overview", params={"class_id": classes[1]["id"]}).json()
    assert len(ov["diagnostics"]) == 2  # o'tgan baholangan + bugungi tayyorlangan
    assert not any(m["custom"] for m in client.get("/api/methods").json()["methods"])
