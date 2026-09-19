"""Landing sahifasidagi chatbot: DarsPilot qanday ishlashini tushuntiradi.

Model faqat quyidagi tasdiqlangan faktlarga tayanadi (hech narsa to'qimaydi).
Kalit bo'lmasa — kalit so'zlar bo'yicha tayyor javoblar ishlatiladi.
"""
from . import config, llm

FACTS = """
DarsPilot — 5-6-sinf matematika o'qituvchisi uchun AI yordamchi. Muammo: o'qituvchi vaqtining katta qismi
ishlarni tekshirish, baho qo'yish va hujjat to'ldirishga ketadi; 30 kishilik sinfda har bir o'quvchiga
alohida e'tibor berish qiyin.

ISH TARTIBI — "dars konveyeri". Har bir dars 5 qadamdan o'tadi:
1) Tayyorlash — AI dars ssenariysini tuzadi (45 daqiqa, 8 bosqich, metodlar, kim bilan alohida ishlash);
2) Darsda — e'tibor jurnali, o'qituvchi ovoz bilan ham ayta oladi ("Dilshod doskaga chiqdi");
3) Tekshirish — qog'ozli diagnostika suratdan o'qiladi yoki qog'ozsiz tezkor tekshiruv (svetofor);
4) Tahlil — bosqichli tashxis, sinf xulosasi, har o'quvchiga feedback;
5) Keyingi dars — natijalarga qarab keyingi ssenariy tayyorlanadi.

QOG'OZ FORMATI. Bitta A4 varaq 4 ta kartochkaga bo'linadi, ikkala tomoni ishlatiladi. Old tomonda o'quvchining
ismi, masala va 1-4-savollar hamda o'tgan ishdan shaxsiy feedback bosiladi. Orqa tomonda 5-7-savollar va
4 burchagida ArUco markerli javob bloki (A4 ning taxminan 1/8 qismi). O'quvchi javobni faqat doirachalarni
bo'yash va son panjarasini belgilash orqali beradi — qo'lda yozma javob yo'q.
O'quvchi hech narsani yirtmaydi — kartochka butunligicha yig'ib olinadi, o'qituvchi orqa tomonini telefonda
suratga oladi; bitta suratda 10 tagacha kartochka o'qiladi. 31 o'quvchilik sinf uchun bitta diagnostika = 8 varaq.

JAVOBNI KOD TEKSHIRADI, AI EMAS. Barcha 7 ta javob kompyuter ko'rish bilan o'qiladi va kod bilan
tekshiriladi — har katak uchun ishonch darajasi hisoblanadi, shubhali belgilar o'qituvchiga tasdiqlashga
chiqadi. Ball AI ning fikri emas: u takrorlanadigan va tekshiriladigan. AI boshqa joyda ishlaydi: har
o'quvchiga darajasiga mos masalani individual yozadi, xato turini talqin qiladi, o'quvchi/ota-ona/o'qituvchi
uchun feedback va sinf bo'yicha xulosa tayyorlaydi. Oxirgi so'z har doim o'qituvchida.

UY VAZIFASI. Mashq daftari sahifasini suratga olsangiz, AI har mashqni raqami bo'yicha tekshiradi:
to'g'ri/xato va xato turi (amallar tartibi, hisob xatosi va h.k.). Natija keyingi dars ssenariysidagi
takrorlash bosqichiga tushadi.

SUMMATIV BAHOLASH. BSB va ChSB ham shu dvigatel bilan o'tkaziladi: har o'quvchiga o'z varianti chiqadi,
natija taqvim-mavzu rejadagi maksimal ballga (15/20/25/40) nisbatan hisoblanib baholar jurnaliga tushadi.

DIFFERENSIATSIYA. Har o'quvchining ko'nikma profili saqlanadi (tushunish, modellashtirish, hisoblash, talqin,
tayanch bilim) va har diagnostikada 4 daraja (B1-B4) dan mos variant beriladi. "N dars e'tiborsiz" ogohlantirishi
kimga navbat kelganini ko'rsatadi.

O'QUV DASTURI. Darslar haqiqiy taqvim-mavzu reja bo'yicha boradi: "AHA! Matematika 5-sinf" (Novda Edutainment,
2024) darsligi, mashq daftari va rasmiy bir yillik ish reja — 170 dars, haftasiga 5 soat, chorak va ta'til sanalari.
Har dars uchun darslik va mashq daftari betlari ko'rsatiladi.

ROLLAR. O'qituvchi — to'liq ish stoli. Direktor — faqat agregat ko'rsatkichlar, o'quvchi ismlari ko'rinmaydi.
Ota-ona — havola va elektron rozilik orqali farzandi haqidagi qisqa xabar (foiz va reyting ko'rsatilmaydi).

MAXFIYLIK. AI ga o'quvchi ismlari yuborilmaydi — faqat kodlar (masalan 5B-17) va agregat ma'lumot.
Har bir AI chaqiruvi jurnalga yoziladi (model, vaqt, tokenlar).

NATIJALAR (demo maktab ma'lumotlari, chorak boshidan): avtomatik o'qish aniqligi ~99%, bitta 10 o'quvchilik
diagnostikani to'liq baholash ~26 sekund, uy vazifasini tekshirish ~8 sekund, chorak boshidan 7 soatga yaqin
tekshiruv vaqti tejaldi, 38 varaq ishlatildi (har darsda test bo'lganda 292 varaq ketardi).

TEXNIKA. Backend: Python, FastAPI, PostgreSQL, MinIO. Kompyuter ko'rish: OpenCV (ArUco markerlar, doirachalarni
o'qish). AI: OpenAI modellari (matn va surat). Frontend: React. Hammasi Docker bilan bitta buyruqda ishga tushadi.
Telefonda oddiy brauzer yetarli — maxsus qurilma, skaner yoki planshet kerak emas.

NARX VA JORIY HOLAT. Mahsulot hozir xakaton prototipi (MVP): demo maktab ma'lumotlari bilan ishlaydi.
Narx, litsenziya va pilot shartlari hali belgilanmagan — bu haqda savol bo'lsa, jamoa bilan bog'lanish kerak.
"""

SYSTEM = (
    "Sen DarsPilot mahsuloti haqidagi yordamchisan. Faqat quyidagi FAKTLARga tayanib javob ber. "
    "Faktlarda yo'q narsani aytma — bunday savolga 'bu haqda ma'lumotim yo'q, jamoadan so'rang' deb javob ber. "
    "O'zbek tilida (lotin), sodda va qisqa yoz: 2-5 gap. Raqamlarni faqat faktlardan ol. "
    "Foydalanuvchi o'zbek, rus yoki ingliz tilida yozsa ham, javobni o'sha tilda ber, lekin faktlarni o'zgartirma. "
    "Javobni faqat JSON qaytar."
)

SUGGESTIONS = [
    "DarsPilot qanday ishlaydi?",
    "Qog'ozli test qanday o'qiladi?",
    "Javobni AI tekshiradimi yoki kod?",
    "O'quvchi ma'lumotlari maxfiymi?",
    "Maktabga qanday qurilma kerak?",
]

FALLBACK = [
    (("qog'oz", "qogoz", "varaq", "skan", "surat", "kamera"),
     "Bitta A4 varaq 4 ta kartochkaga bo'linadi va ikkala tomoni ishlatiladi. O'quvchi hech narsani yirtmaydi — "
     "o'qituvchi kartochkalarni yig'ib, orqa tomonini telefonda suratga oladi. Bitta suratda 10 tagacha kartochka "
     "o'qiladi: 4 burchakdagi ArUco markerlar har bir ishni o'quvchi raqamiga bog'laydi."),
    (("yechim", "qo'lda", "qolda", "rubrika", "yozma", "kim tekshiradi", "ishonch"),
     "Javobni AI emas, kod tekshiradi. O'quvchi doirachani bo'yaydi va son panjarasiga javobni yozadi; "
     "kompyuter ko'rish uni o'qiydi, to'g'ri-noto'g'risini esa oddiy kod solishtiradi — natija takrorlanadigan. "
     "AI masalani har o'quvchiga individual yozadi, xato turini talqin qiladi va feedback tayyorlaydi. "
     "Oxirgi so'z o'qituvchida."),
    (("uy vazifa", "daftar", "mashq"),
     "Mashq daftari sahifasini suratga olsangiz, AI har mashqni raqami bo'yicha tekshiradi — to'g'ri yoki xato, "
     "xato bo'lsa turi bilan (masalan, amallar tartibi). Natija keyingi dars ssenariysidagi takrorlashga tushadi."),
    (("maxfiy", "ism", "shaxsiy", "xavfsiz", "gdpr"),
     "AI ga o'quvchilarning ismlari yuborilmaydi — faqat kodlar (masalan 5B-17) va agregat ma'lumot. "
     "Direktor paneli ham ismsiz ishlaydi, ota-onaga esa faqat o'z farzandi haqidagi qisqa xabar ko'rinadi."),
    (("qurilma", "telefon", "planshet", "internet", "narx", "pul", "litsenziya"),
     "Maxsus qurilma kerak emas: oddiy telefon kamerasi va brauzer yetarli, chop etish uchun esa oddiy printer. "
     "Narx va pilot shartlari hozircha belgilanmagan — mahsulot xakaton prototipi bosqichida."),
    (("baho", "ball", "jurnal", "bsb", "chsb", "summativ"),
     "Yopiq javoblar kompyuter ko'rish bilan, qo'lda yozilgan yechim esa AI rubrikasi bilan baholanadi. "
     "Formativ ball (0-10) va BSB/ChSB natijasi baholar jurnaliga o'zi tushadi, Excelga chiqarish mumkin."),
]

DEFAULT = (
    "DarsPilot — o'qituvchi uchun dars konveyeri: AI dars ssenariysini tuzadi, qog'ozli ishni suratdan tekshiradi "
    "(yopiq javoblarni kompyuter ko'rish, qo'lda yozilgan yechimni AI rubrikasi), har o'quvchiga feedback yozadi va "
    "natijalarga qarab keyingi darsni rejalashtiradi. Qaysi qismini batafsil tushuntiray?"
)


def fallback_answer(question: str) -> str:
    q = (question or "").lower()
    for keys, text in FALLBACK:
        if any(k in q for k in keys):
            return text
    return DEFAULT


def answer(question: str, history: list | None = None) -> dict:
    """history: [{"role": "user"|"bot", "text": "..."}] — oxirgi 6 tasi hisobga olinadi."""
    question = (question or "").strip()[:500]
    if not question:
        return {"javob": DEFAULT, "manba": "shablon", "takliflar": SUGGESTIONS}
    if not llm.enabled():
        return {"javob": fallback_answer(question), "manba": "shablon", "takliflar": SUGGESTIONS}
    user = {
        "FAKTLAR": FACTS,
        "suhbat": [{"kim": h.get("role"), "matn": str(h.get("text", ""))[:400]} for h in (history or [])][-6:],
        "savol": question,
        "javob_formati": {"javob": "...", "takliflar": ["keyingi savol 1", "keyingi savol 2"]},
    }
    data = llm.call_json(SYSTEM, user, "chatbot", model=config.OPENAI_MODEL_FAST)
    if isinstance(data, dict) and isinstance(data.get("javob"), str) and data["javob"].strip():
        tips = [str(x)[:80] for x in (data.get("takliflar") or [])][:3] or SUGGESTIONS[:3]
        return {"javob": data["javob"].strip()[:1200], "manba": "gpt", "takliflar": tips}
    return {"javob": fallback_answer(question), "manba": "shablon", "takliflar": SUGGESTIONS}
