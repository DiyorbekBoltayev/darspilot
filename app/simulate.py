"""Sinov uchun sun'iy "telefon surati": to'ldirilgan javob bloklari (kartochkalar) stol ustida.

Skanerni real printersiz tekshirish va demo zaxirasi uchun ishlatiladi.
"""
import random
import tempfile
from pathlib import Path

import cv2
import numpy as np
import pymupdf

from . import layout as L
from . import pdfgen
from .problems import correct_letter

PROFILES = ["kuchli", "tayanch", "model", "tushunish", "hisoblash", "kuchli", "tayanch"]


def _pick(q, error_prefix=None, rng=None):
    """Berilgan xato turiga mos variant (aniq mosligi birinchi, keyin prefiks bo'yicha)."""
    opts = q["options"]
    if error_prefix is None:
        return correct_letter(q)
    for exact in (True, False):
        for o in opts:
            if o["error"] and (o["error"] == error_prefix if exact else o["error"].startswith(error_prefix)):
                return o["letter"]
    wrong = [o["letter"] for o in opts if not o["correct"]]
    return rng.choice(wrong)


def simulate_answers(spec: dict, profile: str, rng: random.Random) -> dict:
    qs = {q["key"]: q for q in spec["questions"]}
    marks = {k: correct_letter(q) for k, q in qs.items() if k != "q5"}
    marks["q5"] = qs["q5"]["answer"]
    numeric = qs["q5"].get("numeric_errors", {})

    def wrong_number(err=None):
        for val, e in numeric.items():
            if err is None or e.startswith(err):
                return val
        return str(int(float(qs["q5"]["answer"].replace(",", "."))) + 1)

    if profile in ("tayanch", "talqin_vaqt"):
        marks["q6"] = _pick(qs["q6"], "talqin", rng)
        marks["q7"] = _pick(qs["q7"], "tayanch", rng)
    elif profile in ("model", "model_yonalish"):
        marks["q3"] = _pick(qs["q3"], "model", rng)
        marks["q4"] = _pick(qs["q4"], "model", rng)
        marks["q5"] = wrong_number("model")
        marks["q6"] = _pick(qs["q6"], "talqin", rng)
    elif profile == "tushunish":
        marks["q1"] = _pick(qs["q1"], "tushunish", rng)
        marks["q2"] = _pick(qs["q2"], "malumot", rng)
        marks["q3"] = _pick(qs["q3"], "model", rng)
        marks["q5"] = wrong_number()
        marks["q7"] = _pick(qs["q7"], "tayanch", rng)
    elif profile == "hisoblash":
        marks["q4"] = _pick(qs["q4"], "hisoblash", rng)
        marks["q5"] = str(int(float(qs["q5"]["answer"].replace(",", "."))) + 1)
    return marks


def _render_blocks(cards, date, title, class_name, dpi=260):
    """Kartochkalar PDF sini render qilib, har birining orqa tomonidagi javob blokini kesib oladi."""
    tmp = Path(tempfile.mkdtemp()) / "kartochkalar.pdf"
    pdfgen.sheets_pdf(tmp, cards, date, title, class_name)
    doc = pymupdf.open(tmp)
    px_mm = dpi / 25.4
    crops, pages = [], {}
    for i, _ in enumerate(cards):
        sheet, slot = divmod(i, pdfgen.CARDS_PER_SHEET)
        if sheet not in pages:                          # har varaqning orqa tomoni bir marta render qilinadi
            pix = doc[sheet * 2 + 1].get_pixmap(dpi=dpi)
            page_img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
            pages[sheet] = cv2.cvtColor(page_img, cv2.COLOR_RGB2BGR)
        img = pages[sheet]
        cx, cy = pdfgen.card_origin(slot, back=True)
        top = L.BLOCK_Y - L.SOLUTION_GAP - L.SOLUTION_H            # yechim maydoni ham kesimga kiradi
        x0, y0 = int((cx + L.BLOCK_X - 1.5) * px_mm), int((cy + top - 1.5) * px_mm)
        x1, y1 = int((cx + L.BLOCK_X + L.BLOCK_W + 1.5) * px_mm), int((cy + L.BLOCK_Y + L.BLOCK_H + 1.5) * px_mm)
        crops.append(img[y0:y1, x0:x1].copy())
    doc.close()
    return crops, px_mm


TOP_MM = L.SOLUTION_GAP + L.SOLUTION_H + 1.5      # kesim yuqorisidan blok yuqorisigacha


def solution_lines(spec: dict, marks: dict, profile: str) -> list:
    """Demo uchun o'quvchi yozgan yechim: profilga qarab to'g'ri yoki xato bosqichlar."""
    from .problems import reference_solution

    ref = reference_solution(spec)
    expr, ans, unit = ref["ifoda"] or "", ref["javob"] or "", ref["birlik"]
    got = marks.get("q5") or ans
    if profile in ("tayanch", "tushunish"):
        return [f"Javob: {got} {unit}"]
    if profile in ("model", "model_yonalish"):
        broken = expr.replace("(", "").replace(")", "")
        return [broken, f"= {got}", f"Javob: {got} {unit}"]
    if profile == "hisoblash":
        return [expr, f"= {got}", f"Javob: {got} {unit}"]
    return [expr, f"= {ans}", f"Javob: {ans} {unit}"]


def _write_solution(img, lines, px_mm, rng, P):
    """Qo'lyozmaga o'xshash yozuv (demo suratida yechim maydonini to'ldirish uchun)."""
    ink = (rng.randint(30, 70),) * 3
    x_mm, y_mm, w_mm, h_mm = L.solution_box_mm()
    for i, line in enumerate(lines[:3]):
        x, y = P(x_mm + 5 + rng.uniform(-1, 1), y_mm + 10.5 + i * 5.2 + rng.uniform(-0.6, 0.6))
        cv2.putText(img, line[:34], (x, y), cv2.FONT_HERSHEY_SCRIPT_SIMPLEX, px_mm * 0.115,
                    ink, max(2, int(px_mm * 0.09)), cv2.LINE_AA)


def _fill(img, marks, px_mm, rng, solution=None):
    def P(x_mm, y_mm):
        return int((x_mm + 1.5) * px_mm), int((y_mm + TOP_MM) * px_mm)

    if solution:
        _write_solution(img, solution, px_mm, rng, P)

    ink = (rng.randint(15, 45),) * 3
    for qi, q in enumerate(L.TEST_QUESTIONS):
        letter = marks.get(q)
        if not letter:
            continue
        li = L.LETTERS.index(letter)
        x, y = L.test_bubble(qi, li)
        cx, cy = P(x + rng.uniform(-0.3, 0.3), y + rng.uniform(-0.3, 0.3))
        r = int(L.TEST_RADIUS * px_mm * rng.uniform(0.8, 1.0))
        cv2.ellipse(img, (cx, cy), (r, int(r * rng.uniform(0.85, 1.0))), rng.uniform(0, 180), 0, 360, ink, -1, cv2.LINE_AA)
    answer = marks.get("q5") or ""
    for ci, ch in enumerate(answer[: L.GRID_COLS]):
        ri = L.GRID_ROWS.index(ch)
        x, y = L.grid_bubble(ci, ri)
        cx, cy = P(x + rng.uniform(-0.2, 0.2), y + rng.uniform(-0.2, 0.2))
        r = int(L.GRID_RADIUS * px_mm * rng.uniform(0.8, 1.0))
        cv2.circle(img, (cx, cy), r, ink, -1, cv2.LINE_AA)
        bx, by = P(x - 1.6, 11.2)
        cv2.putText(img, ch, (bx, by), cv2.FONT_HERSHEY_SIMPLEX, px_mm * 0.16, ink, max(2, int(px_mm * 0.22)), cv2.LINE_AA)


def make_photo(cards, answers, date="", title="", class_name="", seed=0, solutions=None):
    """cards: [{journal_no, code, name, level, spec}], answers: {journal_no: marks}. Qaytaradi: BGR rasm."""
    rng = random.Random(seed)
    crops, px_mm = _render_blocks(cards, date, title, class_name)
    W, H = 3600, 4200
    canvas = np.full((H, W, 3), (150, 170, 190), np.uint8)
    noise = np.random.default_rng(seed).normal(0, 6, canvas.shape).astype(np.int16)
    canvas = np.clip(canvas.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    n = len(cards)
    cols = 2 if n <= 4 else 3
    rows = max(1, -(-n // cols))
    cell_w, cell_h = W // cols, H // rows
    for i, (st, crop) in enumerate(zip(cards, crops)):
        _fill(crop, answers.get(st["journal_no"], {}), px_mm, rng, (solutions or {}).get(st["journal_no"]))
        col, row = i % cols, i // cols
        s = min(cell_w * rng.uniform(0.86, 0.93) / crop.shape[1], cell_h * rng.uniform(0.8, 0.88) / crop.shape[0])
        ang = rng.uniform(-6, 6)
        cx = col * cell_w + cell_w / 2 + rng.uniform(-30, 30)
        cy = row * cell_h + cell_h / 2 + rng.uniform(-30, 30)
        M = cv2.getRotationMatrix2D((crop.shape[1] / 2, crop.shape[0] / 2), ang, s)
        M[0, 2] += cx - crop.shape[1] / 2
        M[1, 2] += cy - crop.shape[0] / 2
        warped = cv2.warpAffine(crop, M, (W, H), borderValue=(0, 0, 0))
        mask = cv2.warpAffine(np.full(crop.shape[:2], 255, np.uint8), M, (W, H))
        canvas[mask > 0] = warped[mask > 0]

    # telefon perspektivasi, yorug'lik notekisligi, xiralik va siqish
    d = 120
    src = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    dst = np.float32([[rng.uniform(0, d), rng.uniform(0, d)], [W - rng.uniform(0, d), rng.uniform(0, d)],
                      [W - rng.uniform(0, d), H - rng.uniform(0, d)], [rng.uniform(0, d), H - rng.uniform(0, d)]])
    canvas = cv2.warpPerspective(canvas, cv2.getPerspectiveTransform(src, dst), (W, H), borderValue=(120, 130, 140))
    gx = np.linspace(0.78, 1.05, W, dtype=np.float32)[None, :, None]
    canvas = np.clip(canvas.astype(np.float32) * gx, 0, 255).astype(np.uint8)
    canvas = cv2.GaussianBlur(canvas, (5, 5), 0)
    ok, buf = cv2.imencode(".jpg", canvas, [cv2.IMWRITE_JPEG_QUALITY, 82])
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


def solution_crops(cards, solutions, date="", title="", class_name="", seed=0):
    """Har kartochkaning yechim maydoni (to'ldirilgan) — demo ma'lumotlari uchun tayyor kesimlar."""
    rng = random.Random(seed)
    crops, px_mm = _render_blocks(cards, date, title, class_name, dpi=200)
    out = {}
    for card, crop in zip(cards, crops):
        lines = solutions.get(card["journal_no"])
        if lines:
            _fill(crop, {}, px_mm, rng, lines)
        _, _, w_mm, h_mm = L.solution_box_mm()
        y0 = int((TOP_MM - L.SOLUTION_H - L.SOLUTION_GAP) * px_mm)   # = 1.5 mm chekka
        img = crop[max(y0, 0):int((TOP_MM - L.SOLUTION_GAP) * px_mm), int(1.5 * px_mm):int((1.5 + w_mm) * px_mm)]
        _ = h_mm
        out[card["journal_no"]] = img.copy()
    return out


NOTEBOOK_LINES = 14


def make_homework_page(tasks, seed=0):
    """Demo uchun mashq daftari sahifasi: chiziqli qog'oz va qo'lyozmaga o'xshash yechimlar."""
    rng = random.Random(seed)
    W, H = 1240, 1650
    img = np.full((H, W, 3), (246, 246, 240), np.uint8)
    for i in range(1, NOTEBOOK_LINES * 2):
        y = 120 + i * 78
        if y < H - 60:
            cv2.line(img, (90, y), (W - 70, y), (214, 218, 226), 2, cv2.LINE_AA)
    cv2.line(img, (150, 60), (150, H - 60), (232, 196, 196), 2, cv2.LINE_AA)
    ink = (70, 55, 40)
    cv2.putText(img, "Uy vazifasi", (190, 96), cv2.FONT_HERSHEY_SCRIPT_SIMPLEX, 1.5, ink, 3, cv2.LINE_AA)
    y = 200
    for t in tasks:
        text = f"{t['nom']}) {t.get('yozuv', '')}"
        cv2.putText(img, text[:40], (185 + rng.randint(-8, 8), y), cv2.FONT_HERSHEY_SCRIPT_SIMPLEX, 1.25, ink, 3, cv2.LINE_AA)
        y += 156
        if y > H - 120:
            break
    img = cv2.GaussianBlur(img, (3, 3), 0)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 86])
    return buf.tobytes()
