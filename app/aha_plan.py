"""5-sinf Matematika: "AHA! Matematika" darsligi va 2026–2027 o'quv yili taqvim-mavzu rejasi (BSB/ChSB varianti).

Manbalar (17.09.2026 da tekshirilgan):
- Darslik: "AHA! Matematika. 5-sinf", I va II qism, Toshkent, "Novda Edutainment", 2024 (muallif Erik Chan Chun Ming,
  mahalliylashtirish: B. Xaydarov va boshqalar), MMTV nashrga tavsiya etgan.
- Mashq daftari — darslikning ajralmas qismi, "asosan uyda shug'ullanishga mo'ljallangan"; topshiriqlar D1/D2/D3 darajali.
- Taqvim-mavzu reja: o'qituvchi bergan rasmiy fayl — "5-sinf Matematika yillik BSB va CHSB" (e_baza ish reja, 2026–2027).
  Haftasiga 5 soat (MMTV 10.04.2026 dagi 133-son buyrug'i), yiliga 170 soat; choraklar bo'yicha 45 / 35 / 50 / 40.
- Rejada "Taqvimiy vaqt" ustuni bo'sh: sanani har bir o'qituvchi sinf jadvalidan qo'yadi. Shuning uchun bu yerda faqat
  darslar tartibi saqlanadi, sanalar sinf jadvali va o'quv yili kalendaridan hisoblanadi.
- Darslik va mashq daftari sahifalari darsliklarning o'z MUNDARIJA sahifalaridan olindi (PDF matn qatlami), mavzu nomi bo'yicha moslandi.
- Chorak va ta'til sanalari VM 140-son qarori (24–26-bandlar) qoidasidan hisoblangan; 2026–2027 uchun rasmiy e'lon kutilmoqda.
"""
import math
import re
from datetime import date, timedelta

SOURCE = {
    "textbook": "AHA! Matematika. 5-sinf (I–II qism), Novda Edutainment, 2024",
    "workbook": "AHA! Matematika. Mashq daftari, 5-sinf (I–II qism)",
    "plan": "Taqvim-mavzu reja 2026–2027 (BSB/ChSB) · haftasiga 5 soat, 170 soat",
    "note": "Sanalar sinf jadvalidan hisoblanadi; chorak va ta'til sanalari qonun qoidasidan hisoblangan (rasmiy e'lon kutilmoqda).",
}

CHAPTERS = {
    1: "Natural sonlar",
    2: "Sonlar ustida to'rt amal",
    3: "Oddiy kasrlar",
    4: "Uchburchakning yuzi",
    5: "Hajm",
    6: "Nisbatlar",
    7: "O'nli kasrlar",
    8: "Me'yor",
    9: "Foizlar",
    10: "O'rtacha qiymat",
    11: "Burchaklar",
    12: "Uchburchakning xossalari",
    13: "Parallelogramm, romb va trapetsiya",
}

# Bob → shu bobda rivojlanadigan ko'nikmalar (curriculum.SKILLS dagi 5 ta umumiy ko'nikma)
CHAPTER_SKILLS = {
    1: ["tushunish", "hisoblash"],
    2: ["modellashtirish", "hisoblash"],
    3: ["modellashtirish", "hisoblash", "talqin"],
    4: ["modellashtirish", "hisoblash"],
    5: ["modellashtirish", "hisoblash", "talqin"],
    6: ["tushunish", "modellashtirish", "hisoblash"],
    7: ["hisoblash", "talqin"],
    8: ["modellashtirish", "hisoblash"],
    9: ["modellashtirish", "hisoblash", "talqin"],
    10: ["hisoblash", "talqin"],
    11: ["tushunish", "hisoblash"],
    12: ["tushunish", "modellashtirish"],
    13: ["tushunish", "modellashtirish"],
}

# Bosqichli diagnostik varaq (problems.TEMPLATES) tayyor bo'lgan mavzular. Qolgan darslarda — qog'ozsiz tezkor tekshiruv.
TEMPLATE_TOPICS = {
    2: ("amallar_tartibi", ["bo'lish", "amallarni bajarish tartibi", "matnli masalalar", "muammoli topshiriq"]),
    3: ("qolgan_qism", ["qolgan qismning qismi", "matnli masalalar", "muammoli topshiriq"]),
}

# (dars №, chorak, bob, mavzu, darslik sahifasi, mashq daftari sahifasi)
LESSONS = [
    (1, 1, 1, "Takrorlash: 100 000 gacha bo'lgan sonlar", 'I: 2', '1'),
    (2, 1, 1, "1 milliongacha bo'lgan sonlar", 'I: 4', '5–8'),
    (3, 1, 1, "1 milliongacha bo'lgan sonlar", 'I: 4', '5–8'),
    (4, 1, 1, "10 milliongacha bo'lgan sonlar", 'I: 8', '9–14'),
    (5, 1, 1, "10 milliongacha bo'lgan sonlar", 'I: 8', '9–14'),
    (6, 1, 1, 'Takrorlash', 'I: 12', '16–17'),
    (7, 1, 2, "Sonni o'nlik, yuzlik va mingliklarga ko'paytirish", 'I: 19', '21–24'),
    (8, 1, 2, "Sonni o'nlik, yuzlik va mingliklarga ko'paytirish", 'I: 19', '21–24'),
    (9, 1, 2, "Sonni 10, 100 va 1000 ga bo'lish", 'I: 21', '25–26'),
    (10, 1, 2, "Sonni o'nlik, yuzlik va mingliklarga bo'lish", 'I: 26', '27–30'),
    (11, 1, 2, "Sonni o'nlik, yuzlik va mingliklarga bo'lish", 'I: 26', '27–30'),
    (12, 1, 2, 'Qavssiz ifodalarda amallarni bajarish tartibi', 'I: 29', '31–34'),
    (13, 1, 2, 'Qavssiz ifodalarda amallarni bajarish tartibi', 'I: 29', '31–34'),
    (14, 1, 2, 'BSB-1 (15 ball)', '', ''),
    (15, 1, 2, 'BSB tahlili', '', ''),
    (16, 1, 2, 'Qavsli ifodalarda amallarni bajarish tartibi', 'I: 37', '35–36'),
    (17, 1, 2, 'Qavsli ifodalarda amallarni bajarish tartibi', 'I: 37', '35–36'),
    (18, 1, 2, 'Matnli masalalar', 'I: 39', '37–50'),
    (19, 1, 2, 'Matnli masalalar', 'I: 39', '37–50'),
    (20, 1, 3, "Sonlarni bo'lishni kasr ko'rinishida ifodalash", 'I: 46', '55–58'),
    (21, 1, 3, "Sonlarni bo'lishni kasr ko'rinishida ifodalash", 'I: 46', '55–58'),
    (22, 1, 3, "Oddiy kasrni o'nli kasrga aylantirish", 'I: 52', '59–62'),
    (23, 1, 3, "Oddiy kasrni o'nli kasrga aylantirish", 'I: 52', '59–62'),
    (24, 1, 3, "Takrorlash. To'plamning qismi", 'I: 56', '63–64'),
    (25, 1, 3, "Aralash sonlarni qo'shish va ayirish", 'I: 58', '65–70'),
    (26, 1, 3, "Aralash sonlarni qo'shish va ayirish", 'I: 58', '65–70'),
    (27, 1, 3, 'BSB-2 (15 ball)', '', ''),
    (28, 1, 3, 'BSB tahlili', '', ''),
    (29, 1, 3, "To'g'ri kasrni natural songa ko'paytirish", 'I: 65', '73–76'),
    (30, 1, 3, "Noto'g'ri kasrni natural songa ko'paytirish", 'I: 69', '77–78'),
    (31, 1, 3, "Ikkita to'g'ri kasrni ko'paytirish", 'I: 70', '79–80'),
    (32, 1, 3, "Ikkita to'g'ri kasrni ko'paytirish", 'I: 70', '79–80'),
    (33, 1, 3, "To'g'ri va noto'g'ri kasrlarni ko'paytirish", 'I: 75', '81–82'),
    (34, 1, 3, "To'g'ri va noto'g'ri kasrlarni ko'paytirish", 'I: 75', '81–82'),
    (35, 1, 3, "Ikkita noto'g'ri kasrni ko'paytirish", 'I: 76', '83–84'),
    (36, 1, 3, "Ikkita noto'g'ri kasrni ko'paytirish", 'I: 76', '83–84'),
    (37, 1, 3, "Aralash sonlarni natural songa ko'paytirish", 'I: 79', '85–88'),
    (38, 1, 3, 'Qolgan qismning qismi', 'I: 82', '89–90'),
    (39, 1, 3, 'BSB-3 (20 ball)', '', ''),
    (40, 1, 3, 'BSB tahlili', '', ''),
    (41, 1, 3, 'Qolgan qismning qismi', 'I: 82', '89–90'),
    (42, 1, 3, 'Matnli masalalar', 'I: 83', '91–96'),
    (43, 1, 3, 'Matnli masalalar', 'I: 83', '91–96'),
    (44, 1, 3, '1-CHSB (40 ball)', '', ''),
    (45, 1, 3, 'Takrorlash', 'I: 88', '98–99'),
    (46, 2, 4, "Takrorlash. Kvadrat va to'g'ri to'rtburchaklar", 'I: 90', '115–116'),
    (47, 2, 4, 'Uchburchakning asosi va balandligi', 'I: 91', '117–118'),
    (48, 2, 4, 'Uchburchakning asosi va balandligi', 'I: 91', '117–118'),
    (49, 2, 4, 'Uchburchakning yuzini topish', 'I: 96', '119–122'),
    (50, 2, 4, 'Uchburchakning yuzini topish', 'I: 96', '119–122'),
    (51, 2, 4, "To'g'ri to'rtburchak va uchburchaklardan tuzilgan murakkab shakllarning yuzi", 'I: 103', '123–134'),
    (52, 2, 4, "To'g'ri to'rtburchak va uchburchaklardan tuzilgan murakkab shakllarning yuzi. O'ylab ko'ring. Muammoli topshiriq", 'I: 103', '123–134'),
    (53, 2, 5, "Takrorlash. Kub, kuboid, hajm va sig'im", 'I: 110', ''),
    (54, 2, 5, 'Fazoviy jismlarning hajmi', 'I: 111', '139–140'),
    (55, 2, 5, "Uch o'lchamli panjarada fazoviy jismlarni chizish", 'I: 115', '141–144'),
    (56, 2, 5, "Uch o'lchamli panjarada fazoviy jismlarni chizish", 'I: 115', '141–144'),
    (57, 2, 5, "Kvadratli panjarada fazoviy jismlarning turli ko'rinishlarini chizish", 'I: 120', '145–146'),
    (58, 2, 5, "Kvadratli panjarada fazoviy jismlarning turli ko'rinishlarini chizish", 'I: 120', '145–146'),
    (59, 2, 5, 'BSB-4 (25 ball)', '', ''),
    (60, 2, 5, 'BSB tahlili', '', ''),
    (61, 2, 5, "Hajmni santimetr kub va metr kubda o'lchash", 'I: 129', '151–152'),
    (62, 2, 5, "Hajmni santimetr kub va metr kubda o'lchash", 'I: 129', '151–152'),
    (63, 2, 5, 'Kuboid va kubning hajmini topish', 'I: 123', '147–150'),
    (64, 2, 5, 'Kuboid va kubning hajmini topish', 'I: 123', '147–150'),
    (65, 2, 5, "Suyuqliklar hajmini santimetr kub va metr kubda o'lchash", 'I: 129', '151–152'),
    (66, 2, 5, "Suyuqliklar hajmini santimetr kub va metr kubda o'lchash", 'I: 129', '151–152'),
    (67, 2, 5, 'Matnli masalalar', 'I: 131', '153–160'),
    (68, 2, 5, 'Matnli masalalar', 'I: 131', '153–160'),
    (69, 2, 6, 'Nisbat tushunchasi', 'I: 140', '165–168'),
    (70, 2, 6, 'Teng kuchli nisbatlar', 'I: 146', '169–182'),
    (71, 2, 6, 'Teng kuchli nisbatlar', 'I: 146', '169–182'),
    (72, 2, 6, "Berilgan miqdor va nisbatga ko'ra boshqa miqdorni topish", 'I: 155', '183–188'),
    (73, 2, 6, "Berilgan miqdor va nisbatga ko'ra boshqa miqdorni topish", 'I: 155', '183–188'),
    (74, 2, 6, 'BSB-5 (25 ball)', '', ''),
    (75, 2, 6, 'BSB tahlili', '', ''),
    (76, 2, 6, "Berilgan jami miqdor va nisbatga ko'ra uning qismlarini topish", 'I: 157', ''),
    (77, 2, 6, "Berilgan jami miqdor va nisbatga ko'ra uning qismlarini topish", 'I: 157', ''),
    (78, 2, 6, 'Ikkita miqdorning nisbatiga doir matnli masalalar', 'I: 160', '193–200'),
    (79, 2, 6, '2-CHSB (40 ball)', '', ''),
    (80, 2, 6, 'Ikkita miqdorning nisbatiga doir matnli masalalar', 'I: 160', '193–200'),
    (81, 3, 6, 'Ikkita miqdorning nisbatiga doir matnli masalalar', 'I: 160', '193–200'),
    (82, 3, 6, 'Uchta miqdorning nisbati', 'I: 165', '189–192'),
    (83, 3, 6, 'Uchta miqdorning nisbati', 'I: 165', '189–192'),
    (84, 3, 6, 'Uchta miqdorning nisbatiga doir matnli masalalar', 'I: 168', '193–200'),
    (85, 3, 6, 'Uchta miqdorning nisbatiga doir matnli masalalar', 'I: 168', '193–200'),
    (86, 3, 7, "Takrorlash: o'nli kasrlar", 'II: 2', '1'),
    (87, 3, 7, "O'nli kasrni 10, 100 va 1000 ga ko'paytirish", 'II: 4', '5–6'),
    (88, 3, 7, "O'nli kasrni 10, 100 va 1000 ga ko'paytirish", 'II: 4', '5–6'),
    (89, 3, 7, "O'nli kasrni o'nlik, yuzlik va mingliklarga ko'paytirish", 'II: 9', '9'),
    (90, 3, 7, "O'nli kasrni o'nlik, yuzlik va mingliklarga ko'paytirish", 'II: 9', '9'),
    (91, 3, 7, "O'nli kasrni 10, 100 va 1000 ga bo'lish", 'II: 12', '13–16'),
    (92, 3, 7, "O'nli kasrni 10, 100 va 1000 ga bo'lish", 'II: 12', '13–16'),
    (93, 3, 7, "O'nli kasrni o'nliklar, yuzliklar va mingliklarga bo'lish", 'II: 17', '17–20'),
    (94, 3, 7, "O'nli kasrni o'nliklar, yuzliklar va mingliklarga bo'lish", 'II: 17', '17–20'),
    (95, 3, 7, "Takrorlash: uzunlik, massa, sig'im va hajm o'lchov birliklarini almashtirish", 'II: 2', '1'),
    (96, 3, 7, "O'lchov birliklarini almashtirish", 'II: 20', '21–26'),
    (97, 3, 7, "O'lchov birliklarini almashtirish", 'II: 20', '21–26'),
    (98, 3, 7, 'Matnli masalalar', 'II: 26', '27–36'),
    (99, 3, 7, 'Matnli masalalar', 'II: 26', '27–36'),
    (100, 3, 7, 'Matnli masalalar', 'II: 26', '27–36'),
    (101, 3, 7, 'BSB-6 (20 ball)', '', ''),
    (102, 3, 7, 'BSB tahlili', '', ''),
    (103, 3, 8, "Me'yorni topish. Loyiha ishi mavzusini e'lon qilish", 'II: 34', '41–44'),
    (104, 3, 8, "Me'yorni topish", 'II: 34', '41–44'),
    (105, 3, 8, "Me'yorga ko'ra umumiy miqdorni topish", 'II: 38', '45–50'),
    (106, 3, 8, "Me'yorga ko'ra umumiy miqdorni topish", 'II: 38', '45–50'),
    (107, 3, 8, 'Birliklar sonini topish', 'II: 43', '51–52'),
    (108, 3, 8, 'Birliklar sonini topish', 'II: 43', '51–52'),
    (109, 3, 8, 'Matnli masalalar', 'II: 46', '53–60'),
    (110, 3, 8, 'Matnli masalalar', 'II: 46', '53–60'),
    (111, 3, 8, 'Matnli masalalar', 'II: 46', '53–60'),
    (112, 3, 8, 'Matnli masalalar', 'II: 46', '53–60'),
    (113, 3, 9, 'Takrorlash: butunning qismlari', 'II: 52', '65–66'),
    (114, 3, 9, 'Foiz tushunchasi', 'II: 53', '67–68'),
    (115, 3, 9, 'Foiz tushunchasi', 'II: 53', '67–68'),
    (116, 3, 9, "Oddiy kasr, o'nli kasr va foizlar orasidagi munosabatlar", 'II: 56', '69–72'),
    (117, 3, 9, 'Miqdorning foizi', 'II: 62', '73–76'),
    (118, 3, 9, 'Miqdorning foizi', 'II: 62', '73–76'),
    (119, 3, 9, 'Matnli masalalar', 'II: 65', '77–84'),
    (120, 3, 9, 'Matnli masalalar', 'II: 65', '77–84'),
    (121, 3, 9, 'BSB-7 (20 ball)', '', ''),
    (122, 3, 9, 'BSB tahlili', '', ''),
    (123, 3, 9, "QQS (qo'shilgan qiymat solig'i), chegirma va omonat foizi", 'II: 69', '85–88'),
    (124, 3, 9, "QQS (qo'shilgan qiymat solig'i), chegirma va omonat foizi", 'II: 69', '85–88'),
    (125, 3, 9, 'BSB-8 Loyiha ishi taqdimoti va baholash (10 ball)', '', ''),
    (126, 3, 9, 'Matnli masalalar', 'II: 65', '77–84'),
    (127, 3, 9, 'Matnli masalalar', 'II: 65', '77–84'),
    (128, 3, 9, 'Matnli masalalar', 'II: 65', '77–84'),
    (129, 3, 9, '3-CHSB (40 ball)', '', ''),
    (130, 3, 9, 'Takrorlash', 'II: 77', '94–95'),
    (131, 4, 10, "O'rtacha qiymat tushunchasi", 'II: 79', '115–118'),
    (132, 4, 10, "O'rtacha qiymat tushunchasi", 'II: 79', '115–118'),
    (133, 4, 10, "Miqdorlarning o'rtacha va jami qiymati hamda soni", 'II: 83', '119–128'),
    (134, 4, 10, "Miqdorlarning o'rtacha va jami qiymati hamda soni", 'II: 83', '119–128'),
    (135, 4, 10, 'Takrorlash', 'II: 89', ''),
    (136, 4, 11, 'Takrorlash: burchaklar', 'II: 91', '131–132'),
    (137, 4, 11, "To'g'ri chiziqdagi burchaklar", 'II: 92', '133–136'),
    (138, 4, 11, "To'g'ri chiziqdagi burchaklar", 'II: 92', '133–136'),
    (139, 4, 11, 'Vertikal burchaklar', 'II: 96', '137–140'),
    (140, 4, 11, 'Vertikal burchaklar', 'II: 96', '137–140'),
    (141, 4, 11, 'Nuqta atrofidagi burchaklar', 'II: 100', '141–142'),
    (142, 4, 11, 'Nuqta atrofidagi burchaklar', 'II: 100', '141–142'),
    (143, 4, 11, "Noma'lum burchaklarni topish", 'II: 105', '143–148'),
    (144, 4, 11, "Noma'lum burchaklarni topish", 'II: 105', '143–148'),
    (145, 4, 11, "Noma'lum burchaklarni topish", 'II: 105', '143–148'),
    (146, 4, 11, "Noma'lum burchaklarni topish", 'II: 105', '143–148'),
    (147, 4, 11, 'BSB-9 (25 ball)', '', ''),
    (148, 4, 11, 'BSB tahlili', '', ''),
    (149, 4, 12, 'Uchburchakning turlari', 'II: 111', '151–154'),
    (150, 4, 12, 'Uchburchakning turlari', 'II: 111', '151–154'),
    (151, 4, 12, 'Uchburchaklarni chizish', 'II: 118', '155–156'),
    (152, 4, 12, 'Uchburchaklarni chizish', 'II: 118', '155–156'),
    (153, 4, 12, 'Uchburchaklarni chizish', 'II: 118', '155–156'),
    (154, 4, 12, 'Uchburchakning burchaklari', 'II: 123', '157–162'),
    (155, 4, 12, 'Uchburchakning burchaklari', 'II: 123', '157–162'),
    (156, 4, 12, 'Uchburchakning burchaklari', 'II: 123', '157–162'),
    (157, 4, 12, 'Uchburchakning burchaklari', 'II: 123', '157–162'),
    (158, 4, 13, "Takrorlash: kvadrat va to'g'ri to'rtburchakning xossalari", 'II: 133', '165–166'),
    (159, 4, 13, 'Parallelogramm, romb va trapetsiyaning xossalari', 'II: 134', '167–172'),
    (160, 4, 13, 'Parallelogramm, romb va trapetsiyaning xossalari', 'II: 134', '167–172'),
    (161, 4, 13, 'Parallelogramm, romb va trapetsiyaning xossalari', 'II: 134', '167–172'),
    (162, 4, 13, 'BSB-10 (25 ball)', '', ''),
    (163, 4, 13, 'BSB tahlili', '', ''),
    (164, 4, 13, "To'rtburchaklarni chizish", 'II: 144', '173–176'),
    (165, 4, 13, "To'rtburchaklarni chizish", 'II: 144', '173–176'),
    (166, 4, 13, "To'rtburchaklarni chizish", 'II: 144', '173–176'),
    (167, 4, 13, "To'rtburchakning noma'lum burchaklarini topish", 'II: 150', '177–180'),
    (168, 4, 13, "To'rtburchakning noma'lum burchaklarini topish", 'II: 150', '177–180'),
    (169, 4, 13, '4-CHSB (40 ball)', '', ''),
    (170, 4, 13, 'Takrorlash', 'II: 156', ''),
]

QUARTER_LESSONS = {1: (1, 45), 2: (46, 80), 3: (81, 130), 4: (131, 170)}


def kind_of(topic: str) -> str:
    t = topic.lower()
    if t.startswith("bsb tahlili"):
        return "tahlil"
    if "chsb" in t:
        return "chsb"
    if t.startswith("bsb"):
        return "bsb"
    if "muammoli topshiriq" in t:
        return "muammoli"
    return "dars"


ASSESSMENT_KINDS = {"bsb", "chsb"}
KIND_LABEL = {"bsb": "Bo'lim bo'yicha summativ baholash", "chsb": "Chorak bo'yicha summativ baholash",
              "tahlil": "Baholash tahlili", "muammoli": "Muammoli topshiriq", "dars": "Dars"}


def points_of(topic: str):
    m = re.search(r"\((\d+) ball\)", topic)
    return int(m.group(1)) if m else None


def template_for(chapter: int, topic: str):
    entry = TEMPLATE_TOPICS.get(chapter)
    if not entry or kind_of(topic) in ASSESSMENT_KINDS | {"tahlil"}:
        return None
    template, keys = entry
    return template if any(k in topic.lower() for k in keys) else None


def skills_for(chapter: int, topic: str):
    skills = list(CHAPTER_SKILLS.get(chapter, ["hisoblash"]))
    t = topic.lower()
    if any(k in t for k in ("matnli masala", "muammoli", "qolgan qism")):
        skills = ["tushunish", "modellashtirish", "hisoblash", "talqin"]
    return skills


def grouped():
    """Ketma-ket bir xil mavzudagi darslarni bitta reja qatoriga birlashtiradi (soat = darslar soni)."""
    out = []
    for n, q, ch, topic, tb, wb in LESSONS:
        last = out[-1] if out else None
        if last and last["title"] == topic and last["chapter"] == ch and last["quarter"] == q:
            last["hours"] += 1
            continue
        first = QUARTER_LESSONS[q][0]
        out.append({"lesson_no": n, "quarter": q, "chapter": ch, "chapter_title": CHAPTERS[ch], "title": topic, "hours": 1,
                    "week": math.ceil((n - first + 1) / 5), "kind": kind_of(topic), "points": points_of(topic),
                    "textbook": tb, "workbook": wb, "skills": skills_for(ch, topic),
                    "prerequisites": [] if kind_of(topic) in ASSESSMENT_KINDS else ["tayanch"],
                    "template": template_for(ch, topic)})
    return out


# ------------------------------------------------------------------ o'quv yili kalendari (VM 140-son qarori, 24–26-bandlar)
def school_year(d: date) -> int:
    return d.year if d.month >= 7 else d.year - 1


def year_start(d: date) -> date:
    return date(school_year(d), 9, 2)


def year_end(d: date) -> date:
    return date(school_year(d) + 1, 5, 25)


def breaks(y: int):
    """Kuzgi, qishki va bahorgi ta'til (boshlanish va tugash sanalari)."""
    return [(date(y, 11, 4), date(y, 11, 9)), (date(y, 12, 28), date(y + 1, 1, 10)), (date(y + 1, 3, 21), date(y + 1, 3, 27))]


def holidays(y: int):
    return {date(y, 10, 1): "Ustoz va murabbiylar kuni", date(y, 12, 8): "Konstitutsiya kuni",
            date(y + 1, 1, 1): "Yangi yil", date(y + 1, 3, 8): "Xalqaro xotin-qizlar kuni",
            date(y + 1, 5, 9): "Xotira va qadrlash kuni"}


def is_school_day(d: date) -> bool:
    """Ta'til va bayram kunlari chiqarib tashlanadi; hafta kunini sinf jadvali belgilaydi."""
    y = school_year(d)
    if not (date(y, 9, 2) <= d <= date(y + 1, 5, 25)):
        return False
    if d in holidays(y):
        return False
    return not any(a <= d <= b for a, b in breaks(y))


def quarters(y: int):
    def after(day):
        day += timedelta(days=1)
        while day.weekday() == 6:
            day += timedelta(days=1)
        return day

    b = breaks(y)
    return [(1, date(y, 9, 2), b[0][0] - timedelta(days=1)), (2, after(b[0][1]), b[1][0] - timedelta(days=2)),
            (3, after(b[1][1]), b[2][0] - timedelta(days=1)), (4, after(b[2][1]), date(y + 1, 5, 25))]


def quarter_of(d: date):
    qs = quarters(school_year(d))
    for no, a, b in qs:
        if a <= d <= b:
            return no, a, b
    prev = [q for q in qs if q[1] <= d]
    return prev[-1] if prev else qs[0]


def calendar_view(d: date):
    y = school_year(d)
    no, _, _ = quarter_of(d)
    return {
        "year": f"{y}–{y + 1}",
        "current_quarter": no,
        "quarters": [{"no": q, "start": a.strftime("%d.%m.%Y"), "end": b.strftime("%d.%m.%Y"),
                      "lessons": f"{QUARTER_LESSONS[q][0]}–{QUARTER_LESSONS[q][1]}"} for q, a, b in quarters(y)],
        "breaks": [{"start": a.strftime("%d.%m.%Y"), "end": b.strftime("%d.%m.%Y")} for a, b in breaks(y)],
        "holidays": [{"date": k.strftime("%d.%m.%Y"), "name": v} for k, v in sorted(holidays(y).items())],
        "source": SOURCE,
    }
