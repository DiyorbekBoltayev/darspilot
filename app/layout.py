"""Javob bloki geometriyasi (mm). PDF chizish va skanerlash bir xil koordinatalardan foydalanadi.

Bitta A4 varaq 4 ta kartochkaga bo'linadi (old va orqa tomon ishlatiladi): har bir o'quvchiga A6 kartochka tegadi.
Kartochkaning orqa tomonida skanerlanadigan javob bloki turadi — bu A4 ning taxminan 1/8 qismi.
O'quvchi hech narsani yirtmaydi: kartochka butunligicha yig'ib olinadi.

XAVFSIZ CHEKKA (CUT_SAFE). Varaq qirqilganda yoki ikki tomonlama bosma biroz siljiganda matn kesilib qolmasligi kerak:
  - ofis printerlarida old va orqa tomon 1–3 mm gacha siljiydi,
  - qo'lda qirqishda yana 1–2 mm xato bo'ladi,
  - ko'pchilik printer varaq chetidagi ~5 mm ga umuman bosa olmaydi.
Shuning uchun kartochkadagi HAMMA mazmun (matn, javob bloki, markerlar) qirqish chizig'idan kamida CUT_SAFE
uzoqlikda turadi va old/orqa tomon chekkalari bir xil — shunda qaysi tomondan qirqilsa ham hech narsa yo'qolmaydi.
"""

CUT_SAFE = 8.0          # qirqish chizig'idan / varaq chetidan minimal xavfsiz masofa
MARKER_SAFE = 10.0      # ArUco markerlar uchun kengroq chekka (skanerlash ularga bog'liq)

BLOCK_W = 88.0
BLOCK_H = 62.0

MARKER_SIZE = 8.0
# Burchak markerlarining chap-yuqori nuqtalari: 0=TL, 1=TR, 2=BR, 3=BL
MARKER_POS = {
    0: (2.5, 2.5),
    1: (BLOCK_W - 10.5, 2.5),
    2: (BLOCK_W - 10.5, BLOCK_H - 10.5),
    3: (2.5, BLOCK_H - 10.5),
}
MARKER_CENTERS = {k: (x + MARKER_SIZE / 2, y + MARKER_SIZE / 2) for k, (x, y) in MARKER_POS.items()}

# ArUco lug'ati: marker id = jurnal_raqami * 4 + burchak
ARUCO_DICT = "DICT_4X4_250"
MAX_JOURNAL_NO = 61


def marker_id(journal_no: int, corner: int) -> int:
    return journal_no * 4 + corner


# Test savollari (A–D)
TEST_QUESTIONS = ["q1", "q2", "q3", "q4", "q6", "q7"]
TEST_LABELS = {"q1": "1", "q2": "2", "q3": "3", "q4": "4", "q6": "6", "q7": "7"}
LETTERS = ["A", "B", "C", "D"]
TEST_ROW_Y0 = 17.0
TEST_ROW_STEP = 7.0
TEST_COL_X0 = 15.0
TEST_COL_STEP = 8.0
TEST_RADIUS = 2.4
TEST_SAMPLE_R = 1.7


def test_bubble(qi: int, li: int):
    return TEST_COL_X0 + li * TEST_COL_STEP, TEST_ROW_Y0 + qi * TEST_ROW_STEP


# 5-savol: kalkulyator uslubidagi son panjarasi
GRID_COLS = 4
GRID_ROWS = [",", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
GRID_COL_X0 = 50.0
GRID_COL_STEP = 7.0
GRID_ROW_Y0 = 13.0
GRID_ROW_STEP = 4.3
GRID_RADIUS = 1.7
GRID_SAMPLE_R = 1.2


def grid_bubble(ci: int, ri: int):
    return GRID_COL_X0 + ci * GRID_COL_STEP, GRID_ROW_Y0 + ri * GRID_ROW_STEP


# Skanerda blokni tekislash masshtabi
PX_PER_MM = 12

# A4 dagi kartochka to'ri: 2 ustun × 2 qator
CARD_W = 105.0
CARD_H = 148.5
CARD_PAD = CUT_SAFE                                   # matn ramkasi chekkasi
# Javob bloki kartochkaning pastida, gorizontal markazda: markerlar chetdan MARKER_SAFE uzoqlikda
BLOCK_X = round((CARD_W - BLOCK_W) / 2, 2)            # 8.5 mm → marker 11 mm chetda
BLOCK_Y = CARD_H - BLOCK_H - BLOCK_X


def safety_report() -> dict:
    """Mazmunning qirqish chizig'igacha bo'lgan eng kichik masofalari (mm) — test va nazorat uchun."""
    marker_left = BLOCK_X + min(x for x, _ in MARKER_POS.values())
    marker_right = CARD_W - (BLOCK_X + max(x for x, _ in MARKER_POS.values()) + MARKER_SIZE)
    marker_bottom = CARD_H - (BLOCK_Y + max(y for _, y in MARKER_POS.values()) + MARKER_SIZE)
    return {
        "matn": CARD_PAD,
        "blok_chap": BLOCK_X, "blok_ong": CARD_W - BLOCK_X - BLOCK_W,
        "marker_chap": marker_left, "marker_ong": marker_right, "marker_past": marker_bottom,
    }
