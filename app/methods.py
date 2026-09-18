"""Metodlar kutubxonasi (docx, 8-bo'lim): dars bosqichlari va 34 ta boshlang'ich metod."""

STAGES = [
    {"key": "motivatsiya", "name": "Tashkiliy qism va motivatsiya", "minutes": 2,
     "goal": "Diqqatni jamlash, mavzuga qiziqish uyg'otish"},
    {"key": "takrorlash", "name": "O'tgan mavzuni takrorlash", "minutes": 5,
     "goal": "Tayanch bilimlarni eslab chiqarish va tekshirish"},
    {"key": "uy_vazifasi", "name": "Uy vazifasini tekshirish", "minutes": 3,
     "goal": "Tipik xatolarni tez aniqlash"},
    {"key": "kirish", "name": "Yangi mavzuga kirish va maqsad", "minutes": 4,
     "goal": "Maqsadni o'quvchilar o'zlari kashf qilishi"},
    {"key": "yangi_mavzu", "name": "Yangi mavzuni birga o'rganish", "minutes": 12,
     "goal": "Tushunchani aniq → tasviriy → abstrakt tartibda qurish"},
    {"key": "mustahkamlash", "name": "Mustahkamlash: guruhda qiyin masala", "minutes": 9,
     "goal": "Bilimni qo'llash, muammo yechish va hamkorlik"},
    {"key": "diagnostika", "name": "Diagnostik varaq", "minutes": 8,
     "goal": "Har bir o'quvchi qaysi bosqichda qiynalayotganini aniqlash"},
    {"key": "refleksiya", "name": "Refleksiya va uy vazifasi", "minutes": 2,
     "goal": "O'rganilganini anglash, farqlangan uy vazifasi"},
]
STAGE_KEYS = [s["key"] for s in STAGES]
STAGE_BY_KEY = {s["key"]: s for s in STAGES}


def m(id, name, stages, short, form, minutes, steps):
    return {"id": id, "name": name, "stages": stages, "short": short, "form": form, "minutes": minutes, "steps": steps}


METHODS = [
    m("blits", "Blits-so'rov", ["takrorlash"], "Tezkor qisqa savollar zanjiri", "Sinf", "3–5",
      ["5 ta qisqa savol tayyorlang", "Har savolga 10 soniya", "Javobni aniq o'quvchidan so'rang"]),
    m("mini_doska", "Mini-doska", ["takrorlash", "diagnostika"], "Hamma javobni bir vaqtda yozib ko'rsatadi", "Yakka", "3–5",
      ["Savolni o'qing", "Hamma mini-doskaga yozadi", "Signal bilan bir vaqtda ko'rsatadi"]),
    m("svetofor", "Svetofor", ["refleksiya", "yangi_mavzu", "takrorlash"], "Yashil/sariq/qizil kartochka bilan tushunishni ko'rsatish", "Yakka", "1–2",
      ["Tushuntirishdan keyin to'xtang", "O'quvchilar kartochka ko'taradi", "Qizillar bilan darhol ishlang"]),
    m("xatoni_top", "Xatoni top", ["takrorlash", "uy_vazifasi"], "Ataylab xato qilingan yechimdagi xatoni topish", "Juftlik", "4–6",
      ["Doskaga xato yechim yozing", "Juftliklar xatoni topadi", "Bir juftlik sababini tushuntiradi"]),
    m("teskari_test", "Teskari test", ["takrorlash"], "Berilgan javoblarga mos savollarni topish", "Juftlik", "4–5",
      ["Javoblar ro'yxatini bering", "Juftliklar savol tuzadi", "Eng yaxshi savolni sinf tanlaydi"]),
    m("aql_charxi", "Aql charxi", ["takrorlash"], "Savollar g'ildiragi o'yini", "Sinf", "4–6",
      ["G'ildirakda 6 ta savol", "Tasodifiy o'quvchi aylantiradi", "To'g'ri javobga ball"]),
    m("kun_savoli", "Kun savoli / Muammoli vaziyat", ["motivatsiya", "kirish"], "Hayotiy muammo bilan boshlash", "Sinf", "2–5",
      ["Hayotiy vaziyatni ayting", "3 ta taxmin yig'ing", "Javobni dars oxiriga qoldiring"]),
    m("nimasi_ortiqcha", "“Nimasi ortiqcha?”", ["motivatsiya", "takrorlash"], "4 ob'ektdan birini ortiqcha deb asoslash", "Juftlik", "3–5",
      ["4 ta son yoki ifoda ko'rsating", "Juftliklar ortiqchasini tanlaydi", "Turli asoslarni tinglang"]),
    m("aqliy_hujum", "Aqliy hujum", ["kirish"], "G'oyalarni tanqidsiz yig'ish → guruhlash → tanlash", "Sinf", "3–5",
      ["Muammoli savol bering", "Barcha g'oyalarni yozing", "Birga guruhlab, eng yaxshisini tanlang"]),
    m("taxmin", "Taxmin qil va tekshir", ["kirish", "yangi_mavzu"], "Natijani oldindan chamalash, keyin hisoblab solishtirish", "Yakka", "3",
      ["Javobni chamalashni so'rang", "Taxminlarni yozing", "Hisobdan keyin solishtiring"]),
    m("bbb", "BBB (Bilaman–Bilishni xohlayman–Bilib oldim)", ["kirish", "refleksiya"], "3 ustunli jadval: boshida 2 ustun, oxirida 3-ustun", "Yakka/sinf", "4+2",
      ["“Bilaman” ustunini to'ldiring", "“Bilishni xohlayman” savollari", "Dars oxirida “Bilib oldim”"]),
    m("insert", "Insert", ["yangi_mavzu"], "Darslik matnini V, +, −, ? belgilari bilan o'qish", "Yakka", "5–7",
      ["Matnni belgilab o'qish", "Belgilarni jadvalga o'tkazish", "“?” larni birga muhokama"]),
    m("fsmu", "FSMU", ["kirish", "refleksiya"], "Fikr — Sabab — Misol — Umumlashtirish", "Yakka/juftlik", "5–7",
      ["Fikr bildiring", "Sababini ayting", "Misol va umumlashtirish"]),
    m("klaster", "Klaster", ["yangi_mavzu", "refleksiya"], "Markaziy tushuncha va bog'liq tushunchalar tarmog'i", "Guruh", "5–8",
      ["Markazga tushunchani yozing", "Bog'liq tushunchalarni tarmoqlang", "Guruhlar solishtiradi"]),
    m("oyla_juftlash", "O'yla — juftlash — bo'lish", ["yangi_mavzu", "kirish"], "Yakka o'ylash, juftlikda muhokama, sinfga", "Juftlik", "4–6",
      ["1 daqiqa yakka o'ylash", "2 daqiqa juftlikda", "2 ta juftlik sinfga aytadi"]),
    m("cpa", "CPA: aniq → tasviriy → abstrakt", ["yangi_mavzu"], "Singapur yondashuvi: predmet/harakat → chizma → ifoda", "Sinf/juftlik", "8–12",
      ["Predmet yoki harakat bilan modellang", "Chizma/bar-model chizing", "Ifoda va qoidani chiqaring"]),
    m("bar_model", "Bar-model (chiziqli model)", ["yangi_mavzu", "mustahkamlash"], "Masala shartini to'rtburchak bo'laklar bilan tasvirlash", "Yakka/juftlik", "5–10",
      ["Ma'lum va noma'lumni bo'laklarda chizing", "Bo'laklar orasidagi munosabatni toping", "Ifodaga o'tkazing"]),
    m("namunaviy", "Namunaviy → yarim yechim", ["yangi_mavzu"], "To'liq yechilgan misol, keyin qisman, keyin mustaqil", "Yakka", "6–10",
      ["To'liq namunani tushuntiring", "Yarim yechilganini to'ldirting", "Mustaqil misol bering"]),
    m("sahnalashtirish", "Sahnalashtirish (modellashtirish)", ["kirish", "yangi_mavzu", "motivatsiya"], "Harakat masalalarini o'quvchilar ijro etadi", "Sinf", "3–5",
      ["Ikki o'quvchi harakatni ijro etadi", "Sinf kuzatib o'lchaydi", "Kuzatuvdan qoidani chiqaring"]),
    m("zigzag", "Zig-zag (Jigsaw)", ["yangi_mavzu"], "Ekspert guruhlar o'z qismini o'rganib, boshqalarga o'rgatadi", "Guruh", "12–15",
      ["Mavzuni qismlarga bo'ling", "Ekspert guruhlar o'rganadi", "Asosiy guruhlarda bir-biriga o'rgatadi"]),
    m("bumerang", "Bumerang / Zinama-zina", ["yangi_mavzu", "mustahkamlash"], "Qiyinligi oshib boruvchi topshiriqlar, guruhda almashish", "Guruh", "8–12",
      ["3 pog'onali topshiriq bering", "Yakka boshlab, guruhda almashing", "Savollar qaytib tekshiriladi"]),
    m("keys_stadi", "Keys-stadi", ["mustahkamlash"], "Real vaziyat tahlili", "Guruh", "10–15",
      ["Hayotiy keysni bering", "Guruhlar yechim tuzadi", "Yechimlarni solishtiring"]),
    m("venn", "Venn diagrammasi", ["mustahkamlash", "yangi_mavzu"], "Ikki tushuncha yoki yechim usulini solishtirish", "Juftlik", "5",
      ["Ikki doira chizing", "O'xshash va farqli belgilarni yozing", "Xulosani ayting"]),
    m("t_jadval", "T-jadval / Konseptual jadval", ["mustahkamlash"], "Mezonlar bo'yicha solishtirish", "Juftlik", "4–6",
      ["Mezonlarni belgilang", "Jadvalni to'ldiring", "Farqni umumlashtiring"]),
    m("raqamli_boshlar", "Raqamli boshlar", ["mustahkamlash", "takrorlash"], "Guruh birga yechadi, javobni tasodifiy raqamli a'zo aytadi", "Guruh", "6–10",
      ["Guruh a'zolariga 1–5 raqam bering", "Guruh birga yechadi", "Tasodifiy raqam javob beradi"]),
    m("rally_coach", "Navbatma-navbat murabbiy", ["mustahkamlash"], "Biri yechadi, ikkinchisi murabbiy; keyin almashadi", "Juftlik", "6–8",
      ["A yechadi, B kuzatib maslahat beradi", "Rollar almashadi", "Juftlik javoblarni solishtiradi"]),
    m("charxpalak", "Charxpalak", ["mustahkamlash", "refleksiya"], "Varaqlar guruhlar bo'ylab aylanadi, har guruh qo'shimcha qiladi", "Guruh", "8–10",
      ["Har guruhga savol varag'i", "Signal bilan varaqlar aylanadi", "Oxirida o'z varag'ini baholaydi"]),
    m("galereya", "Galereya sayri", ["mustahkamlash"], "Guruh yechimlari devorda; boshqalar izoh qoldiradi", "Guruh", "8–10",
      ["Guruhlar yechimni plakatga yozadi", "Plakatlar devorga ilinadi", "Boshqalar stiker bilan izoh qoldiradi"]),
    m("baliq_skeleti", "Baliq skeleti", ["mustahkamlash"], "Muammo boshida, sabablar suyaklarda — xatolar tahlili", "Guruh", "6–8",
      ["Boshiga muammoni yozing", "Suyaklarga sabablarni yozing", "Asosiy sababni tanlang"]),
    m("masala_tuzish", "Masala tuzish", ["mustahkamlash", "refleksiya"], "O'quvchi berilgan ifodaga mos masala tuzadi (ijodkorlik)", "Yakka/juftlik", "6–8",
      ["Ifoda yoki rasm bering", "O'quvchilar masala tuzadi", "Juftlik masalasini yechadi"]),
    m("loyiha", "Loyiha (mini-tadqiqot)", ["mustahkamlash"], "Ma'lumot yig'ish → reja → bajarish → xulosa", "Guruh", "ko'p darsli",
      ["Savol qo'ying", "Ma'lumot yig'ish rejasini tuzing", "Natijani taqdim eting"]),
    m("chiqish_chiptasi", "Chiqish chiptasi", ["diagnostika", "refleksiya"], "Dars oxirida 1–3 savol", "Yakka", "2–3",
      ["2–3 ta savol bering", "O'quvchi javobni topshirib chiqadi", "Natija keyingi darsga asos"]),
    m("bosqichli_varaq", "Bosqichli diagnostik varaq", ["diagnostika"], "7 savol: aniqlash → model → yechish → talqin → oldingi mavzu (skaner bilan)", "Yakka", "8",
      ["Darajasiga mos variantni tarqating", "8 daqiqa yechish", "Javob chiziqlarini bitta suratga oling"]),
    m("3_2_1", "3-2-1", ["refleksiya"], "3 ta o'rgandim, 2 ta qiziq fakt, 1 ta savol", "Yakka", "2–3",
      ["3 ta o'rgangan narsa", "2 ta qiziq fakt", "1 ta savol"]),
    m("sinkveyn", "Sinkveyn", ["refleksiya", "takrorlash"], "Tushuncha haqida 5 qatorli qisqa xulosa", "Yakka", "3–5",
      ["Ot, 2 sifat, 3 fe'l", "Bir jumla fikr", "Bitta sinonim"]),
    m("ikki_yulduz", "Ikki yulduz va bitta tilak", ["uy_vazifasi", "refleksiya"], "Ikki yutuq va bitta yaxshilash taklifi", "Juftlik", "2",
      ["Juftlik ishini o'qing", "2 ta yutuqni ayting", "1 ta tilak bildiring"]),
    m("ozaro_tekshirish", "Juftlikda o'zaro tekshirish", ["uy_vazifasi"], "Kalit masala bo'yicha juftliklar bir-birini tekshiradi", "Juftlik", "3–4",
      ["Kalit masalani belgilang", "Juftliklar daftarlarni almashadi", "Farqlarni birga muhokama"]),
]
METHOD_BY_ID = {x["id"]: x for x in METHODS}
STAGE_KEYS = {s["key"] for s in STAGES}


def register(card: dict):
    """O'qituvchi qo'shgan metodni kutubxonaga qo'shadi (xotirada; manba — custom_methods jadvali)."""
    if card["id"] in METHOD_BY_ID:
        METHOD_BY_ID[card["id"]].update(card)
        return
    METHODS.append(card)
    METHOD_BY_ID[card["id"]] = card


def candidates(stage_key: str, prefs: dict | None = None):
    """Bosqich uchun nomzod metodlar; o'qituvchi afzal ko'rganlari oldinda."""
    items = [x for x in METHODS if stage_key in x["stages"]]
    if prefs:
        items.sort(key=lambda x: -prefs.get((stage_key, x["id"]), 0))
    return items
