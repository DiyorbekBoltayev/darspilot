"""Testlar tashqi servislarsiz ishlaydi: SQLite, lokal fayl ombori, GPT o'chiq (shablon rejimi)."""
import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="darspilot-test-"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ["MINIO_ENDPOINT"] = ""
os.environ["LOCAL_STORAGE_DIR"] = str(_tmp / "files")
os.environ["OPENAI_API_KEY"] = ""
# Taqvim-mavzu reja sanaga bog'liq: testlar uchun kunni qotiramiz (1-chorak, 12-dars)
os.environ["DARSPILOT_TODAY"] = "2026-09-17"
