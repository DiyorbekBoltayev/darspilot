# Xakaton baholash mezonlari (rasmiy reglamentdan)

Manba: `Umummilly_AI_Xakaton_v2.pptx`, 11–14 va 20-slaydlar.

## 1. 15 ta mezon — har biri 1–10 ball

| # | Texnik mentor | Biznes mentor | Soha mentori |
|---|---|---|---|
| 1 | **Texnik amalga oshirish** | **G'oya va muammoning dolzarbligi** | **Muammoning dolzarbligi** |
| 2 | Kod tayyorligi | Biznes modeli va monetizatsiya | Sohani chuqur tushunish |
| 3 | Yechimning innovatsionligi | Raqobatdagi ustunlik | Amaliy qo'llanish |
| 4 | Jamoaning bilim darajasi | Moliyaviy barqarorlik | Qonunchilikka muvofiqlik |
| 5 | Texnologiyalar to'plami | O'sish imkoniyati | Ta'sir ko'lami |

**Qalin yozilgan 1-qatordagi uchta mezon** — ustuvor yo'nalish tanlangani uchun **+2 ball** qo'shiladigan mezonlar
(20-slayd). Biz Ta'lim trekining 2-ustuvor mavzusini tanlaganmiz, shuning uchun bu ball bizga tegishli — buni
har uchala mentorga suhbat boshida aytish kerak.

## 2. Ball qanday hisoblanadi

```
Mentor bali   = 5 ta mezon ballari yig'indisi ÷ 5
CP bali       = (texnik + biznes + soha bali) ÷ 3
Yakuniy ball  = 0,4 × CP1 + 0,6 × CP2
```

Reglamentdagi namuna (AlfaTex):

| Baholash | CP1 (18-sentabr) | CP2 (19-sentabr) |
|---|---|---|
| Texnik mentor | 7,6 | 8,6 |
| Biznes mentor | 7,2 | 8,2 |
| Soha mentori | 8,2 | 8,6 |
| **O'rtacha** | **7,67** | **8,47** |

Yakuniy: `0,4 × 7,67 + 0,6 × 8,47 = 8,15`

**CP2 og'irligi 60%** — mentor aynan o'sishni va uning tavsiyalari bajarilganini qidiradi. Shuning uchun har bir
mentorga "siz aytgan narsani qildik" deb aniq ko'rsatish CP1 dagi baldan muhimroq.

## 3. Ballar teng bo'lsa (14-slayd)

1. 2-checkpoint bali
2. Soha mentori bali
3. Texnik mentor bali
4. Bosh koordinator qarori

## 4. Har mezonga bizning javobimiz — bitta jumlada

### Texnik mentor
| Mezon | Javob | Dalil |
|---|---|---|
| Texnik amalga oshirish | Zanjir uchidan-uchiga ishlaydi: reja → variant → PDF → surat → OMR → baho → feedback → jurnal | 1 suratda 10 kartochka ~2 s; 10 o'quvchi 26 s da baholandi |
| Kod tayyorligi | 47 pytest testi tashqi servissiz o'tadi, TypeScript strict 0 xato | `pytest -q`, `npm run check` |
| Yechimning innovatsionligi | Bitta suratdan ikki qavatli baholash: doirachalarni kod, qo'lyozmani vision AI o'qiydi | `app/omr.py` + `app/llm.py:592` |
| Jamoaning bilim darajasi | Har qaror uchun "nega bu, nega muqobil emas" tayyor | Monolit, JSONB, ArUco, ReportLab, model tanlovi (100 s → 4,9 s o'lchov) |
| Texnologiyalar to'plami | 160 KB gzip boshlang'ich yuk, three.js alohida chunk, bitta tashqi xizmat (OpenAI), kalitsiz ham ishlaydi | `docker compose up` — 5 konteyner |

### Biznes mentor
| Mezon | Javob | Dalil |
|---|---|---|
| G'oya va muammoning dolzarbligi | O'qituvchi haftasiga 3–5 soatni tekshiruvga sarflaydi, muammo har kuni takrorlanadi | Vaqt hisobi, o'qituvchilar so'rovnomasi |
| Biznes modeli va monetizatsiya | B2B obuna: o'quv markazi 12 000, maktab 15 000 so'm / o'quvchi / oy | Tariflar va to'lovchi segmentlar |
| Raqobatdagi ustunlik | Qurilmasiz ishlaydi + yopiq ma'lumot sikli; raqobatchilar zanjirning bitta bo'g'inida | Raqobat jadvali, 4 ta moat |
| Moliyaviy barqarorlik | Yalpi marja 84–85%, LTV/CAC 7,3 va 13,8, qoplash ~1,5 oy | Unit-ekonomika |
| O'sish imkoniyati | Xorazmdan boshlab 3 yilda ≈ $1 mln ARR; dvigatel boshqa fanlarga ko'chadi | SOM → SAM → TAM |

### Soha mentori
| Mezon | Javob | Dalil |
|---|---|---|
| Muammoning dolzarbligi | 25–35 kishilik sinfda har bir o'quvchining xatosini kuzatib borish imkonsiz | Kunlik ish yuki hisobi |
| Sohani chuqur tushunish | AHA! darsligi, 170 darslik TMR, chorak va ta'til kalendari tizimga kiritilgan | `app/aha_plan.py` |
| Amaliy qo'llanish | O'qituvchi ish tartibini o'zgartirmaydi: qog'oz har darsda emas, qurilma talab qilinmaydi | Dars konveyeri, 5 qadam |
| Qonunchilikka muvofiqlik | Formativ 0–10, BSB/ChSB ballari amaldagi tartibga mos; AI ga ism yuborilmaydi (faqat kod) | Baholar jurnali, eksport |
| Ta'sir ko'lami | Savollar PISA formatida, Singapur yondashuviga mos; natija o'quvchi, ota-ona va direktorga yetadi | Hisobotlar, ota-ona portali |
