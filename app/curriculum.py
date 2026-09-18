"""Ko'nikmalar, xato turlari va savol → masala yechish bosqichi bog'lanishi."""

# Milliy standartdagi 5 bosqichli yondashuvga moslashtirilgan ko'nikmalar
SKILLS = [
    ("tushunish", "Muammoni aniqlash"),
    ("modellashtirish", "Modellashtirish"),
    ("hisoblash", "Yechish (hisoblash)"),
    ("talqin", "Natijani talqin qilish"),
    ("tayanch", "Tayanch bilim (oldingi mavzu)"),
]
SKILL_NAMES = dict(SKILLS)

QUESTION_SKILL = {
    "q1": "tushunish",
    "q2": "tushunish",
    "q3": "modellashtirish",
    "q4": "hisoblash",
    "q5": "hisoblash",
    "q6": "talqin",
    "q7": "tayanch",
}

QUESTION_STEP = {
    "q1": "Muammoni aniqlash",
    "q2": "Ma'lumotni ajratish",
    "q3": "Model tanlash",
    "q4": "Oraliq hisob",
    "q5": "Javob",
    "q6": "Talqin",
    "q7": "Oldingi mavzu",
}

ERRORS = {
    "tushunish": "Masalada nima so'ralayotganini aniqlay olmayapti",
    "malumot": "Berilgan ma'lumotlarni to'g'ri ajratmayapti",
    "model_obyekt": "Faqat bitta harakatlanuvchini hisobga olyapti",
    "model_yonalish": "Harakat yo'nalishini adashtiryapti (qo'shish o'rniga ayirish yoki aksincha)",
    "model_amal": "Amal ma'nosini tushunmayapti (bo'lish o'rniga ko'paytirish)",
    "model_tartib": "Amallar tartibini buzyapti — qavs qo'ymayapti",
    "model_butun": "Qolgan qismning qismi o'rniga butunning qismini olyapti",
    "oraliq_javob": "Masalani oxirigacha yechmayapti: oraliq natijani javob deb yozyapti",
    "model_kechikish": "Kechikish shartini hisobga olmayapti",
    "hisoblash": "Hisoblashda xato qilyapti",
    "talqin_vaqt": "O'nli kasrdagi soatni minut deb o'qiyapti (2,4 soat = 2 soat 40 minut)",
    "talqin": "Natijaning ma'nosini noto'g'ri talqin qilyapti",
    "tayanch_vaqt": "Vaqt birliklarini aylantirishda bo'shliq bor (oldingi mavzu)",
    "tayanch_xona": "10, 100, 1000 ga ko'paytirish va bo'lishda xona xatosi (oldingi mavzu)",
    "tayanch_kasr": "Sonning qismini topishda bo'shliq bor (oldingi mavzu)",
    "javob_yoq": "Javob belgilanmagan",
}

# Xato → keyingi darsga amaliy tavsiya (LLM ishlamasa ham ishlatiladi)
ERROR_ACTIONS = {
    "tushunish": "Masalani o'z so'zi bilan qayta aytib berish mashqi; shartdagi savolni tagiga chizish.",
    "malumot": "“Berilgan / Topish kerak” jadvalini to'ldirish odati.",
    "model_obyekt": "Ikki ob'ektni chizmada (bar-model) birga tasvirlash.",
    "model_yonalish": "Qarama-qarshi va bir yo'nalishdagi harakatni sahnalashtirib solishtirish (Venn diagrammasi).",
    "model_amal": "Amal ma'nosini bar-model bilan takrorlash: “nega aynan shu amal?”",
    "model_tartib": "Ifodani bosqichma-bosqich yozdirish: “avval nimani topamiz?” — so'ng qavs qo'yish mashqi.",
    "model_butun": "Bar-modelda butunni bo'lib, qolgan qismni alohida bo'yash (AHA! I qism, “Qolgan qismning qismi”, 82-bet).",
    "oraliq_javob": "Javobdan oldin savolni qayta o'qish odati: “men topgan son — so'ralgan sonmi?”",
    "model_kechikish": "Harakatni vaqt o'qida bosqichma-bosqich chizish.",
    "hisoblash": "O'nli kasrlarni bo'lish bo'yicha 5 daqiqalik mashq va javobni teskari amal bilan tekshirish.",
    "talqin_vaqt": "0,1 soat = 6 minut ekanini ko'rsatuvchi 3 daqiqalik mini-mashq.",
    "talqin": "“Javob mantiqiymi?” savolini har masaladan keyin berish.",
    "tayanch_vaqt": "Takrorlash bosqichida vaqt birliklariga 2–3 ta tezkor savol.",
    "tayanch_xona": "Xona jadvali bilan 10, 100, 1000 ga ko'paytirish-bo'lishga 3 daqiqalik mashq.",
    "tayanch_kasr": "“Sonning qismini topish” ni bar-model bilan takrorlash (mashq daftari, D1 daraja).",
    "javob_yoq": "O'quvchi bilan shaxsan gaplashish: vaqt yetmadimi yoki tushunmadimi?",
}

LEVELS = ["B1", "B2", "B3", "B4"]
LEVEL_NAMES = {"B1": "Tayanch", "B2": "Asosiy", "B3": "Mustahkam", "B4": "Ilg'or"}


def level_for_score(avg: float) -> str:
    if avg < 0.40:
        return "B1"
    if avg < 0.65:
        return "B2"
    if avg < 0.85:
        return "B3"
    return "B4"
