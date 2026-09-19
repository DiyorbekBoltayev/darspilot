# Demo nutqi — 3 daqiqa (CP2, har uchala mentorga)

Qoida: **gapirganda ekranni ko'rsatib boramiz**. Har bir ekranda uch narsa aytiladi —
*nima qilinadi · qanday qilinadi · nima yutamiz*. Sahifalar oldindan ochib qo'yiladi
(brauzerda 8 ta tab), hech narsa kutib turilmaydi.

**Ochiq turadigan tablar:** `/bugun` · `/dars/<bugungi>?qadam=tayyorlash` · `?qadam=darsda` ·
`?qadam=tekshirish` · `?qadam=tahlil` · `/sinf` · `/metodlar` · `/baholar`

---

## Vaqt taqsimoti

| Vaqt | Bo'lim | Ekran |
|---|---|---|
| 0:00–0:25 | Muammo va yechim | gapiramiz (ekran: `/bugun`) |
| 0:25–0:40 | Nega butun dars jarayoni kerak · qamrov | — |
| 0:40–1:00 | Metodlar va o'quv dasturi | `/metodlar` |
| 1:00–1:20 | Sinf xaritasi | `/sinf` |
| 1:20–1:30 | Darslar konveyeri | `/darslar` |
| 1:30–2:35 | **BUGUN — 5 qadam** (har biri ~13 s) | `/bugun` → `/dars/...` |
| 2:35–2:50 | Baholar jurnali va hisobotlar | `/baholar` |
| 2:50–3:00 | Yakuniy jumla | — |

---

## 0:00–0:25 · Muammo va yechim

> "O'qituvchi vaqtining katta qismi **tekshirish va hujjatga** ketadi.
> Bizning yechimimiz — **AI yordamida avtomatik baholash va feedback tizimi**.
>
> Lekin feedback aniq bo'lishi uchun tizim faqat javobni emas, **dars qanday o'tganini,
> kim nimani qanday o'zlashtirganini** bilishi kerak. Shuning uchun biz butun dars jarayonini —
> tayyorlashdan tahlilgacha — tashkil qiladigan yordamchi qildik."

## 0:25–0:40 · Nega butun jarayon va kimlar uchun

> "Bu yerdagi ba'zi ishlar bitta odam uchun umuman imkonsiz: 90 ta o'quvchining har biriga
> darajasiga mos masala tuzish, har birining xatosini nomlab izoh yozish, kim necha darsdan beri
> e'tibordan chetda qolganini yodda tutish.
>
> Hozircha yechim **5–6-sinf matematika** o'qituvchilari uchun. Dvigatel fanga bog'liq emas —
> boshqa fanlarga kengaytirish imkoniyati bor."

---

## 0:40–1:00 · Metodlar va o'quv dasturi → `/metodlar`

**Ko'rsatamiz:** metodlar ro'yxati, bitta kartochkani ochamiz.

> "Bu — o'qituvchi paneli. Har bir dars uchun asos shu yerda: o'quv dasturi va metodlar.
> Hozir **37 ta metod** bo'yicha to'liq ma'lumot bor — o'qituvchi ularni o'rganadi va
> **o'z metodini ham qo'sha oladi**: matn bilan yozadi, AI uni kartochkaga aylantiradi va
> qaysi turdagi dars bosqichiga mos kelishini o'zi aniqlab qo'yadi, keyin ssenariylarda ishlatadi."

**Yutuq:** *"O'qituvchining tajribasi tizimda qoladi va qayta ishlatiladi."*

## 1:00–1:20 · Sinf xaritasi → `/sinf`

**Ko'rsatamiz:** galaktika, keyin bitta o'quvchini bosamiz.

> "Sinf xaritasi. **Rang** — o'quvchining masala yechish va bilim darajasi; bu darajalar
> **PISA talablariga mos** va **Singapur o'qitish usuli** bilan umumlashtirilgan.
> **Markazdan uzoqligi** — necha darsdan beri unga alohida e'tibor qaratilmagani.
> O'quvchini bossak — natijalari, kuchli va zaif bosqichlari ko'rinadi."

**Yutuq:** *"O'qituvchi bir qarashda: kim orqada qolyapti va kimga navbat kelgan."*

## 1:20–1:30 · Darslar konveyeri → `/darslar`

> "Darslar konveyeri: o'tgan darslar bo'yicha ma'lumot shu yerda saqlanadi va
> keyingi darsga tayyorgarlikni oldindan ko'rib qo'yish mumkin."

---

## 1:30–2:35 · BUGUN — asosiy qism → `/bugun`

> "Eng asosiy bo'lim — **Bugun**. Bugungi darslar ro'yxati; tayyorgarlik ko'rilmagan bo'lsa,
> **5 daqiqada** hammasi tayyorlanadi. Ichiga kiramiz — dars 5 qadamdan iborat."

### 1. Tayyorlash (~13 s) → `?qadam=tayyorlash`
> "Dars ssenariysi tuziladi. Bu shunchaki reja emas: **qaysi bosqichda aynan qaysi o'quvchidan
> so'rash kerakligigacha** ko'rsatma bor. Hammasi o'quvchilarning natijalari va bilim darajasidan
> kelib chiqadi."
**Yutuq:** *"Avval bu ish qo'lda ham qilinmasdi — 30 ta bolani nomma-nom rejalashtirish imkonsiz."*

### 2. Qog'ozli diagnostika (~13 s) → varaqlar/PDF
> "Diagnostika yoqilsa, har o'quvchiga **darajasiga mos** topshiriq shakllanadi. Bu oddiy test emas:
> **bitta masala bo'yicha 7 ta savol** — muammoni tushunish, model tuzish, hisoblash, natijani talqin qilish.
> Shuning uchun natija «5/7» emas, **qaysi bosqichda oqsoqlik borligini** ko'rsatadi."
**Yutuq:** *"Bola qayerda adashganini biladi, o'qituvchi esa nimani takrorlashni biladi."*

### 3. Darsda (~10 s) → `?qadam=darsda`
> "Dars vaqtida ssenariy shu yerda — eslatma sifatida: qaysi bosqichdamiz, kim bilan ishlash kerak."

### 4. Tekshirish (~15 s) → `?qadam=tekshirish`
> "Diagnostika natijalari va uy vazifasi **surat orqali** yuklanadi. AI o'qiydi, o'qituvchidan
> tasdiqlashni so'raydi, shubhali joy bo'lsa **ogohlantiradi**. Tasdiqlangandan keyin natijalar tahlilga tushadi."
**Yutuq:** *"Butun sinfning ishi bir necha daqiqada, oddiy telefon bilan."*

### 5. Tahlil (~14 s) → `?qadam=tahlil`
> "Tahlilda o'qituvchi dars haqidagi **o'z fikri va xulosasini** aytadi — ovozi bilan.
> AI uni ham tahlil qiladi va keyingi dars uchun ko'rsatmalar chiqaradi."
**Yutuq:** *"Dars natijasi keyingi darsning ssenariysiga o'z-o'zidan o'tadi — sikl yopiladi."*

---

## 2:35–2:50 · Jurnal va hisobotlar → `/baholar`

> "Oxirida — baholar jurnali va hisobotlar: formativ baholar, BSB/ChSB, ota-onaga xabar va
> direktor uchun kesim. O'qituvchi bir ishni ikki marta yozmaydi."

## 2:50–3:00 · Yakun

> "Ya'ni: qog'oz qoladi, qurilma talab qilinmaydi, o'qituvchining vaqti tekshiruvdan bo'shaydi —
> va har bir bola nimani qanday o'zlashtirgani tizimda ko'rinib turadi."

---

# 2 daqiqalik qisqa variant

Vaqt qisqarsa **shu 4 qadam** qoladi, qolgani tashlab ketiladi:

| Vaqt | Nima |
|---|---|
| 0:00–0:20 | Muammo → yechim (yuqoridagi birinchi abzas) |
| 0:20–0:35 | Sinf xaritasi: rang = daraja (PISA/Singapur), masofa = e'tiborsiz darslar |
| 0:35–1:35 | Bugun → Tayyorlash → Diagnostika (7 savol) → Tekshirish (surat) → Tahlil (ovoz) |
| 1:35–2:00 | Jurnal/hisobot + yakuniy jumla |

---

# Gapirish qoidalari

1. **Har ekranda uch gap:** nima qilinadi → qanday → nima yutamiz. Ko'p gapirmaymiz.
2. **"Avval bu imkonsiz edi"** — eng kuchli jumla. Ssenariydagi nomli ko'rsatma, xatoni nomlash va
   e'tibor jurnalida aytiladi.
3. **Ekran gapiradi:** bir sahifada 10 soniyadan ko'p turmaymiz, sichqoncha bilan aniq joyni ko'rsatamiz.
4. **Raqamlar tayyor:** 37 metod · 7 savol bitta masalada · 5 qadam · bir suratda 10 ta ish ~2 soniyada ·
   10 o'quvchi 26 soniyada baholanadi.
5. **Texnik tafsilot faqat so'ralsa:** model nomlari, token, arxitektura — nutqda yo'q.
6. **Silliqlik:** tablar oldindan ochiq, demo ma'lumot to'ldirilgan, internet uzilsa ham tizim
   shablon matnlar bilan ishlaydi — demo to'xtamaydi.
