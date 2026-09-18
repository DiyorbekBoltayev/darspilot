/**
 * DarsPilot — o'qituvchilar so'rovnomasini Google Form sifatida yaratadi.
 *
 * Ishlatish: script.google.com → yangi loyiha → shu faylni joylashtiring → "yaratSorovnoma" funksiyasini
 * ishga tushiring → ruxsat bering → Execution log dagi havolalarni oling.
 * Javoblar avtomatik ravishda yangi Google Sheets jadvaliga yig'iladi.
 */
function yaratSorovnoma() {
  var form = FormApp.create('DarsPilot — o‘qituvchilar so‘rovnomasi');
  form.setDescription(
    'DarsPilot — 5–6-sinf matematika o‘qituvchisi uchun AI yordamchi: dars ssenariysi, qog‘ozli ishni telefon ' +
    'suratidan avtomatik tekshirish (uy vazifasi daftari ham), har o‘quvchiga shaxsiy feedback.\n\n' +
    'So‘rovnoma ~6–8 daqiqa oladi. Javoblaringiz faqat mahsulotni takomillashtirish uchun ishlatiladi. ' +
    'Ism va aloqa ma’lumoti — ixtiyoriy.');
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('Rahmat! Javobingiz qabul qilindi. Pilotga yozilgan bo‘lsangiz, tez orada bog‘lanamiz.');

  // ------------------------------------------------ yordamchi funksiyalar
  function bolim(title, help) {
    var p = form.addPageBreakItem().setTitle(title);
    if (help) p.setHelpText(help);
    return p;
  }
  function bitta(title, choices, required, other) {          // bitta javob
    var it = form.addMultipleChoiceItem().setTitle(title).setChoiceValues(choices).setRequired(!!required);
    if (other) it.showOtherOption(true);
    return it;
  }
  function kop(title, choices, required, other) {           // bir nechta javob
    var it = form.addCheckboxItem().setTitle(title).setChoiceValues(choices).setRequired(!!required);
    if (other) it.showOtherOption(true);
    return it;
  }
  function royxat(title, choices, required) {                // ochiluvchi ro'yxat
    return form.addListItem().setTitle(title).setChoiceValues(choices).setRequired(!!required);
  }
  function shkala(title, lo, hi, loLabel, hiLabel, required) {
    return form.addScaleItem().setTitle(title).setBounds(lo, hi).setLabels(loLabel, hiLabel).setRequired(!!required);
  }

  // ------------------------------------------------ 1-bo'lim: siz haqingizda
  bolim('1. Siz haqingizda', 'Segmentlash uchun — javoblar anonim tahlil qilinadi.');
  form.addTextItem().setTitle('Ism-familiya (ixtiyoriy)');
  royxat('Viloyat', ['Xorazm', 'Qoraqalpog‘iston Respublikasi', 'Buxoro', 'Navoiy', 'Samarqand', 'Qashqadaryo',
    'Surxondaryo', 'Jizzax', 'Sirdaryo', 'Toshkent viloyati', 'Toshkent shahri', 'Andijon', 'Farg‘ona', 'Namangan'], true);
  kop('Qaysi sinflarga dars berasiz?', ['5-sinf', '6-sinf', '7-sinf', '8-sinf', '9-sinf', '10–11-sinf', 'Boshlang‘ich'], true);
  bitta('Haftada nechta sinfga dars berasiz?', ['1–2 ta', '3–4 ta', '5–6 ta', '7 tadan ko‘p'], true);
  bitta('Bir sinfdagi o‘rtacha o‘quvchi soni', ['15 tagacha', '16–25', '26–30', '31–35', '35 dan ko‘p'], true);

  // ------------------------------------------------ 2-bo'lim: hozirgi ish tartibi
  bolim('2. Hozirgi ish tartibingiz', 'Bu qism eng muhimi: hozir vaqtingiz qayerga ketayotganini tushunishimiz kerak.');
  bitta('Bir hafta davomida o‘quvchilar ishini tekshirishga (daftar, nazorat, uy vazifasi) qancha vaqt ketadi?',
    ['1 soatgacha', '1–3 soat', '3–5 soat', '5–8 soat', '8 soatdan ko‘p'], true);
  kop('Uy vazifasini odatda qanday tekshirasiz?',
    ['Har bir daftarni ko‘raman', 'Doskada birgalikda tekshiramiz', 'Tanlab, bir nechta daftarni',
      'O‘quvchilar bir-birini tekshiradi', 'Faqat javobini so‘rayman', 'Deyarli tekshira olmayman'], true, true);
  bitta('Bir hafta ichida nechta o‘quvchining uy vazifasini shaxsan ko‘ra olasiz?',
    ['Deyarli hammasini', 'Taxminan yarmini', 'Uchdan birini', 'Juda ozini'], true);
  kop('Qaysi o‘quvchi qaysi mavzuda qiynalayotganini qayerda yozib borasiz?',
    ['O‘z daftarim/blaknotim', 'eMaktab', 'Excel yoki Google Sheets', 'Telegramda o‘zimga',
      'Hech qayerda, yodimda saqlayman'], true, true);
  bitta('Oxirgi 2 haftada bironta o‘quvchi bilan umuman shaxsan ishlamay qolganingizni bilasizmi?',
    ['Ha, aniq bilaman', 'Taxminan bilaman', 'Bilmayman, eslay olmayman'], true);
  kop('Nazorat ishi yoki BSB dan keyin xatolarni qanday tahlil qilasiz?',
    ['Har bir ishni ko‘rib, xato turini yozaman', 'Umumiy xatolarni doskada tushuntiraman',
      'Faqat ball qo‘yaman', 'Vaqt yetmaydi'], false, true);
  bitta('Chop etish imkoniyatingiz qanday?',
    ['Maktab printeri, qog‘oz ham bepul', 'Maktab printeri, qog‘ozni o‘zim olaman',
      'O‘z hisobimdan tashqarida chop etaman', 'Imkoniyat deyarli yo‘q'], true);
  kop('Hozir qanday raqamli vositalardan foydalanasiz?',
    ['eMaktab', 'Telegram guruh', 'Excel / Google Sheets', 'ChatGPT yoki boshqa AI',
      'Kahoot, Quizizz kabi vositalar', 'Hech qanday'], false, true);

  // ------------------------------------------------ 3-bo'lim: imkoniyatlar bahosi
  bolim('3. DarsPilot imkoniyatlari', 'Har bir imkoniyat siz uchun qanchalik foydali? 1 — kerak emas, 5 — juda kerak.');
  form.addGridItem()
    .setTitle('Har bir imkoniyatni baholang')
    .setRows(['45 daqiqalik dars ssenariysi (metodlar va nomli ko‘rsatmalar bilan)',
      'Qog‘ozli diagnostikani bitta telefon suratidan avtomatik o‘qish',
      'Qo‘lda yozilgan yechimni AI bosqichlar bo‘yicha baholashi (rubrika)',
      'Uy vazifasi — mashq daftari sahifasini suratdan tekshirish',
      'Har o‘quvchiga shaxsiy feedback (o‘quvchiga, ota-onaga, o‘zingizga)',
      'O‘quvchining keyingi kartochkasiga o‘tgan ishdan feedback bosilishi',
      'E’tibor jurnali va “N dars e’tiborsiz” ogohlantirishi',
      'BSB/ChSB variantlari va natijaning jurnalga o‘zi tushishi',
      'Baholar jurnali va Excelga chiqarish',
      'Direktor paneli / ota-onaga qisqa xabar'])
    .setColumns(['1', '2', '3', '4', '5'])
    .setRequired(true);
  bitta('Shulardan qaysi biri bo‘lmasa, dasturdan foydalanmagan bo‘lardingiz?',
    ['Dars ssenariysi', 'Diagnostikani suratdan o‘qish', 'Qo‘lda yozilgan yechimni baholash',
      'Uy vazifasini suratdan tekshirish', 'Shaxsiy feedback', 'E’tibor jurnali',
      'BSB/ChSB avtomatlashtirish', 'Baholar jurnali va eksport'], true);

  // ------------------------------------------------ 4-bo'lim: uy vazifasini skanerlash
  bolim('4. Uy vazifasini suratdan tekshirish (yangi imkoniyat)',
    'Mashq daftarining sahifasini telefonda suratga olasiz. AI har bir mashqni raqami bo‘yicha ajratadi, ' +
    'to‘g‘ri-xatoni aniqlaydi va xato turini yozadi (masalan, “amallar tartibi”). Siz faqat tasdiqlaysiz.');
  bitta('Buni qanchalik tez-tez ishlatgan bo‘lardingiz?',
    ['Har darsda', 'Haftada 2–3 marta', 'Haftada 1 marta', 'Faqat nazoratdan oldin', 'Ishlatmagan bo‘lardim'], true);
  bitta('Suratni kim olishi qulay?',
    ['O‘zim sinfda', 'O‘quvchilar o‘z telefonidan yuboradi', 'Ota-ona yuboradi',
      'Navbatchi o‘quvchi yig‘ib beradi'], true, true);
  kop('Nima to‘sqinlik qilishi mumkin?',
    ['Vaqt yetmaydi', 'Internet sekin', 'O‘quvchi qo‘lyozmasi o‘qilmaydi', 'Telefonim eskirgan',
      'Maktabda telefon taqiqlangan', 'AI xatosiga ishonchsizlik', 'Hech narsa'], false, true);
  bitta('AI xato qo‘ysa nima qilasiz?',
    ['Har bir bahoni ko‘rib chiqaman', 'Faqat shubhalilarini ko‘raman', 'Ishonaman, ko‘rib chiqmayman'], true);
  bitta('Uy vazifasi tekshiruvida siz uchun yetarli aniqlik qancha?',
    ['100% dan kam bo‘lsa ishlatmayman', 'Kamida 99%', 'Kamida 95%', 'Kamida 90%',
      'Aniqlik muhim emas, vaqt tejalsa bo‘ldi'], true);
  bitta('Uy vazifasini tekshirish vaqtingizning qanchasi tejalsa, bu sizga arziydi?',
    ['Yarmidan ko‘pi', 'Uchdan biri', 'Har qanday tejamkorlik yaxshi', 'Vaqt masalasi emas'], true);

  // ------------------------------------------------ 5-bo'lim: ishonch va maxfiylik
  bolim('5. Ishonch va maxfiylik');
  bitta('“AI baho qo‘yadi, o‘qituvchi tasdiqlaydi” — bu tartib sizga to‘g‘ri keladimi?',
    ['Ha, aynan shunday bo‘lishi kerak', 'AI faqat taklif qilsin, ballni o‘zim qo‘yaman',
      'AI umuman baho qo‘ymasin'], true);
  shkala('O‘quvchi ismlari AI ga yuborilmasligi (faqat kod: 5B-17) siz uchun qanchalik muhim?',
    1, 5, 'Muhim emas', 'Juda muhim', true);

  // ------------------------------------------------ 6-bo'lim: narx va pilot
  bolim('6. Narx va pilot', 'Oxirgi qism — mahsulotni kim va qanday moliyalashtirishi mumkinligini tushunish uchun.');
  kop('Sizningcha, bunday dastur uchun kim to‘lashi kerak?',
    ['O‘qituvchining o‘zi', 'Maktab', 'Tuman yoki viloyat XTB', 'O‘quv markazi', 'Ota-ona', 'Davlat dasturi'], true, true);
  bitta('O‘qituvchi o‘zi to‘lasa, oyiga qancha adolatli?',
    ['Faqat bepul bo‘lsa ishlataman', '20 000 so‘mgacha', '20 000–50 000', '50 000–100 000',
      '100 000 so‘mdan ko‘p'], true);
  bitta('Maktab butun jamoa uchun to‘lasa, bir o‘qituvchiga oyiga qancha adolatli?',
    ['20 000 so‘mgacha', '20 000–50 000', '50 000–100 000', '100 000 so‘mdan ko‘p', 'Bilmayman'], false);
  bitta('Pilotda qatnashishni xohlaysizmi?',
    ['Ha, bu chorakda', 'Ha, keyingi chorakda', 'Avval ko‘rib chiqaman', 'Yo‘q'], true);
  form.addTextItem().setTitle('Bog‘lanish uchun telefon yoki Telegram (ixtiyoriy)');
  shkala('DarsPilotni hamkasbingizga tavsiya qilish ehtimolingiz', 0, 10, 'Umuman yo‘q', 'Albatta tavsiya qilaman', true);
  form.addParagraphTextItem().setTitle('Nima yetishmayapti yoki nima qo‘shilishini xohlaysiz?');

  // ------------------------------------------------ javoblar jadvali
  var ss = SpreadsheetApp.create('DarsPilot — so‘rovnoma javoblari');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('To‘ldirish havolasi (o‘qituvchilarga shuni yuboring): ' + form.getPublishedUrl());
  Logger.log('Qisqa havola: ' + form.shortenFormUrl(form.getPublishedUrl()));
  Logger.log('Tahrirlash havolasi (faqat o‘zingizga): ' + form.getEditUrl());
  Logger.log('Javoblar jadvali: ' + ss.getUrl());
  return form.getPublishedUrl();
}
