"""Landing sahifasi uchun qo'shilgan qism: ro'yxatdan o'tish, kirish va mahsulot chatboti."""
import pytest
from fastapi.testclient import TestClient

from app import auth, chat
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_password_hash_roundtrip():
    stored = auth.hash_password("demo1234")
    assert stored.startswith("pbkdf2$") and "demo1234" not in stored
    assert auth.check_password("demo1234", stored)
    assert not auth.check_password("demo12345", stored)
    assert not auth.check_password("demo1234", "buzuq-qiymat")


def test_register_login_and_me(client):
    body = {"email": "Yangi.Oqituvchi@Maktab.uz", "password": "parol123", "full_name": "Nodira Xolmatova",
            "role": "o'qituvchi", "school": "Xorazm, 3-maktab"}
    user = client.post("/api/auth/register", json=body).json()
    assert user["email"] == "yangi.oqituvchi@maktab.uz" and user["token"]

    assert client.post("/api/auth/register", json=body).status_code == 400          # takroriy email
    assert client.post("/api/auth/register", json={**body, "email": "boshqa@maktab.uz", "password": "123"}).status_code == 400
    assert client.post("/api/auth/register", json={**body, "email": "email emas", "password": "parol123"}).status_code == 400

    logged = client.post("/api/auth/login", json={"email": "yangi.oqituvchi@maktab.uz", "password": "parol123"}).json()
    assert logged["full_name"] == "Nodira Xolmatova"
    assert client.post("/api/auth/login", json={"email": "yangi.oqituvchi@maktab.uz", "password": "xato"}).status_code == 400

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {logged['token']}"}).json()
    assert me["id"] == user["id"] and "token" not in me
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer buzuq"}).status_code == 401


def test_demo_user_exists(client):
    demo = client.post("/api/auth/login", json={"email": "demo@darspilot.uz", "password": "demo1234"}).json()
    assert demo["role"] == "o'qituvchi" and demo["full_name"]


def test_chat_answers_from_facts(client):
    """GPT o'chiq (testlarda kalit yo'q) — kalit so'zlar bo'yicha tayyor javob qaytadi."""
    res = client.post("/api/chat", json={"question": "Qog'ozli test qanday o'qiladi?", "history": []}).json()
    assert res["manba"] == "shablon" and "marker" in res["javob"].lower()
    assert res["takliflar"]

    res = client.post("/api/chat", json={"question": "Ma'lumotlar maxfiymi?"}).json()
    assert "kod" in res["javob"].lower()

    assert chat.answer("")["javob"] == chat.DEFAULT
    tips = client.get("/api/chat/suggestions").json()
    assert tips["takliflar"] and tips["ai"] is False
