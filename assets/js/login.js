/* ===== Страница входа ===== */
I18n.extend({
  ru: {
    lead: 'Внутренняя система управления компанией',
    loginPlaceholder: 'Введите логин',
    passPlaceholder: 'Введите пароль',
    toggleEye: 'Показать пароль',
    secure: 'Защищённое подключение',
    note: 'Личный кабинет пока в разработке.',
    salesTitle: 'Продажи', salesSub: 'CRM, заказы, клиенты',
    financeTitle: 'Финансы', financeSub: 'Касса, банк, отчёты',
    warehouseTitle: 'Склад', warehouseSub: 'Остатки, перемещения',
    docsTitle: 'Документы', docsSub: 'Договоры, файлы, КБ'
  },
  uz: {
    lead: 'Kompaniyani boshqarish ichki tizimi',
    loginPlaceholder: 'Login kiriting',
    passPlaceholder: 'Parolni kiriting',
    toggleEye: 'Parolni ko’rsatish',
    secure: 'Himoyalangan ulanish',
    note: 'Shaxsiy kabinet hali ishlab chiqilmoqda.',
    salesTitle: 'Savdo', salesSub: 'CRM, buyurtmalar, mijozlar',
    financeTitle: 'Moliya', financeSub: 'Kassa, bank, hisobotlar',
    warehouseTitle: 'Ombor', warehouseSub: 'Qoldiqlar, ko’chirishlar',
    docsTitle: 'Hujjatlar', docsSub: 'Shartnomalar, fayllar, BB'
  }
});

(function () {
  var form = document.getElementById('loginForm');
  var note = document.getElementById('loginNote');
  var pass = document.getElementById('loginPass');
  var eye = document.getElementById('toggleEye');

  var WARN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor"/>' +
    '<rect x="10.6" y="6" width="2.8" height="9" rx="1.4" fill="#1a1200"/><circle cx="12" cy="17.5" r="1.6" fill="#1a1200"/></svg>';

  var noteKey = null; // какой текст сейчас показан в note (для перевода при смене языка)

  // Показать жёлтое предупреждение под кнопкой (анимация перезапускается при каждом показе)
  function showNote(key) {
    noteKey = key;
    note.innerHTML = WARN_ICON + '<span>' + I18n.t(key) + '</span>';
    note.classList.add('i18n-fade', 'i18n-extra'); // теперь note тоже плавно гаснет при смене языка
    note.classList.remove('note-warn');
    void note.offsetWidth; // перезапуск CSS-анимации
    note.classList.add('note-warn');
  }

  I18n.onChange(function () {
    if (noteKey) note.querySelector('span').textContent = I18n.t(noteKey);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    // Кабинета пока нет — как в оригинале, данные никуда не отправляются
    showNote('note');
  });

  eye.addEventListener('click', function () {
    var show = pass.type === 'password';
    pass.type = show ? 'text' : 'password';
    eye.classList.toggle('on', show);
    eye.setAttribute('aria-pressed', String(show));
  });

  I18n.init(document.getElementById('langSwitch'));
})();
