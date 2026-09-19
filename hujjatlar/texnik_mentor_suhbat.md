# CP2 — texnik mentor bilan suhbat (Fractal · DarsPilot)

Ishchi hujjat: suhbat paytida ochiq turadi. Har bir raqam va `fayl:satr` koddan tekshirilgan (19-sentabr).
Mentor: **Yaxshimurodov Jaloladdin**, **14:20**. Loyihani birinchi marta ko'radi. CP2 — yakuniy balning **60%** i.

## Ochilish (30–40 soniya)

> "Fractal, DarsPilot. Ta'lim treki, **2-ustuvor mavzu — avtomatik baholash va feedback**.
> **Muammo:** 5-sinf matematika o'qituvchisida 3 sinf, ~90 o'quvchi. Har bolaning ishini ko'rib izoh yozish
> jismonan imkonsiz — bola "5/7" oladi, **qaysi qadamda adashganini bilmaydi**.
> **Yechim:** dars konveyeri. Tizim rejadan bugungi mavzuni oladi, har o'quvchiga o'z darajasida masala
> generatsiya qiladi, A4 da 4 ta kartochka bosadi. O'qituvchi ishlarni **bitta telefon surati** bilan oladi,
> tizim javoblarni o'qiydi, xatoni **nomlab** beradi va keyingi kartochkaga bosiladigan izoh yozadi. Uy
> vazifasi — mashq daftari beti suratdan tekshiriladi.
> **Chegarani birinchi aytaman:** javobni **kod** o'qiydi, AI emas — baho `app/grading.py` dan chiqadi,
> AI faqat matn yozadi. Sayt jonli: **https://darspilot.com**, hoziroq ko'rsataman."

## 10 daqiqalik reja

| Vaqt | Nima | Nimani ochaman |
|---|---|---|
| 0:00–0:40 | Muammo → yechim, kod/AI chegarasi | "Ochilish" |
| 0:40–1:00 | Sayt jonli: **https://darspilot.com**, HTTPS, demo kirish | brauzer manzil qatori |
| 1:00–3:00 | **Demo:** dars → kartochka PDF → surat → 10 ta ish o'qildi → feedback | `darspilot.com/dars/:id` |
| 3:00–4:00 | **Uy vazifasi:** daftar beti → surat → fonda AI → o'qituvchi tasdiqlaydi | `HomeworkPanel` |
| 4:00–4:45 | **Ovozli tahlil:** 20 soniya gap → tuzilgan xulosa | `VoiceDebrief` |
| 4:45–6:15 | Arxitektura: 13 qadam, kod/AI chegarasi, `app/layout.py` yagona geometriya | 1-bo'lim |
| 6:15–7:15 | **Deploy:** domen, VPS, HTTPS, eski CPU muammosi | "Deploy" bo'limi |
| 7:15–10:00 | **Savollar** | "Mentor savol bersa" |

> Brauzerda oldindan ochiq tursin: `https://darspilot.com`, kirish `demo@darspilot.uz` / `demo1234`
> (`app/auth.py:128 ensure_demo_user`). Internet sekin bo'lsa lokal `docker compose` nusxasi tayyor; AI kalitsiz
> ham tizim shablon matnlar bilan ishlaydi (`app/llm.py:22 enabled`) — demo qulamaydi.

# 1) Texnik amalga oshirish

**U nimani qidiradi:** zanjir uchidan-uchiga ishlaydimi, qaysi qadam kod, qaysi qadam AI.

## Uchidan-uchiga zanjir: 13 qadam

| # | Qadam | Kim | Fayl:satr |
|---|---|---|---|
| 1 | Taqvim-mavzu rejadan bugungi dars va mavzu | KOD | `app/aha_plan.py:65 LESSONS` (170 dars), `app/curriculum_plan.py:50` |
| 2 | Dars formati: diagnostika kunimi, guruh ishimi | KOD | `app/conveyor.py:47 plan_format` |
| 3 | Har o'quvchiga 4 darajadan biri, sonlar va distraktorlar | KOD | `app/problems.py:600 generate`, `:44 _mc` |
| 4 | Masala shartini hayotiy matnga aylantirish (4 daraja parallel) | **AI** | `app/llm.py:124 write_story`, `:198 enrich_problems` |
| 5 | AI matnini tekshirish: ortiqcha son, shahar juftligi masofaga mosmi | KOD | `app/llm.py:157`, `:169`, `:120 place_pairs` |
| 6 | A4 → 4 ta A6 kartochka, javob bloki, ArUco markerlar | KOD | `app/pdfgen.py`, `app/layout.py:23 MARKER_POS` |
| 7 | Telefon surati omborga tushadi (navbat) | KOD | `app/service.py:362 store_photo` |
| 8 | ArUco → perspektivani tekislash → doirachalarni o'qish | KOD | `app/omr.py:196 scan_image` |
| 9 | Baho, bosqichli tashxis, asosiy xato kodi | KOD | `app/grading.py:9 grade` |
| 10 | O'quvchi / ota-ona / o'qituvchi uchun matn | **AI** | `app/llm.py:281 student_feedback` |
| 11 | Jurnal bali (formativ 0–10 yoki BSB max) | KOD | `app/grading.py:69 formative_points` |
| 12 | Uy vazifasi: mashq daftari beti suratdan tekshiriladi | **AI (vision)** | `app/llm.py:570 check_homework` |
| 13 | Ovozli tahlil → xulosa → keyingi dars ssenariysi | **AI** + KOD | `app/conveyor.py:534`, `app/llm.py:344 compose_lesson` |

**Asosiy tamoyil (`app/llm.py:4` izohi):** *"LLM hech qachon sonlarni va to'g'ri javobni hal qilmaydi (bular kodda). U faqat matn yozadi."* — 13 qadamdan **9 tasi sof kod**, AI 4 joyda.

## Aniq raqamlar

| Nima | Qiymat | Qayerdan |
|---|---|---|
| Bitta suratdagi kartochkalar | 10 tasi 7/7 katakdan xatosiz o'qiladi | `tests/test_core.py:45 test_omr_roundtrip_ten_cards` |
| Bitta kartochkadagi katak | 6 ta test doirachasi (A–D) + 4 ustunli son panjarasi = **7 javob** | `app/layout.py:41`, `:58` |
| Tekislash aniqligi | 12 piksel / mm | `app/layout.py:72 PX_PER_MM` |
| Kirish surati chegarasi | uzun tomoni 4200 px gacha kichraytiriladi | `app/omr.py:200` |
| Jurnal raqamlari | 1–61 (marker id = jurnal × 4 + burchak) | `app/layout.py:33 MAX_JOURNAL_NO`, `app/omr.py:50` |
| Uy vazifasi | bitta o'quvchiga ko'pi bilan 6 bet | `app/service.py:1006`, `app/llm.py:585` |
| Demo bazasi | 3 sinf, 88 o'quvchi (29 + 31 + 28) | `app/seed.py:44 CLASSES` |
| HTTP endpointlar | 81 ta | `app/main.py` |
| AI chaqiruvi qancha turdi | har chaqiruv soniyasi bilan yoziladi, `/ai` sahifasida ko'rinadi | `app/llm.py:34 _log`, `:87` |

**Ishonchlilik o'lchanadi:** `app/service.py:582 scan_quality` — avtomatik o'qilgan (`auto_pct`), tuzatilgan (`accuracy_pct`), o'zgarishsiz ketgan feedback (`feedback_kept_pct`).

# 2) Kod tayyorligi

**U nimani qidiradi:** boshqa dasturchi davom ettira oladimi.

| Nima | Qiymat |
|---|---|
| Jami test | **47** (32 funksiya; `test_generator_valid` 4 shablon × 4 daraja = 16) |
| Fayllar | `tests/test_core.py`, `test_api.py`, `test_ai_grading.py`, `test_conveyor.py`, `test_features.py`, `test_auth_chat.py` |
| Tashqi bog'liqlik | **yo'q** — SQLite, lokal ombor, `OPENAI_API_KEY=""` (`tests/conftest.py:6–12`); sana qotirilgan `DARSPILOT_TODAY=2026-09-17` (`:12`) |
| Generator tekshiruvi | 4 shablon × 4 daraja × **200 seed = 3200 masala**: har savolda 4 variant, bitta to'g'ri, har noto'g'risida xato kodi (`tests/test_core.py:14–25`) |

Eng qimmatli 4 test: `tests/test_core.py:45` — butun OMR zanjiri (10 kartochka → surat → javoblar aynan mos); `tests/test_ai_grading.py:217`
— bosma geometriyasi qirqish va duplexda buzilmaydi; `:258` — kartochka surati uy vazifasi o'rniga rad etiladi; `:28` — javobni faqat kod o'qishi.

**Struktura:** `app/main.py` (81 endpoint, mantiq yo'q, xatoni HTTP kodga aylantiradi — `:28 _wrap`) → `app/service.py` / `app/conveyor.py`
(biznes mantiq) → `app/omr.py` · `app/llm.py` · `app/pdfgen.py`; og'ir ish event loopni bloklamaydi (`app/main.py:37 _run` → `run_in_threadpool`).
Frontend: 54 ta `.ts/.tsx`, **`strict: true`** (`web/tsconfig.app.json:21`) + `noUnusedLocals` (`:23`), `noUnusedParameters` (`:24`),
`noFallthroughCasesInSwitch` (`:26`); `npm run check` = `tsc -b && oxlint src` → **0 xato**; build 2459 modul, 603 ms.

**Yagona geometriya:** `app/layout.py` (92 satr) — o'lchamlar bitta joyda; undan `app/pdfgen.py` (chizadi), `app/omr.py` (o'qiydi),
`app/simulate.py` (demo surat) o'qiydi; doiracha koordinatasi faqat `layout.test_bubble` / `layout.grid_bubble` orqali — PDF bilan
skaner ajralib qolmaydi, `:83 safety_report()` chekkalarni raqam bilan qaytaradi. **Migratsiya:** `app/db.py:54 NEW_COLUMNS` →
`ALTER TABLE` (`:63 _add_missing_columns`), demo ma'lumot yo'qolmaydi; 3 jadval, 5 ustun (`scans.journal_nos`, `scans.status`,
`homework.status`, `homework.image_keys`, `lessons.debrief`), PostgreSQL `JSONB`, SQLite `JSON`.

> **So'ralsa (o'zimiz mavzu ochmaymiz):** CI hali yo'q — har commit oldidan qo'lda `pytest -q` +
> `npm run check`, GitHub Actions birinchi vazifa. Frontend testlari yo'q — Vitest rejada.

# 3) Yechimning innovatsionligi

1. **Javobni AI emas, kod o'qiydi — ataylab qilingan qaror.** Bir xil surat har safar bir xil ball: baho **takrorlanuvchi va
   tushuntiriladigan**; chegara test bilan qotirilgan (`tests/test_ai_grading.py:28`).
2. **Distraktorlar tasodifiy emas.** Har noto'g'ri variant aniq tushuncha xatosiga bog'langan
   (`app/problems.py:44 _mc`). Natija "5/7" emas, "**amallar tartibi buzilgan**" (`app/llm.py:246 STUDENT_NOTE`).
3. **Bosqichli tashxis, ballar yig'indisi emas.** 7 savol — yechishning 7 bosqichi; `app/grading.py:37–53`
   uzilish joyini topadi; talqin + tayanch birga xato bo'lsa "muammo tayanch bilimda" (`root_cause_note`).
4. **Feedback qog'ozga qaytadi.** Matn murojaatsiz, 3-shaxsda (`app/llm.py:230`) — keyingi kartochkaning old
   tomoniga bosiladi, o'quvchida qurilma va internet kerak emas.
5. **Ovoz — kod va AI birgalikda.** Ismni AI topmaydi: kirill→lotin, qo'shimchalar tozalanadi, `difflib` 0.84
   o'xshashlik (`app/conveyor.py:436 match_names`, `:450`); AI faqat xulosa tuzadi (`app/llm.py:492 lesson_debrief`).
6. **AI sifati o'lchanadi.** `/ai` sahifasi — chaqiruv maqsadi, modeli, soniyasi, xatosi; `scan_quality` —
   o'qituvchi nechta katakni tuzatgani. Da'vo emas, **raqam**.

# 4) Jamoaning bilim darajasi

## "Nega bu vosita, nega muqobil emas"

| Qaror | Nega shu | Nega muqobil emas | Dalil |
|---|---|---|---|
| **Python monolit** | Bitta jarayonda CV + AI + PDF | Node.js da ArUco darajasidagi CV yo'q; ajratilsa 2 deploy, 2 nosozlik nuqtasi | `requirements.txt` — 14 paket |
| **FastAPI** | async I/O (AI 5–100 s), avtomatik `/api/docs`, Pydantic | Django — ORM/admin kerak emas; Flask — async va sxema qo'lda | `app/main.py:24` |
| **ArUco, QR emas** | marker id = jurnal raqami; 8×8 mm; oflayn; 4 burchak perspektivani beradi | QR: ko'p joy, faqat identifikator, geometriya bermaydi | `app/layout.py:32`, `app/omr.py:50` |
| **O'z OMR imiz** | Geometriya `layout.py` da; chegaralar har suratga moslashadi | Tayyor kutubxonalar qat'iy shablon va skaner sifatini talab qiladi | `app/omr.py:127 _choose` |
| **ReportLab, HTML→PDF emas** | Millimetr aniqligi: marker 8 mm, doiracha r=2,4 mm | Brauzer masshtabi va marja OMR geometriyasini buzadi | `app/layout.py:48`, `app/pdfgen.py` |
| **PostgreSQL + JSONB** | AI javoblari o'zgaruvchan tuzilma; hisobot uchun SQL qoladi | To'liq NoSQL — jurnal va baholarga tranzaksiya kerak | `app/db.py:55–59` |
| **SQLAlchemy 2.0** | Bir xil kod testlarda SQLite, prodda PostgreSQL | Raw SQL — ikki dialektga ikki xil kod | `app/db.py:11–14` |
| **Fayl ombori interfeys ortida** | `storage.put/get/exists/delete` — MinIO yoki lokal papka | Bazada BYTEA — backup og'irlashadi, baza shishadi | `app/storage.py:77` |
| **React 19 + Vite** | Jamoa tajribasi, three.js/TanStack ekotizimi | Vue ham mos; arxitektura API-first, frontend qaytariladigan qaror | `web/package.json` |
| **TanStack Query, Redux emas** | Holatning 95% i — server holati (kesh, invalidatsiya, fon) | Redux: global holat deyarli yo'q, keraksiz murakkablik | `HomeworkPanel.tsx:16 refetchInterval` |
| **oxlint, ESLint emas** | Bir necha barobar tez, `npm run check` bir soniyada | ESLint konfiguratsiyasi bu hajmga ortiqcha | `web/package.json:11` |
| **Tez model vizual baholashda** | O'lchov: og'ir model ~100 s, tez model ~5 s, sifat bir xil | Og'ir modelda bitta sinf 50 daqiqa | `app/config.py:29–31` |

> **Chegaralar (so'ralsa):** kartochka qattiq burchilsa o'qilmaydi — 4 burchakdan kamida 3 tasi kerak (`app/omr.py:84`);
> daftar tekshiruvi AI ga bog'liq, natija o'qituvchi tasdig'idan o'tadi (`app/service.py:1175 confirm_homework`).

# 5) Texnologiyalar to'plami

## Backend

| Kutubxona | Versiya | Nima qiladi va nega shu |
|---|---|---|
| FastAPI | 0.141.1 | 81 endpoint; Pydantic so'rovni tekshiradi, og'ir ish `run_in_threadpool` ga; async + avtomatik OpenAPI |
| uvicorn | 0.53.0 | ASGI server, konteynerda `--host 0.0.0.0 --port 8000`; FastAPI ning standart jufti |
| SQLAlchemy | 2.0.54 | ORM; `db.session()` kontekst menejeri — commit/rollback/close bitta joyda (`app/db.py:18`) |
| psycopg (binary) | 3.3.5 | `postgresql+psycopg://`; psycopg2 ga nisbatan yangi, binary — kompilyatsiya kerak emas |
| opencv-python-headless | 5.0.0.93 (serverda 4.10) | ArUco, `getPerspectiveTransform` + `warpPerspective` → 12 px/mm tekis rasm; headless — GUI kutubxonalari kerak emas |
| numpy | 2.5.3 (serverda 1.26.4) | Piksel matematikasi: doiracha ichidagi siyoh disk maskasi bo'yicha (`app/omr.py:105 _disk_mean`) |
| reportlab | 5.0.1 | A4 PDF: kartochka, marker, doiracha — mm koordinatalarida, `layout.py` dan o'qiydi |
| pymupdf | 1.28.2 | Mashq daftari PDF idan bet rasmi: `get_pixmap(dpi=150)` → JPEG, keshlanadi (`app/workbook.py:96`); matn va koordinatani ham beradi (`:145 exercise_lines`) |
| openai | 3.14.1 | Matn, vision, transkripsiya bitta SDK da; `response_format={"type":"json_object"}`, javob validatsiyadan o'tadi |
| minio | 7.2.20 | S3-mos ombor: `storage.put/get/exists/delete` — MinIO yoki lokal papka (`app/storage.py:77`) |
| openpyxl | 3.1.5 | Baholar eksporti (.xlsx), reja importi — eMaktab API ochilmaguncha yagona yo'l |
| python-multipart | 0.0.32 | Surat yuklash (multipart/form-data), `UploadFile` — FastAPI talabi |

## Frontend — o'lchangan raqamlar

| Chunk | Xom | gzip | Qachon yuklanadi |
|---|---|---|---|
| `index` + `ui` + `hooks` + `utils` + CSS | — | **≈176 KB** (91,8 + 56,4 + 8,1 + 3,9 + 15,4) | doim |
| `common` (**three.js**) | 576,8 KB | **145,0 KB** | faqat `/sinf` va natijalar sahifasida, `lazy()` bilan |
| `Lesson` (asosiy sahifa) | 87,5 KB | 22,5 KB | `/dars/:id` ga kirilganda |
| Qolgan sahifalar | — | 1,7–5,3 KB | marshrut bo'yicha |

- 15 marshrut `lazy()` bilan (`web/src/App.tsx:12–26`); three.js faqat `pages/ClassMap.tsx:13`, `pages/Results.tsx:13`.
- Animatsiya kafolatlari: `prefers-reduced-motion` + WebGL tekshiruvi (`fx/support.ts:2`, `:4`), sahifa
  ko'rinmasa sikl to'xtaydi (`fx/common.ts:55`), unmount'da `dispose()` (`fx/common.ts:79–84`).
- Mobil: kamera to'g'ridan ochiladi — `capture="environment"` (`ScanPanel.tsx:71`, `HomeworkPanel.tsx:218`, `:242`), uy vazifasida `multiple`.

## Infratuzilma (lokal)

`docker compose up -d --build` → **5 konteyner**: `db` (postgres:16-alpine), `minio`, `minio-init` (bucket), `api` (healthcheck bilan),
`web` (node:22 → nginx:1.27, `/api` proxy). Tartib compose da: `api` — `db` sog'lom va bucket tayyor bo'lgach (`docker-compose.yml:60–64`), `web` — `api` sog'lom bo'lgach (`:71–73`).

# Deploy — sayt jonli ishlayapti

**Bu demo emas, haqiqiy prod** — suhbat paytida manzil qatorida turadi.

| Nima | Holati |
|---|---|
| Domen | **darspilot.com** (Cloudflare Registrar); `GET /api/health` → `{"ok":true}` |
| Server | DNS A-yozuvi (`@` va `www`) → **189.74.97.73**, O'zbekistondagi VPS |
| Konteynerlar | `docker compose`: `db` (postgres:16-alpine) + `api` (FastAPI/uvicorn) + `web` (nginx) |
| HTTPS | **Let's Encrypt**; `http://` → **301** → `https://`; sertifikat **cron** bilan avtomatik yangilanadi |
| Konfiguratsiya fayllari | `Dockerfile`, `requirements-oldcpu.txt`, `docker-compose.yml`, `deploy/nginx-ssl.conf` (443, sertifikat, HTTP→HTTPS) |

**Eng qiyin joyi — server protsessori eski (`x86-64-v1`, SSE4.2 yo'q):** numpy/opencv import paytida yiqilardi, MinIO ko'tarilmadi;
ikkalasi ham **ilova kodiga tegmasdan** yechildi (batafsil — quyidagi jadval, 1-band). Xulosa: "Interfeysni oldindan
ajratganimiz uchun prod kutilmagan chiqqanda kodga emas, **konfiguratsiyaga** tegdik."

# Qanday muammoni kodda qanday yechdik

| Muammo | Yechim | Qayerda (fayl:satr) |
|---|---|---|
| **1.** Prod CPU `x86-64-v1`: numpy 2.x / opencv 5.x import paytida yiqiladi; MinIO ko'tarilmadi, `api` esa `minio-init` ni kutadi — stek qotdi | Build argumentlari + eski paket to'plami (Python 3.12, numpy 1.26.4, opencv-headless 4.10.0.84); ombor interfeys ortida bo'lgani uchun MinIO lokal papkaga almashtirildi, 3 konteyner qoldi | `Dockerfile:3 ARG PY`, `:16 ARG REQ`, `requirements-oldcpu.txt`, `docker-compose.yml:63–64`, `app/storage.py:77`, `app/config.py:19 LOCAL_STORAGE_DIR`, commit `026e3a9` |
| **2.** Surat qiyshiq yoki barmoq markerni yopsa — 4 burchakdan biri topilmaydi, perspektiva tekislanmaydi | Uch qavat: parallelogramm qoidasi bilan 4-burchakni hisoblash; natijani geometriyaga solishtirish (tomonlar nisbati, konvekslik), xato 0.6 dan katta bo'lsa rad; 4 marker topilganda ham 5 variantni taqqoslash; topilmasa CLAHE bilan qayta qidirish | `app/omr.py:60 _from_three`, `:68 _plausible`, `:57 EXPECTED_RATIO`, `:96`, `:84 _complete`, `:206` |
| **3.** Qotirilgan siyoh chegarasi (`FILLED = 0.33`) haqiqiy kartochkada sinadi: yorug'lik, ruchka rangi, qog'oz turi | Avval barcha doirachalar o'lchanadi, keyin chiziqning o'z darajasi: `base` = mediana, `peak` = 97-protsentil; `fill = base + 0.42·span`, `low = base + 0.22·span`; ikkinchi doiracha eng qoraning 70% idan yuqori bo'lsa "ikki belgi"; markaz 0,9 mm siljisa 9 nuqtali oyna; noaniq katak `confidence`/`flags` bilan o'qituvchiga chiqadi | `app/omr.py:24–30`, `:158–159`, `:127 _choose`, `:138`, `:117 _OFFSETS`, `:122 _bubble_ink`, `:192` |
| **4.** A4 dan 4 ta A6 qirqilganda mazmun kesilardi: duplex 1–3 mm siljiydi, qo'l qirqishi 1–2 mm, printer chekka ~5 mm ga bosmaydi | `CUT_SAFE = 8.0` va markerlarga kengroq `MARKER_SAFE = 10.0`; javob bloki gorizontal markazda — chap va o'ng chekka bir xil, duplex qaysi tomonga siljishidan qat'i nazar hech narsa yo'qolmaydi; qo'riqchi test | `app/layout.py:15 CUT_SAFE`, `:16 MARKER_SAFE`, `:79 BLOCK_X`, `:83 safety_report()`, `tests/test_ai_grading.py:217` |
| **5.** Vision chaqiruvi bir necha soniya — 25 daftarni ketma-ket suratga olayotgan o'qituvchi har safar kutardi | Surat saqlanadi, javob darhol qaytadi, tahlil fonga: `_BG = ThreadPoolExecutor(max_workers=3)`. Holat `homework.status`: `yuklandi → navbatda → tayyor \| xato`; frontend faqat `pending > 0` bo'lsa 2500 ms so'raydi; fon xatosi ilovani yiqitmaydi | `app/service.py:31 _BG`, `:1016 _BG.submit`, `:1157 except Exception`, `HomeworkPanel.tsx:16`, commit `595fb3f` |
| **6.** Kartochka yoki darslik beti uy vazifasi deb yuklanadi — AI baribir "mashqlar" topib beradi | Uch qavat: (1) kod AI dan oldin — har bet `omr.scan_image` dan o'tadi, bizning ArUco topilsa AI ga umuman bormaydi; (2) AI sahifa turini aytadi (`daftar\|kartochka\|darslik\|boshqa`), `daftar` bo'lmasa ro'yxat bo'sh; (3) chegaradagi suratda bir marta qayta so'raladi, keyin aniq xabar | `app/service.py:1134–1139`, `app/llm.py:553 HOMEWORK_SYSTEM`, `:589`, `app/service.py:1143`, `:962 PAGE_MESSAGE`, test `tests/test_ai_grading.py:258` |
| **7.** LLM matnga o'zidan son qo'shar, "300 km" ni "Urganch – Xiva" (35 km) ga bog'lardi — masala mantiqi buziladi | Generatsiyadan keyin qat'iy validatsiya: masofa oralig'iga mos shahar juftlari oldindan yozilgan va promptga faqat shular beriladi; matndagi sonlar to'plami kutilganiga aynan teng bo'lishi shart; javob matn ichida chiqib qolmagani; shaharlar ro'yxatda bormi. Mos kelmasa — shablon matn | `app/llm.py:112 PLACE_PAIRS`, `:120 place_pairs`, `:157`, `:159`, `:169–173` |
| **8.** `create_all` mavjud jadvalga ustun qo'shmaydi → serverda `UndefinedColumn`; bazani tozalash demo ma'lumotni yo'q qiladi | `NEW_COLUMNS` — jadval → ustun → dialekt bo'yicha DDL; ishga tushganda `inspect(engine)` bilan solishtirilib yetishmagani `ALTER TABLE ... ADD COLUMN` bilan qo'shiladi | `app/db.py:54 NEW_COLUMNS`, `:63` |
| **9.** `POST /api/demo/reset` va `/api/curriculum/reset` ochiq internetda — havolani bilgan odam demoni o'chirib yuborardi | `require_user` `Authorization: Bearer` ni tekshiradi (yo'q bo'lsa 401), ikkala reset endpointida `Depends(require_user)`; fayl endpointida faqat `scans/`, `pdf/`, `homework/`, `workbook/` prefikslari, `..` taqiqlangan | `app/main.py:187 require_user`, `:621`, `:663`, `:577`, `tests/test_api.py:90`, commit `c961b8a` |
| **10.** Model `reasoning_effort` ni qabul qilmasa `BadRequestError` — feedback umuman yozilmaydi | Xato aynan `reasoning` haqida bo'lsa parametr olib tashlanib chaqiruv bir marta qayta yuboriladi; qolgan uzilishlarda `None` qaytadi va tizim shablon matnga o'tadi — demo qulamaydi | `app/config.py:28`, `app/llm.py:79–83`, `:91` |

Qo'shimcha: **1-band** — interfeys tufayli kodga emas, konfiguratsiyaga tegdik. **2-band** — noto'g'ri topilgan marker
yo'qolganidan xavfliroq, shuning uchun 4 ta topilganda ham variantlar taqqoslanadi. **6-band** — kod AI dan oldin, AI ikkinchi filtr.

# Mentor savol bersa

**1. "Suratni kim o'qiydi — AI mi?"**
Yo'q, sof OpenCV: ArUco → `getPerspectiveTransform` → doiracha siyohi (`app/omr.py:196 scan_image`). Tekin, oflayn, takrorlanuvchi.

**2. "Bitta burchak ko'rinmasa nima bo'ladi?"**
`app/omr.py:60 _from_three` 4-burchakni hisoblaydi, `:68 _plausible` geometriyaga solishtiradi (xato 0.6 dan katta — rad);
4 ta marker topilganda ham 5 variant taqqoslanadi (`:84 _complete`).

**3. "Doiracha to'ldirilganini qanday bilasiz? Chegara qotirilganmi?"**
Yo'q, har suratga moslashadi: chiziq medianasi (`base`) va 97-protsentili (`peak`) — `app/omr.py:158–159`, chegaralar
shularga nisbatan (`:127 _choose`). Qotirilgan chegara haqiqiy kartochkada sinadi — sinab ko'rganmiz.

**4. "AI javobiga qanchalik ishonasiz?"**
Umuman ishonmaymiz, har javob validatsiyadan o'tadi: masala matnida sonlar to'plami (`app/llm.py:157`), feedbackda uch
maydon ham bo'sh emasligi (`:298`), uy vazifasida sahifa turi va mashq tuzilishi (`:586–597`).

**5. "Deploy qilganmisiz? Qanday to'siqqa uchradingiz?"**
Ha — https://darspilot.com (VPS 189.74.97.73, Docker Compose, Let's Encrypt, `GET /api/health` → `{"ok":true}`). To'siq:
CPU `x86-64-v1` — `Dockerfile:3 ARG PY`, `:16 ARG REQ`, `requirements-oldcpu.txt`, `app/storage.py:77` bilan yechildi.

**6. "Frontend testlari bormi? CI bormi?"**
Ikkalasi ham yo'q; backendda 47 test, qo'lda `pytest -q` + `npm run check`. Reja: GitHub Actions, keyin Vitest.

**7. "Migratsiya qanday? Alembic bormi?"**
Alembic yo'q: `app/db.py:54 NEW_COLUMNS` — `ALTER TABLE`; sxema tubdan o'zgarsa `:79 _upgrade_if_needed` demo
jadvallarni qayta yaratadi (AI jurnali saqlanadi). Pilot maktabdan oldin Alembic kerak.

**8. "TypeScript qanday sozlangan?"**
`web/tsconfig.app.json:21` `strict: true` + `noUnusedLocals` (`:23`), `noUnusedParameters` (`:24`), `noFallthroughCasesInSwitch`
(`:26`), `verbatimModuleSyntax` (`:14`). Kamchilik: `web/src/lib/types.ts` qo'lda — keyingi qadam `openapi-typescript`.

**9. "Bundle hajmi? Kuchsiz telefonda ishlaydimi? Animatsiyalar bezakmi?"**
≈176 KB gzip; three.js alohida 145 KB, faqat `pages/ClassMap.tsx:13` va `Results.tsx:13` da — asosiy oqim 3D talab
qilmaydi. Animatsiya ma'noli: shar markazdan uzoqligi = e'tibordan chetda qolgan darslar soni.

**10. "Kod review va git qanday yuritilyapti?"**
Public repo, mazmunli o'zbekcha commitlar (sabab va oqibat bilan — `git log`); tekshiruv qo'lda, CI keyingi qadam.

**11. "Global state nima bilan?"**
TanStack Query (kesh, invalidatsiya), Redux yo'q. Polling faqat fon ishi bor paytda (`HomeworkPanel.tsx:16` — `pending > 0` → 2500 ms).

**12. "Og'ir ish serverni bloklaydimi?"**
Yo'q: `app/main.py:37 _run` → `run_in_threadpool`; uy vazifasi tahlili umuman alohida — `app/service.py:31 _BG`, javob darhol qaytadi.

**13. "Shaxsiy ma'lumot? AI ga nima yuboriladi?"**
Ism yuborilmaydi — faqat kod (`5B-17`) va agregat statistika (`app/llm.py:5`). Ovoz saqlanmaydi. Parol PBKDF2-SHA256,
200 000 iteratsiya (`app/auth.py:18 ITERATIONS`).

**14. "Sayt ochiq — bazani begona odam tozalab yuborishi mumkinmi?"**
Yo'q: reset endpointlari kirishni talab qiladi (`app/main.py:187 require_user`, `:621`, `:663`), fayl endpointida yo'l
prefiksi va `..` tekshiriladi (`:577`), testi `tests/test_api.py:90`.

**15. "Bir xil surat ikki marta yuklansa?"**
`Response` kaliti `(diagnostic_id, student_id)` — qator yangilanadi (`app/service.py:424–430`); qaysi surat "oxirgi"
bo'lgani ko'rinadi (`tests/test_ai_grading.py:249`); suratni o'chirish javoblarni o'chirmaydi (`app/service.py:446`).

**16. "Kod monolit — keyin ajratasizmi?"**
Bu miqyosda bitta jarayon kamroq nosozlik nuqtasi. OMR, PDF, AI va geometriya allaqachon alohida modul — ajratish mexanik ish.

**17. "Nega React, Vue emas?"**
Jamoa tajribasi va three.js/TanStack ekotizimi. API-first: 81 endpoint (`app/main.py`), frontend almashsa ham backend o'zgarmaydi.

**18. "Model tanlovini nimaga asoslagansiz?"**
O'lchov bilan (`app/config.py:29–31`): og'ir model ~100 s, tez model ~5 s, sifat farqi sezilmadi; feedback ham tezroq modelda (`app/llm.py:291`).

**19. "AI qancha ishlatilyapti — buni ko'rsata olasizmi?"**
Ha, `/ai` sahifasi: har chaqiruv `llm_calls` ga — maqsad, model, soniya, tokenlar, xato (`app/llm.py:34 _log`, `:87`).
Jurnalga yozolmaslik asosiy ishni to'xtatmaydi (`:42`).

**20. "Demo suratlar soxtami? Mashq daftari beti qayerdan olinadi?"**
Demo surat haqiqiy zanjirdan o'tadi: `app/simulate.py:115 make_photo` egilish/shovqin/soyali "telefon surati" yasaydi va `omr.scan_image` ga
tushadi. Daftar beti rejadagi bet raqamlaridan ("31–34"): `app/workbook.py:70 parse_pages` → `:96 page_jpeg` (pymupdf, 150 dpi, kesh —
`app/service.py:917`); demo javoblari haqiqiy betga yoziladi, xatosi amallar tartibi buzilgan natija (`app/service.py:1040`, `app/workbook.py:223`).

# Oxirgi kunda qo'shilganlar

| Commit | Vaqt | Nima qo'shildi |
|---|---|---|
| `595fb3f` | 18.09 22:10 | **Skaner navbati va uy vazifasi fon rejimi** — surat avval omborga (`Scan.status`), har suratda kim o'qilgani ko'rinadi; ArUco oldindan tekshiruvi; `ALTER` migratsiya. Shu kunda: ovozli tahlil `7463563` (`VoiceDebrief.tsx`, `lessons.debrief`) va mobil ko'rinish `09bc4f2` |
| `49c7f00` | 19.09 10:34 | **Mashq daftari betlari va ko'p betli uy vazifasi** — `app/workbook.py` (249 satr): AHA! PDF sidan bet rasmi; 6 betgacha surat; demo surati haqiqiy betdan |
| `026e3a9` / `c961b8a` | 18–19.09 | **Eski protsessorli server uchun yig'ish varianti**; **`demo/reset` himoyasi** (`require_user`), demo kuni BSB/ChSB ga tushmaydi |
| — | 19.09 | **Prod deploy** — darspilot.com, VPS, Let's Encrypt HTTPS, lokal fayl ombori |

**Uch gap bilan:** (1) loyiha jonli manzilda ishlaydi — mentor telefonidan ochib ko'rishi mumkin; (2) o'qituvchi suratga
olishda kutmaydi — navbat va fon oqimi; (3) uy vazifasi haqiqiy mashq daftari betidan tekshiriladi.
