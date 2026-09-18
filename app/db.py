"""Ma'lumotlar bazasi ulanishi (SQLAlchemy 2.0)."""
import time
from contextlib import contextmanager

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from . import config
from .models import SCHEMA_VERSION, Base, Setting

_kwargs = {"pool_pre_ping": True}
if config.DATABASE_URL.startswith("sqlite"):
    _kwargs = {"connect_args": {"check_same_thread": False}}
engine = create_engine(config.DATABASE_URL, **_kwargs)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


@contextmanager
def session() -> Session:
    s = SessionLocal()
    try:
        yield s
        s.commit()
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()


def init(retries: int = 30):
    """Baza tayyor bo'lguncha kutib, jadvallarni yaratadi (docker'da db servisi sekinroq ko'tariladi)."""
    for attempt in range(retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            break
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2)
    _upgrade_if_needed()
    Base.metadata.create_all(engine)
    with session() as s:
        row = s.get(Setting, "schema_version")
        if row:
            row.value = SCHEMA_VERSION
        else:
            s.add(Setting(key="schema_version", value=SCHEMA_VERSION))


def _upgrade_if_needed():
    """MVP bosqichida migratsiya o'rniga: sxema versiyasi eskirgan bo'lsa demo jadvallar qayta yaratiladi (AI jurnali saqlanadi)."""
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    if "classes" not in tables:
        return
    version = None
    if "settings" in tables:
        with engine.connect() as conn:
            version = conn.execute(text("SELECT value FROM settings WHERE key = 'schema_version'")).scalar()
    if version == SCHEMA_VERSION:
        return
    keep = {"llm_calls"}
    drop = [t for t in Base.metadata.sorted_tables if t.name in tables and t.name not in keep]
    with engine.begin() as conn:
        if engine.dialect.name == "postgresql":
            for t in reversed(drop):
                conn.execute(text(f'DROP TABLE IF EXISTS "{t.name}" CASCADE'))
        else:
            Base.metadata.drop_all(conn, tables=drop)
