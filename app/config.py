"""Sozlamalar: muhit o'zgaruvchilari (.env yoki docker compose) orqali."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# PostgreSQL 16 (docker compose'da "db" servisi). Lokal sinov uchun sqlite:///... ham ishlaydi.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://darspilot:darspilot@localhost:5432/darspilot")

# MinIO (S3-mos fayl ombori). MINIO_ENDPOINT bo'sh bo'lsa, fayllar lokal papkaga yoziladi.
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "darspilot")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "darspilot-secret")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "darspilot")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"
LOCAL_STORAGE_DIR = Path(os.getenv("LOCAL_STORAGE_DIR", BASE_DIR / "data" / "files"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
# Masala matni, dars ssenariysi va sinf xulosasi uchun asosiy model
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-terra")
# Ko'p o'quvchiga feedback yozish uchun arzonroq model
OPENAI_MODEL_FAST = os.getenv("OPENAI_MODEL_FAST", "gpt-5.6-luna")
OPENAI_TIMEOUT = float(os.getenv("OPENAI_TIMEOUT", "120"))
# Fikrlash darajasi (minimal/low/medium/high). Bo'sh qoldirilsa model standarti ishlatiladi.
OPENAI_REASONING_EFFORT = os.getenv("OPENAI_REASONING_EFFORT", "low").strip()
# Qo'lyozma yechim va mashq daftarini suratdan baholash uchun (vizual model)
# Tezligi muhim: bitta sinfda 30 tagacha surat baholanadi (terra ~100 s, luna ~5 s)
OPENAI_MODEL_VISION = os.getenv("OPENAI_MODEL_VISION", OPENAI_MODEL_FAST)

# Ovozli kiritish (e'tibor jurnali): nutqni matnga aylantirish modeli
OPENAI_TRANSCRIBE_MODEL = os.getenv("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-transcribe")

# React build (docker'da nginx beradi; lokal ishga tushirishda FastAPI o'zi berishi mumkin)
STATIC_DIR = Path(os.getenv("STATIC_DIR", BASE_DIR / "web" / "dist"))

# Bitta o'quvchi ishini qo'lda tekshirish va izoh yozishga ketadigan taxminiy vaqt (daqiqa)
MINUTES_SAVED_PER_STUDENT = 3.5
# Bitta o'quvchining uy vazifasini daftardan tekshirishga ketadigan taxminiy vaqt (daqiqa)
MINUTES_SAVED_PER_HOMEWORK = 1.5
# "E'tiborsiz" deb hisoblanadigan darslar soni
ATTENTION_GAP_ALERT = 5
