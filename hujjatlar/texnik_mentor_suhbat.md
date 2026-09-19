# CP2 — texnik mentor bilan suhbat (Fractal · DarsPilot)

Ishchi hujjat: suhbat paytida ochib turiladi. Har bir raqam va `fayl:satr` koddan tekshirilgan (19-sentabr).
Mentor: **Sanjar Barakayev** — Frontend Team Lead, Vue/Nuxt/TS, enterprise va davlat mahsulotlari.
CP2 yakuniy balning **60%** ini beradi, shuning uchun asosiy urg'u — **CP1 dan keyin nima o'zgardi**.

## Ochilish (20 soniya)

> "Fractal, DarsPilot. Ta'lim treki, **2-ustuvor mavzu — avtomatik baholash va feedback** (shuning uchun
> ustuvor mavzu bali ham bizga tegishli). CP1 dan keyin bitta katta qaror qabul qildik: **kartochkadan
> qo'lda yoziladigan yechim maydonini butunlay olib tashladik**. Endi javobni **faqat kod** o'qiydi,
> AI esa masala matni, feedback va daftar tekshiruvida ishlaydi. Hoziroq ko'rsataman."

## 10 daqiqalik reja

| Vaqt | Nima | Nimani ochib turaman |
|---|---|---|
| 0:00–0:30 | Ochilish + "CP1 dan keyin 3 ta o'zgarish" | shu hujjatning "CP2 da nima yangi" bo'limi |
| 0:30–2:30 | **Jonli demo:** dars → kartochka PDF → surat → 10 ta ish o'qildi → feedback | `localhost:8080/dars/:id` |
| 2:30–3:30 | **Uy vazifasi:** mashq daftari beti ko'rinadi → surat → fonda AI → o'qituvchi tasdiqlaydi | `HomeworkPanel` |
| 3:30–4:30 | **Ovozli tahlil:** 20 soniya gapirish → tuzilgan xulosa | `VoiceDebrief` |
| 4:30–6:00 | Arxitektura: 5 konteyner, kod/AI chegarasi, `app/layout.py` yagona geometriya | shu hujjat, 1-bo'lim |
| 6:00–7:00 | Kod sifati: 47 test, `npm run check` 0 xato, **CI hali yo'q** — halol aytamiz | terminal |
| 7:00–9:00 | **Savollar** | shu hujjat, "Mentor savol bersa" |
| 9:00–10:00 | Undan so'raymiz (pastda 3 ta savol) | — |

> Demo brauzerda oldindan ochiq tursin. Internet yo'q bo'lsa: AI kalitsiz ham tizim shablon matnlar bilan
> to'liq ishlaydi (`app/llm.py:22 enabled`), demo qulamaydi.

---

# 1) Texnik amalga oshirish

**U nimani qidiradi:** zanjir uchidan-uchiga ishlaydimi, qaysi qadam kod, qaysi qadam AI.

## Uchidan-uchiga zanjir: 13 qadam

| # | Qadam | Kim bajaradi | Fayl:satr |
|---|---|---|---|
| 1 | Taqvim-mavzu rejadan bugungi dars va mavzu | KOD | `app/aha_plan.py:65 LESSONS` (170 dars), `app/curriculum_plan.py:50` |
| 2 | Dars formati: diagnostika kunimi, guruh ishimi | KOD | `app/conveyor.py:47 plan_format` |
| 3 | Har o'quvchiga 4 darajadan biri, sonlar va distraktorlar | KOD | `app/problems.py:600 generate`, `:44 _mc` |
| 4 | Masala shartini hayotiy matnga aylantirish (4 daraja parallel) | **AI** | `app/llm.py:124 write_story`, `:198 enrich_problems` |
| 5 | AI matnini tekshirish: ortiqcha son yo'qmi, shahar juftligi masofaga mosmi | KOD | `app/llm.py:157`, `:169`, `:120 place_pairs` |
| 6 | A4 → 4 ta A6 kartochka, javob bloki, ArUco markerlar | KOD | `app/pdfgen.py`, `app/layout.py:23 MARKER_POS` |
| 7 | Telefon surati omborga tushadi (navbat) | KOD | `app/service.py:362 store_photo` |
| 8 | ArUco → perspektivani tekislash → doirachalarni o'qish | KOD | `app/omr.py:196 scan_image` |
| 9 | Baho, bosqichli tashxis, asosiy xato kodi | KOD | `app/grading.py:9 grade` |
| 10 | O'quvchi / ota-ona / o'qituvchi uchun matn | **AI** | `app/llm.py:281 student_feedback` |
| 11 | Jurnal bali (formativ 0–10 yoki BSB max) | KOD | `app/grading.py:69 formative_points` |
| 12 | Uy vazifasi: mashq daftari beti suratdan tekshiriladi | **AI (vision)** | `app/llm.py:570 check_homework` |
| 13 | Ovozli dars tahlili → tuzilgan xulosa → keyingi dars ssenariysi | **AI** + KOD | `app/conveyor.py:534`, `app/llm.py:344 compose_lesson` |

**Asosiy tamoyil (`app/llm.py:4` izohi):** *"LLM hech qachon sonlarni va to'g'ri javobni hal qilmaydi
(bular kodda). U faqat matn yozadi."* — 13 qadamdan **9 tasi sof kod**, AI 4 joyda.

## Aniq raqamlar

| Nima | Qiymat | Qayerdan |
|---|---|---|
| Bitta suratdagi kartochkalar | 10 tasi 7/7 katakdan xatosiz o'qiladi | `tests/test_core.py:45 test_omr_roundtrip_ten_cards` |
| Bitta kartochkadagi katak | 6 ta test doirachasi (A–D) + 4 ustunli son panjarasi = **7 javob** | `app/layout.py:41`, `:58` |
| Suratni tekislash aniqligi | 12 piksel / mm | `app/layout.py:72 PX_PER_MM` |
| Kirish surati chegarasi | uzun tomoni 4200 px gacha kichraytiriladi | `app/omr.py:200` |
| Jurnal raqamlari | 1–61 (marker id = jurnal × 4 + burchak) | `app/layout.py:33 MAX_JOURNAL_NO`, `app/omr.py:50` |
| Uy vazifasi | bitta o'quvchiga ko'pi bilan 6 bet | `app/service.py:1006`, `app/llm.py:585` |
| Demo bazasi | 3 sinf, 88 o'quvchi (29 + 31 + 28) | `app/seed.py:44 CLASSES` |
| AI chaqiruvi qancha turdi | har chaqiruv soniyasi bilan yoziladi va `/ai` sahifasida ko'rinadi | `app/llm.py:34 _log`, `:87` |

**Ishonchlilik o'lchanadi, aytilmaydi:** `app/service.py:582 scan_quality` — nechta katak avtomatik o'qildi
(`auto_pct`), nechtasi tuzatildi (`accuracy_pct`), feedbackning qanchasi o'zgarishsiz ketdi
(`feedback_kept_pct`) — bu raqamlar ekranda turadi.

---

# 2) Kod tayyorligi

**U nimani qidiradi:** boshqa dasturchi davom ettira oladimi.

## Testlar

| Nima | Qiymat |
|---|---|
| Jami test | **47** (32 funksiya, ulardan `test_generator_valid` 4 shablon × 4 daraja = 16 ta) |
| Fayllar | `tests/test_core.py`, `test_api.py`, `test_ai_grading.py`, `test_conveyor.py`, `test_features.py`, `test_auth_chat.py` |
| Tashqi bog'liqlik | **yo'q** — SQLite, lokal fayl ombori, `OPENAI_API_KEY=""` (`tests/conftest.py:6–12`) |
| Sana ham qotirilgan | `DARSPILOT_TODAY=2026-09-17` — taqvim rejaga bog'liq testlar barqaror (`tests/conftest.py:12`) |
| Generator tekshiruvi | 4 shablon × 4 daraja × **200 seed = 3200 masala**: har savolda 4 xil variant, bitta to'g'ri, har noto'g'risida xato kodi (`tests/test_core.py:14–25`) |

Eng qimmatli 4 test: `tests/test_core.py:45` — **butun OMR zanjiri** (10 kartochka → surat → o'qish →
javoblar aynan mos); `tests/test_ai_grading.py:217` — **bosma geometriyasi** qirqish va duplex siljishida
buzilmaydi; `:258` — uy vazifasi o'rniga **kartochka surati yuborilsa rad etiladi**; `:28` — kartochkada
qo'lyozma maydoni **umuman yo'qligi** kod darajasida qotirilgan.

## Struktura va tiplar

- Backend qavatlari: `app/main.py` (81 endpoint, mantiq yo'q, xatoni HTTP kodga aylantiradi — `:28 _wrap`)
  → `app/service.py` / `app/conveyor.py` (biznes mantiq) → `app/omr.py` · `app/llm.py` · `app/pdfgen.py` (vositalar).
- Og'ir ishlar event loopni bloklamaydi: `app/main.py:37 _run` → `run_in_threadpool`.
- Frontend: 54 ta `.ts/.tsx`, **TypeScript `strict: true`** (`web/tsconfig.app.json:21`) + `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch` (`:23`, `:24`, `:26`).
  `npm run check` = `tsc -b && oxlint src` → **0 xato** (bugun yurgizilgan). Build: **2459 modul, 603 ms**.

## Yagona geometriya manbasi

`app/layout.py` (92 satr) — kartochka o'lchamlari **bitta joyda**; undan `app/pdfgen.py` (chizadi),
`app/omr.py` (o'qiydi) va `app/simulate.py` (demo surat yasaydi) o'qiydi. Doiracha koordinatasi faqat
`layout.test_bubble` / `layout.grid_bubble` orqali olinadi — PDF bilan skaner ajralib qolmaydi.
`app/layout.py:83 safety_report()` chekkalarni raqam bilan qaytaradi, test uni qo'riqlaydi.

## Migratsiya

`app/db.py:54 NEW_COLUMNS` — yangi ustun `ALTER TABLE` bilan qo'shiladi, demo ma'lumot yo'qolmaydi
(`:63 _add_missing_columns`). Hozir 3 jadval, 5 ustun: `scans.journal_nos`, `scans.status`,
`homework.status`, `homework.image_keys`, `lessons.debrief`; PostgreSQL uchun `JSONB`, SQLite uchun `JSON`.

## Kamchiliklarni o'zimiz aytamiz

| Kamchilik | Holati | Reja |
|---|---|---|
| **CI yo'q** | `.github/` papkasi yo'q. CP1 da "CP2 gacha qilamiz" deganmiz — **bajarmadik**, vaqt demo funksiyalariga ketdi | GitHub Actions: `pytest` + `npm run check`, 1 soatlik ish |
| **Frontend testlari yo'q** | `web/package.json` da test skripti yo'q | Vitest + Testing Library: avval `ScanPanel` va `HomeworkPanel` |
| **Alembic yo'q** | `app/db.py:79 _upgrade_if_needed` sxema versiyasi o'zgarsa demo jadvallarni qayta yaratadi (AI jurnali saqlanadi) | Pilot maktabdan oldin Alembic |
| `types.ts` qo'lda yozilgan | FastAPI sxemasiga mos, lekin avtomatik emas | `openapi-typescript` `/api/openapi.json` dan |
| Oflayn navbat yo'q | surat yuklashda internet uzilsa qayta urinish kerak | IndexedDB navbati |
| `app/workbook.py:198 evaluate` da `eval` | kirish — bizning mashq daftari PDF imiz, foydalanuvchi emas; `__builtins__` bo'sh va regex faqat raqam/amal qoldiradi | to'liq parserga o'tkazish |

---

# 3) Yechimning innovatsionligi

1. **Javobni AI emas, kod o'qiydi — ataylab qilingan qaror.** CP1 da kartochkada qo'lyozma yechim maydoni
   bor edi va uni vision model rubrika bo'yicha baholardi. CP2 da **butunlay olib tashladik** (`489f1c8`):
   `crop_solution`, `grade_solution`, `RUBRIC`, `set_open_score` — hammasi kodda yo'q. Sabab: baho
   **takrorlanuvchi va tushuntiriladigan** bo'lishi kerak; endi ball faqat `app/grading.py:9` dan chiqadi.

2. **Distraktorlar tasodifiy emas.** Har bir noto'g'ri variant aniq tushuncha xatosiga bog'langan
   (`app/problems.py:44 _mc` — har variantda `error` maydoni). Natija "5/7" emas,
   "**amallar tartibi buzilgan: qavs qo'yilmagan**" (`app/llm.py:246 STUDENT_NOTE`).

3. **Bosqichli tashxis, ballar yig'indisi emas.** 7 savol — masala yechishning 7 bosqichi;
   `app/grading.py:37–53` uzilish qayerdaligini topadi va talqin + tayanch savollari birga xato bo'lsa
   "muammo bugungi mavzuda emas" izohi chiqadi (`root_cause_note`).

4. **Feedback qog'ozga qaytadi.** Matn murojaatsiz, 3-shaxsda yoziladi, chunki u keyingi kartochkaning
   old tomoniga bosiladi (`app/llm.py:230`). O'quvchida qurilma va internet kerak emas.

5. **Ovoz — kod va AI birgalikda.** Ovozdan **ismni AI topmaydi**: kirill→lotin, o'zbekcha qo'shimchalarni
   tozalash va `difflib` bilan 0.84 o'xshashlik (`app/conveyor.py:436 match_names`, `:450`).
   AI faqat erkin gapni tuzilgan xulosaga aylantiradi (`app/llm.py:492 lesson_debrief`).

6. **AI sifati o'lchanadi.** `/ai` sahifasi — har chaqiruvning maqsadi, modeli, soniyasi, xatosi
   (`app/llm.py:34 _log`); `scan_quality` — o'qituvchi nechta katakni tuzatgani. Da'vo emas, **raqam**.

---

# 4) Jamoaning bilim darajasi

## "Nega bu vosita, nega muqobil emas"

| Qaror | Nega shu | Nega muqobil emas | Dalil |
|---|---|---|---|
| **Python monolit** | Bitta jarayonda CV + AI + PDF | Node.js da ArUco darajasidagi CV yo'q; ajratilsa 2 ta deploy, 2 ta nosozlik nuqtasi | `requirements.txt` — 14 paket |
| **FastAPI** | async I/O (AI chaqiruvi 5–100 s), avtomatik `/api/docs`, Pydantic validatsiya | Django — ORM va admin kerak emas, ortiqcha og'irlik; Flask — async va sxema qo'lda | `app/main.py:24` |
| **ArUco, QR emas** | marker id = jurnal raqami; 8×8 mm joy; oflayn, tekin; 4 burchak perspektivani ham beradi | QR: ko'p joy, faqat identifikator, geometriya bermaydi | `app/layout.py:32`, `app/omr.py:50` |
| **O'z OMR imiz, tayyor kutubxona emas** | Bizning geometriya `layout.py` da; chegaralar har suratga moslashadi | Tayyor OMR kutubxonalari qat'iy shablon va skaner sifatini talab qiladi — telefon surati bilan ishlamaydi | `app/omr.py:127 _choose` |
| **ReportLab, HTML→PDF emas** | Millimetr aniqligi: marker 8 mm, doiracha r=2,4 mm | Brauzer masshtabi va marja OMR geometriyasini buzadi | `app/layout.py:48`, `app/pdfgen.py` |
| **PostgreSQL + JSONB** | AI javoblari (ssenariy, xulosa, masalalar ro'yxati) o'zgaruvchan tuzilma; hisobot uchun SQL qoladi | To'liq NoSQL — jurnal va baholar uchun tranzaksiya kerak | `app/db.py:55–59` |
| **SQLAlchemy 2.0** | Xuddi shu kod testlarda SQLite, prodda PostgreSQL bilan ishlaydi | Raw SQL — ikki dialekt uchun ikki xil kod | `app/db.py:11–14` |
| **MinIO (S3), bazaga emas** | Surat va PDF baza hajmini shishirmaydi; interfeys bitta, lokal papka ham shu interfeysda | Fayllarni BYTEA da saqlash — backup og'irlashadi | `app/storage.py` |
| **React 19 + Vite** | Jamoa tajribasi, three.js/TanStack ekotizimi | Vue ham mos, lekin arxitektura API-first: frontend qaytariladigan qaror, backend o'zgarmaydi | `web/package.json` |
| **TanStack Query, Redux emas** | Holatning 95% i — server holati (kesh, invalidatsiya, fon yangilanishi) | Redux: global holat deyarli yo'q, keraksiz murakkablik | `HomeworkPanel.tsx:16 refetchInterval` |
| **oxlint, ESLint emas** | Bir necha barobar tez, `npm run check` bir soniyada tugaydi | ESLint konfiguratsiyasi bu hajmdagi loyihaga ortiqcha | `web/package.json:11` |
| **Tez model vizual baholashda** | Sinfda 30 tagacha surat; sozlamada o'lchov yozilgan: og'ir model ~100 s, tez model ~5 s, sifat bir xil | Og'ir modelda bitta sinf 50 daqiqa ketadi | `app/config.py:29–31` |

## Nima qila olmaymiz (mentor shuni qadrlaydi)

- Qo'lyozma **yechim jarayonini** baholamaymiz — CP1 da bor edi, olib tashladik.
- Kartochka qattiq burchilgan bo'lsa o'qilmaydi: 4 burchakdan kamida 3 tasi kerak (`app/omr.py:84`).
- Daftar tekshiruvi **AI ga bog'liq** va xato qilishi mumkin — natija har doim o'qituvchi tasdig'idan
  o'tadi (`app/service.py:1175 confirm_homework`).

---

# 5) Texnologiyalar to'plami

## Backend

| Kutubxona | Versiya | Nima qiladi | Qanday ishlaydi | Nega shu |
|---|---|---|---|---|
| FastAPI | 0.141.1 | 81 ta HTTP endpoint | Pydantic modellari so'rovni tekshiradi; og'ir ish `run_in_threadpool` ga uzatiladi | async, avtomatik OpenAPI |
| uvicorn | 0.53.0 | ASGI server | konteynerda `--host 0.0.0.0 --port 8000` | FastAPI ning standart jufti |
| SQLAlchemy | 2.0.54 | ORM va sessiya | `db.session()` kontekst menejeri: commit/rollback/close bitta joyda (`app/db.py:18`) | Bitta kod ikki dialektga |
| psycopg (binary) | 3.3.5 | PostgreSQL drayveri | `postgresql+psycopg://` | psycopg2 ga nisbatan yangi, binary — kompilyatsiya kerak emas |
| opencv-python-headless | 5.0.0.93 | ArUco, perspektiva, morfologiya | `getPerspectiveTransform` + `warpPerspective` blokni 12 px/mm tekis rasmga aylantiradi | headless: GUI kutubxonalari konteynerga kerak emas |
| numpy | 2.5.3 | Piksel matematikasi | doiracha ichidagi siyoh — disk maskasi bo'yicha o'rtacha (`app/omr.py:105 _disk_mean`) | OpenCV bilan bir xil massiv formati |
| reportlab | 5.0.1 | A4 PDF: kartochkalar, markerlar, doirachalar | mm koordinatalarida chizadi, `layout.py` dan o'qiydi | Millimetr aniqligi |
| pymupdf | 1.28.2 | Mashq daftari PDF idan bet rasmini olish | `get_pixmap(dpi=150)` → JPEG, keshlanadi (`app/workbook.py:96`) | Matn va koordinatani ham beradi (`:145 exercise_lines`) |
| openai | 3.14.1 | Matn, vision, transkripsiya — bitta SDK | `response_format={"type":"json_object"}`, javob har safar validatsiyadan o'tadi | Uchala rejim bir joyda |
| minio | 7.2.20 | S3-mos fayl ombori | `storage.put/get/exists/delete` — MinIO yoki lokal papka | Interfeys bitta, muhit almashsa kod o'zgarmaydi |
| openpyxl | 3.1.5 | Baholar eksporti (.xlsx), reja importi | — | eMaktab API ochilmaguncha yagona yo'l |
| python-multipart | 0.0.32 | Surat yuklash (multipart/form-data) | `UploadFile` | FastAPI talabi |

## Frontend — o'lchangan raqamlar (bugungi build)

| Chunk | Xom | gzip | Qachon yuklanadi |
|---|---|---|---|
| `index` + `ui` + `hooks` + `utils` + CSS | — | **≈176 KB** (91,8 + 56,4 + 8,1 + 3,9 + 15,4) | doim |
| `common` (**three.js**) | 576,8 KB | **145,0 KB** | faqat `/sinf` va natijalar sahifasida, `lazy()` bilan |
| `Lesson` (asosiy sahifa) | 87,5 KB | 22,5 KB | `/dars/:id` ga kirilganda |
| Qolgan sahifalar | — | 1,7–5,3 KB | marshrut bo'yicha |

- 15 ta marshrut `lazy()` bilan bo'lingan (`web/src/App.tsx:12–26`); three.js faqat
  `pages/ClassMap.tsx:13` va `pages/Results.tsx:13` da yuklanadi.
- Animatsiya kafolatlari: `prefers-reduced-motion` va WebGL tekshiruvi (`fx/support.ts:2`, `:4`),
  sahifa ko'rinmasa sikl to'xtaydi (`fx/common.ts:55`), unmount'da `dispose()` (`fx/common.ts:79–84`).
- Mobil: kamera to'g'ridan-to'g'ri ochiladi — `capture="environment"` (`ScanPanel.tsx:71`,
  `HomeworkPanel.tsx:218`, `:242`), uy vazifasida `multiple` (ko'p bet).

## Infratuzilma

`docker compose up -d --build` → **5 konteyner**: `db` (postgres:16-alpine), `minio`, `minio-init`
(bucket yaratadi), `api` (healthcheck bilan), `web` (node:22 build → nginx:1.27, `/api` proxy).
`api` faqat `db` sog'lom va bucket tayyor bo'lgach ko'tariladi (`docker-compose.yml:60–64`),
`web` esa `api` sog'lom bo'lgach (`:71–73`) — ishga tushirish tartibi compose ning o'zida.

---

# Qanday muammoni kodda qanday yechdik

## 1. Eski protsessorli serverda numpy/opencv umuman ishga tushmadi

**Muammo:** VPS ning CPU si `x86-64-v1` (SSE4.2/POPCNT yo'q — QEMU ning umumiy modeli). NumPy 2.x va
OpenCV 5.x binarlari `x86-64-v2` talab qiladi → konteyner import paytida yiqiladi.
**Yechim:** Dockerfile ga `ARG PY` va `ARG REQ` qo'shildi (`Dockerfile:3`, `:16`), `requirements-oldcpu.txt`
yozildi: Python 3.12 + numpy 1.26.4 + opencv-headless 4.10.0.84 (numpy 1.26 Python 3.13 ni qo'llamaydi).
Kodning o'zi o'zgarmadi. Buyruq: `--build-arg PY=3.12 --build-arg REQ=requirements-oldcpu.txt`. Commit `026e3a9`.

## 2. To'rtinchi ArUco marker ko'rinmasa

**Muammo:** Telefon surati qiyshiq tushsa yoki barmoq markerni yopsa, 4 burchakdan biri topilmaydi —
perspektivani tekislab bo'lmaydi.
**Yechim (uch qavat):** `app/omr.py:60 _from_three` parallelogramm qoidasi bilan 4-burchakni hisoblaydi;
`:68 _plausible` natijani geometriyaga solishtiradi (tomonlar nisbati `:57 EXPECTED_RATIO` ga yaqinmi,
to'rtburchak konveksmi) va xato 0.6 dan katta bo'lsa chiziqni rad etadi (`:96`); `:84 _complete` esa
4 ta marker topilganda ham 5 ta variantni taqqoslab eng ishonchlisini tanlaydi — chunki **noto'g'ri
topilgan marker** yo'qolganidan xavfliroq. Qo'shimcha: birinchi urinishda to'liq topilmasa, CLAHE bilan
kontrast oshirilib ikkinchi marta qidiriladi (`app/omr.py:206`).

## 3. Qat'iy siyoh chegarasi har suratda sinadi

**Muammo:** CP1 dagi kod `FILLED = 0.33` kabi qotirilgan chegaralar bilan ishlardi. Haqiqiy bosilgan
kartochkalarda yorug'lik, ruchka rangi va qog'oz turi tufayli xuddi shu chegara bir suratda hammasini
"bo'yalgan", boshqasida hammasini "bo'sh" deb o'qidi.
**Yechim (`app/omr.py:24–30` izohi):** avval **barcha** doirachalar o'lchanadi, so'ng shu chiziqning
**o'z** darajasi hisoblanadi — `base` = mediana, `peak` = 97-protsentil (`:158–159`); chegaralar shularga
nisbatan: `fill = base + 0.42·span`, `low = base + 0.22·span` (`:127 _choose`); ikkinchi doiracha eng
qoraning 70% idan yuqori bo'lsa "ikki belgi" bayrog'i qo'yiladi (`:138`). Doiracha markazi bosma va
perspektiva tufayli 0,9 mm gacha siljishi mumkin — 9 nuqtali oynada eng qora joy olinadi
(`:117 _OFFSETS`, `:122 _bubble_ink`). Noaniq kataklar `confidence` va `flags` orqali o'qituvchiga
chiqadi, jim xato qilinmaydi (`:192`).

## 4. Bosma varaq qirqilganda mazmun kesilib ketardi

**Muammo:** A4 dan 4 ta A6 kartochka qirqiladi. Ofis printerida old/orqa tomon 1–3 mm siljiydi,
qo'lda qirqishda yana 1–2 mm xato, ustiga printer varaq chetidagi ~5 mm ga umuman bosa olmaydi.
**Yechim:** `app/layout.py:15 CUT_SAFE = 8.0` va `:16 MARKER_SAFE = 10.0` (markerlar uchun kengroq chekka,
chunki butun skanerlash ularga bog'liq). Javob bloki gorizontal markazda (`:79 BLOCK_X`) — chap va o'ng
chekka **bir xil**, duplex qaysi tomonga siljishidan qat'i nazar hech narsa yo'qolmaydi.
**Qo'riqchi:** `:83 safety_report()` raqamlarni qaytaradi, `tests/test_ai_grading.py:217` ularni har
testda tekshiradi — kimdir geometriyani o'zgartirsa test yiqiladi.

## 5. Uy vazifasi tahlili o'qituvchini kutishga majbur qilardi

**Muammo:** Vision chaqiruvi bir necha soniya davom etadi. 25 o'quvchining daftarini ketma-ket suratga
olayotgan o'qituvchi har safar kutib turishi kerak edi.
**Yechim:** Surat saqlanadi, javob **darhol** qaytadi, tahlil fonga uzatiladi —
`app/service.py:31 _BG = ThreadPoolExecutor(max_workers=3)`, yuborish `:1016 _BG.submit(...)`.
Holat `homework.status` da: `yuklandi → navbatda → tayyor | xato`. Frontend faqat navbatda ish bor paytda
so'raydi (`HomeworkPanel.tsx:16` — `pending > 0` bo'lsa 2500 ms, aks holda `false`), bo'sh polling yo'q.
Fon ishi ilovani yiqitmaydi: `app/service.py:1157 except Exception` — xato o'qituvchiga xabar bo'lib
chiqadi. Commit `595fb3f`.

## 6. Kartochka surati uy vazifasi deb qabul qilinardi

**Muammo:** O'qituvchi adashib diagnostika kartochkasini yoki bo'sh darslik betini uy vazifasi sifatida
yuklaydi — AI unga baribir "mashqlar" topib beradi.
**Yechim — uch qavat:** (1) **kod, AI dan oldin** — har bet `omr.scan_image` dan o'tadi va bizning ArUco
markerlarimiz topilsa AI ga umuman yuborilmaydi, chaqiruv tejaladi (`app/service.py:1134–1139`);
(2) **AI ning o'zi sahifa turini aytadi** — `daftar | kartochka | darslik | boshqa`
(`app/llm.py:553 HOMEWORK_SYSTEM`), `daftar` bo'lmasa masalalar ro'yxati bo'sh qoladi (`:589`);
(3) chegaradagi suratda tasnif adashishi mumkin — **bir marta qayta so'raladi** (`app/service.py:1143`),
keyin aniq xabar beriladi (`:962 PAGE_MESSAGE`).
**Test:** `tests/test_ai_grading.py:258` — kartochka surati yuborilsa `status == "xato"` bo'lishi shart.

## 7. LLM masala matniga o'zidan son qo'shar, masofani noto'g'ri shaharga bog'lardi

**Muammo:** "300 km" masalasini AI "Urganch – Xiva" (aslida 35 km) deb yozardi va matnga yil, soat kabi
keraksiz sonlar qo'shardi — bu **masala mantiqini** buzadi.
**Yechim — generatsiyadan keyin qat'iy validatsiya:** `app/llm.py:112 PLACE_PAIRS` da masofa oralig'iga
mos shaharlar juftlari oldindan yozilgan va promptga faqat mos juftlar beriladi (`:120 place_pairs`);
`:157` — matndagi sonlar to'plami kutilgan to'plamga **aynan teng** bo'lishi shart, aks holda javob rad
etilib shablon matn ishlatiladi; `:159` — masala javobi matn ichida chiqib qolmaganini tekshiradi;
`:169–173` — AI tanlagan shaharlar ro'yxatda bormi va matnda uchraydimi (apostrof variantlari
normallashtirilib). Ya'ni **AI ning javobi ishonchsiz manba deb qaraladi**.

## 8. Demo bazasini yangi ustun buzardi

**Muammo:** `Base.metadata.create_all` mavjud jadvalga ustun qo'shmaydi. Demo serverida yangi versiya
chiqqach `UndefinedColumn` xatosi chiqardi; bazani tozalash esa demo ma'lumotni yo'q qiladi.
**Yechim:** `app/db.py:54 NEW_COLUMNS` — jadval → ustun → dialekt bo'yicha DDL; ishga tushganda
`inspect(engine)` bilan solishtirilib yetishmagani `ALTER TABLE ... ADD COLUMN` bilan qo'shiladi (`:63`).
Alembic o'rnini bosmaydi, lekin MVP bosqichida demo ma'lumotni saqlab qoladi.

## 9. `/api/demo/reset` ochiq internetda turardi

**Muammo:** Sayt demo uchun ochiq. `POST /api/demo/reset` va `POST /api/curriculum/reset` bazani
tozalaydi — havolani bilgan har qanday odam demoni suhbat o'rtasida o'chirib yuborishi mumkin edi.
**Yechim:** `app/main.py:187 require_user` — `Authorization: Bearer` tekshiriladi, bo'lmasa 401; ikkala
reset endpointida `Depends(require_user)` (`:621`, `:663`). Fayl endpointida yo'l qo'riqlanadi: faqat
`scans/`, `pdf/`, `homework/`, `workbook/` prefikslari, `..` taqiqlangan (`:577`); testi
`tests/test_api.py:90`. Commit `c961b8a`.

## 10. Model `reasoning_effort` ni qo'llamasa — butun chaqiruv yiqilardi

Sozlamada `OPENAI_REASONING_EFFORT` bor (`app/config.py:28`), lekin har model uni qabul qilmaydi →
`BadRequestError` va feedback umuman yozilmaydi. `app/llm.py:79–83` — xato aynan `reasoning` haqida
bo'lsa, parametr olib tashlanib chaqiruv **bir marta qayta** yuboriladi. Qolgan har qanday uzilishda
`None` qaytadi va tizim shablon matnga o'tadi (`:91`) — demo qulamaydi.

---

# CP2 da nima yangi (CP1 — 18-sentabr 14:30 dan keyin)

Hammasi git tarixida (`git log --oneline`), commit vaqtlari bilan:

| Commit | Vaqt | Nima qo'shildi |
|---|---|---|
| `026e3a9` | 18.09 22:10 | **Eski protsessorli server uchun yig'ish varianti** — `requirements-oldcpu.txt`, `Dockerfile` da `PY`/`REQ` argumentlari |
| `595fb3f` | 18.09 22:10 | **Skaner navbati va uy vazifasi fon rejimi** — surat avval omborga tushadi (`Scan.status`), har suratda kim o'qilgani ko'rinadi, surat o'chiriladi; ArUco oldindan tekshiruvi; `ALTER` migratsiya |
| `7463563` | 18.09 22:10 | **Ovozli dars tahlili** — `POST /api/lessons/{id}/debrief/voice|text`, `DELETE /debrief`; `lessons.debrief` ustuni; `VoiceDebrief.tsx` (207 satr) |
| `09bc4f2` | 18.09 22:10 | **Mobil ko'rinish** — gorizontal siljish yo'qotildi (CardHeader tugmalari, 8 bosqich, direktor jadvali), modal `dvh` + safe-area, `viewport-fit=cover`, barmoq uchun katta tugmalar |
| `c961b8a` | 19.09 09:22 | **`demo/reset` himoyasi** (`require_user`), demo kuni BSB/ChSB ga tushmaydi, "Demo daftar surati" |
| `d5818a3`, `2faff36` | 19.09 09:27–09:48 | Kod xaritasi va baholash mezonlari hujjatlari |
| `489f1c8` | 19.09 10:08 | **Kartochkadan qo'lyozma yechim maydoni olib tashlandi** — `layout`, `pdfgen`, `omr`, `llm`, `service`, `models`, frontend, 8 fayl |
| `49c7f00` | 19.09 10:34 | **Mashq daftari betlari va ko'p betli uy vazifasi** — `app/workbook.py` (249 satr): AHA! mashq daftari PDF sidan bet rasmi; bitta o'quvchiga 6 betgacha surat, so'ng bitta tugma bilan tahlilga; demo surati haqiqiy betdan yasaladi |

## Uchta gap bilan

1. **Xabarni soddalashtirdik** — CP1 da "AI qo'lyozmani ham baholaydi" degan edik, mentorlar shubha
   bildirdi; endi javobni faqat kod tekshiradi.
2. **O'qituvchi endi kutmaydi** — suratga olish va tekshirish ajratildi (navbat + fon oqimi).
3. **Ovoz ikkinchi qadamga ham kirdi** — e'tibor jurnalidagi andoza "Tahlil" qadamiga kengaytirildi.

---

# Mentor savol bersa

**1. "Suratni kim o'qiydi — AI mi?"**
Yo'q. `app/omr.py:196 scan_image` — sof OpenCV: ArUco markerlar → `getPerspectiveTransform` →
doirachalardagi siyoh zichligi. AI bu yerda umuman ishtirok etmaydi. Tekin, oflayn va takrorlanuvchi.

**2. "Bitta burchak ko'rinmasa nima bo'ladi?"**
`app/omr.py:60 _from_three` 4-burchakni hisoblaydi, `:68 _plausible` natijani geometriyaga solishtiradi.
4 ta marker topilganda ham 5 variant taqqoslanadi (`:84 _complete`) — noto'g'ri topilgan marker
yo'qolganidan xavfliroq. Xato 0.6 dan katta bo'lsa chiziq rad etiladi.

**3. "Doiracha to'ldirilganini qanday bilasiz? Chegara qotirilganmi?"**
Yo'q, chegara **har suratga moslashadi**: chiziqning medianasi (`base`) va 97-protsentili (`peak`)
olinadi (`app/omr.py:158–159`), chegaralar shularga nisbatan (`:127 _choose`). CP1 da qotirilgan chegara
bor edi — haqiqiy bosilgan kartochkada sindi.

**4. "AI javobiga qanchalik ishonasiz?"**
Umuman ishonmaymiz. Har javob validatsiyadan o'tadi: masala matnida sonlar to'plami (`app/llm.py:157`),
feedbackda uch maydon ham bo'sh emasligi (`:298`), uy vazifasida sahifa turi va har mashqning tuzilishi
(`:586–597`). Mos kelmasa — shablon matn yoki `None`.

**5. "Frontend testlari bormi?"**
**Yo'q — eng zaif joyimiz, CP1 da ham shunday degan edik.** Backendda 47 test bor, `web/package.json` da
test skripti yo'q. Reja: Vitest + Testing Library — `ScanPanel` va `HomeworkPanel` dan boshlanadi.

**6. "CI qo'ydingizmi? CP1 da va'da qilgan edingiz."**
**Yo'q, qo'ymadik** — `.github/` papkasi yo'q. Vaqt demo funksiyalariga ketdi, bu prioritizatsiya xatomiz.
Hozir har commit oldidan qo'lda `pytest -q` va `npm run check`. GitHub Actions — birinchi navbatdagi vazifa.

**7. "Migratsiya qanday? Alembic bormi?"**
Alembic yo'q. `app/db.py:54 NEW_COLUMNS` — yangi ustunlar `ALTER TABLE` bilan (hozir 3 jadval, 5 ustun);
sxema versiyasi tubdan o'zgarsa `:79 _upgrade_if_needed` demo jadvallarni qayta yaratadi (AI jurnali
saqlanadi). MVP yechimi — pilot maktabdan oldin Alembic kerak.

**8. "TypeScript qanday sozlangan?"**
`web/tsconfig.app.json:21` — `strict: true`, ustiga `noUnusedLocals` (`:23`), `noUnusedParameters` (`:24`),
`noFallthroughCasesInSwitch` (`:26`), `verbatimModuleSyntax` (`:14`). `npm run check` bugun **0 xato**.
Kamchilik: `web/src/lib/types.ts` qo'lda yozilgan — keyingi qadam `openapi-typescript`.

**9. "Bundle hajmi? Kuchsiz telefonda ishlaydimi? Animatsiyalar bezakmi?"**
Boshlang'ich yuk **≈176 KB gzip**; three.js — **145 KB alohida chunk**, faqat `/sinf` va natijalar
sahifasida `lazy()` bilan (`pages/ClassMap.tsx:13`, `Results.tsx:13`). Sinfdagi asosiy oqim — surat
yuklash — 3D talab qilmaydi. Animatsiya bezak emas: galaktikada sharning markazdan uzoqligi = oxirgi
e'tibordan beri o'tgan darslar soni; himoyasi — reduced-motion, WebGL fallback, `visibilitychange`, `dispose()`.

**10. "Kod review va git qanday yuritilyapti?"**
Public repo, mazmunli commitlar (o'zbekcha, sabab va oqibat bilan — `git log` da ko'rinadi).
Har commit oldidan qo'lda `pytest -q` + `npm run check`. Avtomatlashtirish (CI) — hali yo'q.

**11. "Global state nima bilan?"**
Server holati — TanStack Query (kesh, invalidatsiya). Redux yo'q: global holat deyarli yo'q. Polling
faqat fon ishi ketayotganda yoqiladi (`HomeworkPanel.tsx:16` — `pending > 0` bo'lsa 2500 ms).

**12. "Og'ir ish serverni bloklaydimi?"**
Yo'q. Endpointlar `app/main.py:37 _run` orqali `run_in_threadpool` ga uzatiladi; uy vazifasi tahlili
umuman alohida: `app/service.py:31 _BG = ThreadPoolExecutor(max_workers=3)`, javob darhol qaytadi.

**13. "Shaxsiy ma'lumot? AI ga nima yuboriladi?"**
Ism **yuborilmaydi** — faqat kod (`5B-17`) va agregat statistika (`app/llm.py:5`). Ovoz saqlanmaydi,
faqat matnga aylantiriladi. Parol PBKDF2-SHA256, **200 000 iteratsiya** (`app/auth.py:18 ITERATIONS`).

**14. "Bazani begona odam tozalab yuborishi mumkinmi?"**
Endi yo'q: reset endpointlari kirishni talab qiladi (`app/main.py:187 require_user`, `:621`, `:663`),
fayl endpointida yo'l prefiksi va `..` tekshiriladi (`:577`). CP1 dan keyin qo'shilgan (`c961b8a`).

**15. "Bir xil surat ikki marta yuklansa?"**
`Response` kaliti `(diagnostic_id, student_id)` — qator yangilanadi (`app/service.py:424–430`); skaner
ro'yxatida qaysi surat "oxirgi" bo'lgani ko'rinadi (`tests/test_ai_grading.py:249`); suratni o'chirish
javoblarni o'chirmaydi (`app/service.py:446`).

**16. "Kod monolit — keyin ajratasizmi?"**
Bu miqyosda bitta jarayon kamroq nosozlik nuqtasi. OMR, PDF, AI va geometriya allaqachon alohida
modul va bir-biriga to'g'ridan-to'g'ri bog'lanmagan — kerak bo'lsa ajratish mexanik ish.

**17. "Nega React, Vue emas?"**
Jamoa tajribasi va three.js/TanStack ekotizimi. Lekin arxitektura API-first: 81 endpoint
(`app/main.py`), frontend butunlay almashtirilsa ham backend o'zgarmaydi — bu **qaytariladigan qaror**.
Sizning Nuxt tajribangizda bu chegarani qanday chizasiz?

**18. "Model tanlovini nimaga asoslagansiz?"**
O'lchov bilan (`app/config.py:29–31`): vizual baholashda og'ir model ~100 s, tez model ~5 s, sifat farqi
sezilmadi — sinfda 30 tagacha surat bor. Ko'p o'quvchiga feedback ham tezroq modelda (`app/llm.py:291`).

**19. "AI qancha ishlatilyapti — buni ko'rsata olasizmi?"**
Ha, `/ai` sahifasi: har chaqiruv `llm_calls` ga yoziladi — maqsad, model, soniya, tokenlar, xato
(`app/llm.py:34 _log`, `:87`). Jurnalga yozolmaslik asosiy ishni to'xtatmaydi (`:42`).

**20. "Mashq daftari beti qayerdan olinadi?"**
Rejada uy vazifasi bosma bet raqamlari bilan beriladi ("31–34"): `app/workbook.py:70 parse_pages` uni
ro'yxatga aylantiradi, `:96 page_jpeg` pymupdf bilan 150 dpi rasm qilib oladi va keshlaydi
(`app/service.py:917 lesson_workbook`).

**21. "Demo suratlar soxtami?"**
Ular **haqiqiy zanjirdan o'tadi**: `app/simulate.py:115 make_photo` sun'iy "telefon surati" (egilish,
shovqin, soya) yasaydi va u boshqa suratlar kabi `omr.scan_image` ga tushadi. Uy vazifasi demosi esa
**haqiqiy mashq daftari betiga** javoblarni yozadi, xato javob amallar tartibini buzib hisoblangan
natija bo'ladi (`app/service.py:1040`, `app/workbook.py:223`) — AI shu xato turini topishi kerak.

---

# Yakun: undan so'rash va aytmaslik

**Oxirgi 1 daqiqada so'raymiz** (u gapirishni yaxshi ko'radi, bu "bilim darajasi" ga ijobiy ta'sir qiladi):

1. "CI ni bizning holatda qayerdan boshlagan bo'lardingiz — backend testlaridanmi yoki `tsc` danmi?"
2. "Enterprise loyihada `ui.tsx` kabi ichki primitivlar qachon alohida dizayn tizimiga ajraladi?"
3. "Davlat mahsulotlarida shaxsiy ma'lumot bo'yicha qanday talablarga duch kelgansiz — biz AI ga ism
   yubormaymiz, bu yetarlimi?"

**Aytmaslik kerak:** "hammasi tayyor, kamchilik yo'q" (u darhol tekshiradi); "keyin qo'shamiz" degan
mavhum javob (o'rniga: nima, qanday, qachon); CI savolini chetlab o'tish — **CP1 da va'da berib
bajarmadik**, buni o'zimiz aytamiz; birinchi daqiqada model nomlari va token narxlari — avval demo.
