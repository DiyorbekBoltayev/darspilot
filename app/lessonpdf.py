"""Dars ssenariysini rasmiy dars ishlanmasi / texnologik xarita ko'rinishida PDF ga chiqarish (FR-08)."""
import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from . import clock
from .pdfgen import FONT, FONT_BOLD

FIRUZA = colors.HexColor("#0A8A91")
INDIGO = colors.HexColor("#23328C")
LINE = colors.HexColor("#CFDCDD")
TINT = colors.HexColor("#EAF5F5")
MUTED = colors.HexColor("#5B6B73")

base = ParagraphStyle("b", fontName=FONT, fontSize=9, leading=12)
small = ParagraphStyle("s", parent=base, fontSize=8, leading=10.5, textColor=MUTED)
bold = ParagraphStyle("bb", parent=base, fontName=FONT_BOLD)
h1 = ParagraphStyle("h1", parent=base, fontName=FONT_BOLD, fontSize=16, leading=20, textColor=INDIGO)
h2 = ParagraphStyle("h2", parent=base, fontName=FONT_BOLD, fontSize=11, leading=14, textColor=FIRUZA, spaceBefore=6, spaceAfter=3)


def _p(text, style=base):
    return Paragraph(str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>"), style)


def _list(items):
    return _p("\n".join(f"• {x}" for x in items))


def build(plan: dict, class_name: str) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=14 * mm, rightMargin=14 * mm, topMargin=12 * mm, bottomMargin=12 * mm,
                            title=f"Dars ishlanmasi — {plan['topic']}")
    story = [_p("DARS ISHLANMASI (TEXNOLOGIK XARITA)", small), _p(plan["topic"], h1), Spacer(1, 4)]
    total = sum(s["minutes"] for s in plan["stages"])
    info = Table([[_p("Fan: Matematika"), _p(f"Sinf: {class_name}"),
                   _p(f"Sana: {clock.today().strftime('%d.%m.%Y')}"), _p(f"Davomiyligi: {total} daqiqa"),
                   _p("Holat: " + ("tasdiqlangan" if plan.get("status") == "tasdiqlangan" else "qoralama"))]],
                 colWidths=[50 * mm, 40 * mm, 45 * mm, 50 * mm, 84 * mm])
    info.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), TINT), ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                              ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    story += [info, _p("Dars maqsadlari", h2)]
    goal = plan["goal"]
    goals = Table([[_p("Ta'limiy", bold), _p(goal["talimiy"])], [_p("Tarbiyaviy", bold), _p(goal["tarbiyaviy"])],
                   [_p("Rivojlantiruvchi", bold), _p(goal["rivojlantiruvchi"])],
                   [_p("Kutilayotgan natijalar", bold), _list(goal["mezonlar"])],
                   [_p("Jihozlar", bold), _p("Darajali diagnostik varaqlar (B1–B4), javob chiziqlari, mini-doskalar, o'qituvchi telefoni (skaner)")]],
                  colWidths=[45 * mm, 224 * mm])
    goals.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("BACKGROUND", (0, 0), (0, -1), TINT)]))
    story += [goals, _p("Darsning borishi", h2)]

    rows = [[_p(x, bold) for x in ("Vaqt", "Bosqich va metod", "O'qituvchi faoliyati", "O'quvchilar faoliyati", "Nomli ko'rsatmalar")]]
    for st in plan["stages"]:
        start = st["start"]
        rows.append([
            _p(f"{start}–{start + st['minutes']}′"),
            _p(f"{st['name']}\n{st['method']['name']} ({st['method']['form']})"),
            _list(st["teacher"]),
            _list(st["students"]),
            _p("\n".join(f"{t['code']}: {t['task']}" for t in st["targeted"]) or "—", small),
        ])
    flow = Table(rows, colWidths=[16 * mm, 50 * mm, 78 * mm, 55 * mm, 70 * mm], repeatRows=1)
    flow.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("BACKGROUND", (0, 0), (-1, 0), TINT)]))
    story += [flow, _p("Guruh ishi", h2), _p(plan["group_problem"]["text"])]
    grows = [[_p(x, bold) for x in ("Guruh", "A'zolar (qism · rol)")]]
    for g in plan["groups"]:
        grows.append([_p(f"{g['n']}-guruh"), _p("; ".join(f"{m['code']} ({m['part']} · {m['role']})" for m in g["members"]))])
    gt = Table(grows, colWidths=[25 * mm, 244 * mm], repeatRows=1)
    gt.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, LINE), ("BACKGROUND", (0, 0), (-1, 0), TINT)]))
    hw = plan["homework"]
    story += [Spacer(1, 4), gt, _p("Uy vazifasi", h2), _p(hw["asosiy"]), _list(hw["tanlov"]),
              Spacer(1, 8), _p("DarsPilot tomonidan tayyorlangan; o'qituvchi tomonidan ko'rib chiqiladi.", small)]
    doc.build(story)
    return buf.getvalue()
