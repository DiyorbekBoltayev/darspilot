"""SQLAlchemy 2.0 ORM modellari (PostgreSQL 16; testlarda SQLite ham ishlaydi)."""
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

JsonType = JSON().with_variant(JSONB(), "postgresql")


class Base(DeclarativeBase):
    pass


SCHEMA_VERSION = "7"


class User(Base):
    """Tizim foydalanuvchisi: o'qituvchi, direktor yoki ota-ona (landing sahifasidagi ro'yxatdan o'tish)."""
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(20), default="o'qituvchi")
    school: Mapped[str | None] = mapped_column(String(160))
    password_hash: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class SchoolClass(Base):
    __tablename__ = "classes"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(20))
    grade: Mapped[int] = mapped_column(Integer)
    subject: Mapped[str] = mapped_column(String(60))
    teacher: Mapped[str | None] = mapped_column(String(120))
    # haftalik jadval: [{"weekday": 0..5, "hour": 1..7}]
    schedule: Mapped[list] = mapped_column(JsonType, default=list)
    # qog'ozli bosqichli diagnostika har necha darsda bir marta (standart 3)
    diag_every: Mapped[int] = mapped_column(Integer, default=3)


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (UniqueConstraint("class_id", "journal_no"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), index=True)
    journal_no: Mapped[int] = mapped_column(Integer)
    full_name: Mapped[str] = mapped_column(String(120))
    code: Mapped[str] = mapped_column(String(20))
    parent_token: Mapped[str | None] = mapped_column(String(32), unique=True)
    parent_consent: Mapped[bool] = mapped_column(Boolean, default=False)


class Lesson(Base):
    """Konveyer birligi: bitta sinfning bitta darsi (tayyorlash → darsda → tekshirish → tahlil → keyingi dars)."""
    __tablename__ = "lessons"
    __table_args__ = (UniqueConstraint("class_id", "date"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    topic: Mapped[str | None] = mapped_column(String(200))
    hour: Mapped[int | None] = mapped_column(Integer)
    seq: Mapped[int | None] = mapped_column(Integer)
    curriculum_topic_id: Mapped[int | None] = mapped_column(ForeignKey("curriculum_topics.id", ondelete="SET NULL"))
    diagnostic_day: Mapped[bool] = mapped_column(Boolean, default=False)
    group_work: Mapped[bool] = mapped_column(Boolean, default=False)
    conducted_at: Mapped[datetime | None] = mapped_column(DateTime)
    quick_check: Mapped[dict | None] = mapped_column(JsonType)
    debrief: Mapped[dict | None] = mapped_column(JsonType)   # o'qituvchining ovozli/matnli dars tahlili


class Attention(Base):
    __tablename__ = "attention"
    __table_args__ = (UniqueConstraint("student_id", "lesson_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), index=True)
    kind: Mapped[str] = mapped_column(String(30), default="ishladim")


class SkillScore(Base):
    __tablename__ = "skill_scores"
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), primary_key=True)
    skill: Mapped[str] = mapped_column(String(40), primary_key=True)
    score: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Diagnostic(Base):
    __tablename__ = "diagnostics"
    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), index=True)
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id"))
    template: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(200))
    date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="yaratildi")
    # formativ (kundalik diagnostika) | bsb | chsb — summativ ish ham shu dvigatel bilan tuziladi
    kind: Mapped[str] = mapped_column(String(20), default="formativ")
    max_points: Mapped[int] = mapped_column(Integer, default=10)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class DiagProblem(Base):
    __tablename__ = "diag_problems"
    diagnostic_id: Mapped[int] = mapped_column(ForeignKey("diagnostics.id"), primary_key=True)
    level: Mapped[str] = mapped_column(String(4), primary_key=True)
    spec: Mapped[dict] = mapped_column(JsonType)


class DiagAssign(Base):
    __tablename__ = "diag_assign"
    diagnostic_id: Mapped[int] = mapped_column(ForeignKey("diagnostics.id"), primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), primary_key=True)
    level: Mapped[str] = mapped_column(String(4))


class Scan(Base):
    __tablename__ = "scans"
    id: Mapped[int] = mapped_column(primary_key=True)
    diagnostic_id: Mapped[int] = mapped_column(ForeignKey("diagnostics.id"), index=True)
    original_key: Mapped[str] = mapped_column(String(300))
    annotated_key: Mapped[str] = mapped_column(String(300))
    strips_found: Mapped[int] = mapped_column(Integer)
    journal_nos: Mapped[list | None] = mapped_column(JsonType)   # shu suratdan o'qilgan o'quvchilar (jurnal raqami)
    status: Mapped[str] = mapped_column(String(20), default="o'qildi")   # yuklandi | o'qildi
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Response(Base):
    __tablename__ = "responses"
    diagnostic_id: Mapped[int] = mapped_column(ForeignKey("diagnostics.id"), primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), primary_key=True)
    marks: Mapped[dict] = mapped_column(JsonType)
    flags: Mapped[dict] = mapped_column(JsonType, default=dict)
    source: Mapped[str] = mapped_column(String(20), default="skaner")
    # skaner o'qigan dastlabki javob va ishonch darajasi — o'qituvchi tuzatishini o'lchash uchun
    auto_marks: Mapped[dict | None] = mapped_column(JsonType)
    confidence: Mapped[float | None] = mapped_column(Float)
    corrected: Mapped[int] = mapped_column(Integer, default=0)   # o'qituvchi o'zgartirgan kataklar soni
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Result(Base):
    __tablename__ = "results"
    diagnostic_id: Mapped[int] = mapped_column(ForeignKey("diagnostics.id"), primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), primary_key=True)
    correct: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(Integer)
    primary_error: Mapped[str | None] = mapped_column(String(40))
    details: Mapped[dict] = mapped_column(JsonType)
    feedback_student: Mapped[str | None] = mapped_column(Text)
    feedback_parent: Mapped[str | None] = mapped_column(Text)
    feedback_teacher: Mapped[str | None] = mapped_column(Text)
    feedback_source: Mapped[str | None] = mapped_column(String(20))
    # feedback sifati: +1 foydali, -1 foydasiz; matn tahrirlangan bo'lsa edited=True
    feedback_rating: Mapped[int | None] = mapped_column(Integer)
    feedback_edited: Mapped[bool] = mapped_column(Boolean, default=False)


class DiagSummary(Base):
    __tablename__ = "diag_summary"
    diagnostic_id: Mapped[int] = mapped_column(ForeignKey("diagnostics.id"), primary_key=True)
    summary: Mapped[dict] = mapped_column(JsonType)
    source: Mapped[str | None] = mapped_column(String(20))


class LessonPlan(Base):
    """Dars ssenariysi (docx, 7-bo'lim): 8 bosqich, metodlar, nomli ko'rsatmalar, guruh ishi."""
    __tablename__ = "lesson_plans"
    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), index=True)
    diagnostic_id: Mapped[int | None] = mapped_column(ForeignKey("diagnostics.id"))
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id"), index=True)
    topic: Mapped[str] = mapped_column(String(200))
    plan: Mapped[dict] = mapped_column(JsonType)
    source: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class LlmCall(Base):
    """Har bir GPT chaqiruvi: kuzatuvchanlik va xarajat hisobi uchun."""
    __tablename__ = "llm_calls"
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    purpose: Mapped[str] = mapped_column(String(60))
    model: Mapped[str] = mapped_column(String(60))
    ok: Mapped[bool] = mapped_column(Boolean)
    seconds: Mapped[float] = mapped_column(Float)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer)
    completion_tokens: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(Text)


class Setting(Base):
    """Sozlanadigan qiymatlar (masalan, "N dars e'tiborsiz" chegarasi — FR-19)."""
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[str] = mapped_column(String(200))


class CustomMethod(Base):
    """O'qituvchi qo'shgan metod (FR-10): AI kartochkaga aylantiradi, o'qituvchi tasdiqlaydi."""
    __tablename__ = "custom_methods"
    id: Mapped[int] = mapped_column(primary_key=True)
    card: Mapped[dict] = mapped_column(JsonType)
    source_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class MethodPreference(Base):
    """O'qituvchi tuzatishlari afzallik sifatida (FR-07): tanlangan metod +1, almashtirilgan −1."""
    __tablename__ = "method_prefs"
    stage: Mapped[str] = mapped_column(String(30), primary_key=True)
    method_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    score: Mapped[int] = mapped_column(Integer, default=0)


class WeeklyReport(Base):
    """Haftalik AI-xulosa (FR-22)."""
    __tablename__ = "weekly_reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), index=True)
    period: Mapped[str] = mapped_column(String(60))
    report: Mapped[dict] = mapped_column(JsonType)
    source: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class CurriculumTopic(Base):
    """Taqvim-mavzu reja qatori (FR-04, FR-05): mavzu → ko'nikmalar → tayanch ko'nikmalar."""
    __tablename__ = "curriculum_topics"
    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), index=True)
    order: Mapped[int] = mapped_column(Integer)
    week: Mapped[int | None] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    hours: Mapped[int] = mapped_column(Integer, default=1)
    skills: Mapped[list] = mapped_column(JsonType, default=list)
    prerequisites: Mapped[list] = mapped_column(JsonType, default=list)
    template: Mapped[str | None] = mapped_column(String(40))
    source: Mapped[str] = mapped_column(String(20), default="standart")
    quarter: Mapped[int | None] = mapped_column(Integer)
    chapter: Mapped[int | None] = mapped_column(Integer)
    chapter_title: Mapped[str | None] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(20), default="dars")  # dars | bsb | chsb | tahlil | muammoli
    points: Mapped[int | None] = mapped_column(Integer)
    textbook: Mapped[str | None] = mapped_column(String(40))
    workbook: Mapped[str | None] = mapped_column(String(40))
    lesson_no: Mapped[int | None] = mapped_column(Integer)


class Grade(Base):
    """Baholar jurnali: darsdagi formativ ball yoki summativ (BSB/ChSB) natija."""
    __tablename__ = "grades"

    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), primary_key=True)
    points: Mapped[float] = mapped_column(Float)
    max_points: Mapped[int] = mapped_column(Integer, default=10)
    kind: Mapped[str] = mapped_column(String(20), default="formativ")  # formativ | bsb | chsb
    source: Mapped[str] = mapped_column(String(20), default="qo'lda")  # qo'lda | diagnostika | import
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Homework(Base):
    """Mashq daftari sahifasi surati → AI tekshiruvi (har masala bo'yicha to'g'ri/xato + xato turi)."""
    __tablename__ = "homework"
    __table_args__ = (UniqueConstraint("lesson_id", "student_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    image_key: Mapped[str | None] = mapped_column(String(300))
    reference: Mapped[str | None] = mapped_column(String(60))   # mashq daftari sahifasi (D1 42-43)
    tasks: Mapped[list] = mapped_column(JsonType, default=list)  # [{"nom": "12", "togri": true, "xato": "...", "izoh": "..."}]
    correct: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    comment: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(20), default="ai")
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="tayyor")    # navbatda | tayyor | xato
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ClassGroups(Base):
    """Doimiy guruhlar: har darsda qayta bo'lmaslik uchun tarkib 2 hafta saqlanadi (docx 10-bo'lim, o'qituvchi izohi)."""
    __tablename__ = "class_groups"
    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), index=True)
    members: Mapped[list] = mapped_column(JsonType)  # [[student_id, ...], ...]
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    active: Mapped[bool] = mapped_column(Boolean, default=True)
