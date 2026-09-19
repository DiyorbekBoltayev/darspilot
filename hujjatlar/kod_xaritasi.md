# DarsPilot — kod xaritasi va texnologiyalar

Bu hujjat mentor bilan suhbat uchun: **savol berilganda qaysi faylni ochish kerakligini** darrov topish uchun.
Har bir manzil `fayl:satr` ko'rinishida — muharrirda shu joyga sakrash mumkin.

---

## 1. Texnologiyalar va nega aynan shular

### Backend — Python 3.13 + FastAPI

Bitta tilda **uchta og'ir ish** bajarilishi kerak edi, va Pythonda uchalasi ham eng kuchli:

| Ish | Kutubxona | Nega Python |
|---|---|---|
| Kartochka suratini o'qish (kompyuter ko'rish) | OpenCV + ArUco | OpenCV ning asosiy API si C++ va Python; Node.js da bu darajadagi ArUco/ CV yechimi yo'q |
| AI chaqiruvlari (matn, surat, ovoz) | `openai` SDK | Rasmiy SDK, JSON rejim, vision va transkripsiya bir joyda |
| Bosma varaq (PDF) millimetrli aniqlikda | ReportLab + pymupdf | Millimetr darajasida joylashuv va marker chizish kerak — ReportLab shunga mos |

Agar backend boshqa tilda bo'lganida, skanerlash uchun alohida Python xizmati kerak bo'lardi — ikkita tizim, ikki
barobar deploy. Hozir **bitta jarayon**: surat kelganda o'sha yerda o'qiladi.

FastAPI tanlanishi: async I/O (AI chaqiruvi uzoq davom etadi, server bloklanmaydi), `/api/docs` da avtomatik
hujjat, Pydantic bilan so'rov validatsiyasi.

### Ma'lumotlar bazasi — PostgreSQL 16 + SQLAlchemy 2

AI javoblari (mashqlar ro'yxati, rubrika ballari, ssenariy bosqichlari) tuzilishi o'zgaruvchan — ular **JSONB**
ustunlarda saqlanadi, qolgani odatdagi jadvallar. Testlarda xuddi shu kod SQLite bilan ishlaydi (`app/db.py`).

### Frontend — React 19 + TypeScript (strict) + Vite + Tailwind 4

- TypeScript **strict** — API javoblarining tuzilishi `web/src/lib/types.ts` da qat'iy yozilgan, backend o'zgarsa
  kompilyatsiya xato beradi.
- TanStack Query — server holati keshi va fon yangilanishi (uy vazifasi tekshiruvi fonda ketayotganda ro'yxat
  o'zi yangilanadi).
- motion (Framer Motion) va three.js — AI ishlayotgan paytdagi vizual va sinf galaktikasi; three.js **alohida
  chunk** bo'lib, faqat kerak bo'lganda yuklanadi.

### Infratuzilma

Docker Compose: `db` (PostgreSQL) + `api` (FastAPI/uvicorn) + `web` (nginx, statik build va `/api` proxy).
Surat/PDF fayllari MinIO (S3) yoki lokal papkada (`app/storage.py` — ikkalasi bitta interfeys).

---

## 2. So'rov qayerdan qayerga boradi

```
Brauzer (React)
   │  web/src/lib/api.ts  — barcha HTTP chaqiruvlar shu yerda
   ▼
nginx (web konteyneri)  →  /api/* ni api konteyneriga uzatadi
   ▼
app/main.py             — endpointlar: validatsiya, fayl o'qish, xatoni HTTP kodga aylantirish
   ▼
app/service.py          — diagnostika, baholash, uy vazifasi biznes mantig'i
app/conveyor.py         — dars konveyeri (5 qadam), ovozli funksiyalar
   ▼
app/omr.py (surat o'qish) · app/llm.py (AI) · app/pdfgen.py (PDF) · app/models.py (baza)
```

`app/main.py` da mantiq yo'q — u faqat "qabul qiluvchi qavat". Og'ir ishlar `run_in_threadpool` orqali
alohida oqimda bajariladi (`app/main.py:37`).

---

## 3. Mentor savol bersa — qaysi faylni ochaman

| Savol | Fayl:satr | Nima ko'rsataman |
|---|---|---|
| **«Suratning qaysi qismini analiz qilyapsiz?»** | `app/omr.py:210` `scan_image` | Butun oqim: kattalikni kamaytirish → kulrangga o'tkazish → ArUco markerlarni topish → har chiziqni o'qish |
| «Kartochkani qanday topasiz?» | `app/omr.py:44` `_detect` | Har javob blokining 4 burchagida ArUco marker; markerlar ID si jurnal raqamini beradi |
| «Bitta burchak ko'rinmasa?» | `app/omr.py:61` `_from_three`, `:85` `_complete` | 3 ta markerdan 4-chisi hisoblab topiladi |
| «Doiracha to'ldirilganini qanday bilasiz?» | `app/omr.py:123` `_bubble_ink`, `:128` `_choose` | Doiracha atrofida 9 nuqtada siyoh zichligi; chegara har suratga moslashadi (mediana va 97-protsentil) |
| «Qo'lda yozilgan yechimni kim baholaydi?» | `app/llm.py:592` `grade_solution` | Yechim maydoni kesib olinadi va vision model rubrika bo'yicha 3 mezonga ball qo'yadi |
| «Rubrika qayerda?» | `app/llm.py:553` `RUBRIC` | 3 mezon × 2 ball = 6 ball: ifoda, hisob, javob |
| **«Uy vazifasini qanday tekshiradi?»** | `app/service.py:1030` `check_homework` → `:1102` `analyze_homework` | Surat saqlanadi, javob darhol qaytadi, tahlil **fonda** ketadi |
| «Kartochka rasmini uy vazifasi deb qabul qilmaydimi?» | `app/service.py:1108` (ArUco tekshiruvi) + `app/llm.py:640` | Avval markerlar qidiriladi (kartochka bo'lsa darhol rad), keyin AI sahifa turini aniqlaydi |
| «AI javobiga ishonasizmi?» | `app/llm.py:656` va `app/service.py:1141` | Har javob tekshiriladi; noto'g'ri tuzilish bo'lsa `None`, o'qituvchi qo'lda kiritadi |
| «Ovozdan ismni qanday topasiz?» | `app/conveyor.py:436` `match_names` | **AI emas** — kirill→lotin, o'zbekcha qo'shimchalarni tozalash, `difflib` bilan 0.84 o'xshashlik |
| «Ovozli dars tahlili?» | `app/conveyor.py:553` → `app/llm.py:492` `lesson_debrief` | Ovoz → matn → JSON xulosa (yaxshi/qiyinchilik/o'quvchilar/keyingi dars) |
| «Varaqni kim chizadi?» | `app/pdfgen.py:124` `_card_front`, `:191` `_answer_block` | Old tomon — savollar, orqa — javob bloki; qirqish chiziqlari `:104` |
| «O'lchamlar qayerdan?» | `app/layout.py` | Geometriyaning **yagona manbasi**: PDF ham, skaner ham, simulyator ham shu fayldan o'qiydi; `safety_report()` chekkalarni tekshiradi |
| «Masalalar tayyormi yoki generatsiya?» | `app/problems.py:108` `gen_qarama_qarshi` | Har o'quvchiga 4 daraja bo'yicha alohida sonlar; javoblar kod bilan tekshiriladi |
| «Dars ssenariysi qanday tuziladi?» | `app/scenario.py:60` `priority` → `app/llm.py:334` | Avval kod kim bilan ishlash kerakligini hisoblaydi, keyin AI 8 bosqichli ssenariy yozadi |
| «Baho qanday qo'yiladi?» | `app/grading.py:9` `grade` | Test javoblari + ochiq yechim ballari → bosqichli tashxis |
| «Direktor hisoboti?» | `app/reports.py:118` `director_panel` | Sinflar kesimi, ssenariy ulushi, e'tibor jurnali |
| «AI qancha ishlatilgan, qancha turdi?» | `app/llm.py:_log` → `LlmCall` jadvali → `/ai` sahifasi | Har chaqiruv yozib boriladi: maqsad, model, soniya, xato |
| «Demo ma'lumotlar qayerdan?» | `app/seed.py` | 3 sinf, 88 o'quvchi, o'quv yili boshidan bugungacha darslar |
| «Printer yo'q bo'lsa demoni qanday ko'rsatasiz?» | `app/simulate.py:146` `make_photo`, `:205` `make_homework_page` | Sun'iy "telefon surati" va mashq daftari sahifasi — haqiqiy skaner/AI yo'lidan o'tadi |

---

## 4. Backend fayllari — har biri nima qiladi

| Fayl | Satr | Vazifasi |
|---|---|---|
| `app/main.py` | 654 | Barcha HTTP endpointlar (≈80 ta). Mantiq yo'q — chaqiradi va xatoni HTTP kodga aylantiradi |
| `app/service.py` | 1435 | Asosiy biznes mantiq: diagnostika, skanerlash, baholash, uy vazifasi, jurnal, eksport |
| `app/conveyor.py` | 564 | Dars konveyeri: 5 qadam, jadval, tezkor tekshiruv, ovozli e'tibor va dars tahlili |
| `app/llm.py` | 673 | AI ning **hamma** chaqiruvi: masala matni, feedback, ssenariy, vision baholash, transkripsiya |
| `app/omr.py` | 251 | Kompyuter ko'rish: ArUco, perspektivani tekislash, doirachalarni o'qish |
| `app/problems.py` | 618 | Masala generatori (4 daraja, chalg'ituvchi javoblar, xato turlari) |
| `app/pdfgen.py` | 377 | Bosma varaq va kartochkalar (ReportLab) |
| `app/layout.py` | 104 | Kartochka geometriyasi — PDF, skaner va simulyator uchun yagona manba |
| `app/scenario.py` | 421 | Ssenariy uchun ma'lumot tayyorlash: kim bilan ishlash, guruhlar, vaqt |
| `app/models.py` | 301 | Baza jadvallari (SQLAlchemy) |
| `app/db.py` | 97 | Ulanish, sessiya, yengil migratsiya (`_add_missing_columns`) |
| `app/storage.py` | 77 | Fayl ombori: MinIO yoki lokal papka (bitta interfeys) |
| `app/auth.py` | 137 | Ro'yxatdan o'tish/kirish: PBKDF2-SHA256 200k + HMAC token |
| `app/chat.py` | 136 | Landing sahifasidagi chatbot (faqat mahsulot faktlari asosida) |
| `app/reports.py` | 258 | Haftalik xulosa, direktor paneli, ota-ona hisoboti |
| `app/aha_plan.py` | 363 | AHA! darsligi bo'yicha 170 darslik taqvim-mavzu reja, chorak va ta'tillar |
| `app/curriculum_plan.py` | 175 | Reja mavzularini darslarga bog'lash |
| `app/curriculum.py` | 83 | O'quv dasturi faylini (Excel/PDF) o'qib mavzularga ajratish |
| `app/methods.py` | 123 | Metod kartotekasi (faol metodlar) |
| `app/grading.py` | 87 | Ball va bosqichli tashxis hisobi |
| `app/simulate.py` | 226 | Demo suratlar: kartochkalar va mashq daftari sahifasi |
| `app/seed.py` | 387 | Demo ma'lumotlar (3 sinf, darslar tarixi, natijalar) |
| `app/lessonpdf.py` | 81 | Ssenariyni PDF qilib chiqarish |
| `app/clock.py` | 32 | Sana/vaqt (Toshkent), demo uchun `DARSPILOT_TODAY` |
| `app/config.py` | 44 | Sozlamalar (.env dan) |

---

## 5. Sahifalar (frontend)

Yo'l → fayl → nima ko'rsatadi:

| Yo'l | Fayl | Mazmuni |
|---|---|---|
| `/` | `pages/Landing.tsx` | Animatsiyali landing: muammo, yechim, chatbot |
| `/kirish` | `pages/Auth.tsx` | Kirish va ro'yxatdan o'tish |
| `/bugun` | `pages/Today.tsx` | Bugungi darslar, har biri qaysi qadamda |
| `/darslar` | `pages/Lessons.tsx` | Sinf darslari ro'yxati va formatlari |
| **`/dars/:id`** | `pages/Lesson.tsx` | **Asosiy sahifa** — 5 qadamli konveyer |
| `/sinf` | `pages/ClassMap.tsx` | Sinf galaktikasi (3D), e'tibor jurnali |
| `/baholar` | `pages/Grades.tsx` | Baholar jurnali |
| `/oquvchi/:id` | `pages/Student.tsx` | O'quvchi profili, ko'nikma radar |
| `/diagnostika/:id` | `pages/DiagnosticDetail.tsx` | Varaqlar, skaner, javoblar |
| `/diagnostika/:id/natijalar` | `pages/Results.tsx` | Har o'quvchi bahosi va feedbacki |
| `/metodlar` | `pages/Methods.tsx` | Metod kartotekasi, o'z metodini qo'shish |
| `/dastur` | `pages/Curriculum.tsx` | Taqvim-mavzu reja |
| `/hisobotlar` | `pages/Reports.tsx` | Haftalik AI xulosa |
| `/direktor` | `pages/Director.tsx` | Direktor paneli |
| `/ota-ona`, `/ota-ona/:token` | `pages/ParentPicker.tsx`, `ParentPortal.tsx` | Ota-ona havolasi va portali |
| `/ai` | `pages/AiLog.tsx` | AI chaqiruvlari jurnali (shaffoflik) |

### Dars sahifasining qadamlari (`web/src/components/lesson/`)

| Qadam | Komponent | Nima bo'ladi |
|---|---|---|
| Tayyorlash | `PrepareStep.tsx` + `PlanEditor.tsx` | AI ssenariysi, uni tahrirlash, varaq chiqarish |
| Darsda | `ClassStep.tsx` + `VoiceAttention.tsx` | 8 bosqich bo'yicha yurish, ovozli e'tibor jurnali |
| Tekshirish | `CheckStep.tsx` + `diagnostic/ScanPanel.tsx` + `HomeworkPanel.tsx` | Kartochkalarni skanerlash, uy vazifasini suratdan tekshirish |
| Tahlil | `AnalysisStep.tsx` + `VoiceDebrief.tsx` | Raqamli tahlil + o'qituvchining ovozli xulosasi |
| Keyingi dars | `NextStep.tsx` | Natijalar keyingi ssenariyga o'tadi |

---

## 6. Uchta asosiy oqim (demoda ko'rsatiladigan)

### A. Kartochka surati → baho (AI + kompyuter ko'rish birga)

```
Telefon surati
 → app/service.py:402 process_photo         (surat saqlanadi)
 → app/omr.py:210 scan_image                 (ArUco → tekislash → doirachalar)   ← KOD, AI emas
 → app/omr.py:197 crop_solution              (qo'lyozma yechim maydoni kesiladi)
 → app/llm.py:592 grade_solution             (vision model rubrika bo'yicha baholaydi)  ← AI
 → app/grading.py:9 grade                    (test + ochiq yechim = bosqichli tashxis)
 → app/llm.py:281 student_feedback           (o'quvchi, ota-ona, o'qituvchi uchun matn)  ← AI
```
Nega ikki qavat: doirachalarni AI ga bermaymiz — kod 100% aniq va tekin o'qiydi; AI faqat
**qo'lyozma yechim** kabi kod eplay olmaydigan joyda ishlatiladi.

### B. Mashq daftari surati → tekshiruv

```
Telefon surati
 → app/service.py:1030 check_homework        (saqlanadi, javob darhol qaytadi)
 → fon oqimi (ThreadPoolExecutor)
   → app/omr.py:210 scan_image               (markerlar bormi? bor bo'lsa — bu kartochka, rad etiladi)
   → app/llm.py:640 check_homework           (vision: sahifa turi + har mashq to'g'ri/xato + izoh)  ← AI
 → o'qituvchi tasdiqlaydi → jurnalga o'tadi
```

### C. Ovoz → tuzilgan xulosa

```
Mikrofon (MediaRecorder, webm/opus)
 → app/llm.py:451 transcribe                 (ovoz → matn)  ← AI
 → e'tibor uchun:  app/conveyor.py:436 match_names   (ismlar — sof kod, difflib)
 → tahlil uchun:   app/llm.py:492 lesson_debrief     (matn → JSON xulosa)  ← AI
```

---

## 7. Ma'lumotlar bazasining asosiy jadvallari (`app/models.py`)

`classes` → `students` → `lessons` (konveyer birligi) → `diagnostics` → `responses` (o'qilgan javoblar) →
`results` (baho va feedback). Yon jadvallar: `homework` (daftar tekshiruvi), `attention` (e'tibor jurnali),
`lesson_plans` (ssenariy), `curriculum_topics` (reja), `scans` (yuklangan suratlar), `llm_calls` (AI jurnali),
`users`, `grades`.

Yangi ustun qo'shilganda `app/db.py:54 NEW_COLUMNS` ga yoziladi va ishga tushganda `ALTER TABLE` bilan
qo'shiladi — demo bazasi buzilmaydi.

---

## 8. Xavfsizlik va demo rejimi

- Parollar: PBKDF2-SHA256, 200 000 iteratsiya (`app/auth.py:49`).
- Bazani tozalaydigan amallar (`/api/demo/reset`, `/api/curriculum/reset`) **kirishni talab qiladi**
  (`app/main.py:192 require_user`) — sayt ochiq internetda turgani uchun.
- Ovoz saqlanmaydi, faqat matnga aylantiriladi.
- Ota-ona portali — faqat maxsus token bilan, ismlar ko'rsatilmaydi.
- AI ga o'quvchi **ismi yuborilmaydi** — faqat kod (`5B-07`) va statistika.

## 9. Ishga tushirish

```
docker compose up -d --build      # db + api + web
http://localhost:8080             # web
http://localhost:8000/api/docs    # API hujjati
pytest -q                         # 47 test
```
Demo serverda: `https://darspilot.com` · kirish `demo@darspilot.uz` / `demo1234`.
