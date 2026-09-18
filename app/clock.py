"""Joriy sana va vaqt — O'zbekiston vaqti (UTC+5, yil davomida o'zgarmaydi).

Konteyner UTC da ishlaganda ham maktab kuni to'g'ri hisoblanishi uchun vaqt mintaqasi shu yerda qat'iy belgilangan.
Testlar va demo sahna uchun DARSPILOT_TODAY=YYYY-MM-DD bilan kunni qotirish mumkin.
"""
import os
from datetime import date, datetime, time, timedelta, timezone

TZ = timezone(timedelta(hours=5), "Asia/Tashkent")


def _pinned() -> date | None:
    value = os.environ.get("DARSPILOT_TODAY", "").strip()
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def today() -> date:
    return _pinned() or datetime.now(TZ).date()


def now() -> datetime:
    real = datetime.now(TZ).replace(tzinfo=None)
    pinned = _pinned()
    return real if pinned is None or pinned == real.date() else datetime.combine(pinned, time(real.hour, real.minute, real.second))
