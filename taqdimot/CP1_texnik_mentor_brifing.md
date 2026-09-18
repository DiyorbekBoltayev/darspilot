# CP1 — texnik mentor bilan suhbat (Fractal)

**Vaqt:** 18-sentabr, **14:30** — birinchi sessiya. Keyin: **15:00** soha mentori (Elmurod Quriyozov, Ta'lim),
**15:40** biznes mentori (Amirbek Ne'matilloyev). Har biri 10 daqiqa, alohida.

## Mentor kim

**Sanjar Barakayev** — Frontend Team Lead (Webase LLC / Imkon Uzbekistan, Toshkent). 10 kishilik jamoani boshqaradi,
**enterprise va davlat mahsulotlari** ustida ishlaydi; o'zi yozganidek — "arxitektura qarorlari va kod-review
standartlari". Stack: **Vue / Nuxt / TypeScript**. GitHub'da: `vue-esignature` (E-IMZO integratsiyasi), `nuxt-starter`
(jamoa uchun shablon), landing loyihalar.

**Bundan nima kelib chiqadi:**
- U React emas, **Vue** odami — "React zo'r" degan gap ishlamaydi; **qaror va uning sababi** kerak.
- Davlat/enterprise tajribasi: **saqlanuvchanlik, xavfsizlik, shaxsiy ma'lumot, integratsiya** (E-IMZO, eMaktab) —
  shu mavzular unga tanish va qadrli.
- Team lead sifatida: **kod tuzilishi, tiplash, review, testlar, boshqa dasturchi davom ettira oladimi** — asosiy savoli.
- Frontend lead sifatida: **animatsiyalar**, bundle hajmi, kuchsiz telefonda ishlash — albatta so'raydi.

## 10 daqiqani qanday taqsimlash

| Vaqt | Nima |
|---|---|
| 0:00–0:40 | Bir jumlada: "Qog'ozli ishni telefon suratidan avtomatik baholaydigan tizim. AI qayerda kerak — o'sha yerda; sonlar va ball har doim kodda." |
| 0:40–2:30 | **Jonli demo:** bugungi dars → kartochka PDF → surat → 10 ta ish 2 soniyada o'qildi → qo'lyozma yechim bahosi → feedback. Gapirmang, ko'rsating. |
| 2:30–4:30 | **HLA slaydi:** 5 konteyner, bitta compose. Ma'lumot oqimi: kod → PDF → surat → OpenCV → AI → jurnal. |
| 4:30–6:00 | **Qaror va sabablari jadvali** (nega FastAPI, nega JSONB, nega ArUco, nega React). Har qatorda "muqobil nega emas" bor. |
| 6:00–7:30 | **Kod sifati:** 45 test, TypeScript strict — 0 xato, `npm run check`, public repo, bitta buyruqda ishga tushadi. |
| 7:30–10:00 | **Savollar.** Javob bermasdan oldin "bu yerda kamchiligimiz bor" deyishdan qo'rqmang — u buni qadrlaydi. |

> Repo va demo brauzerda **oldindan ochiq** tursin: `localhost:8080` (Bugun sahifasi) va GitHub sahifasi.

## Frontend: raqamlar bilan javob (u aynan shuni so'raydi)

- **Stack:** React 19 + Vite 8 + TypeScript (`strict: true`, 0 xato) + Tailwind 4 (`@theme` tokenlari) +
  TanStack Query + react-router 8 + motion + three.js. Tekshiruv: `npm run check` (tsc + oxlint), build **1,03 s**.
- **Bundle (gzip):** boshlang'ich yuk ≈ **160 KB** (index 92 + ui 56 + CSS 14). Har sahifa alohida chunk: **2–19 KB**.
  **three.js — 145 KB alohida chunk**, faqat vizualizatsiyasi bor sahifada `lazy()` bilan yuklanadi;
  landing va boshqa sahifalar uni umuman olmaydi.
- **Holat boshqaruvi:** server holati — TanStack Query (kesh, invalidatsiya, `setQueryData`); Redux yo'q, chunki
  global holat deyarli yo'q. Sessiya va AI overlay — ikkita kichik context; auth — 40 qatorli
  `useSyncExternalStore` do'koni. Uy vazifasi fonda tahlil qilinayotganda `refetchInterval` faqat shu paytda yoqiladi.
- **Tuzilma:** `pages/` (marshrutlar), `components/ui.tsx` (dizayn primitivlari — komponent kutubxonasi ishlatilmagan),
  `components/lesson|diagnostic|landing|fx/` (funksional bloklar), `lib/` (api, tiplar, do'kon).
- **Mobil:** kartochkani suratga olish — `<input capture="environment">`, kamera to'g'ridan-to'g'ri ochiladi;
  gorizontal skroll yo'q (gridlarda aniq `grid-cols-1`), tugmalar barmoq uchun katta.

## Animatsiyalar: nega bor va nega xavfsiz

**Sabab — ular bezak emas, ma'lumot ko'rsatadi:**
- *Sinf galaktikasi*: har shar — o'quvchi; markazdan uzoqligi = **oxirgi e'tibordan beri o'tgan darslar**,
  rangi = o'zlashtirish. O'qituvchi bir qarashda "kim e'tibordan chetda qolgan"ini ko'radi.
- *Bilim oqimi*: nuqtalar bosqichli darvozalardan o'tadi — har darvozadan o'tish ehtimoli shu bosqichdagi
  to'g'ri javob foizi. Diagrammaga qaraganda tezroq tushuniladi.
- *Landing hero*: chop etish → surat → AI baho zanjirini 3 kadrda tushuntiradi (matnsiz).

**Muhandislik kafolatlari (aynan shu javob kutiladi):**
- `prefers-reduced-motion: reduce` — animatsiya to'xtaydi;
- WebGL yo'q yoki eski qurilma — statik fallback ko'rsatiladi;
- sahifa ko'rinmay qolsa `visibilitychange` bo'yicha sikl to'xtaydi (batareya);
- unmount'da `dispose()` — geometriya, material va renderer tozalanadi;
- `lazy()` + alohida chunk — animatsiya yo'q sahifalarda 0 KB.

## Kutilayotgan savollar va qisqa javoblar

1. **"Nega React, Vue emas?"** — Jamoadagi tajriba va three.js/TanStack ekotizimi. Arxitektura API-first:
   frontend butunlay almashtirilsa ham backend o'zgarmaydi. Vue bilan qayta yozish 2–3 hafta, lekin hozir sabab yo'q.
2. **"Global state nima bilan?"** — Server holati Query'da, UI holati komponentda. Redux qo'shish — keraksiz murakkablik.
3. **"Tiplar backend bilan qanday bog'langan?"** — Hozir `lib/types.ts` qo'lda yozilgan va FastAPI sxemasiga mos.
   Keyingi qadam: `/api/openapi.json` dan avtomatik generatsiya (openapi-typescript). Buni ochiq aytamiz.
4. **"Frontend testlari bormi?"** — **Yo'q, bu bizning eng zaif joyimiz.** Backendda 45 test bor.
   Reja: Vitest + Testing Library bilan ScanPanel va baholar jurnali, keyin Playwright bilan konveyer e2e.
5. **"Kuchsiz telefonda ishlaydimi?"** — Boshlang'ich yuk 160 KB; 3D faqat kerakli sahifada; reduced-motion va
   WebGL fallback bor. Sinfdagi asosiy oqim (surat yuklash) umuman 3D talab qilmaydi.
6. **"Xatolar va tarmoq uzilishi?"** — API xatolari toast va `ErrorState` bilan ko'rsatiladi; AI kaliti bo'lmasa
   shablon matnlar ishlaydi. **Ochiq kamchilik:** oflayn navbat yo'q — surat yuklashda internet uzilsa qayta urinish kerak.
   Reja: IndexedDB navbati.
7. **"Kod review, git?"** — Public repo, mazmunli commitlar, har commit oldidan `tsc + oxlint + pytest`.
   Hozircha CI yo'q — GitHub Actions qo'shish 20 daqiqalik ish, CP2 gacha qilamiz.
8. **"Xavfsizlik va shaxsiy ma'lumot?"** — AI ga ism emas, kod yuboriladi (5B-17); parol PBKDF2-SHA256 (200k iteratsiya),
   sessiya HMAC token; rol bo'yicha ko'rinishlar; hammasi Docker'da — mahalliy serverga ham o'rnatiladi.
9. **"eMaktab bilan integratsiya?"** — Hozir Excel eksport. Rasmiy API ochilsa — to'g'ridan-to'g'ri; E-IMZO kabi
   davlat integratsiyalarida sizning tajribangiz biz uchun qiziq (savol berish uchun yaxshi joy).
10. **"Nega monolit?"** — Bu miqyosda bitta jarayon: kamroq nosozlik nuqtasi. OMR, PDF va AI allaqachon alohida
    modul — ajratish kerak bo'lsa oson.

## Undan nima so'rash kerak (oxirgi 1 daqiqa)

- "Enterprise loyihada frontendni qanday tuzasiz — bizda `ui.tsx` yetarlimi yoki dizayn tizimini ajratish kerakmi?"
- "Davlat mahsulotlarida ma'lumot maxfiyligi bo'yicha qanday talablarga duch kelgansiz?"
- "Bizning holatda frontend testlarini qayerdan boshlagan bo'lardingiz?"

Bu savollar unga "jamoaning bilim darajasi" mezoni bo'yicha kuchli taassurot qoldiradi — mentor gapirishni yaxshi ko'radi.

## Aytmaslik kerak

- "Raqobatchimiz yo'q", "hammasini o'zimiz yozdik, kutubxona ishlatmadik" (to'g'ri emas va foydasi yo'q).
- Birinchi daqiqada model nomlari va token narxlari haqida gapirish — avval demo.
- Kamchilikni yashirish: u 10 kishilik jamoani boshqaradi, yashirilgan narsani baribir ko'radi.
  "Bu bizda yo'q, sababi shu, rejamiz bu" — eng kuchli javob.

---

# 10 ball uchun: mezon-ma-mezon nima aytish kerak

Texnik mentor **5 ta mezonni 1–10 ball** bilan baholaydi, uning bali = yig'indi ÷ 5.
Ustuvor mavzu tanlangani uchun **+2 qo'shimcha ball** beriladi — buni birinchi 20 soniyada aytib qo'ying:
> "Biz Ta'lim trekining **2-ustuvor mavzusini** tanladik — AI yordamida avtomatik baholash va feedback.
> Bu qo'shimcha funksiya emas, mahsulotning o'zagi."

## 1) Texnik amalga oshirish

**U nimani qidiradi:** ishlaydimi, uchidan-uchiga tugallanganmi, yoki slayddagi va'dami.

**Aytiladigan gap:**
> "Zanjir to'liq ishlaydi: taqvim reja → 4 darajali variant → PDF → chop → surat → OMR → baho → feedback →
> jurnal → keyingi dars ssenariysi. Bugun ertalab birinchi marta **haqiqiy bosilgan kartochka** bilan sinadik:
> kamchilik chiqdi — kartochka eski geometriya bilan bosilgan edi, shuning uchun son panjarasi siljidi.
> Sababini topdik, o'qishni moslashuvchan chegaralarga o'tkazdik va hozir uchta real suratning ikkitasi
> 100% to'g'ri o'qiladi."

**Ko'rsatiladigan raqamlar:** 1 suratda 10 kartochka · o'qish ~2 s · 10 o'quvchini to'liq baholash 26 s ·
kataklarning 99,5% avtomatik.

## 2) Kod tayyorligi

**U nimani qidiradi:** boshqa dasturchi davom ettira oladimi; testlar, tiplar, struktura, git.

**Aytiladigan gap:**
> "45 ta pytest testi tashqi servissiz o'tadi — SQLite va lokal fayl ombori bilan, AI o'chiq rejimda.
> Frontendda TypeScript **strict** yoqilgan, 0 xato; `npm run check` bitta buyruqda tsc va oxlintni yuritadi.
> Geometriya bitta manbada: PDF chizish, skaner va sinov generatori `layout.py` dan oladi, shuning uchun
> ular hech qachon ajralib qolmaydi. Chop etish chekkalari ham test bilan qo'riqlanadi."

**Kamchilikni o'zingiz ayting (bu ball qo'shadi):**
> "Frontend testlari hali yo'q va CI qo'yilmagan. Reja: Vitest bilan ScanPanel va baholar jurnali,
> keyin GitHub Actions — CP2 gacha."

## 3) Yechimning innovatsionligi

**Aytiladigan to'rt gap (eng kuchli tomonimiz):**
1. "Bitta suratdan **ikki xil baholash**: klassik kompyuter ko'rish yopiq javobni o'qiydi, xuddi shu ArUco
   markerlar bilan yechim maydoni kesilib vizual AI ga beriladi — qo'shimcha skaner ham, ikkinchi surat ham kerak emas."
2. "Distraktorlar tasodifiy emas: har bir noto'g'ri variant aniq tushuncha xatosiga bog'langan, shuning uchun
   natija '5/7' emas, '**amallar tartibini buzyapti**'."
3. "Feedback qog'ozga qaytadi — keyingi kartochkaning old tomoniga bosiladi. O'quvchida qurilma, akkaunt yoki
   internet talab qilinmaydi."
4. "AI ning sifati o'lchanadi: nechta katak avtomatik o'qildi, o'qituvchi nechtasini tuzatdi, feedbackning
   qanchasi o'zgarishsiz ketdi — bular ekranda ko'rsatiladi."

## 4) Jamoaning bilim darajasi

**U nimani qidiradi:** qarorni tushuntira olasizmi, muqobilni bilasizmi, cheklovlarni ayta olasizmi.

**Tayyor javoblar (qisqa):**
- *Nega monolit?* — bu miqyosda bitta jarayon kamroq nosozlik nuqtasi; OMR, PDF va AI allaqachon alohida modul.
- *Nega JSONB?* — ssenariy va natija o'zgaruvchan tuzilma; sxemani buzmasdan saqlanadi, hisobot uchun SQL qoladi.
- *Nega ArUco, QR emas?* — marker id = jurnal raqami, kam joy egallaydi, oflayn va tekin.
- *Nega ReportLab, HTML→PDF emas?* — millimetr aniqligi kerak; brauzer masshtabi OMR geometriyasini buzadi.
- *Nega React, Vue emas?* — jamoa tajribasi va ekosistema; arxitektura API-first, frontend qaytariladigan qaror.
- *Model tanlovi* — o'lchov bilan: bitta qo'lyozmani baholash og'ir modelda 100 s, tez modelda 4,9 s, sifat bir xil.

**Oxirida undan so'rang** (u gapirishni yaxshi ko'radi va bu "bilim darajasi" ga ijobiy ta'sir qiladi):
"Enterprise loyihada dizayn tizimini qachon alohida ajratasiz?", "Frontend testlarini bizning holatda
qayerdan boshlagan bo'lardingiz?"

## 5) Texnologiyalar to'plami

**Aytiladigan gap:**
> "Har bir vosita uchun sabab va 'muqobil nega emas' yozilgan — slaydda jadval bor. Frontendda boshlang'ich yuk
> **160 KB gzip**, har sahifa 2–19 KB, three.js esa **145 KB alohida chunk** va faqat vizualizatsiyali sahifada
> yuklanadi; build 1 soniya. Tashqi xizmat bitta — OpenAI; kalit bo'lmasa tizim shablon matnlar bilan ishlaydi,
> demo hech qachon qulamaydi. Hammasi Docker'da: `docker compose up` — 5 konteyner."

**Animatsiya haqida so'rasa:** "Ular bezak emas — ma'lumot ko'rsatadi (galaktikada masofa = e'tibordan beri
o'tgan darslar). Himoyasi bor: `prefers-reduced-motion`, WebGL yo'q bo'lsa statik fallback, sahifa ko'rinmasa
sikl to'xtaydi, unmount'da `dispose()`."

## Ball yo'qotadigan 5 xato

1. Demo o'rniga slayd o'qish — birinchi 2 daqiqada **ekranni** ko'rsating.
2. "Hammasi tayyor, kamchilik yo'q" deyish — u darhol tekshiradi.
3. Birinchi daqiqada model nomlari va token narxlari haqida gapirish.
4. "Keyin qo'shamiz" degan mavhum javob — o'rniga: nima, qanday va **qachon**.
5. Demo joyida qulashi — sahifalarni oldindan ochib qo'ying, `demo reset` tayyor tursin, internet yo'q bo'lsa
   shablon rejimi ishlashini ayting.

## Ochilish (20 soniya, yodda tursin)

> "Fractal jamoasi, DarsPilot. Ta'lim treki, 2-ustuvor mavzu — avtomatik baholash va feedback.
> Muammo: matematika o'qituvchisi haftasiga 3–5 soatini ishlarni tekshirishga sarflaydi.
> Biz qog'ozli ishni telefon suratidan baholaydigan tizim qurdik: yopiq javoblarni kompyuter ko'rish,
> qo'lda yozilgan yechimni AI rubrikasi o'qiydi. Hoziroq ko'rsataman."

## Yakun (10 soniya)

> "Bizda ochiq repo, 45 test va bitta buyruqda ko'tariladigan tizim bor. Eng zaif joyimiz — frontend testlari va CI;
> CP2 gacha shuni yopamiz. Sizning maslahatingiz aynan shu joyda kerak."
