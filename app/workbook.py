"""Mashq daftari ("AHA! Matematika 5-sinf") sahifalari.

Uy vazifasi taqvim-mavzu rejada bosma bet raqamlari bilan beriladi ("31–34"). Shu yerda o'sha betlar
PDF dan rasm qilib olinadi: o'qituvchi uy vazifasi qadamida qaysi mashqlar berilganini ko'radi, demo
surati ham aynan shu betdan yasaladi.
"""
import re
from pathlib import Path

from . import config
from .storage import storage

PAGE_OFFSET = 4          # bosma bet raqami + shu qiymat = PDF dagi sahifa (1 dan boshlab)
DPI = 150
MAX_PAGES = 6            # bitta darsga ko'pi bilan shuncha bet ko'rsatiladi

_doc = None
_missing = False


def _path() -> Path | None:
    """WORKBOOK_PDF ko'rsatilmagan bo'lsa, darslik/ papkasidagi eng to'liq nusxa olinadi.

    Papkada bir necha nusxa bo'lishi mumkin (qisqartirilgan variantlar ham) — taqvim-mavzu
    rejadagi bet raqamlari to'liq nashrga mos, shuning uchun sahifasi ko'prog'i tanlanadi.
    """
    raw = (getattr(config, "WORKBOOK_PDF", "") or "").strip()
    if raw:
        p = Path(raw)
        return p if p.exists() else None
    folder = Path("darslik")
    if not folder.exists():
        return None
    best, best_pages = None, -1
    for p in sorted(folder.glob("*mashq_daftari*.pdf")):
        try:
            import pymupdf

            with pymupdf.open(p) as doc:
                n = len(doc)
        except Exception:
            continue
        if n > best_pages:
            best, best_pages = p, n
    return best


def available() -> bool:
    return _path() is not None


def _open():
    """PDF ni bir marta ochib keshlaydi (fayl bo'lmasa None)."""
    global _doc, _missing
    if _doc is not None or _missing:
        return _doc
    path = _path()
    if path is None:
        _missing = True
        return None
    try:
        import pymupdf

        _doc = pymupdf.open(path)
    except Exception:
        _missing = True
    return _doc


def parse_pages(reference: str | None) -> list:
    """'31–34', '31, 33', '31' → [31, 32, 33, 34]. Cheklov: MAX_PAGES ta bet."""
    if not reference:
        return []
    out = []
    for part in re.split(r"[,;]", str(reference)):
        part = part.strip().replace("—", "-").replace("–", "-")
        if not part:
            continue
        m = re.match(r"^(\d+)\s*-\s*(\d+)$", part)
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            if a <= b:
                out.extend(range(a, b + 1))
            continue
        m = re.match(r"^(\d+)$", part)
        if m:
            out.append(int(m.group(1)))
    seen, pages = set(), []
    for n in out:
        if n not in seen:
            seen.add(n)
            pages.append(n)
    return pages[:MAX_PAGES]


def page_jpeg(printed_no: int) -> bytes | None:
    """Bosma bet raqami bo'yicha sahifa rasmi (keshlanadi)."""
    key = f"workbook/{printed_no}.jpg"
    if storage.exists(key):
        return storage.get(key)
    doc = _open()
    if doc is None:
        return None
    idx = printed_no + PAGE_OFFSET - 1
    if idx < 0 or idx >= len(doc):
        return None
    try:
        pix = doc[idx].get_pixmap(dpi=DPI)
        data = pix.tobytes("jpeg", jpg_quality=88)
    except Exception:
        return None
    storage.put(key, data, "image/jpeg")
    return data


def page_text(printed_no: int) -> str:
    """Sahifadagi matn — demo javoblarini tayyorlash uchun."""
    doc = _open()
    if doc is None:
        return ""
    idx = printed_no + PAGE_OFFSET - 1
    if idx < 0 or idx >= len(doc):
        return ""
    try:
        return doc[idx].get_text()
    except Exception:
        return ""


def pages_view(reference: str | None) -> dict:
    """Uy vazifasi qadami uchun: qaysi betlar berilgan va ularning rasmlari."""
    nums = parse_pages(reference)
    pages = []
    for n in nums:
        if page_jpeg(n) is not None:
            pages.append({"no": n, "url": f"/api/files/workbook/{n}.jpg"})
    return {"reference": reference, "pages": pages, "available": available()}

# ------------------------------------------------------------------ demo surati uchun: mashqlar va ularning o'rni

EXERCISE_RE = re.compile(r"^([a-z])\)\s*(.+)$")
OPS = {"×": "*", "÷": "/", "·": "*", ":": "/", "−": "-", "–": "-", "—": "-", ",": "."}


def exercise_lines(printed_no: int) -> list:
    """Betdagi 'a) 2 × 3 × 4' ko'rinishidagi mashqlar va ularning piksel koordinatalari (DPI bo'yicha)."""
    doc = _open()
    if doc is None:
        return []
    idx = printed_no + PAGE_OFFSET - 1
    if idx < 0 or idx >= len(doc):
        return []
    scale = DPI / 72.0
    out = []
    try:
        data = doc[idx].get_text("dict")
    except Exception:
        return []
    for block in data.get("blocks", []):
        for line in block.get("lines", []):
            text = "".join(sp.get("text", "") for sp in line.get("spans", [])).strip()
            m = EXERCISE_RE.match(text)
            if not m:
                continue
            x0, y0, x1, y1 = line["bbox"]
            out.append({"label": m.group(1), "expr": m.group(2).strip(), "text": text,
                        "x": int(x1 * scale), "y": int(y1 * scale)})
    return out


FIELD_RE = re.compile(r"^(Ism|Sinf|Sana)\s*:")


def field_positions(printed_no: int) -> dict:
    """Betning yuqorisidagi 'Ism:', 'Sinf:', 'Sana:' maydonlarining piksel koordinatalari."""
    doc = _open()
    if doc is None:
        return {}
    idx = printed_no + PAGE_OFFSET - 1
    if idx < 0 or idx >= len(doc):
        return {}
    scale = DPI / 72.0
    out = {}
    try:
        data = doc[idx].get_text("dict")
    except Exception:
        return {}
    for block in data.get("blocks", []):
        for line in block.get("lines", []):
            text = "".join(sp.get("text", "") for sp in line.get("spans", [])).strip()
            m = FIELD_RE.match(text)
            if m:
                x0, y0, x1, y1 = line["bbox"]
                out[m.group(1)] = (int(x1 * scale), int(y1 * scale))
    return out


def evaluate(expr: str):
    """Oddiy arifmetik ifodani hisoblaydi (× ÷ + − va qavslar). Hisoblab bo'lmasa None."""
    clean = expr
    for a, b in OPS.items():
        clean = clean.replace(a, b)
    clean = re.sub(r"[^0-9+\-*/(). ]", "", clean).strip()
    if not clean or not re.search(r"\d", clean):
        return None
    try:
        value = eval(clean, {"__builtins__": {}}, {})       # noqa: S307 — faqat raqam va amallar qoldi
    except Exception:
        return None
    if isinstance(value, float):
        if value != value or value in (float("inf"), float("-inf")):
            return None
        value = round(value, 2)
        if abs(value - round(value)) < 1e-9:
            value = int(round(value))
    return value


def fmt(value) -> str:
    return str(value).replace(".", ",")


def evaluate_left_to_right(expr: str):
    """Amallar tartibini buzib, chapdan o'ngga hisoblash — o'quvchining tipik xatosi."""
    clean = expr
    for a, b in OPS.items():
        clean = clean.replace(a, b)
    clean = re.sub(r"[^0-9+\-*/. ]", "", clean)
    parts = re.findall(r"\d+(?:\.\d+)?|[+\-*/]", clean)
    if len(parts) < 3 or len(parts) % 2 == 0:
        return None
    try:
        value = float(parts[0])
        for i in range(1, len(parts) - 1, 2):
            op, num = parts[i], float(parts[i + 1])
            if op == "+":
                value += num
            elif op == "-":
                value -= num
            elif op == "*":
                value *= num
            elif op == "/":
                if num == 0:
                    return None
                value /= num
    except Exception:
        return None
    value = round(value, 2)
    return int(value) if abs(value - round(value)) < 1e-9 else value
