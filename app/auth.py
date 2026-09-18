"""Ro'yxatdan o'tish va kirish: parol PBKDF2 bilan xeshlanadi, sessiya HMAC token bilan.

Demo uchun API ochiq qoladi — token faqat interfeys uchun (kim kirgan, qaysi rol).
Shuning uchun tashqi kutubxona kerak emas: hashlib va hmac yetarli.
"""
import base64
import hashlib
import hmac
import re
import secrets
import time

from sqlalchemy import select

from . import db
from .models import Setting, User

ITERATIONS = 200_000
TOKEN_TTL = 30 * 24 * 3600          # 30 kun
ROLES = ("o'qituvchi", "direktor", "ota-ona")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


class AuthError(Exception):
    pass


_cached_secret: bytes | None = None


def _secret() -> bytes:
    """Server siri: birinchi ishga tushishda yaratiladi va sozlamalarda saqlanadi.

    Qiymat keshlanadi — aks holda ochiq tranzaksiya ichidan ikkinchi sessiya ochilib, SQLite blokka tushadi.
    """
    global _cached_secret
    if _cached_secret:
        return _cached_secret
    with db.session() as s:
        row = s.get(Setting, "auth_secret")
        if not row:
            row = Setting(key="auth_secret", value=secrets.token_urlsafe(32))
            s.add(row)
        value = row.value
    _cached_secret = value.encode()
    return _cached_secret


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(8)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS)
    return f"pbkdf2${ITERATIONS}${salt}${dk.hex()}"


def check_password(password: str, stored: str) -> bool:
    try:
        _, iters, salt, digest = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iters))
        return hmac.compare_digest(dk.hex(), digest)
    except (ValueError, AttributeError):
        return False


def make_token(user_id: int) -> str:
    payload = f"{user_id}.{int(time.time()) + TOKEN_TTL}"
    sig = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    return base64.urlsafe_b64encode(f"{payload}.{sig}".encode()).decode().rstrip("=")


def read_token(token: str) -> int | None:
    try:
        raw = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4)).decode()
        uid, exp, sig = raw.split(".")
        payload = f"{uid}.{exp}"
        good = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()[:32]
        if not hmac.compare_digest(sig, good) or int(exp) < time.time():
            return None
        return int(uid)
    except Exception:
        return None


def _view(u: User, token: str | None = None) -> dict:
    out = {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role, "school": u.school}
    return {**out, "token": token} if token else out


def register(email: str, password: str, full_name: str, role: str = "o'qituvchi", school: str | None = None) -> dict:
    email = (email or "").strip().lower()
    full_name = (full_name or "").strip()
    if not EMAIL_RE.match(email):
        raise AuthError("Email noto'g'ri ko'rinishda")
    if len(password or "") < 6:
        raise AuthError("Parol kamida 6 ta belgidan iborat bo'lsin")
    if len(full_name) < 3:
        raise AuthError("To'liq ismni kiriting")
    if role not in ROLES:
        raise AuthError("Rol noto'g'ri")
    with db.session() as s:
        if s.scalars(select(User).where(User.email == email)).first():
            raise AuthError("Bu email allaqachon ro'yxatdan o'tgan")
        u = User(email=email, full_name=full_name, role=role, school=(school or "").strip() or None,
                 password_hash=hash_password(password))
        s.add(u)
        s.flush()
        view = _view(u)
    return {**view, "token": make_token(view["id"])}


def login(email: str, password: str) -> dict:
    with db.session() as s:
        u = s.scalars(select(User).where(User.email == (email or "").strip().lower())).first()
        if not u or not check_password(password or "", u.password_hash):
            raise AuthError("Email yoki parol noto'g'ri")
        view = _view(u)
    return {**view, "token": make_token(view["id"])}


def me(token: str | None) -> dict | None:
    uid = read_token(token or "")
    if uid is None:
        return None
    with db.session() as s:
        u = s.get(User, uid)
        return _view(u) if u else None


def ensure_demo_user(email="demo@darspilot.uz", password="demo1234", full_name="Sultonboyev Bekzodbek",
                     role="o'qituvchi", school="Xorazm viloyati, 12-maktab"):
    """Demo hisobi — landing sahifasida ko'rsatiladi, hakamlar bir bosishda kiradi."""
    with db.session() as s:
        if s.scalars(select(User).where(User.email == email)).first():
            return
    try:
        register(email, password, full_name, role, school)
    except AuthError:
        pass
