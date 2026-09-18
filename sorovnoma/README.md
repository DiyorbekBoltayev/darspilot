# So'rovnomani Google Form sifatida yaratish

Bu papkada:

| Fayl | Nima |
|---|---|
| `DarsPilot_oqituvchilar_sorovnomasi.md` | Savollar matni (o'qish, tahrirlash va taqdimotga qo'yish uchun) |
| `google_form_yaratish.gs` | Google Apps Script — formani **o'zi yaratadi** (30 ta savol, 6 bo'lim, javoblar jadvali bilan) |

## Nima kerak

1. **Google hisobi** (gmail bo'lsa bo'ldi). Boshqa hech narsa kerak emas — to'lov, API kalit yoki qo'shimcha
   dastur talab qilinmaydi.
2. Brauzer va ~2 daqiqa vaqt.

## Qadamlar (2 daqiqa)

1. <https://script.google.com> ga kiring → **New project**.
2. Ochilgan `Code.gs` ichidagi hamma narsani o'chirib, `google_form_yaratish.gs` faylining **butun mazmunini**
   nusxalab qo'ying va saqlang (Ctrl+S).
3. Yuqoridagi funksiya ro'yxatidan **`yaratSorovnoma`** ni tanlang → **Run**.
4. Birinchi marta Google ruxsat so'raydi: *Review permissions* → hisobingizni tanlang →
   "Google hasn't verified this app" chiqsa → **Advanced** → **Go to … (unsafe)** → **Allow**.
   (Bu o'z hisobingizda o'z skriptingizni ishga tushirish uchun oddiy holat — skript faqat forma va jadval yaratadi.)
5. Pastdagi **Execution log** da 4 ta havola chiqadi:
   - **To'ldirish havolasi** — o'qituvchilarga yuboriladigani;
   - **Qisqa havola** (`forms.gle/…`) — Telegramga qulay;
   - **Tahrirlash havolasi** — faqat o'zingiz uchun;
   - **Javoblar jadvali** — Google Sheets, javoblar avtomatik tushadi.

## Keyin nima qilish kerak

- **Tekshirib chiqing:** formani bir marta o'zingiz to'ldiring — savollar tartibi va majburiy bandlar to'g'rimi.
- **Sozlash (ixtiyoriy):** formani ochib, rang va sarlavha rasmini brendga moslang (firuza rang).
- **Tarqatish:** viloyat metod birlashmalari, maktab direktorlari, o'qituvchilar Telegram guruhlari,
  tanish o'qituvchilar. Xabar matni: *"Matematika o'qituvchilari uchun 6 daqiqalik so'rovnoma —
  tekshirish ishini yengillashtiradigan vosita ustida ishlayapmiz, fikringiz kerak."*
- **Maqsad:** CP2 ga qadar ≥ 30, pitchgacha ≥ 50 javob.

## Javoblarni qanday o'qiymiz

Jadval to'lgach, quyidagi kesimlar taqdimotga tayyor raqam beradi:

- 14-savol (jadval) — har bir imkoniyatning o'rtacha bali → **eng kerakli 3 ta funksiya**;
- 6, 8, 16, 21-savollar — uy vazifasi skanerining qiymati (vaqt × chastota);
- 19, 20, 22-savollar — **"AI baho qo'yadi, o'qituvchi tasdiqlaydi"** modeliga ishonch;
- 24–26-savollar — kim to'lashga tayyor va qancha;
- 27, 28-savollar — pilot hamkorlar ro'yxati (aloqa bilan);
- 29-savol — NPS; 30-savol — iqtiboslar (pitch uchun).

Javoblar kelgandan keyin jadval havolasini bering — tahlilni va pitchga tayyor xulosalarni tayyorlab beraman.

## Agar Apps Script ishlatmoqchi bo'lmasangiz

`DarsPilot_oqituvchilar_sorovnomasi.md` dagi savollarni Google Formsda qo'lda ham kiritish mumkin
(~25 daqiqa). Tartib bir xil: 6 bo'lim, 3-bo'limdagi baholash — "Ko'p tanlovli jadval" (grid) tipida,
23 va 29-savollar — "Chiziqli shkala" (1–5 va 0–10).
