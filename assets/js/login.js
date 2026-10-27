/* ===== Страница входа ===== */
I18n.extend({
  ru: {
    lead: 'Внутренняя система управления компанией',
    loginPlaceholder: 'Введите логин',
    passPlaceholder: 'Введите пароль',
    toggleEye: 'Показать пароль',
    secure: 'Защищённое подключение',
    note: 'Личный кабинет пока в разработке.',
    empty: 'Введите логин и пароль.',
    wrong: 'Неверный логин или пароль.',
    blocked: 'Учётная запись заблокирована. Обратитесь к администратору.',
    welcome: 'Добро пожаловать! Открываем систему…',
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
    empty: 'Login va parolni kiriting.',
    wrong: 'Login yoki parol noto‘g‘ri.',
    blocked: 'Hisob bloklangan. Administratorga murojaat qiling.',
    welcome: 'Xush kelibsiz! Tizim ochilmoqda…',
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

  var OK_ICON = '<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#04140c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Показать сообщение под кнопкой (анимация перезапускается при каждом показе)
  function showNote(key, ok) {
    noteKey = key;
    note.innerHTML = (ok ? OK_ICON : WARN_ICON) + '<span>' + I18n.t(key) + '</span>';
    note.classList.add('i18n-fade', 'i18n-extra'); // note тоже плавно гаснет при смене языка
    note.classList.toggle('note-ok', !!ok);
    note.classList.remove('note-warn');
    void note.offsetWidth; // перезапуск CSS-анимации
    note.classList.add('note-warn');
  }

  I18n.onChange(function () {
    if (noteKey) note.querySelector('span').textContent = I18n.t(noteKey);
  });

  // Вход: проверка логина и пароля (в демо — по хэшу в данных браузера), затем переход в систему
  var busy = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var login = document.getElementById('loginName').value.trim();
    if (!login || !pass.value) { showNote('empty'); return; }
    busy = true;
    SM.ready.then(function () {
      if (!SM.server) SM.load();
      return SM.login(login, pass.value);
    }).then(function (res) {
      if (!res.ok) { busy = false; showNote(res.error === 'blocked' ? 'blocked' : 'wrong'); form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); return; }
      showNote('welcome', true);
      document.body.classList.add('leaving');
      setTimeout(function () { location.href = 'admin.html'; }, 650);
    });
  });

  eye.addEventListener('click', function () {
    var show = pass.type === 'password';
    pass.type = show ? 'text' : 'password';
    eye.classList.toggle('on', show);
    eye.setAttribute('aria-pressed', String(show));
  });

  I18n.init(document.getElementById('langSwitch'));
})();
