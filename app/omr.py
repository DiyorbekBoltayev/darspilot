"""Javob bloklarini telefon suratidan o'qish (OMR).

Bitta suratda bir nechta kartochka bo'lishi mumkin: har bir javob blokining 4 burchagida ArUco markerlar bor,
marker id = jurnal_raqami * 4 + burchak. Shuning uchun kartochkalar bir-biridan va o'quvchi kodidan
alohida QR-kodsiz ajratiladi.
"""
from dataclasses import dataclass, field

import cv2
import numpy as np

from . import layout as L

_DICT = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, L.ARUCO_DICT))
_params = cv2.aruco.DetectorParameters()
_params.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
_params.adaptiveThreshWinSizeMin = 5
_params.adaptiveThreshWinSizeMax = 63
_params.adaptiveThreshWinSizeStep = 8
_params.minMarkerPerimeterRate = 0.008
_params.polygonalApproxAccuracyRate = 0.05
_DETECTOR = cv2.aruco.ArucoDetector(_DICT, _params)

# Chegaralar har bir chiziq uchun o'sha chiziqning o'z siyohiga qarab hisoblanadi:
# telefon surati, yorug'lik, ruchka rangi va qog'oz turli bo'lgani uchun qat'iy chegara ishlamaydi.
FILL_FRAC = 0.42     # bo'sh va eng qora doiracha orasidagi ulush: bundan yuqori — bo'yalgan
LOW_FRAC = 0.22      # shu oraliqda — xira belgi
SECOND_REL = 0.70    # ikkinchi doiracha eng qoraning shunchasidan yuqori bo'lsa — ikki belgi
ABS_MIN = 0.10       # umuman siyoh yo'q (bo'sh ustun) deb hisoblash uchun minimal qiymat
SEARCH_MM = 0.9      # doiracha markazini shu radiusda qidiramiz (bosma va perspektiva siljishi uchun)


@dataclass
class StripRead:
    journal_no: int
    marks: dict = field(default_factory=dict)       # {'q1': 'B', ..., 'q5': '2,4'}
    flags: dict = field(default_factory=dict)       # {'q3': 'ikki belgi'}
    confidence: float = 1.0
    corners: int = 4
    quad: list = field(default_factory=list)        # asl suratdagi burchaklar


def _detect(gray):
    corners, ids, _ = _DETECTOR.detectMarkers(gray)
    if ids is None:
        return {}
    groups = {}
    for c, mid in zip(corners, ids.ravel()):
        mid = int(mid)
        journal_no, corner = divmod(mid, 4)
        if not 1 <= journal_no <= L.MAX_JOURNAL_NO:
            continue
        groups.setdefault(journal_no, {})[corner] = c.reshape(4, 2).mean(axis=0)
    return groups


EXPECTED_RATIO = (L.MARKER_CENTERS[1][0] - L.MARKER_CENTERS[0][0]) / (L.MARKER_CENTERS[3][1] - L.MARKER_CENTERS[0][1])


def _from_three(pts: dict, missing: int):
    opposite = (missing + 2) % 4
    n1, n2 = (missing + 1) % 4, (missing + 3) % 4
    full = {k: v for k, v in pts.items() if k != missing}
    full[missing] = full[n1] + full[n2] - full[opposite]
    return full


def _plausible(full: dict) -> float:
    """Chiziq geometriyasiga moslik xatosi (0 — ideal). Noto'g'ri topilgan markerni aniqlash uchun."""
    tl, tr, br, bl = (np.asarray(full[k], dtype=np.float64) for k in range(4))
    top, bottom = np.linalg.norm(tr - tl), np.linalg.norm(br - bl)
    left, right = np.linalg.norm(bl - tl), np.linalg.norm(br - tr)
    if min(top, bottom, left, right) < 20:
        return 99.0
    ratio = ((top + bottom) / 2) / ((left + right) / 2)
    err = abs(np.log(ratio / EXPECTED_RATIO)) + abs(np.log(top / bottom)) + abs(np.log(left / right))
    # konveks va soat mili yo'nalishida ekanini tekshirish
    quad = np.float32([tl, tr, br, bl])
    if not cv2.isContourConvex(quad.reshape(-1, 1, 2)):
        err += 10
    return float(err)


def _complete(pts: dict):
    """Burchaklarni to'ldiradi va geometriyasi eng to'g'ri variantni tanlaydi."""
    options = []
    if len(pts) == 4:
        options.append(dict(pts))
        for missing in range(4):
            options.append(_from_three(pts, missing))
    elif len(pts) == 3:
        options.append(_from_three(pts, ({0, 1, 2, 3} - set(pts)).pop()))
    if not options:
        return None
    best = min(options, key=_plausible)
    return best if _plausible(best) < 0.6 else None


def _ink_map(warped):
    bg = cv2.dilate(warped, np.ones((71, 71), np.uint8))
    norm = np.clip(warped.astype(np.float32) / np.maximum(bg.astype(np.float32), 1), 0, 1)
    return 1.0 - norm


def _disk_mean(ink, cx_mm, cy_mm, r_mm):
    s = L.PX_PER_MM
    cx, cy, r = int(round(cx_mm * s)), int(round(cy_mm * s)), int(round(r_mm * s))
    y0, y1, x0, x1 = max(cy - r, 0), cy + r + 1, max(cx - r, 0), cx + r + 1
    patch = ink[y0:y1, x0:x1]
    if patch.size == 0:
        return 0.0
    yy, xx = np.ogrid[y0 - cy:y1 - cy, x0 - cx:x1 - cx]
    mask = xx * xx + yy * yy <= r * r
    return float(patch[mask].mean()) if mask.any() else 0.0


_OFFSETS = [(0.0, 0.0), (-SEARCH_MM, 0.0), (SEARCH_MM, 0.0), (0.0, -SEARCH_MM), (0.0, SEARCH_MM),
            (-SEARCH_MM * 0.7, -SEARCH_MM * 0.7), (SEARCH_MM * 0.7, -SEARCH_MM * 0.7),
            (-SEARCH_MM * 0.7, SEARCH_MM * 0.7), (SEARCH_MM * 0.7, SEARCH_MM * 0.7)]


def _bubble_ink(ink, cx_mm, cy_mm, r_mm):
    """Doirachani biroz siljigan holatda ham topadi: kichik oynadagi eng qora joy olinadi."""
    return max(_disk_mean(ink, cx_mm + dx, cy_mm + dy, r_mm) for dx, dy in _OFFSETS)


def _choose(values, base, peak):
    """base — bo'sh doiracha darajasi, peak — shu chiziqdagi eng qora belgi. Chegaralar shularga nisbatan."""
    span = max(peak - base, 0.06)
    fill = base + FILL_FRAC * span
    low = base + LOW_FRAC * span
    order = np.argsort(values)[::-1]
    best, second = values[order[0]], values[order[1]]
    if best < max(low, ABS_MIN):
        return None, None
    if best < fill:
        return int(order[0]), "xira belgi"
    if second > best * SECOND_REL and second > fill:
        return int(order[0]), "ikki belgi"
    return int(order[0]), None


def read_strip(gray, pts: dict) -> StripRead:
    s = L.PX_PER_MM
    src = np.float32([pts[k] for k in range(4)])
    dst = np.float32([[L.MARKER_CENTERS[k][0] * s, L.MARKER_CENTERS[k][1] * s] for k in range(4)])
    H = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(gray, H, (int(L.BLOCK_W * s), int(L.BLOCK_H * s)), flags=cv2.INTER_LINEAR,
                                 borderValue=255)
    ink = _ink_map(cv2.GaussianBlur(warped, (3, 3), 0))

    # 1-bosqich: barcha doirachalar o'lchanadi, so'ng shu chiziqning o'z darajasi hisoblanadi
    test_vals = [[_bubble_ink(ink, *L.test_bubble(qi, li), L.TEST_SAMPLE_R) for li in range(4)]
                 for qi in range(len(L.TEST_QUESTIONS))]
    grid_vals = [[_bubble_ink(ink, *L.grid_bubble(ci, ri), L.GRID_SAMPLE_R) for ri in range(len(L.GRID_ROWS))]
                 for ci in range(L.GRID_COLS)]
    flat = np.array([v for row in test_vals for v in row] + [v for col in grid_vals for v in col])
    base = float(np.median(flat))
    peak = float(np.percentile(flat, 97))

    res = StripRead(journal_no=0)
    unsure = 0
    for qi, q in enumerate(L.TEST_QUESTIONS):
        idx, flag = _choose(test_vals[qi], base, peak)
        res.marks[q] = L.LETTERS[idx] if idx is not None else None
        if flag:
            res.flags[q] = flag
            unsure += 1

    symbols = []
    grid_flags = []
    for ci in range(L.GRID_COLS):
        idx, flag = _choose(grid_vals[ci], base, peak)
        symbols.append(L.GRID_ROWS[idx] if idx is not None else "")
        if flag:
            grid_flags.append(f"{ci + 1}-ustun: {flag}")
    last = max((i for i, sym in enumerate(symbols) if sym), default=-1)
    body = symbols[: last + 1]
    if "" in body:
        grid_flags.append("oraliqda bo'sh ustun")
    answer = "".join(body)
    if answer.startswith(",") or answer.endswith(",") or answer.count(",") > 1:
        grid_flags.append("vergul noto'g'ri joyda")
    res.marks["q5"] = answer or None
    if grid_flags:
        res.flags["q5"] = "; ".join(grid_flags)
        unsure += 1
    empty = sum(1 for q in L.TEST_QUESTIONS if res.marks.get(q) is None)
    if empty >= 3:
        res.flags["chiziq"] = f"{empty} ta savol bo'sh o'qildi — suratni tekshiring"
        unsure += 1
    res.confidence = round(max(0.0, 1 - unsure / 7), 2)
    return res


def scan_image(img_bgr):
    """Suratdagi barcha chiziqlarni o'qiydi. Qaytaradi: (natijalar ro'yxati, belgilangan rasm)."""
    h, w = img_bgr.shape[:2]
    scale = 1.0
    if max(h, w) > 4200:
        scale = 4200 / max(h, w)
        img_bgr = cv2.resize(img_bgr, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    groups = _detect(gray)
    # to'liq topilmagan chiziqlar uchun kontrasti oshirilgan rasmda ikkinchi urinish
    if not groups or any(len(p) < 4 for p in groups.values()):
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(gray)
        for jno, pts in _detect(clahe).items():
            merged = groups.setdefault(jno, {})
            for corner, center in pts.items():
                merged.setdefault(corner, center)

    annotated = img_bgr.copy()
    reads = []
    for journal_no, pts in sorted(groups.items()):
        full = _complete(pts)
        if full is None:
            continue
        r = read_strip(gray, full)
        r.journal_no = journal_no
        r.corners = len(pts)
        # chiziqning tashqi chegarasini chizish uchun burchak markazlarini biroz kengaytiramiz
        quad = np.float32([full[k] for k in range(4)])
        r.quad = quad.tolist()
        color = (60, 170, 90) if not r.flags else (40, 160, 245)
        cv2.polylines(annotated, [quad.astype(np.int32)], True, color, max(3, w // 500))
        label = f"#{journal_no:02d}" + (" ?" if r.flags else " OK")
        org = tuple(int(v) for v in quad[0])
        cv2.putText(annotated, label, (org[0], max(org[1] - 12, 30)), cv2.FONT_HERSHEY_SIMPLEX,
                    max(1.0, w / 1600), color, max(2, w // 700), cv2.LINE_AA)
        reads.append(r)
    return reads, annotated
