"""DarsPilot API (FastAPI). Hujjat: /api/docs"""
import mimetypes
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from . import auth, chat, config, conveyor, curriculum_plan, db, lessonpdf, problems, reports, seed, service
from .storage import storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()
    storage.ensure()
    seed.seed()
    service.load_custom_methods()
    yield


app = FastAPI(title="DarsPilot API", version="1.1", lifespan=lifespan,
              docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)


def _wrap(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except service.NotFound:
        raise HTTPException(404, "Topilmadi")
    except ValueError as e:
        raise HTTPException(400, str(e))


async def _run(fn, *args, **kwargs):
    return await run_in_threadpool(_wrap, fn, *args, **kwargs)


# ------------------------------------------------------------------ so'rov tanalari
class CreateDiagnostic(BaseModel):
    template: Optional[str] = None
    lesson_id: Optional[int] = None
    class_id: Optional[int] = None


class Marks(BaseModel):
    q1: Optional[str] = None
    q2: Optional[str] = None
    q3: Optional[str] = None
    q4: Optional[str] = None
    q5: Optional[str] = None
    q6: Optional[str] = None
    q7: Optional[str] = None


class RegisterBody(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "o'qituvchi"
    school: Optional[str] = None


class LoginBody(BaseModel):
    email: str
    password: str


class ChatBody(BaseModel):
    question: str
    history: Optional[List[dict]] = None


class FeedbackRate(BaseModel):
    rating: Optional[int] = None
    text: Optional[str] = None


class HomeworkTasks(BaseModel):
    tasks: Optional[List[dict]] = None
    confirmed: bool = True


class StudentIds(BaseModel):
    student_ids: List[int]


class StageEdit(BaseModel):
    key: str
    method_id: Optional[str] = None
    minutes: Optional[int] = None
    removed_codes: List[str] = []


class PlanEdit(BaseModel):
    stages: List[StageEdit] = []
    status: Optional[str] = None


class AttentionToggle(BaseModel):
    student_id: Optional[int] = None
    code: Optional[str] = None
    on: bool = True
    lesson_id: Optional[int] = None


class SettingsBody(BaseModel):
    gap_alert: int


class StudentsBody(BaseModel):
    names: List[str]


class MethodDraftBody(BaseModel):
    text: str


class MethodSaveBody(BaseModel):
    card: dict
    source_text: Optional[str] = None


class CurriculumConfirm(BaseModel):
    topics: List[dict]


class ClassEdit(BaseModel):
    diag_every: int


class LessonFormat(BaseModel):
    diagnostic_day: Optional[bool] = None
    group_work: Optional[bool] = None


class PlanRequest(BaseModel):
    regroup: bool = False


class QuickCheck(BaseModel):
    green: int = 0
    yellow: int = 0
    red: int = 0
    struggled: List[int] = []
    note: Optional[str] = None


class TextBody(BaseModel):
    text: str


class ConsentBody(BaseModel):
    consent: bool


class GradesBody(BaseModel):
    marks: dict
    kind: str = "formativ"


# ------------------------------------------------------------------ umumiy
@app.get("/api/health")
def health():
    return {"ok": True}


# ------------------------------------------------------------------ kirish va landing chatboti
@app.post("/api/auth/register")
def auth_register(body: RegisterBody):
    try:
        return auth.register(body.email, body.password, body.full_name, body.role or "o'qituvchi", body.school)
    except auth.AuthError as e:
        raise HTTPException(400, str(e))


@app.post("/api/auth/login")
def auth_login(body: LoginBody):
    try:
        return auth.login(body.email, body.password)
    except auth.AuthError as e:
        raise HTTPException(400, str(e))


def require_user(authorization: Optional[str] = Header(None)) -> dict:
    """Ma'lumotni yo'q qiladigan amallar faqat tizimga kirgan o'qituvchi uchun.

    Sayt ochiq internetda turgani uchun demo bazasini istalgan odam o'chirib yuborishining oldi olinadi.
    """
    user = auth.me((authorization or "").removeprefix("Bearer ").strip())
    if not user:
        raise HTTPException(401, "Bu amal uchun tizimga kirish kerak")
    return user


@app.get("/api/auth/me")
def auth_me(authorization: Optional[str] = Header(None)):
    token = (authorization or "").removeprefix("Bearer ").strip()
    user = auth.me(token)
    if not user:
        raise HTTPException(401, "Sessiya tugagan")
    return user


@app.post("/api/chat")
async def landing_chat(body: ChatBody):
    """Landing sahifasidagi chatbot: faqat mahsulot faktlariga tayanadi."""
    return await _run(chat.answer, body.question, body.history)


@app.get("/api/chat/suggestions")
def chat_suggestions():
    return {"takliflar": chat.SUGGESTIONS, "ai": bool(config.OPENAI_API_KEY)}


@app.get("/api/templates")
def templates():
    return [{"key": k, "title": v} for k, v in problems.TEMPLATES.items()]


@app.get("/api/settings")
def settings_get():
    return service.settings_view()


@app.put("/api/settings")
def settings_put(body: SettingsBody):
    _wrap(service.save_settings, body.gap_alert)
    return service.settings_view()


# ------------------------------------------------------------------ sinflar va dars konveyeri
@app.get("/api/classes")
def classes():
    return conveyor.classes_view()


@app.put("/api/classes/{cid}")
def class_edit(cid: int, body: ClassEdit):
    return _wrap(conveyor.update_class, cid, body.diag_every)


@app.get("/api/today")
def today():
    return conveyor.today_view()


@app.get("/api/classes/{cid}/lessons")
def class_lessons(cid: int):
    return _wrap(conveyor.class_lessons, cid)


@app.get("/api/lessons/{lid}")
def lesson(lid: int):
    return _wrap(conveyor.lesson_detail, lid)


@app.patch("/api/lessons/{lid}")
def lesson_format(lid: int, body: LessonFormat):
    return _wrap(conveyor.update_format, lid, body.diagnostic_day, body.group_work)


@app.post("/api/lessons/{lid}/plan")
async def lesson_plan_create(lid: int, body: PlanRequest):
    return await _run(conveyor.prepare_plan, lid, body.regroup)


@app.post("/api/lessons/{lid}/diagnostic")
async def lesson_diagnostic(lid: int):
    return await _run(conveyor.prepare_diagnostic, lid)


@app.post("/api/lessons/{lid}/conduct")
def lesson_conduct(lid: int):
    return _wrap(conveyor.conduct, lid)


@app.post("/api/lessons/{lid}/quick-check")
def lesson_quick_check(lid: int, body: QuickCheck):
    return _wrap(conveyor.save_quick_check, lid, body.green, body.yellow, body.red, body.struggled, body.note)


@app.post("/api/lessons/{lid}/next")
async def lesson_next(lid: int):
    return await _run(conveyor.prepare_next, lid)


@app.get("/api/lessons/{lid}/attention")
def lesson_attention(lid: int):
    return _wrap(service.attention_view, lesson_id=lid)


@app.put("/api/lessons/{lid}/attention")
def lesson_attention_save(lid: int, body: StudentIds):
    _wrap(service.save_attention, body.student_ids, lesson_id=lid)
    return service.attention_view(lesson_id=lid)


@app.post("/api/lessons/{lid}/attention/mark")
def lesson_attention_mark(lid: int, body: StudentIds):
    """Ovoz/matndan tasdiqlangan ismlar: mavjud belgilarga qo'shiladi."""
    for sid in body.student_ids:
        _wrap(service.toggle_attention, sid, True, lid)
    return service.attention_view(lesson_id=lid)


@app.post("/api/lessons/{lid}/attention/text")
def lesson_attention_text(lid: int, body: TextBody):
    return _wrap(conveyor.attention_from_text, lid, body.text)


async def _audio_bytes(file: UploadFile) -> bytes:
    """Ovozli endpointlar uchun umumiy o'qish va hajm chegarasi."""
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(413, "Audio juda katta (15 MB gacha)")
    return data


@app.post("/api/lessons/{lid}/attention/voice")
async def lesson_attention_voice(lid: int, file: UploadFile = File(...)):
    data = await _audio_bytes(file)
    return await _run(conveyor.attention_from_voice, lid, data, file.filename or "ovoz.webm")


@app.post("/api/lessons/{lid}/debrief/voice")
async def lesson_debrief_voice(lid: int, file: UploadFile = File(...)):
    """«Dars qanday o'tdi» — o'qituvchining og'zaki tahlili tuzilgan xulosaga aylanadi."""
    data = await _audio_bytes(file)
    return await _run(conveyor.debrief_from_voice, lid, data, file.filename or "ovoz.webm")


@app.post("/api/lessons/{lid}/debrief/text")
async def lesson_debrief_text(lid: int, body: TextBody):
    return await _run(conveyor.debrief_from_text, lid, body.text)


@app.delete("/api/lessons/{lid}/debrief")
def lesson_debrief_clear(lid: int):
    return _wrap(conveyor.clear_debrief, lid)


@app.post("/api/attention/toggle")
def attention_toggle(body: AttentionToggle):
    sid = body.student_id or _wrap(service.student_id_by_code, body.code or "")
    _wrap(service.toggle_attention, sid, body.on, body.lesson_id)
    return {"ok": True}


# ------------------------------------------------------------------ dars ssenariylari
@app.get("/api/plans")
def plans(class_id: Optional[int] = None):
    return service.lesson_plans(class_id)


@app.get("/api/plans/{pid}")
def plan(pid: int):
    return _wrap(service.lesson_plan, pid)


@app.put("/api/plans/{pid}")
def plan_edit(pid: int, body: PlanEdit):
    return _wrap(service.update_lesson_plan, pid, [x.model_dump() for x in body.stages], body.status)


@app.get("/api/plans/{pid}/pdf")
def plan_pdf(pid: int):
    p = _wrap(service.lesson_plan, pid)
    with db.session() as s:
        name = service.get_class(s, p["class_id"]).name
    data = lessonpdf.build(p, name)
    return Response(data, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="dars_ishlanmasi_{pid}.pdf"'})


# ------------------------------------------------------------------ sinf paneli, o'quvchilar
@app.get("/api/overview")
def overview(class_id: Optional[int] = None):
    return _wrap(service.overview, class_id)


@app.get("/api/students/{sid}")
def student(sid: int):
    return _wrap(service.student_detail, sid)


@app.post("/api/students")
def students_add(body: StudentsBody, class_id: Optional[int] = None):
    return _wrap(service.add_students, body.names, class_id)


@app.post("/api/students/import")
async def students_import(file: UploadFile = File(...), class_id: Optional[int] = None):
    return _wrap(service.import_students, await file.read(), file.filename or "", class_id)


@app.get("/api/students/{sid}/parent-report")
def parent_report(sid: int):
    return _wrap(reports.parent_report, sid)


@app.get("/api/classes/{cid}/grades")
def class_grades(cid: int):
    return _wrap(service.grades_view, cid)


@app.put("/api/lessons/{lid}/grades")
def lesson_grades(lid: int, body: GradesBody):
    return _wrap(service.save_grades, lid, body.marks, body.kind)


@app.get("/api/attention")
def attention(class_id: Optional[int] = None):
    return _wrap(service.attention_view, class_id)


# ------------------------------------------------------------------ diagnostika
@app.get("/api/diagnostics")
def diagnostics(class_id: Optional[int] = None):
    return service.list_diagnostics(class_id)


@app.post("/api/diagnostics")
async def create_diagnostic(body: CreateDiagnostic):
    did = await _run(service.create_diagnostic, body.template, body.lesson_id, body.class_id)
    return {"id": did}


@app.get("/api/diagnostics/{did}")
def diagnostic(did: int):
    return _wrap(service.diagnostic_detail, did)


@app.get("/api/diagnostics/{did}/pdf/{kind}")
async def diagnostic_pdf(did: int, kind: str):
    data = await _run(service.get_pdf, did, kind)
    return Response(data, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="diagnostika_{did}_{kind}.pdf"'})


@app.post("/api/diagnostics/{did}/scan")
async def diagnostic_scan(did: int, files: List[UploadFile] = File(...)):
    out = {"found": 0, "matched": 0, "flagged": 0, "errors": [], "annotated": []}
    for f in files:
        res = await _run(service.process_photo, did, await f.read(), f.filename)
        if "error" in res:
            out["errors"].append(res["error"])
            continue
        for k in ("found", "matched", "flagged"):
            out[k] += res[k]
        out["annotated"].append(res["annotated"])
    return out


@app.delete("/api/diagnostics/{did}/scans/{scan_id}")
def diagnostic_scan_delete(did: int, scan_id: int):
    """Yuklangan suratni o'chirish (noto'g'ri yoki takroriy surat uchun)."""
    return _wrap(service.delete_scan, did, scan_id)


@app.post("/api/diagnostics/{did}/photos")
async def diagnostic_photos(did: int, files: List[UploadFile] = File(...)):
    """Suratlarni omborga yuklaydi (hali o'qilmaydi) — o'qituvchi bir nechtasini ketma-ket suratga oladi."""
    out = None
    errors = []
    for f in files:
        try:
            out = await _run(service.store_photo, did, await f.read(), f.filename)
        except HTTPException as e:
            errors.append(str(e.detail))
    if out is None:
        raise HTTPException(400, "; ".join(errors) or "Surat yuklanmadi")
    return out


@app.post("/api/diagnostics/{did}/scan-pending")
async def diagnostic_scan_pending(did: int):
    """Navbatdagi barcha suratlarni birdan o'qiydi."""
    return await _run(service.scan_pending, did)


@app.post("/api/diagnostics/{did}/demo-photo")
async def diagnostic_demo_photo(did: int):
    res = await _run(service.demo_photo, did)
    if "error" in res:
        raise HTTPException(400, res["error"])
    return res


@app.put("/api/diagnostics/{did}/responses/{sid}")
def diagnostic_response(did: int, sid: int, body: Marks):
    _wrap(service.save_response, did, sid, body.model_dump())
    return {"ok": True}


@app.post("/api/diagnostics/{did}/responses/{sid}/confirm")
def diagnostic_confirm(did: int, sid: int):
    _wrap(service.confirm_response, did, sid)
    return {"ok": True}


@app.put("/api/diagnostics/{did}/results/{sid}/feedback")
def diagnostic_feedback_rate(did: int, sid: int, body: FeedbackRate):
    """Feedback sifati: 👍/👎 yoki o'qituvchi tahriri."""
    return _wrap(service.rate_feedback, did, sid, body.rating, body.text)


@app.get("/api/diagnostics/{did}/quality")
def diagnostic_quality(did: int):
    return _wrap(service.scan_quality, did)


@app.post("/api/diagnostics/{did}/grade")
async def diagnostic_grade(did: int):
    return await _run(service.grade_diagnostic, did)


@app.get("/api/diagnostics/{did}/results")
def diagnostic_results(did: int):
    return _wrap(service.diagnostic_results, did)


@app.get("/api/diagnostics/{did}/export.xlsx")
def diagnostic_export(did: int):
    data = _wrap(service.export_xlsx, did)
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="diagnostika_{did}_natijalar.xlsx"'})


@app.get("/api/lessons/{lid}/homework")
def homework_get(lid: int):
    return _wrap(service.homework_view, lid)


@app.post("/api/lessons/{lid}/homework")
async def homework_check(lid: int, student_id: int = Form(...), file: UploadFile = File(...)):
    """Mashq daftari sahifasi surati → AI har mashqni tekshiradi."""
    return await _run(service.check_homework, lid, student_id, await file.read(), file.filename)


@app.post("/api/lessons/{lid}/homework/demo")
async def homework_demo(lid: int, student_id: int | None = None):
    """Daftar yo'q bo'lsa: sun'iy mashq daftari sahifasi yaratiladi va haqiqiy AI tekshiruvidan o'tadi."""
    return await _run(service.demo_homework, lid, student_id)


@app.put("/api/lessons/{lid}/homework/{sid}")
def homework_confirm(lid: int, sid: int, body: HomeworkTasks):
    return _wrap(service.confirm_homework, lid, sid, body.tasks, body.confirmed)


@app.get("/api/impact")
def impact(class_id: Optional[int] = None):
    """AI ta'siri: tekshirilgan ishlar, aniqlik, tejalgan vaqt va qog'oz."""
    return _wrap(service.impact_stats, class_id)


@app.get("/api/files/{key:path}")
def file(key: str):
    if not key.startswith(("scans/", "pdf/", "homework/")) or ".." in key:
        raise HTTPException(404)
    try:
        data = storage.get(key)
    except Exception:
        raise HTTPException(404)
    return Response(data, media_type=mimetypes.guess_type(key)[0] or "application/octet-stream",
                    headers={"Cache-Control": "private, max-age=3600"})


# ------------------------------------------------------------------ metodlar, o'quv dasturi
@app.get("/api/methods")
def methods():
    return service.methods_catalog()


@app.post("/api/methods/draft")
async def method_draft(body: MethodDraftBody):
    return await _run(service.method_draft, body.text)


@app.post("/api/methods")
def method_save(body: MethodSaveBody):
    return _wrap(service.save_method, body.card, body.source_text)


@app.get("/api/curriculum")
def curriculum(class_id: Optional[int] = None):
    return _wrap(curriculum_plan.view, class_id)


@app.post("/api/curriculum/import")
async def curriculum_import(file: UploadFile = File(...)):
    data = await file.read()
    return await _run(curriculum_plan.import_preview, data, file.filename or "")


@app.post("/api/curriculum/confirm")
def curriculum_confirm(body: CurriculumConfirm, class_id: Optional[int] = None):
    return _wrap(curriculum_plan.confirm, body.topics, class_id)


@app.post("/api/curriculum/reset")
def curriculum_reset(class_id: Optional[int] = None, user: dict = Depends(require_user)):
    return _wrap(curriculum_plan.reset_default, class_id)


# ------------------------------------------------------------------ hisobotlar: o'qituvchi, direktor, ota-ona
@app.get("/api/reports/weekly")
def weekly_get(class_id: Optional[int] = None):
    return {"report": _wrap(reports.latest_weekly, class_id)}


@app.post("/api/reports/weekly")
async def weekly_create(class_id: Optional[int] = None):
    return {"report": await _run(reports.create_weekly, class_id)}


@app.get("/api/reports/director")
def director():
    return reports.director_panel()


@app.get("/api/reports/parents")
def parent_links(class_id: Optional[int] = None):
    return _wrap(reports.parent_links, class_id)


@app.get("/api/parent/{token}")
def parent_portal(token: str):
    return _wrap(reports.parent_portal, token)


@app.put("/api/parent/{token}/consent")
def parent_consent(token: str, body: ConsentBody):
    return _wrap(reports.set_consent, token, body.consent)


# ------------------------------------------------------------------ AI jurnali, demo
@app.get("/api/ai-log")
def ai_log():
    return service.ai_log()


@app.post("/api/demo/reset")
async def demo_reset(user: dict = Depends(require_user)):
    """Demo bazasini boshidan tiklaydi — barcha jadvallar tozalanadi, shuning uchun kirish talab qilinadi."""
    await run_in_threadpool(service.demo_reset)
    return {"ok": True, "by": user["email"]}


# Docker'siz ishga tushirishda React build'ni FastAPI o'zi beradi (docker'da buni nginx qiladi)
if config.STATIC_DIR.exists():
    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404)
        target = (config.STATIC_DIR / path).resolve()
        if path and target.is_file() and config.STATIC_DIR.resolve() in target.parents:
            return FileResponse(target)
        return FileResponse(config.STATIC_DIR / "index.html")
