# DarsPilot — AI yordamida avtomatik baholash va feedback

**Muammo (xakaton ustuvor mavzusi №2):** o'qituvchilar ko'p vaqtini tekshirish va hujjatlarga sarflaydi.
**Yechim — dars konveyeri.** O'qituvchining har bir darsi 5 qadamdan o'tadi:
**Tayyorlash → Darsda → Tekshirish → Tahlil → Keyingi dars.** Har qadam keyingisiga ma'lumot beradi:
qog'ozli diagnostika (bitta suratdan 10 ta javob chizig'i) yoki qog'ozsiz tezkor tekshiruv → bosqichli tashxis →
AI feedback (o'quvchi, ota-ona, o'qituvchi) → formativ ball Excel'ga → e'tibor jurnali va natijalar asosida
**keyingi dars ssenariysi**. Bir nechta sinf bilan ishlaydi (select orqali almashtiriladi), rollar: o'qituvchi, direktor, ota-ona.

Darslar **haqiqiy taqvim-mavzu reja** bo'yicha boradi: "AHA! Matematika 5-sinf" (Novda Edutainment, 2024) darsligi va
2026–2027 o'quv yili rejasi (haftasiga 5 soat, 170 dars, BSB/ChSB). Reja o'qituvchining rasmiy Excel ish rejasidan,
darslik va **mashq daftari** betlari esa kitoblarning o'z mundarijasidan olingan (`darslik/` papkasi, `app/aha_plan.py`).

**Qog'oz formati.** Bitta A4 varaq 4 ta kartochkaga bo'linadi va ikkala tomoni ishlatiladi: old tomonda o'quvchining
**ismi**, masala, 1–4-savollar va **o'tgan ishdan shaxsiy feedback** ("Senga — o'tgan ishingdan"); orqa tomonda
5–7-savollar, **yechim maydoni** va ArUco markerli javob bloki (A4 ning ~1/8 qismi).
O'quvchi hech narsani yirtmaydi — kartochka butunligicha yig'ib olinadi va orqa tomoni suratga olinadi.
31 o'quvchilik sinfga bitta diagnostika = **8 varaq**.

## Baholash ikki qatlamli

1. **Yopiq javoblar — kompyuter ko'rish.** ArUco markerlar bo'yicha tekislangan javob bloki o'qiladi (7 savol);
   har katak uchun ishonch darajasi hisoblanadi, shubhali belgilar o'qituvchiga chiqadi.
2. **Qo'lda yozilgan yechim — AI rubrika bo'yicha.** Xuddi shu suratdan, xuddi shu markerlar yordamida yechim maydoni
   kesib olinadi va vizual model uni 3 mezon bo'yicha baholaydi (amal/ifoda, hisob, javob birligi — har biriga 0–2 ball).
   O'qituvchi har bahoni bir bosishda tasdiqlaydi yoki tuzatadi; tuzatishlar o'lchanadi.

**Uy vazifasi** (`mashq daftari`) ham suratdan tekshiriladi: har mashq raqami bo'yicha to'g'ri/xato va xato turi
aniqlanadi, natija keyingi dars ssenariysidagi takrorlash bosqichiga tushadi.

**BSB/ChSB** ham shu dvigatel bilan: summativ kunda har o'quvchiga o'z varianti chiqadi, natija rejadagi maksimal
ballga (15/20/25/40) nisbatan hisoblanib jurnalga tushadi.

**Ishonchlilik va ta'sir o'lchanadi:** avtomatik o'qish foizi, o'qituvchi tuzatgan kataklar, AI baholagan yechimlar,
o'zgartirilmasdan yuborilgan feedback ulushi, tejalgan vaqt va qog'oz — `/api/impact` va har sahifadagi "AI ta'siri" paneli.

## Landing sahifasi, kirish va AI yordamchi

Sayt ochilganda avval **landing sahifasi** chiqadi (`/`): muammo, dars konveyeri, ikki qatlamli baholash,
rollar va real ko'rsatkichlar (`/api/impact` dan jonli olinadi) animatsiya bilan tushuntiriladi.
Sahifadagi **AI yordamchi** (`/api/chat`) faqat mahsulot haqidagi tasdiqlangan faktlarga tayanib javob beradi —
istalgan odam kirib, tizim qanday ishlashini so'rab bilib olishi mumkin (kalitsiz — tayyor javoblar rejimi).

**Kirish va ro'yxatdan o'tish** (`/kirish`): parol PBKDF2 bilan xeshlanadi, sessiya HMAC token orqali
(`app/auth.py`). Demo hisobi: `demo@darspilot.uz` / `demo1234` — sahifadagi tugma bilan bir bosishda.
Ish stoli kirgandan keyin `/bugun` manzilida ochiladi.

## Ishga tushirish — bitta buyruq

Talab: Docker Desktop (Compose v2).

```bat
copy .env.example .env        :: OPENAI_API_KEY ni kiriting (ixtiyoriy)
docker compose up --build -d  :: yoki: run.bat
```

| Manzil | Nima |
|---|---|
| http://localhost:8080 | Ilova (React) |
| http://localhost:8080/api/docs | API hujjatlari (Swagger) |
| http://localhost:9101 | MinIO konsoli (`darspilot` / `darspilot-secret`) |

Birinchi ishga tushishda demo maktab yaratiladi: bitta o'qituvchining **3 ta parallel sinfi** (5-A, 5-B, 5-V — 29/31/28 to'qima ism),
2-sentabrdan bugungi kunga qadar jadval bo'yicha o'tgan darslar, e'tibor jurnali, tezkor tekshiruvlar va bitta baholangan diagnostika.
GPT kalitisiz ham ilova to'liq ishlaydi (shablon matnlar bilan).

Demo sanasini qotirish (masalan taqdimot uchun): `DARSPILOT_TODAY=2026-09-17` muhit o'zgaruvchisi.

Portlar band bo'lsa `.env` da o'zgartiring: `WEB_PORT=8081`, `MINIO_CONSOLE_PORT=9102`.
Ma'lumotlarni tozalab qaytadan boshlash: `docker compose down -v && docker compose up --build -d`.

## Texnologiyalar

| Qatlam | Stek |
|---|---|
| Frontend | React 19 + Vite 8 + TypeScript, Tailwind CSS 4, TanStack Query, React Router, Motion, Three.js |
| Brend | "Xiva ko'k": firuza #0A8A91, indigo #23328C, terrakota #C4572E, oltin #D9A21B; Unbounded + Onest shriftlari |
| Backend | Python 3.13, FastAPI, SQLAlchemy 2, Uvicorn |
| Ma'lumotlar bazasi | PostgreSQL 16 (alpine) |
| Fayl ombori | MinIO (S3-mos): skanerlangan suratlar va PDF varaqlar |
| Kompyuter ko'rishi | OpenCV (ArUco markerlar, perspektiva, pufakcha va son panjarasini o'qish) |
| AI | OpenAI GPT (JSON rejim, validatsiya, shablon zaxirasi) |
| Hujjatlar | ReportLab (PDF), openpyxl (Excel) |
| Infratuzilma | Docker Compose: `db`, `minio`, `minio-init`, `api`, `web` (nginx) |

```
Brauzer ──► web (nginx: React build, /api → api)
               │
               ▼
            api (FastAPI) ──► PostgreSQL 16   (sinf, o'quvchi, diagnostika, javoblar, natijalar, ssenariylar, AI jurnali)
               │         └──► MinIO           (scans/…jpg, pdf/…pdf)
               └──► OpenAI GPT                (masala matni, feedback, sinf xulosasi, dars ssenariysi)
```

## Dars konveyeri

| Qadam | Nima bo'ladi |
|---|---|
| **1. Tayyorlash** | Dars formati (qog'ozli diagnostika / qog'ozsiz tezkor tekshiruv, guruh ishi bor-yo'qligi), AI ssenariysi (8 bosqich, nomli ko'rsatmalar), tasdiqlash, kerak bo'lsa diagnostik varaqlar PDF |
| **2. Darsda** | Bosqichma-bosqich ekran: metod, o'qituvchi va o'quvchi harakatlari, nomli topshiriqlar ("Ishladim" tugmasi), **ovozli e'tibor jurnali**, guruhlar tarkibi |
| **3. Tekshirish** | Diagnostika kuni — kartochkalarning orqa tomonini skaner qilish (bitta suratda 10 tagacha); boshqa kunlari — svetofor (yashil/sariq/qizil) va qiynalgan o'quvchilarni belgilash |
| **4. Tahlil** | AI bilan baholash, bosqichli tashxis, sinf xulosasi, har o'quvchiga feedback; tezkor tekshiruvda — svetofor tahlili |
| **5. Keyingi dars** | Natija + e'tibor jurnali + guruhlar keyingi dars ssenariysiga o'tadi |

**Qog'oz masalasi.** Har darsda test — qog'oz va vaqt isrofi. DarsPilot qog'ozli diagnostikani **mavzu oxirida yoki har N darsda**
(standart: 3) rejalashtiradi, qolgan darslarda qog'ozsiz tezkor tekshiruv qiladi. "Bugun" sahifasida chorak boshidan beri
tejalgan varaqlar soni ko'rinadi (demo maktabda ~1 200 varaq).

## Demo oqimi (~3 daqiqa)

1. **Bugun** — 3 ta sinfning bugungi darslari, har birida 5 qadamli konveyer, diagnostika taqvimi va qog'oz hisobi.
2. **Dars → Tayyorlash** — format almashtirgichlari, AI ssenariysi (metod, vaqt, nomli ko'rsatmalar), diagnostik varaqlar.
3. **Dars → Darsda** — bosqichlar bo'yicha ekran, "Ishladim" belgilari va **ovoz bilan e'tibor kiritish** ("Bugun Aziza va Bekzod bilan ishladim").
4. **Dars → Tekshirish** — telefon surati yoki printersiz **Demo surat**; qog'ozsiz kunda — svetofor.
5. **Dars → Tahlil** — AI baholash, bosqichlar bo'yicha foiz, xato turlari, har o'quvchiga feedback, Excel.
6. **Dars → Keyingi dars** — bitta tugma bilan keyingi dars ssenariysi.
7. **Sinf xaritasi** ("sinf orbitasi": radius — e'tibor, balandlik — o'zlashtirish; + issiqlik xaritasi), **Baholar jurnali**
   (dars × o'quvchi ballari; diagnostikadan avtomatik tushadi), **O'quv dasturi** (real reja, darslik va mashq daftari betlari),
   **Hisobotlar** (haftalik AI-xulosa, ota-onalar), **Direktor paneli**, **Ota-ona kabineti** (rozilik bilan), **AI jurnali**.

Video yozish uchun AI overleyini darhol ochish: `http://localhost:8080/?fxdemo=grade` (`create`, `scan`, `demo`, `lesson`, `report`).

## Docx talablari qamrovi (13.1 va 21.1-bo'limlar)

| Talab | Holat |
|---|---|
| FR-02 O'quvchi qo'shish (qo'lda, Excel/CSV) · FR-03 neytral kod | Ishlaydi |
| FR-04/05 Taqvim-mavzu reja importi (PDF/DOCX/XLSX → AI → tasdiq), ko'nikmalar xaritasi | Ishlaydi (rasm OCR — keyin) |
| FR-06/07 Ssenariy generatsiyasi va tahrirlash, tuzatishlar afzallik sifatida | Ishlaydi |
| FR-08 Dars ishlanmasi / texnologik xarita eksporti | PDF |
| FR-09/10 Metodlar kutubxonasi, o'z metodini qo'shish (AI kartochka → tasdiq) | Ishlaydi |
| FR-12…17 4 darajali masala, PDF varaqlar, skaner, tasdiqlash, tashxis, o'quvchi modeli | Ishlaydi |
| FR-18/19 E'tibor jurnali (o'rindiqlar, ssenariy ichida), N sozlanadi | Ishlaydi |
| FR-20 Aralash guruhlar va qismlar · FR-21 Sinf paneli, o'quvchi profili | Ishlaydi |
| FR-22 Haftalik AI-xulosa · FR-23 Formativ ball eksporti | Ishlaydi |
| FR-24 Direktor paneli | Ishlaydi (barcha sinflar: o'zlashtirish, formativ reja, e'tibor qamrovi, ssenariy ulushi) |
| FR-25 Ota-ona kabineti | Ishlaydi (havola + elektron rozilik; Telegram yuborish — pilotda) |
| Ovozli e'tibor jurnali (9.4) | Ishlaydi (nutq → matn → sinf ro'yxati bilan moslash → o'qituvchi tasdig'i) |
| FR-01 Kirish va rollar · FR-26 Telegram-bot · FR-28 Offline · FR-30 Audit | Keyingi bosqich |

## Loyiha tuzilmasi

| Fayl | Vazifasi |
|---|---|
| `app/main.py` | FastAPI JSON API (`/api/...`) |
| `app/service.py` | Biznes-mantiq: diagnostika, skaner, baholash, ssenariy, panel, eksport |
| `app/models.py`, `app/db.py` | SQLAlchemy modellari va ulanish |
| `app/storage.py` | MinIO (yoki lokal papka) fayl ombori |
| `app/problems.py` | Parametrik masala generatori; har bir noto'g'ri variant aniq xato turiga bog'langan |
| `app/layout.py`, `app/pdfgen.py` | Javob bloki geometriyasi va kartochkalar PDF (A4 da 4 ta, duplex) |
| `app/omr.py` | Bitta suratdan bir nechta javob blokini o'qish |
| `app/grading.py` | Baholash, tashxis qoidalari, ko'nikma ballari |
| `app/scenario.py`, `app/methods.py` | Ustuvorlik bali, guruhlar, 8 bosqichli ssenariy, 37 ta metod |
| `app/llm.py` | OpenAI: masala matni, feedback, xulosalar, ssenariy, metod kartochkasi, o'quv dasturi |
| `app/reports.py`, `app/curriculum_plan.py`, `app/lessonpdf.py` | Hisobotlar, taqvim-mavzu reja importi, dars ishlanmasi PDF |
| `app/aha_plan.py` | "AHA! Matematika 5-sinf" taqvim-mavzu rejasi (170 dars), darslik/mashq daftari betlari, o'quv yili kalendari |
| `app/conveyor.py` | Dars konveyeri: jadval, dars formati, 5 qadam holati, ovozli e'tibor (ism moslash) |
| `app/clock.py` | Joriy sana (`DARSPILOT_TODAY` bilan qotiriladi) |
| `app/simulate.py`, `app/seed.py` | Sun'iy telefon surati va demo maktab (3 sinf) |
| `web/src/pages/*` | Sahifalar: Bugun, Darslar konveyeri, Dars (5 qadam), Sinf xaritasi, O'quv dasturi, Metodlar, Hisobotlar, Direktor paneli, Ota-ona kabineti, AI jurnali |
| `web/src/components/lesson/*` | Konveyer qadamlari, ssenariy muharriri, ovozli e'tibor jurnali |
| `web/src/components/fx/*` | Three.js sahnalari: sinf orbitasi, bilim oqimi, AI overleyi |
| `web/scripts/make-brand-assets.mjs` | Brend: xotam yulduzi logotipi va girih naqshi |

## Docker'siz ishlab chiqish

```bat
python -m venv .venv
.venv\Scripts\pip install -r requirements-dev.txt
set DATABASE_URL=sqlite:///data/dev.db
set MINIO_ENDPOINT=
.venv\Scripts\python -m uvicorn app.main:app --port 8000

cd web
npm install
npm run dev                   :: http://localhost:5173 (/api → 8000 ga proksi)
```

Testlar (SQLite va lokal ombor bilan, tashqi servislarsiz): `.venv\Scripts\python -m pytest -q`
Frontend tekshiruvi: `cd web && npm run build && npm run lint`
GPT kalitini tekshirish: `.venv\Scripts\python scripts\check_openai.py`

## GPT qanday ishlatiladi

Hamma chaqiruvlar `app/llm.py` dagi `call_json()` orqali o'tadi (`response_format={"type": "json_object"}`).

1. **Masala matni** (`write_story`). Kod sonlarni tanlaydi va javobni hisoblaydi, AI faqat shartni qayta yozadi.
   Matndagi barcha sonlar ruxsat etilganlariga teng bo'lishi, shaharlar masofaga mos juftlikdan olinishi shart,
   aks holda shablon matn qoladi. Shuning uchun AI "noto'g'ri javob" chiqara olmaydi.
2. **Feedback** (`student_feedback`). Ism emas, faqat kod va bosqichlar natijasi yuboriladi. Tezkor model, 10 tadan paket.
2a. **Ovozli e'tibor** (`transcribe`). Ovoz matnga aylantiriladi (saqlanmaydi), ismlar **kod ichida** sinf ro'yxati bilan
   solishtiriladi (transliteratsiya va qo'shimchalar hisobga olinadi), o'qituvchi tasdiqlaydi.
3. **Sinf xulosasi** (`class_summary`). Faqat agregat statistika.
4. **Dars ssenariysi** (`compose_lesson`). Nomzod metodlar va ustuvor o'quvchilar kodlari; javob `scenario.finalize` validatoridan o'tadi.

Har bir chaqiruv `llm_calls` jadvaliga yoziladi va **AI jurnali** sahifasida ko'rinadi.

## Maxfiylik

- LLM ga o'quvchi ismlari yuborilmaydi, faqat kodlar.
- Javob chiziqlarida ism o'qilmaydi; o'quvchi kodni jurnal raqami bo'yicha oladi.
- `.env`, `data/`, `web/node_modules/`, `web/dist/` git'ga kirmaydi (`.gitignore`).
