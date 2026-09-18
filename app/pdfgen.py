"""PDF: o'quvchi kartochkalari (masala + javob bloki) va o'qituvchi kaliti.

Bitta A4 varaq 4 ta kartochkaga bo'linadi va ikkala tomoni ishlatiladi:
  old tomon  — o'quvchining ismi, masala sharti va 1–4-savollar,
  orqa tomon — 5–7-savollar va ArUco markerli javob bloki (A4 ning ~1/8 qismi).
O'quvchi hech narsani yirtmaydi; kartochka butunligicha yig'ib olinadi va telefonda suratga olinadi.
Duplex (uzun qirra bo'yicha) chop etishda orqa tomon gorizontal ko'zgu qilib joylashtiriladi.
"""
import io
from pathlib import Path

import cv2
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Frame, KeepInFrame, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from . import layout as L
from .curriculum import LEVEL_NAMES, LEVELS
from .problems import correct_letter

FONT, FONT_BOLD = "Helvetica", "Helvetica-Bold"
for regular, bold in (("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
                      ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")):
    if Path(regular).exists() and Path(bold).exists():
        pdfmetrics.registerFont(TTFont("DPSans", regular))
        pdfmetrics.registerFont(TTFont("DPSans-Bold", bold))
        FONT, FONT_BOLD = "DPSans", "DPSans-Bold"
        break

NAVY = colors.HexColor("#1F3A5F")
MUTED = colors.HexColor("#6C757D")
LIGHT = colors.HexColor("#F1F3F5")
LINE = colors.HexColor("#C9D1D9")

_ARUCO = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, L.ARUCO_DICT))
_marker_cache = {}

CARDS_PER_SHEET = 4
# kartochka o'rni: (ustun, qator) — A4 ning chap-yuqori burchagidan mm da
SLOTS = [(0, 0), (1, 0), (0, 1), (1, 1)]


def _txt(s: str) -> str:
    return s if FONT != "Helvetica" else s.replace("−", "-")


def _marker(mid: int) -> ImageReader:
    if mid not in _marker_cache:
        img = cv2.aruco.generateImageMarker(_ARUCO, mid, 240)
        ok, buf = cv2.imencode(".png", img)
        _marker_cache[mid] = buf.tobytes()
    return ImageReader(io.BytesIO(_marker_cache[mid]))


def card_origin(slot: int, back: bool):
    """Kartochkaning chap-yuqori burchagi (mm). Duplexda orqa tomon gorizontal ko'zgu bo'ladi."""
    col, row = SLOTS[slot]
    if back:
        col = 1 - col
    return col * L.CARD_W, row * L.CARD_H


STYLES = {
    "head": ParagraphStyle("head", fontName=FONT_BOLD, fontSize=10.5, leading=12.5, textColor=NAVY),
    "sub": ParagraphStyle("sub", fontName=FONT, fontSize=6.8, leading=8.4, textColor=MUTED),
    "story": ParagraphStyle("story", fontName=FONT, fontSize=8.4, leading=10.6),
    "ask": ParagraphStyle("ask", fontName=FONT_BOLD, fontSize=8.4, leading=10.6, textColor=NAVY, spaceBefore=2),
    "q": ParagraphStyle("q", fontName=FONT_BOLD, fontSize=7.8, leading=9.4, spaceBefore=3.5),
    "opt": ParagraphStyle("opt", fontName=FONT, fontSize=7.4, leading=8.8),
    "note": ParagraphStyle("note", fontName=FONT, fontSize=6.4, leading=8, textColor=MUTED, spaceBefore=3),
    "fb": ParagraphStyle("fb", fontName=FONT, fontSize=6.6, leading=8.2, textColor=colors.HexColor("#234E52")),
    "fbhead": ParagraphStyle("fbhead", fontName=FONT_BOLD, fontSize=6.4, leading=7.8, textColor=colors.HexColor("#0A8A91")),
}


def _question_flowables(q: dict, width_mm: float):
    """Savol matni va 2 ustunli variantlar."""
    num = q["key"][1:]
    out = [Paragraph(_txt(f"{num}. {q['text']}"), STYLES["q"])]
    if q.get("options"):
        opts = [Paragraph(_txt(f"{o['letter']}) {o['text']}"), STYLES["opt"]) for o in q["options"]]
        half = width_mm / 2 * mm
        t = Table([[opts[0], opts[1]], [opts[2], opts[3]]], colWidths=[half, half])
        t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                               ("TOPPADDING", (0, 0), (-1, -1), 0.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 0.5),
                               ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        out.append(t)
    return out


def _frame(c: canvas.Canvas, x_mm: float, y_top_mm: float, w_mm: float, h_mm: float, flowables):
    """Kartochka ichidagi matnni ramkaga joylashtiradi (sig'masa, avtomatik kichraytiradi)."""
    frame = Frame((x_mm) * mm, (A4[1] / mm - y_top_mm - h_mm) * mm, w_mm * mm, h_mm * mm,
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, showBoundary=0)
    frame.addFromList([KeepInFrame(w_mm * mm, h_mm * mm, flowables, mode="shrink")], c)


def _cut_marks(c: canvas.Canvas):
    """Qirqish chiziqlari va burchak nishonlari. Chiziqlar ikkala tomonda ham bir xil joyda turadi."""
    c.setStrokeColor(colors.HexColor("#C4CCD4"))
    c.setLineWidth(0.4)
    c.setDash(2, 3)
    c.line(L.CARD_W * mm, 0, L.CARD_W * mm, A4[1])
    c.line(0, A4[1] - L.CARD_H * mm, A4[0], A4[1] - L.CARD_H * mm)
    c.setDash()
    # burchak nishonlari: qaychi shu yerdan boshlanadi
    c.setLineWidth(0.6)
    mark = 5 * mm
    for x in (L.CARD_W * mm,):
        c.line(x, 0, x, mark)
        c.line(x, A4[1], x, A4[1] - mark)
    for y in (A4[1] - L.CARD_H * mm,):
        c.line(0, y, mark, y)
        c.line(A4[0], y, A4[0] - mark, y)
    c.setFillColor(colors.black)


def _card_front(c: canvas.Canvas, slot: int, card: dict, date: str, title: str, class_name: str):
    x0, y0 = card_origin(slot, back=False)
    pad = L.CARD_PAD
    w = L.CARD_W - 2 * pad

    head_h = 13.0
    c.setFillColor(NAVY)
    c.roundRect((x0 + pad) * mm, (A4[1] / mm - y0 - pad - head_h) * mm,
                (L.CARD_W - 2 * pad) * mm, head_h * mm, 1.8 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont(FONT_BOLD, 10)
    c.drawString((x0 + pad + 3) * mm, (A4[1] / mm - y0 - pad - 5.2) * mm, _txt(card["name"][:26]))
    c.setFont(FONT, 6.8)
    c.drawString((x0 + pad + 3) * mm, (A4[1] / mm - y0 - pad - 9.4) * mm,
                 _txt(f"{class_name} · {card['code']} · Variant {card['level']} ({LEVEL_NAMES[card['level']]}) · {date}"))
    c.setFont(FONT_BOLD, 8)
    c.drawRightString((x0 + L.CARD_W - pad - 3) * mm, (A4[1] / mm - y0 - pad - 5.2) * mm, f"№{card['journal_no']}")
    if card.get("kind") in ("bsb", "chsb"):
        badge = card["kind"].upper()
        c.setFillColor(colors.HexColor("#C4572E"))
        c.roundRect((x0 + L.CARD_W - pad - 18) * mm, (A4[1] / mm - y0 - pad - 11.2) * mm, 15 * mm, 4.4 * mm, 1 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont(FONT_BOLD, 6)
        c.drawCentredString((x0 + L.CARD_W - pad - 10.5) * mm, (A4[1] / mm - y0 - pad - 10.2) * mm,
                            _txt(f"{badge} · {card.get('max_points', '')} ball" if card.get("max_points") else badge))
        c.setFillColor(colors.white)

    spec = card["spec"]
    flow = [Paragraph(_txt(title[:60]), STYLES["sub"]), Spacer(1, 2)]
    box = Table([[Paragraph(_txt(spec["story"]), STYLES["story"])]], colWidths=[w * mm])
    box.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), LIGHT), ("LEFTPADDING", (0, 0), (-1, -1), 5),
                             ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 4),
                             ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    flow += [box, Paragraph(_txt(spec["ask"]), STYLES["ask"])]
    for q in spec["questions"][:4]:
        flow += _question_flowables(q, w)
    flow.append(Paragraph(_txt("Javoblarni kartochkaning orqa tomonidagi doirachalarga belgilang."), STYLES["note"]))
    fb = (card.get("feedback") or "").strip()
    body_h = L.CARD_H - 2 * pad - head_h - 3 - (FEEDBACK_H + 2 if fb else 0)
    _frame(c, x0 + pad, y0 + pad + head_h + 1.5, w, body_h, flow)
    if fb:
        c.setFont(FONT, 5.8)
        c.setFillColor(MUTED)
        c.drawString((x0 + pad) * mm, A4[1] - (y0 + L.CARD_H - pad - FEEDBACK_H - 2.5) * mm, _txt("Qoralama uchun joy"))
        c.setFillColor(colors.black)
        _feedback_box(c, x0 + pad, y0 + L.CARD_H - pad - FEEDBACK_H, w, fb)
    else:
        c.setFont(FONT, 5.8)
        c.setFillColor(MUTED)
        c.drawString((x0 + pad) * mm, A4[1] - (y0 + L.CARD_H - pad - 0.5) * mm, _txt("Qoralama uchun joy"))
        c.setFillColor(colors.black)


FEEDBACK_H = 13.0


def _feedback_box(c: canvas.Canvas, x_mm: float, y_top_mm: float, w_mm: float, text: str):
    """O'tgan diagnostikadagi shaxsiy feedback — o'quvchining o'z kartochkasida qaytariladi."""
    c.setFillColor(colors.HexColor("#E8F6F5"))
    c.setStrokeColor(colors.HexColor("#9ED6D4"))
    c.setLineWidth(0.5)
    c.roundRect(x_mm * mm, A4[1] - (y_top_mm + FEEDBACK_H) * mm, w_mm * mm, FEEDBACK_H * mm, 1.8 * mm, stroke=1, fill=1)
    c.setFillColor(colors.black)
    _frame(c, x_mm + 2, y_top_mm + 1.4, w_mm - 4, FEEDBACK_H - 2.4,
           [Paragraph(_txt("O'TGAN TOPSHIRIQ BO'YICHA XULOSA"), STYLES["fbhead"]), Paragraph(_txt(text[:230]), STYLES["fb"])])


def _answer_block(c: canvas.Canvas, bx: float, by: float, card: dict, date: str):
    """Skanerlanadigan javob bloki (ArUco markerlar bilan). bx, by — blokning chap-yuqori burchagi (mm)."""
    def X(x):
        return (bx + x) * mm

    def Y(y):
        return A4[1] - (by + y) * mm

    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.roundRect(X(0), Y(L.BLOCK_H), L.BLOCK_W * mm, L.BLOCK_H * mm, 2.5 * mm, stroke=1, fill=0)

    for corner, (mx, my) in L.MARKER_POS.items():
        c.drawImage(_marker(L.marker_id(card["journal_no"], corner)), X(mx), Y(my + L.MARKER_SIZE),
                    L.MARKER_SIZE * mm, L.MARKER_SIZE * mm)

    c.setFillColor(colors.black)
    c.setFont(FONT_BOLD, 8.5)
    c.drawString(X(13), Y(6.2), card["code"])
    c.setFont(FONT, 6.4)
    c.setFillColor(MUTED)
    c.drawString(X(13), Y(10), _txt(card["name"][:20]))
    c.setFillColor(colors.black)

    # 1–4, 6–7 savollar: A–D doirachalari
    c.setFont(FONT_BOLD, 6.4)
    for li, letter in enumerate(L.LETTERS):
        x, _ = L.test_bubble(0, li)
        c.drawCentredString(X(x), Y(L.TEST_ROW_Y0 - 4.2), letter)
    c.setLineWidth(0.6)
    c.setStrokeColor(colors.black)
    for qi, q in enumerate(L.TEST_QUESTIONS):
        _, y = L.test_bubble(qi, 0)
        c.setFont(FONT_BOLD, 7.5)
        c.drawRightString(X(L.TEST_COL_X0 - 3.6), Y(y + 1), L.TEST_LABELS[q])
        for li in range(4):
            x, y = L.test_bubble(qi, li)
            c.circle(X(x), Y(y), L.TEST_RADIUS * mm, stroke=1, fill=0)

    # 5-savol: son panjarasi
    c.setFillColor(colors.black)
    c.setFont(FONT_BOLD, 6.4)
    c.drawString(X(L.GRID_COL_X0 - 5), Y(9.4), _txt("5-savol javobi"))
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.6)
    c.setFont(FONT_BOLD, 5.8)
    for ri, label in enumerate(L.GRID_ROWS):
        _, y = L.grid_bubble(0, ri)
        c.drawCentredString(X(L.GRID_COL_X0 - 5.5), Y(y + 0.8), label)
        for ci in range(L.GRID_COLS):
            x, y = L.grid_bubble(ci, ri)
            c.circle(X(x), Y(y), L.GRID_RADIUS * mm, stroke=1, fill=0)

    c.setFont(FONT, 5.6)
    c.setFillColor(MUTED)
    c.drawCentredString(X(L.BLOCK_W / 2), Y(L.BLOCK_H - 3.2), _txt("Doirachani qora ruchka bilan to'liq bo'yang"))
    c.setFillColor(colors.black)


def _solution_box(c: canvas.Canvas, x_mm: float, y_top_mm: float):
    """5-savol yechimi yoziladigan maydon: markerlar yordamida kesib olinadi va AI rubrika bo'yicha baholaydi."""
    w, h = L.SOLUTION_W, L.SOLUTION_H
    c.setStrokeColor(colors.HexColor("#9FB4C7"))
    c.setLineWidth(0.6)
    c.setDash(1.6, 1.6)
    c.roundRect(x_mm * mm, A4[1] - (y_top_mm + h) * mm, w * mm, h * mm, 2 * mm, stroke=1, fill=0)
    c.setDash()
    c.setFont(FONT_BOLD, 6.2)
    c.setFillColor(NAVY)
    c.drawString((x_mm + 3) * mm, A4[1] - (y_top_mm + 4.4) * mm, _txt("YECHIM (5-savol) — bosqichlarni yozing"))
    c.setFont(FONT, 5.2)
    c.setFillColor(MUTED)
    c.drawRightString((x_mm + w - 3) * mm, A4[1] - (y_top_mm + h - 1.8) * mm,
                      _txt("amal → hisob → javob (birligi bilan)"))
    c.setStrokeColor(colors.HexColor("#DCE4EC"))
    c.setLineWidth(0.3)
    for i in range(1, 4):
        y = y_top_mm + 5.0 + i * 4.6
        c.line((x_mm + 3) * mm, A4[1] - y * mm, (x_mm + w - 3) * mm, A4[1] - y * mm)
    c.setFillColor(colors.black)


def _card_back(c: canvas.Canvas, slot: int, card: dict, date: str, title: str):
    x0, y0 = card_origin(slot, back=True)
    pad = L.CARD_PAD
    w = L.CARD_W - 2 * pad
    spec = card["spec"]

    flow = [Paragraph(_txt(f"{card['name'][:24]} · {card['code']} · Variant {card['level']}"
                            "  ·  kartochkani yirtmang"), STYLES["sub"]), Spacer(1, 2)]
    for q in spec["questions"][4:]:
        if q["key"] == "q5":
            flow.append(Paragraph(_txt(f"5. {q['text']}"), STYLES["q"]))
            flow.append(Paragraph(_txt(f"Javobni pastdagi son panjarasiga chapdan boshlab yozing ({q.get('unit', '')})."), STYLES["note"]))
        else:
            flow += _question_flowables(q, w)
    sol_top = y0 + L.BLOCK_Y - L.SOLUTION_GAP - L.SOLUTION_H
    _frame(c, x0 + pad, y0 + pad, w, sol_top - (y0 + pad) - 1.5, flow)
    _solution_box(c, x0 + L.BLOCK_X, sol_top)
    _answer_block(c, x0 + L.BLOCK_X, y0 + L.BLOCK_Y, card, date)
    c.setFillColor(colors.black)


def sheets_pdf(path: Path, cards: list, date: str, title: str, class_name: str):
    """cards: [{journal_no, code, name, level, spec}] — har A4 da 4 ta kartochka, duplex (old/orqa)."""
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle(f"Diagnostik kartochkalar — {title}")
    for start in range(0, len(cards), CARDS_PER_SHEET):
        chunk = cards[start:start + CARDS_PER_SHEET]
        _cut_marks(c)
        for slot, card in enumerate(chunk):
            _card_front(c, slot, card, date, title, class_name)
        c.showPage()
        _cut_marks(c)
        for slot, card in enumerate(chunk):
            _card_back(c, slot, card, date, title)
        c.showPage()
    c.save()


def key_pdf(path: Path, problems: dict, date: str, title: str):
    """O'qituvchi kaliti: har daraja uchun masala matni va to'g'ri javoblar jadvali."""
    styles = {
        "h": ParagraphStyle("h", fontName=FONT_BOLD, fontSize=15, leading=19, textColor=NAVY, spaceAfter=2),
        "sub": ParagraphStyle("sub", fontName=FONT, fontSize=9, leading=12, textColor=MUTED, spaceAfter=8),
        "story": ParagraphStyle("story", fontName=FONT, fontSize=10.5, leading=14),
        "q": ParagraphStyle("q", fontName=FONT_BOLD, fontSize=9.5, leading=12, spaceBefore=5),
        "opt": ParagraphStyle("opt", fontName=FONT, fontSize=9, leading=11.5),
        "note": ParagraphStyle("note", fontName=FONT, fontSize=8.5, textColor=MUTED, spaceBefore=10),
    }
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
                            topMargin=13 * mm, bottomMargin=13 * mm, title=f"O'qituvchi kaliti — {title}")
    story = [Paragraph("O'QITUVCHI KALITI", styles["h"]),
             Paragraph(_txt(f"{title} · {date} · o'quvchilarga bermang"), styles["sub"])]
    print_note = Table([[Paragraph(_txt(
        "<b>Chop etish sozlamasi:</b> A4 · masshtab <b>100% (Actual size)</b> — “Fit to page” ni tanlamang, "
        "aks holda javob bloki kichrayadi va skaner o'qiy olmaydi. Ikki tomonlama: <b>uzun qirra bo'yicha</b> "
        "(long edge). Varaq chiziq bo'ylab 4 ta kartochkaga qirqiladi — har tomonda 8 mm bo'sh joy qoldirilgan, "
        "shuning uchun 2–3 mm xato bilan qirqilsa ham matn va markerlar kesilmaydi."), styles["opt"])]],
        colWidths=[178 * mm])
    print_note.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF6E5")),
                                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E7C98A")),
                                    ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                                    ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story += [print_note, Spacer(1, 10)]
    header = ["Variant"] + [str(i) for i in range(1, 8)]
    rows = [header]
    for level in LEVELS:
        spec = problems.get(level)
        if not spec:
            continue
        row = [f"{level} ({LEVEL_NAMES[level]})"]
        for q in spec["questions"]:
            row.append(f"{q['answer']} {q['unit']}" if q["key"] == "q5" else correct_letter(q))
        rows.append(row)
    key = Table(rows, colWidths=[34 * mm] + [20.5 * mm] * 7)
    key.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, -1), FONT), ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                             ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                             ("GRID", (0, 0), (-1, -1), 0.5, LINE), ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                             ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    story += [key, Spacer(1, 4),
              Paragraph("Savollar bosqichlari: 1–2 muammoni aniqlash · 3 modellashtirish · 4–5 yechish · 6 talqin · 7 oldingi mavzu.", styles["note"]),
              Spacer(1, 10)]
    for level in LEVELS:
        spec = problems.get(level)
        if not spec:
            continue
        story.append(Paragraph(f"Variant {level} · {LEVEL_NAMES[level]}", styles["h"]))
        box = Table([[Paragraph(_txt(spec["story"] + " " + spec["ask"]), styles["story"])]], colWidths=[178 * mm])
        box.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), LIGHT), ("LEFTPADDING", (0, 0), (-1, -1), 8),
                                 ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6),
                                 ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
        story.append(box)
        for q in spec["questions"]:
            num = q["key"][1:]
            if q["key"] == "q5":
                story.append(Paragraph(_txt(f"{num}. {q['text']} — javob: <b>{q['answer']} {q['unit']}</b>"), styles["q"]))
                continue
            right = correct_letter(q)
            story.append(Paragraph(_txt(f"{num}. {q['text']} — to'g'ri javob: <b>{right}</b>"), styles["q"]))
            opts = [Paragraph(_txt(f"{o['letter']}) {o['text']}" + ("" if o["correct"] else f"  [{o['error']}]")), styles["opt"]) for o in q["options"]]
            t = Table([[opts[0], opts[1]], [opts[2], opts[3]]], colWidths=[89 * mm, 89 * mm])
            t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 1),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
            story.append(t)
        story.append(Spacer(1, 8))
    doc.build(story)
