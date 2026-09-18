"""Konveyer qoidalari: dars formati (guruh ishi, diagnostika chastotasi), tezkor tekshiruv, ovozli/matnli e'tibor, direktor va ota-ona."""
import pytest
from fastapi.testclient import TestClient

from app.conveyor import match_names
from app.main import app

ROSTER = [
    {"id": 1, "code": "5B-01", "name": "Aziza Karimova"},
    {"id": 2, "code": "5B-02", "name": "Bekzod Toshpo'latov"},
    {"id": 3, "code": "5B-03", "name": "Dilshod Rahimov"},
    {"id": 4, "code": "5B-04", "name": "Dilshod Usmonov"},
    {"id": 5, "code": "5B-05", "name": "Kamola Saidova"},
]


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_match_names_latin_cyrillic_and_ambiguous():
    r = match_names("Bugun Azizaga va Bekzodjon bilan ishladim", ROSTER)
    assert {m["id"] for m in r["matches"]} == {1, 2} and not r["ambiguous"]
    r = match_names("Камола билан ишладим", ROSTER)
    assert [m["id"] for m in r["matches"]] == [5]
    r = match_names("Dilshod bilan ishladim", ROSTER)
    assert not r["matches"] and {o["id"] for o in r["ambiguous"][0]["options"]} == {3, 4}
    r = match_names("Dilshod Usmonov doskaga chiqdi", ROSTER)
    assert [m["id"] for m in r["matches"]] == [4]


def test_lesson_format_rules(client):
    lessons = client.get(f"/api/classes/{client.get('/api/classes').json()[2]['id']}/lessons").json()["lessons"]
    upcoming = [x for x in lessons if x["when"] == "kelgusi"]
    assert upcoming and not any(x["diagnostic_day"] and x["group_work"] for x in lessons)
    # guruh ishi har darsda emas
    assert sum(x["group_work"] for x in lessons) < len(lessons) / 2

    plain = next(x for x in upcoming if not x["template"] and x["kind"] in ("dars", "tahlil"))
    r = client.patch(f"/api/lessons/{plain['id']}", json={"diagnostic_day": True})
    assert r.status_code == 400
    assert client.patch(f"/api/lessons/{plain['id']}", json={"group_work": True}).json()["group_work"]
    assert client.post(f"/api/lessons/{upcoming[-1]['id']}/conduct").status_code == 400

    # summativ baholash (BSB/ChSB) kuni: guruh ishi bo'lmaydi, ssenariy shart emas,
    # lekin ish varaqlari xuddi shu dvigatel bilan tayyorlanadi — varaq yaratilgach tayyorlash bosqichi yopiladi
    bsb = next((x for x in upcoming if x["kind"] == "bsb"), None)
    if bsb:
        assert client.patch(f"/api/lessons/{bsb['id']}", json={"group_work": True}).status_code == 400
        before = client.get(f"/api/lessons/{bsb['id']}").json()
        assert before["steps"][0]["done"] is not before["diagnostic_day"]
        if before["diagnostic_day"]:
            assert client.post(f"/api/lessons/{bsb['id']}/diagnostic").status_code == 200
            assert client.get(f"/api/lessons/{bsb['id']}").json()["steps"][0]["done"]

    diag_day = next((x for x in lessons if x["diagnostic_day"] and not x["conducted"]), None)
    if diag_day:
        assert client.patch(f"/api/lessons/{diag_day['id']}", json={"group_work": True}).status_code == 400

    cid = lessons[0]["class_id"]
    assert client.put(f"/api/classes/{cid}", json={"diag_every": 0}).status_code == 400
    assert next(c for c in client.put(f"/api/classes/{cid}", json={"diag_every": 2}).json() if c["id"] == cid)["diag_every"] == 2


def test_group_lesson_plan_and_stable_groups(client):
    lesson = next(x for x in client.get("/api/today").json()["lessons"] if x["class_name"] == "5-A")
    assert lesson["group_work"]
    first = client.post(f"/api/lessons/{lesson['id']}/plan", json={"regroup": False}).json()["plan"]
    assert first["groups"] and first["group_problem"]

    def members(plan):
        return sorted(sorted(m["code"] for m in g["members"]) for g in plan["groups"])

    second = client.post(f"/api/lessons/{lesson['id']}/plan", json={"regroup": False}).json()["plan"]
    assert members(second) == members(first)
    regrouped = client.post(f"/api/lessons/{lesson['id']}/plan", json={"regroup": True}).json()["plan"]
    assert sum(len(g["members"]) for g in regrouped["groups"]) == sum(len(g["members"]) for g in first["groups"])

    plain = next(x for x in client.get("/api/today").json()["lessons"] if x["class_name"] == "5-V")
    if plain["diagnostic_day"]:  # qog'ozsiz formatga o'tkazamiz
        plain = client.patch(f"/api/lessons/{plain['id']}", json={"diagnostic_day": False})
        assert plain.status_code == 200
        plain = plain.json()
    assert not plain["diagnostic_day"]
    plan = client.post(f"/api/lessons/{plain['id']}/plan", json={}).json()["plan"]
    assert all(c["id"] != "bosqichli_varaq" for s in plan["stages"] for c in s["candidates"])


def test_quick_check_voice_text_attention(client):
    lesson = next(x for x in client.get("/api/today").json()["lessons"] if x["class_name"] == "5-V")
    if lesson["diagnostic_day"]:
        lesson = client.patch(f"/api/lessons/{lesson['id']}", json={"diagnostic_day": False}).json()
    roster = client.get(f"/api/lessons/{lesson['id']}/attention").json()["students"]
    first, second = roster[0], roster[1]
    text = f"Bugun {first['name'].split()[0]} va {second['name'].split()[0]} bilan ishladim"
    heard = client.post(f"/api/lessons/{lesson['id']}/attention/text", json={"text": text}).json()
    assert {m["id"] for m in heard["matches"]} >= {first["id"], second["id"]}
    att = client.post(f"/api/lessons/{lesson['id']}/attention/mark", json={"student_ids": [first["id"], second["id"]]}).json()
    assert sum(s["today"] for s in att["students"]) == 2
    voice = client.post(f"/api/lessons/{lesson['id']}/attention/voice", files={"file": ("ovoz.webm", b"\x1aE\xdf\xa3")})
    assert voice.status_code == 400  # testda OpenAI kaliti yo'q

    qc = client.post(f"/api/lessons/{lesson['id']}/quick-check",
                     json={"green": 18, "yellow": 6, "red": 4, "struggled": [first["id"], 999999], "note": "vaqt birliklari"}).json()
    assert qc["conducted"] and qc["quick_check"]["struggled"] == [first["id"]]
    steps = {s["key"]: s["done"] for s in qc["steps"]}
    assert steps["tekshirish"] and steps["tahlil"]

    nxt = client.post(f"/api/lessons/{lesson['id']}/next").json()
    plan = client.get(f"/api/lessons/{nxt['next_lesson_id']}").json()["plan"]
    reasons = {a["code"]: a["reason"] for a in plan["alerts"]}
    assert "tezkor tekshiruvda qiynaldi" in reasons.get(first["code"], "") or first["code"] not in reasons


def test_director_and_parent(client):
    d = client.get("/api/reports/director").json()
    assert [c["name"] for c in d["classes"]] == ["5-A", "5-B", "5-V"]
    assert d["school"]["students"] == sum(c["students"] for c in d["classes"])
    assert all(c["formative"] >= 1 and 0 <= c["coverage"] <= 100 for c in d["classes"])
    assert d["trend"] and d["insight"]

    cid = d["classes"][1]["id"]
    links = client.get("/api/reports/parents", params={"class_id": cid}).json()
    token = links[0]["token"]
    portal = client.get(f"/api/parent/{token}").json()
    assert portal["class"]["name"] == "5-B" and portal["skills"] and portal["history"]
    assert "code" in portal["student"] and portal["tip"]
    flipped = client.put(f"/api/parent/{token}/consent", json={"consent": not portal["consent"]}).json()
    assert flipped["consent"] is (not portal["consent"])
