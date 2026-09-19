# CP2 — texnik mentor bilan suhbat (Fractal · DarsPilot)

Ishchi hujjat: suhbat paytida ochib turiladi. Har bir raqam va `fayl:satr` koddan tekshirilgan (19-sentabr).
Mentor: **Yaxshimurodov Jaloladdin** — vaqt **14:20**. Loyihani birinchi marta ko'radi, shuning uchun
hujjat butun jarayonni boshidan tushuntiradi. CP2 yakuniy balning **60%** ini beradi.

## Ochilish (30–40 soniya)

> "Fractal, DarsPilot. Ta'lim treki, **2-ustuvor mavzu — avtomatik baholash va feedback**.
>
> **Muammo:** 5-sinf matematika o'qituvchisida 3 sinf, ~90 o'quvchi. Har darsdan keyin har bir bolaning
> ishini ko'rib, xatosini topib izoh yozish jismonan imkonsiz — bola "5/7" degan raqam oladi,
> **qaysi qadamda adashganini bilmaydi**.
>
> **Yechim:** dars konveyeri. Tizim rejadan bugungi mavzuni oladi, har o'quvchiga o'z darajasida masala
> generatsiya qiladi, A4 da 4 ta qog'oz kartochka bosib beradi. O'qituvchi ishlarni **bitta telefon surati**
> bilan oladi, tizim javoblarni o'qiydi, xatoni **nomlab** beradi va keyingi kartochkaga bosiladigan izoh
> yozadi. Uy vazifasi — mashq daftari beti suratdan tekshiriladi.
>
> **Chegarani birinchi aytaman:** javobni **kod** o'qiydi, AI emas — baho `app/grading.py` dan chiqadi,
> AI faqat matn yozadi. Sayt jonli: **https://darspilot.com**, hoziroq ko'rsataman."

## 10 daqiqalik reja

| Vaqt | Nima | Nimani ochib turaman |
|---|---|---|
| 0:00–0:40 | Loyiha nima: muammo → yechim, kod/AI chegarasi | shu hujjatning "Ochilish" bo'limi |
| 0:40–1:00 | Sayt jonli: **https://darspilot.com**, HTTPS, demo kirish | brauzer manzil qatori |
| 1:00–3:00 | **Jonli demo:** dars → kartochka PDF → surat → 10 ta ish o'qildi → feedback | `darspilot.com/dars/:id` |
| 3:00–4:00 | **Uy vazifasi:** mashq daftari beti → surat → fonda AI → o'qituvchi tasdiqlaydi | `HomeworkPanel` |
| 4:00–4:45 | **Ovozli tahlil:** 20 soniya gapirish → tuzilgan xulosa | `VoiceDebrief` |
| 4:45–6:15 | Arxitektura: 13 qadam, kod/AI chegarasi, `app/layout.py` yagona geometriya | shu hujjat, 1-bo'lim |
| 6:15–7:15 | **Deploy:** domen, VPS, HTTPS va eski CPU muammosi | shu hujjat, "Deploy" bo'limi |
| 7:15–10:00 | **Savollar** | shu hujjat, "Mentor savol bersa" |

> Demo brauzerda oldindan ochiq tursin: `https://darspilot.com`, kirish `demo@darspilot.uz` / `demo1234`
> (`app/auth.py:128 ensure_demo_user`). Internet sekin bo'lsa lokal `docker compose` nusxasi ham tayyor.
> AI kalitsiz ham tizim shablon matnlar bilan to'liq ishlaydi (`app/llm.py:22 enabled`) — demo qulamaydi.

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
| HTTP endpointlar | 81 ta | `app/main.py` |
| AI chaqiruvi qancha turdi | har chaqiruv soniyasi bilan yoziladi va `/ai` sahifasida ko'rinadi | `app/llm.py:34 _log`, `:87` |

**Ishonchlilik o'lchanadi, aytilmaydi:** `app/service.py:582 scan_quality` — nechta katak avtomatik o'qildi
(`auto_pct`), nechtasi tuzatildi (`accuracy_pct`), feedback qanchasi o'zgarishsiz ketdi
(`feedback_kept_pct`). Bu raqamlar ekranda turadi.

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
javoblar aynan mos); `tests/test_ai_grading.py:217` — **bosma geometriyasi** qirqish va duplexda buzilmaydi;
`:258` — uy vazifasi o'rniga **kartochka surati rad etiladi**; `:28` — javoblarni **faqat kod** o'qishi.

## Struktura va tiplar

- Backend qavatlari: `app/main.py` (81 endpoint, mantiq yo'q, xatoni HTTP kodga aylantiradi — `:28 _wrap`)
  → `app/service.py` / `app/conveyor.py` (biznes mantiq) → `app/omr.py` · `app/llm.py` · `app/pdfgen.py`.
  Og'ir ishlar event loopni bloklamaydi: `app/main.py:37 _run` → `run_in_threadpool`.
- Frontend: 54 ta `.ts/.tsx`, **TypeScript `strict: true`** (`web/tsconfig.app.json:21`) + `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch` (`:23`, `:24`, `:26`).
  `npm run check` = `tsc -b && oxlint src` → **0 xato**. Build: **2459 modul, 603 ms**.

## Yagona geometriya manbasi va migratsiya

`app/layout.py` (92 satr) — kartochka o'lchamlari **bitta joyda**; undan `app/pdfgen.py` (chizadi),
`app/omr.py` (o'qiydi) va `app/simulate.py` (demo surat yasaydi) o'qiydi. Doiracha koordinatasi faqat
`layout.test_bubble` / `layout.grid_bubble` orqali olinadi — PDF bilan skaner ajralib qolmaydi;
`:83 safety_report()` chekkalarni raqam bilan qaytaradi, test uni qo'riqlaydi.
`app/db.py:54 NEW_COLUMNS` — yangi ustun `ALTER TABLE` bilan qo'shiladi, demo ma'lumot yo'qolmaydi
(`:63 _add_missing_columns`). Hozir 3 jadval, 5 ustun: `scans.journal_nos`, `scans.status`,
`homework.status`, `homework.image_keys`, `lessons.debrief`; PostgreSQL `JSONB`, SQLite `JSON`.

> **So'ralsa (o'zimiz mavzu ochmaymiz):** CI hali yo'q — har commit oldidan qo'lda `pytest -q` +
> `npm run check`, GitHub Actions birinchi navbatdagi vazifa. Frontend testlari yo'q — Vitest rejalashtirilgan.
> Alembic o'rniga hozircha `ALTER TABLE` migratsiyasi.

# 3) Yechimning innovatsionligi

1. **Javobni AI emas, kod o'qiydi — ataylab qilingan qaror.** Javob `app/omr.py:196` da sof OpenCV bilan
   o'qiladi, ball faqat `app/grading.py:9` dan chiqadi: bir xil surat har safar bir xil ballni beradi —
   baho **takrorlanuvchi va tushuntiriladigan**. Chegara test bilan qotirilgan: `tests/test_ai_grading.py:28`.
2. **Distraktorlar tasodifiy emas.** Har bir noto'g'ri variant aniq tushuncha xatosiga bog'langan
   (`app/problems.py:44 _mc` — har variantda `error`). Natija "5/7" emas, "**amallar tartibi buzilgan:
   qavs qo'yilmagan**" (`app/llm.py:246 STUDENT_NOTE`).
3. **Bosqichli tashxis, ballar yig'indisi emas.** 7 savol — yechishning 7 bosqichi; `app/grading.py:37–53`
   uzilish joyini topadi, talqin + tayanch birga xato bo'lsa "muammo bugungi mavzuda emas, tayanch
   bilimda" izohi chiqadi (`root_cause_note`).
4. **Feedback qog'ozga qaytadi.** Matn murojaatsiz, 3-shaxsda yoziladi, chunki u keyingi kartochkaning
   old tomoniga bosiladi (`app/llm.py:230`). O'quvchida qurilma va internet kerak emas.
5. **Ovoz — kod va AI birgalikda.** Ovozdan **ismni AI topmaydi**: kirill→lotin, qo'shimchalarni tozalash
   va `difflib` bilan 0.84 o'xshashlik (`app/conveyor.py:436 match_names`, `:450`). AI faqat erkin gapni
   tuzilgan xulosaga aylantiradi (`app/llm.py:492 lesson_debrief`).
6. **AI sifati o'lchanadi.** `/ai` sahifasi — har chaqiruvning maqsadi, modeli, soniyasi, xatosi
   (`app/llm.py:34 _log`); `scan_quality` — o'qituvchi nechta katakni tuzatgani. Da'vo emas, **raqam**.

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
| **Fayl ombori interfeys ortida** | `storage.put/get/exists/delete` — MinIO (S3) yoki lokal papka, kod bilmaydi | Fayllarni bazada BYTEA da saqlash — backup og'irlashadi, baza shishadi | `app/storage.py:77` |
| **React 19 + Vite** | Jamoa tajribasi, three.js/TanStack ekotizimi | Vue ham mos, lekin arxitektura API-first: frontend qaytariladigan qaror, backend o'zgarmaydi | `web/package.json` |
| **TanStack Query, Redux emas** | Holatning 95% i — server holati (kesh, invalidatsiya, fon yangilanishi) | Redux: global holat deyarli yo'q, keraksiz murakkablik | `HomeworkPanel.tsx:16 refetchInterval` |
| **oxlint, ESLint emas** | Bir necha barobar tez, `npm run check` bir soniyada tugaydi | ESLint konfiguratsiyasi bu hajmdagi loyihaga ortiqcha | `web/package.json:11` |
| **Tez model vizual baholashda** | Sinfda 30 tagacha surat; sozlamada o'lchov yozilgan: og'ir model ~100 s, tez model ~5 s, sifat bir xil | Og'ir modelda bitta sinf 50 daqiqa ketadi | `app/config.py:29–31` |

> **Chegaralar (so'ralsa):** kartochka qattiq burchilgan bo'lsa o'qilmaydi — 4 burchakdan kamida 3 tasi
> kerak (`app/omr.py:84`); daftar tekshiruvi AI ga bog'liq va xato qilishi mumkin, shuning uchun natija
> har doim o'qituvchi tasdig'idan o'tadi (`app/service.py:1175 confirm_homework`).

# 5) Texnologiyalar to'plami

## Backend

| Kutubxona | Versiya | Nima qiladi | Qanday ishlaydi | Nega shu |
|---|---|---|---|---|
| FastAPI | 0.141.1 | 81 ta HTTP endpoint | Pydantic modellari so'rovni tekshiradi; og'ir ish `run_in_threadpool` ga uzatiladi | async, avtomatik OpenAPI |
| uvicorn | 0.53.0 | ASGI server | konteynerda `--host 0.0.0.0 --port 8000` | FastAPI ning standart jufti |
| SQLAlchemy | 2.0.54 | ORM va sessiya | `db.session()` kontekst menejeri: commit/rollback/close bitta joyda (`app/db.py:18`) | Bitta kod ikki dialektga |
| psycopg (binary) | 3.3.5 | PostgreSQL drayveri | `postgresql+psycopg://` | psycopg2 ga nisbatan yangi, binary — kompilyatsiya kerak emas |
| opencv-python-headless | 5.0.0.93 (serverda 4.10) | ArUco, perspektiva, morfologiya | `getPerspectiveTransform` + `warpPerspective` blokni 12 px/mm tekis rasmga aylantiradi | headless: GUI kutubxonalari konteynerga kerak emas |
| numpy | 2.5.3 (serverda 1.26.4) | Piksel matematikasi | doiracha ichidagi siyoh — disk maskasi bo'yicha o'rtacha (`app/omr.py:105 _disk_mean`) | OpenCV bilan bir xil massiv formati |
| reportlab | 5.0.1 | A4 PDF: kartochkalar, markerlar, doirachalar | mm koordinatalarida chizadi, `layout.py` dan o'qiydi | Millimetr aniqligi |
| pymupdf | 1.28.2 | Mashq daftari PDF idan bet rasmini olish | `get_pixmap(dpi=150)` → JPEG, keshlanadi (`app/workbook.py:96`) | Matn va koordinatani ham beradi (`:145 exercise_lines`) |
| openai | 3.14.1 | Matn, vision, transkripsiya — bitta SDK | `response_format={"type":"json_object"}`, javob har safar validatsiyadan o'tadi | Uchala rejim bir joyda |
| minio | 7.2.20 | S3-mos fayl ombori | `storage.put/get/exists/delete` — MinIO yoki lokal papka (`app/storage.py:77`) | Interfeys bitta, muhit almashsa kod o'zgarmaydi |
| openpyxl | 3.1.5 | Baholar eksporti (.xlsx), reja importi | — | eMaktab API ochilmaguncha yagona yo'l |
| python-multipart | 0.0.32 | Surat yuklash (multipart/form-data) | `UploadFile` | FastAPI talabi |

## Frontend — o'lchangan raqamlar

| Chunk | Xom | gzip | Qachon yuklanadi |
|---|---|---|---|
| `index` + `ui` + `hooks` + `utils` + CSS | — | **≈176 KB** (91,8 + 56,4 + 8,1 + 3,9 + 15,4) | doim |
| `common` (**three.js**) | 576,8 KB | **145,0 KB** | faqat `/sinf` va natijalar sahifasida, `lazy()` bilan |
| `Lesson` (asosiy sahifa) | 87,5 KB | 22,5 KB | `/dars/:id` ga kirilganda |
| Qolgan sahifalar | — | 1,7–5,3 KB | marshrut bo'yicha |

- 15 ta marshrut `lazy()` bilan bo'lingan (`web/src/App.tsx:12–26`); three.js faqat `pages/ClassMap.tsx:13`
  va `pages/Results.tsx:13` da yuklanadi.
- Animatsiya kafolatlari: `prefers-reduced-motion` va WebGL tekshiruvi (`fx/support.ts:2`, `:4`), sahifa
  ko'rinmasa sikl to'xtaydi (`fx/common.ts:55`), unmount'da `dispose()` (`fx/common.ts:79–84`).
- Mobil: kamera to'g'ridan-to'g'ri ochiladi — `capture="environment"` (`ScanPanel.tsx:71`,
  `HomeworkPanel.tsx:218`, `:242`), uy vazifasida `multiple` (ko'p bet).

## Infratuzilma (lokal)

`docker compose up -d --build` → **5 konteyner**: `db` (postgres:16-alpine), `minio`, `minio-init`
(bucket), `api` (healthcheck bilan), `web` (node:22 build → nginx:1.27, `/api` proxy). `api` faqat `db`
sog'lom va bucket tayyor bo'lgach ko'tariladi (`docker-compose.yml:60–64`), `web` esa `api` sog'lom
bo'lgach (`:71–73`) — ishga tushirish tartibi compose ning o'zida.

# Deploy — sayt jonli ishlayapti

**Bu demo emas, haqiqiy prod** — suhbat paytida manzil qatorida turadi.

| Nima | Holati |
|---|---|
| Domen | **darspilot.com** — Cloudflare Registrar'dan olindi |
| DNS | A-yozuvi (`@` va `www`) → **189.74.97.73**, O'zbekistondagi VPS |
| Konteynerlar | `docker compose`: `db` (postgres:16-alpine) + `api` (FastAPI/uvicorn) + `web` (nginx) |
| Sertifikat | **Let's Encrypt**, HTTPS ishlaydi |
| Yo'naltirish | `http://darspilot.com` → **301** → `https://darspilot.com` |
| Yangilanish | sertifikat **cron** orqali avtomatik yangilanadi — qo'l aralashuvi kerak emas |
| Sog'liq | `https://darspilot.com/api/health` → `{"ok":true}` |
| Demo kirish | `demo@darspilot.uz` / `demo1234` (`app/auth.py:128 ensure_demo_user`) |
| Fayllar | `Dockerfile`, `requirements-oldcpu.txt`, `docker-compose.yml`, `deploy/nginx-ssl.conf` (serverdagi nginx: 443, sertifikat, HTTP→HTTPS) |

**Eng qiyin joyi — server protsessori eski (`x86-64-v1`, SSE4.2 yo'q).** numpy 2.x / opencv 5.x import
paytida yiqilardi, MinIO ham ko'tarilmadi. Ikkalasi ham **ilova kodiga tegmasdan** yechildi:
`Dockerfile:3 ARG PY` + `:16 ARG REQ` va `requirements-oldcpu.txt` (Python 3.12 + numpy 1.26.4 +
opencv-headless 4.10.0.84); fayl ombori esa interfeys ortida (`app/storage.py:77`) — MinIO o'chirilib
lokal papkaga o'tdi (`app/config.py:19`), 5 konteyner o'rniga 3 tasi qoldi (batafsili pastda, 1-band).

> Xulosa: "Interfeysni oldindan ajratganimiz uchun prod muhiti kutilmagan chiqqanda kodga emas,
> **konfiguratsiyaga** tegdik."

# Qanday muammoni kodda qanday yechdik

## 1. Prod serverda numpy/opencv va MinIO umuman ishga tushmadi

**Muammo:** VPS ning CPU si `x86-64-v1` (SSE4.2/POPCNT yo'q). NumPy 2.x va OpenCV 5.x binarlari
`x86-64-v2` talab qiladi → `api` import paytida yiqiladi. MinIO ham ko'tarilmadi, `api` esa
`minio-init` tugashini kutadi (`docker-compose.yml:63–64`) — butun stek qotib qoldi.
**Yechim — ikkalasi ham ilova kodiga tegmasdan.** (1) `Dockerfile:3 ARG PY` va `:16 ARG REQ` build
argumentlari + `requirements-oldcpu.txt`: Python 3.12 + numpy 1.26.4 + opencv-headless 4.10.0.84
(`--build-arg PY=3.12 --build-arg REQ=requirements-oldcpu.txt`, commit `026e3a9`). (2) Fayl ombori
boshidan **interfeys** ortida edi: `app/storage.py:77` — `MINIO_ENDPOINT` bo'sh bo'lsa `LocalStorage`
(`app/config.py:19 LOCAL_STORAGE_DIR`). MinIO olib tashlandi, 5 o'rniga 3 konteyner qoldi; yo'l
xavfsizligi shu klassda (`_path` da `resolve()`, ildizdan chiqish taqiqlangan).

## 2. To'rtinchi ArUco marker ko'rinmasa

**Muammo:** Telefon surati qiyshiq tushsa yoki barmoq markerni yopsa, 4 burchakdan biri topilmaydi —
perspektivani tekislab bo'lmaydi.
**Yechim (uch qavat):** `app/omr.py:60 _from_three` parallelogramm qoidasi bilan 4-burchakni hisoblaydi;
`:68 _plausible` natijani geometriyaga solishtiradi (tomonlar nisbati `:57 EXPECTED_RATIO` ga yaqinmi,
to'rtburchak konveksmi) va xato 0.6 dan katta bo'lsa rad etadi (`:96`); `:84 _complete` 4 ta marker
topilganda ham 5 variantni taqqoslab eng ishonchlisini tanlaydi — **noto'g'ri topilgan marker**
yo'qolganidan xavfliroq. Topilmasa CLAHE bilan kontrast oshirilib qayta qidiriladi (`app/omr.py:206`).

## 3. Qat'iy siyoh chegarasi har suratda sinadi

**Muammo:** Qotirilgan `FILLED = 0.33` kabi chegara haqiqiy bosilgan kartochkalarda sinadi: yorug'lik,
ruchka rangi va qog'oz turi tufayli bir suratda hammasini "bo'yalgan", boshqasida "bo'sh" deb o'qiydi.
**Yechim (`app/omr.py:24–30` izohi):** avval **barcha** doirachalar o'lchanadi, so'ng shu chiziqning
**o'z** darajasi hisoblanadi — `base` = mediana, `peak` = 97-protsentil (`:158–159`); chegaralar shularga
nisbatan: `fill = base + 0.42·span`, `low = base + 0.22·span` (`:127 _choose`); ikkinchi doiracha eng
qoraning 70% idan yuqori bo'lsa "ikki belgi" bayrog'i (`:138`). Doiracha markazi 0,9 mm gacha siljishi
mumkin — 9 nuqtali oynada eng qora joy olinadi (`:117 _OFFSETS`, `:122 _bubble_ink`). Noaniq kataklar
`confidence` va `flags` orqali o'qituvchiga chiqadi, jim xato qilinmaydi (`:192`).

## 4. Bosma varaq qirqilganda mazmun kesilib ketardi

**Muammo:** A4 dan 4 ta A6 kartochka qirqiladi. Ofis printerida old/orqa tomon 1–3 mm siljiydi,
qo'lda qirqishda yana 1–2 mm xato, ustiga printer varaq chetidagi ~5 mm ga umuman bosa olmaydi.
**Yechim:** `app/layout.py:15 CUT_SAFE = 8.0` va `:16 MARKER_SAFE = 10.0` (markerlarga kengroq chekka —
butun skanerlash ularga bog'liq). Javob bloki gorizontal markazda (`:79 BLOCK_X`): chap va o'ng chekka
**bir xil**, duplex qaysi tomonga siljishidan qat'i nazar hech narsa yo'qolmaydi. **Qo'riqchi:**
`:83 safety_report()` raqamlarni qaytaradi, `tests/test_ai_grading.py:217` har testda tekshiradi.

## 5. Uy vazifasi tahlili o'qituvchini kutishga majbur qilardi

**Muammo:** Vision chaqiruvi bir necha soniya davom etadi. 25 o'quvchining daftarini ketma-ket suratga
olayotgan o'qituvchi har safar kutib turishi kerak edi.
**Yechim:** Surat saqlanadi, javob **darhol** qaytadi, tahlil fonga uzatiladi —
`app/service.py:31 _BG = ThreadPoolExecutor(max_workers=3)`, yuborish `:1016 _BG.submit(...)`. Holat
`homework.status` da: `yuklandi → navbatda → tayyor | xato`. Frontend faqat navbatda ish bor paytda
so'raydi (`HomeworkPanel.tsx:16` — `pending > 0` bo'lsa 2500 ms), bo'sh polling yo'q. Fon ishi ilovani
yiqitmaydi: `app/service.py:1157 except Exception` — xato o'qituvchiga xabar bo'ladi. Commit `595fb3f`.

## 6. Kartochka surati uy vazifasi deb qabul qilinardi

**Muammo:** O'qituvchi adashib diagnostika kartochkasini yoki bo'sh darslik betini uy vazifasi sifatida
yuklaydi — AI unga baribir "mashqlar" topib beradi.
**Yechim — uch qavat:** (1) **kod, AI dan oldin** — har bet `omr.scan_image` dan o'tadi, bizning ArUco
markerlarimiz topilsa AI ga umuman yuborilmaydi (`app/service.py:1134–1139`); (2) **AI ning o'zi sahifa
turini aytadi** — `daftar | kartochka | darslik | boshqa` (`app/llm.py:553 HOMEWORK_SYSTEM`), `daftar`
bo'lmasa masalalar ro'yxati bo'sh qoladi (`:589`); (3) chegaradagi suratda **bir marta qayta so'raladi**
(`app/service.py:1143`), keyin aniq xabar beriladi (`:962 PAGE_MESSAGE`).
**Test:** `tests/test_ai_grading.py:258` — kartochka surati yuborilsa `status == "xato"` bo'lishi shart.

## 7. LLM masala matniga o'zidan son qo'shar, masofani noto'g'ri shaharga bog'lardi

**Muammo:** "300 km" masalasini AI "Urganch – Xiva" (aslida 35 km) deb yozardi va matnga yil, soat kabi
keraksiz sonlar qo'shardi — bu **masala mantiqini** buzadi.
**Yechim — generatsiyadan keyin qat'iy validatsiya:** `app/llm.py:112 PLACE_PAIRS` da masofa oralig'iga
mos shaharlar juftlari oldindan yozilgan, promptga faqat mos juftlar beriladi (`:120 place_pairs`);
`:157` — matndagi sonlar to'plami kutilganiga **aynan teng** bo'lishi shart, aks holda javob rad etilib
shablon matn ishlatiladi; `:159` — masala javobi matn ichida chiqib qolmaganini tekshiradi; `:169–173` —
AI tanlagan shaharlar ro'yxatda bormi va matnda uchraydimi. **AI javobi ishonchsiz manba deb qaraladi.**

## 8. Demo bazasini yangi ustun buzardi

**Muammo:** `Base.metadata.create_all` mavjud jadvalga ustun qo'shmaydi. Serverda yangi versiya chiqqach
`UndefinedColumn` xatosi chiqardi; bazani tozalash esa demo ma'lumotni yo'q qiladi.
**Yechim:** `app/db.py:54 NEW_COLUMNS` — jadval → ustun → dialekt bo'yicha DDL; ishga tushganda
`inspect(engine)` bilan solishtirilib yetishmagani `ALTER TABLE ... ADD COLUMN` bilan qo'shiladi (`:63`).

## 9. `/api/demo/reset` ochiq internetda turardi

**Muammo:** Sayt demo uchun ochiq. `POST /api/demo/reset` va `POST /api/curriculum/reset` bazani
tozalaydi — havolani bilgan har qanday odam demoni suhbat o'rtasida o'chirib yuborishi mumkin edi.
**Yechim:** `app/main.py:187 require_user` — `Authorization: Bearer` tekshiriladi, bo'lmasa 401; ikkala
reset endpointida `Depends(require_user)` (`:621`, `:663`). Fayl endpointida yo'l qo'riqlanadi: faqat
`scans/`, `pdf/`, `homework/`, `workbook/` prefikslari, `..` taqiqlangan (`:577`); testi
`tests/test_api.py:90`, commit `c961b8a`.

## 10. Model `reasoning_effort` ni qo'llamasa — butun chaqiruv yiqilardi

Sozlamada `OPENAI_REASONING_EFFORT` bor (`app/config.py:28`), lekin har model uni qabul qilmaydi →
`BadRequestError` va feedback umuman yozilmaydi. `app/llm.py:79–83` — xato aynan `reasoning` haqida bo'lsa,
parametr olib tashlanib chaqiruv **bir marta qayta** yuboriladi; qolgan uzilishlarda `None` qaytadi va
tizim shablon matnga o'tadi (`:91`) — demo qulamaydi.

# Mentor savol bersa

**1. "Suratni kim o'qiydi — AI mi?"**
Yo'q. `app/omr.py:196 scan_image` — sof OpenCV: ArUco markerlar → `getPerspectiveTransform` →
doirachalardagi siyoh zichligi. AI ishtirok etmaydi: tekin, oflayn, takrorlanuvchi.

**2. "Bitta burchak ko'rinmasa nima bo'ladi?"**
`app/omr.py:60 _from_three` 4-burchakni hisoblaydi, `:68 _plausible` natijani geometriyaga solishtiradi;
4 ta marker topilganda ham 5 variant taqqoslanadi (`:84 _complete`) — noto'g'ri topilgan marker
yo'qolganidan xavfliroq. Xato 0.6 dan katta bo'lsa chiziq rad etiladi.

**3. "Doiracha to'ldirilganini qanday bilasiz? Chegara qotirilganmi?"**
Yo'q, chegara **har suratga moslashadi**: chiziq medianasi (`base`) va 97-protsentili (`peak`)
olinadi (`app/omr.py:158–159`), chegaralar shularga nisbatan (`:127 _choose`). Qotirilgan chegara
haqiqiy bosilgan kartochkada yorug'lik va ruchka rangi tufayli sinadi — sinab ko'rganmiz.

**4. "AI javobiga qanchalik ishonasiz?"**
Umuman ishonmaymiz. Har javob validatsiyadan o'tadi: masala matnida sonlar to'plami (`app/llm.py:157`),
feedbackda uch maydon ham bo'sh emasligi (`:298`), uy vazifasida sahifa turi va mashq tuzilishi
(`:586–597`). Mos kelmasa — shablon matn yoki `None`.

**5. "Deploy qilganmisiz? Qanday to'siqqa uchradingiz?"**
Ha — **https://darspilot.com**: Cloudflare Registrar domeni, DNS A-yozuvi VPS ga (189.74.97.73), Docker
Compose `db` + `api` + `web` (nginx), Let's Encrypt, HTTP→HTTPS 301, cron bilan avtomatik yangilanish,
`GET /api/health` → `{"ok":true}`. To'siq: CPU `x86-64-v1` — numpy/opencv import paytida yiqildi, MinIO
ham ko'tarilmadi; `Dockerfile:3 ARG PY`, `:16 ARG REQ`, `requirements-oldcpu.txt` va `app/storage.py:77`
bilan **ilova kodiga tegmasdan** yechildi.

**6. "Frontend testlari bormi? CI bormi?"**
Frontend testlari yo'q, CI ham hali yo'q — backendda 47 test bor, har commit oldidan qo'lda `pytest -q`
+ `npm run check`. Reja: GitHub Actions, keyin Vitest + Testing Library (`ScanPanel`, `HomeworkPanel`).

**7. "Migratsiya qanday? Alembic bormi?"**
Alembic yo'q. `app/db.py:54 NEW_COLUMNS` — yangi ustunlar `ALTER TABLE` bilan (3 jadval, 5 ustun); sxema
tubdan o'zgarsa `:79 _upgrade_if_needed` demo jadvallarni qayta yaratadi (AI jurnali saqlanadi). MVP
yechimi — pilot maktabdan oldin Alembic kerak.

**8. "TypeScript qanday sozlangan?"**
`web/tsconfig.app.json:21` — `strict: true`, ustiga `noUnusedLocals` (`:23`), `noUnusedParameters` (`:24`),
`noFallthroughCasesInSwitch` (`:26`), `verbatimModuleSyntax` (`:14`). `npm run check` — **0 xato**.
Kamchilik: `web/src/lib/types.ts` qo'lda yozilgan — keyingi qadam `openapi-typescript`.

**9. "Bundle hajmi? Kuchsiz telefonda ishlaydimi? Animatsiyalar bezakmi?"**
Boshlang'ich yuk **≈176 KB gzip**; three.js — **145 KB alohida chunk**, faqat `/sinf` va natijalar
sahifasida `lazy()` bilan (`pages/ClassMap.tsx:13`, `Results.tsx:13`) — asosiy oqim (surat yuklash) 3D
talab qilmaydi. Animatsiya bezak emas: sharning markazdan uzoqligi = e'tibordan beri o'tgan darslar soni;
himoyasi — reduced-motion, WebGL fallback, `visibilitychange`, `dispose()`.

**10. "Kod review va git qanday yuritilyapti?"**
Public repo, mazmunli commitlar (o'zbekcha, sabab va oqibat bilan — `git log` da ko'rinadi).
Har commit oldidan qo'lda `pytest -q` + `npm run check`. Avtomatlashtirish (CI) — keyingi qadam.

**11. "Global state nima bilan?"**
Server holati — TanStack Query (kesh, invalidatsiya). Redux yo'q: global holat deyarli yo'q. Polling
faqat fon ishi ketayotganda yoqiladi (`HomeworkPanel.tsx:16` — `pending > 0` bo'lsa 2500 ms).

**12. "Og'ir ish serverni bloklaydimi?"**
Yo'q. Endpointlar `app/main.py:37 _run` orqali `run_in_threadpool` ga uzatiladi; uy vazifasi tahlili
umuman alohida: `app/service.py:31 _BG = ThreadPoolExecutor(max_workers=3)`, javob darhol qaytadi.

**13. "Shaxsiy ma'lumot? AI ga nima yuboriladi?"**
Ism **yuborilmaydi** — faqat kod (`5B-17`) va agregat statistika (`app/llm.py:5`). Ovoz saqlanmaydi,
faqat matnga aylantiriladi. Parol PBKDF2-SHA256, **200 000 iteratsiya** (`app/auth.py:18 ITERATIONS`).

**14. "Sayt ochiq — bazani begona odam tozalab yuborishi mumkinmi?"**
Yo'q: reset endpointlari kirishni talab qiladi (`app/main.py:187 require_user`, `:621`, `:663`),
fayl endpointida yo'l prefiksi va `..` tekshiriladi (`:577`), testi `tests/test_api.py:90`.

**15. "Bir xil surat ikki marta yuklansa?"**
`Response` kaliti `(diagnostic_id, student_id)` — qator yangilanadi (`app/service.py:424–430`); skaner
ro'yxatida qaysi surat "oxirgi" bo'lgani ko'rinadi (`tests/test_ai_grading.py:249`); suratni o'chirish
javoblarni o'chirmaydi (`app/service.py:446`).

**16. "Kod monolit — keyin ajratasizmi?"**
Bu miqyosda bitta jarayon kamroq nosozlik nuqtasi. OMR, PDF, AI va geometriya allaqachon alohida
modul va bir-biriga to'g'ridan-to'g'ri bog'lanmagan — kerak bo'lsa ajratish mexanik ish.

**17. "Nega React, Vue emas?"**
Jamoa tajribasi va three.js/TanStack ekotizimi. Lekin arxitektura API-first: 81 endpoint
(`app/main.py`), frontend almashtirilsa ham backend o'zgarmaydi — **qaytariladigan qaror**.

**18. "Model tanlovini nimaga asoslagansiz?"**
O'lchov bilan (`app/config.py:29–31`): vizual baholashda og'ir model ~100 s, tez model ~5 s, sifat farqi
sezilmadi — sinfda 30 tagacha surat bor. Ko'p o'quvchiga feedback ham tezroq modelda (`app/llm.py:291`).

**19. "AI qancha ishlatilyapti — buni ko'rsata olasizmi?"**
Ha, `/ai` sahifasi: har chaqiruv `llm_calls` ga yoziladi — maqsad, model, soniya, tokenlar, xato
(`app/llm.py:34 _log`, `:87`). Jurnalga yozolmaslik asosiy ishni to'xtatmaydi (`:42`).

**20. "Demo suratlar soxtami? Mashq daftari beti qayerdan olinadi?"**
Demo suratlar **haqiqiy zanjirdan o'tadi**: `app/simulate.py:115 make_photo` sun'iy "telefon surati"
(egilish, shovqin, soya) yasaydi va u boshqa suratlar kabi `omr.scan_image` ga tushadi. Mashq daftari beti
rejadagi bosma bet raqamlaridan ("31–34") olinadi: `app/workbook.py:70 parse_pages` → `:96 page_jpeg`
(pymupdf, 150 dpi, keshlanadi, `app/service.py:917`). Uy vazifasi demosi haqiqiy betga javoblarni yozadi,
xato javob — amallar tartibi buzilgan natija (`app/service.py:1040`, `app/workbook.py:223`).

# Oxirgi kunda qo'shilganlar

Hammasi git tarixida (`git log --oneline`), commit vaqtlari bilan:

| Commit | Vaqt | Nima qo'shildi |
|---|---|---|
| `026e3a9` | 18.09 22:10 | **Eski protsessorli server uchun yig'ish varianti** — `requirements-oldcpu.txt`, `Dockerfile` da `PY`/`REQ` argumentlari |
| `595fb3f` | 18.09 22:10 | **Skaner navbati va uy vazifasi fon rejimi** — surat avval omborga tushadi (`Scan.status`), har suratda kim o'qilgani ko'rinadi; ArUco oldindan tekshiruvi; `ALTER` migratsiya |
| `7463563` | 18.09 22:10 | **Ovozli dars tahlili** — `POST /api/lessons/{id}/debrief/voice\|text`, `DELETE /debrief`; `lessons.debrief` ustuni; `VoiceDebrief.tsx` (207 satr) |
| `09bc4f2` | 18.09 22:10 | **Mobil ko'rinish** — gorizontal siljish yo'qotildi, modal `dvh` + safe-area, `viewport-fit=cover`, barmoq uchun katta tugmalar |
| `c961b8a` | 19.09 09:22 | **`demo/reset` himoyasi** (`require_user`), demo kuni BSB/ChSB ga tushmaydi, "Demo daftar surati" |
| `49c7f00` | 19.09 10:34 | **Mashq daftari betlari va ko'p betli uy vazifasi** — `app/workbook.py` (249 satr): AHA! mashq daftari PDF sidan bet rasmi; bitta o'quvchiga 6 betgacha surat; demo surati haqiqiy betdan yasaladi |
| — | 19.09 | **Prod deploy** — darspilot.com domeni, VPS, Let's Encrypt HTTPS, eski CPU uchun build varianti va lokal fayl ombori |

**Uch gap bilan:** (1) loyiha **jonli manzilda** ishlaydi — mentor telefonidan ochib ko'rishi mumkin;
(2) o'qituvchi suratga olishda kutmaydi — navbat va fon oqimi; (3) uy vazifasi haqiqiy mashq daftari
betidan tekshiriladi.
