/* =========================================================
   SM AVTO BASE — оболочка: сайдбар-«рельс», верхняя панель,
   тема по времени, язык, плашка обновления, маршруты, поиск
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM, UI = SM.ui;
  const { html, raw, fmt: F } = SM;
  const I = UI.icon;
  SM.pages = {};
  SM.page = (key, def) => (SM.pages[key] = def);
  // версия сборки: когда на сайте выкладывают новую, version.json отличается — показываем плашку «обновите страницу»
  SM.APP_VERSION = '2026-10-16.6';

  /* ---------- Тема: светлая 8:00–18:00, тёмная 18:00–8:00; вручную — до следующего переключения ---------- */
  const OVR = 'sm.themeOverride';
  SM.theme = () => document.documentElement.getAttribute('data-theme') || 'dark';
  SM.themeAuto = (d = new Date()) => (d.getHours() >= 8 && d.getHours() < 18 ? 'light' : 'dark');
  SM.nextThemeSwitch = (d = new Date()) => { const t = new Date(d), h = d.getHours(); if (h < 8) t.setHours(8, 0, 0, 0); else if (h < 18) t.setHours(18, 0, 0, 0); else { t.setDate(t.getDate() + 1); t.setHours(8, 0, 0, 0); } return t.getTime(); };
  SM.themeWanted = () => { try { const o = JSON.parse(localStorage.getItem(OVR) || 'null'); if (o && o.until > Date.now()) return o.theme; } catch (e) { /* без хранилища — по времени */ } return SM.themeAuto(); };
  SM.themeTip = () => (SM.theme() === 'dark' ? 'Тёмная тема' : 'Светлая тема') + (SM.theme() === SM.themeAuto() ? ' · по времени' : ' · вручную до ' + (SM.themeAuto() === 'light' ? '18:00' : '8:00')) + '\nСама: светлая с 8:00, тёмная с 18:00';
  // возвращает промис, который завершается, когда «волна» докатилась
  let switching = 0;
  SM.applyTheme = function (t, origin) {
    const root = document.documentElement;
    if (SM.theme() === t) return Promise.resolve();
    const flip = () => {
      root.setAttribute('data-theme', t);
      document.querySelectorAll('meta[name=theme-color]').forEach((m) => m.setAttribute('content', t === 'dark' ? '#0b0c0f' : '#f2f3f7'));
      document.querySelectorAll('[data-act=theme]').forEach((b) => { b.innerHTML = String(I(t === 'dark' ? 'sun' : 'moon')); b.setAttribute('data-tip', SM.themeTip()); });
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) {
      // новая тема раскрывается «волной» от кнопки (или сверху, если сменилась по времени);
      // переходы цвета на это время выключены (.theme-switching), иначе круг идёт рывками
      const x = origin ? origin.x : innerWidth / 2, y = origin ? origin.y : 0;
      const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      // счётчик — на случай быстрых повторных нажатий: класс снимаем, когда закончилась последняя «волна»
      switching++; root.classList.add('theme-switching');
      const vt = document.startViewTransition(flip);
      vt.ready.then(() => root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: origin ? 600 : 1100, easing: 'cubic-bezier(.25, .8, .25, 1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
      return vt.finished.catch(() => {}).then(() => { if (--switching <= 0) { switching = 0; root.classList.remove('theme-switching'); } });
    }
    root.classList.add('theme-fade'); flip(); setTimeout(() => root.classList.remove('theme-fade'), 700);
    return Promise.resolve();
  };
  SM.toggleTheme = function (origin) {
    const t = SM.theme() === 'dark' ? 'light' : 'dark';
    try { if (t === SM.themeAuto()) localStorage.removeItem(OVR); else localStorage.setItem(OVR, JSON.stringify({ theme: t, until: SM.nextThemeSwitch() })); } catch (e) { /* без хранилища */ }
    // сообщение — после «волны», чтобы его анимация не мешала кругу
    SM.applyTheme(t, origin).then(() => UI.toast(t === 'dark' ? 'Тёмная тема' : 'Светлая тема', t === SM.themeAuto() ? 'Как положено по времени' : 'До ' + (t === 'dark' ? '8:00' : '18:00') + ', потом — снова по времени', 'info', { icon: t === 'dark' ? 'moon' : 'sun', ms: 2600 }));
  };
  SM.startThemeClock = () => setInterval(() => { const w = SM.themeWanted(); if (w !== SM.theme()) SM.applyTheme(w); }, 30000);

  /* ---------- Язык: русский, узбекский (латиница), узбекский (кириллица) ---------- */
  SM.LANGS = [['ru', 'RU', 'Русский'], ['uz', 'UZ', "O'zbekcha"], ['uzc', 'ЎЗ', 'Ўзбекча']];
  SM.lang = () => { try { const l = localStorage.getItem('ms_lang'); return SM.LANGS.some((x) => x[0] === l) ? l : 'ru'; } catch (e) { return 'ru'; } };
  SM.setLang = function (l) {
    if (l === SM.lang()) return;
    const body = document.body;
    body.classList.add('lang-out');
    setTimeout(() => {
      try { localStorage.setItem('ms_lang', l); } catch (e) { /* без хранилища */ }
      if (SM.i18n) SM.i18n.set(l);
      SM.refresh();
      body.classList.remove('lang-out');
      body.classList.add('lang-in');
      setTimeout(() => body.classList.remove('lang-in'), 400);
      UI.toast(l === 'ru' ? 'Язык: русский' : l === 'uz' ? "Til: o'zbekcha" : 'Тил: ўзбекча', '', 'info', { icon: 'lang', ms: 2200 });
    }, 230);
  };
  function langMenu(btn) {
    const old = UI.$('.menu-pop');
    if (old) { old.remove(); return; }
    const p = document.createElement('div');
    p.className = 'menu-pop';
    p.setAttribute('role', 'menu');
    p.innerHTML = SM.LANGS.map(([k, code, name]) => '<button type="button" role="menuitemradio" class="' + (SM.lang() === k ? 'on' : '') + '" data-lang="' + k + '" translate="no"><span class="code">' + code + '</span><span>' + name + '<small>' + { ru: 'кириллица', uz: 'lotin yozuvi', uzc: 'кирилл ёзуви' }[k] + '</small></span>' + String(I('check', 'ck')) + '</button>').join('');
    document.body.appendChild(p);
    const r = btn.getBoundingClientRect();
    p.style.top = r.bottom + 8 + 'px';
    p.style.left = Math.max(8, Math.min(r.right - p.offsetWidth, innerWidth - p.offsetWidth - 8)) + 'px';
    p.addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (b) { p.remove(); SM.setLang(b.dataset.lang); } });
    setTimeout(() => document.addEventListener('mousedown', function off(e) { if (!p.contains(e.target) && !btn.contains(e.target)) { p.remove(); document.removeEventListener('mousedown', off); } }), 0);
  }

  /* ---------- Плашка «сайт обновился» (новая версия на сервере) ---------- */
  let updShown = false;
  SM.checkUpdate = async function () {
    if (updShown || location.protocol === 'file:') return;
    try {
      const r = await fetch('version.json?_=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const v = (await r.json()).v;
      if (v && v !== SM.APP_VERSION) showUpdate();
    } catch (e) { /* нет сети — проверим позже */ }
  };
  function showUpdate() {
    updShown = true;
    const b = document.createElement('div');
    b.className = 'update-bar';
    b.setAttribute('role', 'status');
    b.innerHTML = String(html`<i></i><span>На сайт внесены изменения — обновите страницу</span><button class="btn btn-primary btn-sm" data-x="reload">${I('refresh')}Обновить</button><button class="btn btn-icon btn-sm" data-x="hide" aria-label="Скрыть">${I('x')}</button>`);
    document.body.appendChild(b);
    b.querySelector('[data-x=reload]').onclick = () => location.reload();
    b.querySelector('[data-x=hide]').onclick = () => b.remove();
  }

  /* ---------- Маршрут: #/раздел/id?параметры ---------- */
  SM.route = function () {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
    return { key: seg[0] || '', id: seg[1] || null, q: Object.fromEntries(new URLSearchParams(qs || '')) };
  };
  SM.go = (hash) => { if (location.hash === hash) SM.render(); else location.hash = hash; };
  SM.setQuery = function (patch, replace) {
    const r = SM.route();
    const q = Object.assign({}, r.q, patch);
    Object.keys(q).forEach((k) => (q[k] === '' || q[k] == null) && delete q[k]);
    const s = new URLSearchParams(q).toString();
    const h = '#/' + r.key + (r.id ? '/' + r.id : '') + (s ? '?' + s : '');
    if (replace) { history.replaceState(null, '', h); SM.render(true); } else SM.go(h);
  };
  SM.homeKey = () => (SM.can('dashboard') ? 'dashboard' : (SM.SECTIONS.find((s) => SM.can(s.key)) || { key: 'dashboard' }).key);

  /* ---------- Каркас ---------- */
  function shell() {
    document.body.innerHTML = String(html`
      <div class="app">
        <aside class="sidebar" id="sidebar" aria-label="Разделы"></aside>
        <div class="main">
          <header class="topbar" id="topbar"></header>
          <main class="content" id="view"></main>
        </div>
      </div>
      <nav class="bnav" id="bnav" aria-label="Быстрые разделы"></nav>
      <div id="routebar"></div>
      <div class="nav-scrim" data-act="nav-close"></div>`);
  }

  /* счётчики в меню: что ждёт действия именно от этой роли */
  function counts() {
    const c = {};
    const u = SM.user;
    const sales = SM.db.sales.filter((s) => SM.saleVisible(s));
    const pend = SM.db.payments.filter((p) => p.status === 'pending').length;
    if (pend && SM.flag('confirmPay')) c.accounting = { n: pend, bad: true };
    if (u.role === 'storekeeper') { const n = sales.filter((s) => SM.canReady(s) || (s.readyAt && !s.shippedAt && s.state === 'posted')).length; if (n) c.sales = { n }; }
    else { const n = sales.filter((s) => ['draft', 'await', 'partial'].includes(SM.saleStatus(s))).length; if (n) c.sales = { n }; }
    const dn = SM.db.deliveries.filter((d) => d.status === 'new').length;
    if (dn) c.delivery = { n: dn, bad: u.role === 'courier' };
    const low = SM.lowStock().length;
    if (low) c.stock = { n: low, bad: true };
    const un = SM.unread().length;
    if (un) c.notifications = { n: un, bad: true };
    return c;
  }

  function sidebar(active, cnt) {
    const u = SM.user;
    const groups = [];
    SM.SECTIONS.forEach((s) => {
      if (!SM.can(s.key)) return;
      let g = groups.find((x) => x.name === s.group);
      if (!g) groups.push((g = { name: s.group, items: [] }));
      g.items.push(s);
    });
    const prev = UI.$('#sidebar .sb-nav');
    const keep = prev ? prev.scrollTop : 0;
    UI.$('#sidebar').innerHTML = String(html`<div class="sb-in">
      <a class="sb-brand" href="#/${SM.homeKey()}" aria-label="SM AVTO BASE">${UI.logoMark()}<span class="sb-fade"><b>SM <em>AVTO BASE</em></b><small>Учётная система</small></span></a>
      <nav class="sb-nav">${groups.map((g) => html`<div class="sb-group"><span class="sb-fade">${g.name}</span>${g.items.map((s) => html`
        <a class="sb-link ${active === s.key ? 'active' : ''}" href="#/${s.key}" data-tip="${s.title}" data-tip-pos="right" data-tip-rail="1" ${active === s.key ? raw('aria-current="page"') : ''}><span class="tile">${I(s.icon)}</span><span class="sb-fade">${s.title}</span>${cnt[s.key] ? html`<span class="sb-count ${cnt[s.key].bad ? 'bad' : ''}">${SM.capCount(cnt[s.key].n)}</span>` : ''}</a>`)}</div>`)}</nav>
      <div class="sb-user">${UI.avatar(u.name, u.id)}<div class="who sb-fade"><b>${u.name}</b><small>${SM.roleOf(u).title}</small></div><button class="btn btn-icon btn-sm sb-fade" data-act="logout" data-tip="Выйти" aria-label="Выйти">${I('logout')}</button></div></div>`);
    const nav = UI.$('#sidebar .sb-nav');
    nav.scrollTop = keep;
    const act = nav.querySelector('.sb-link.active');
    if (act) { const a = act.getBoundingClientRect(), n = nav.getBoundingClientRect(); if (a.top < n.top || a.bottom > n.bottom) act.scrollIntoView({ block: 'nearest' }); }
  }

  function topbar(sec, title) {
    const un = SM.unread().length;
    const r = SM.rateRow();
    const lang = SM.LANGS.find((x) => x[0] === SM.lang());
    UI.$('#topbar').innerHTML = String(html`
      <button class="tb-btn burger" data-act="nav-open" aria-label="Меню">${I('menu')}</button>
      <div class="crumbs"><small>${sec ? sec.group : ''}</small><b>${title}</b></div>
      <div class="spacer"></div>
      <button class="tb-btn" data-act="search" data-tip="Поиск: товар, клиент, № продажи (клавиша /)" aria-label="Поиск">${I('search')}</button>
      <button class="tb-btn tb-rate" data-act="rate" data-tip="${'Курс $ на ' + F.dt(r.at) + '\nналичный ' + F.num(r.cash) + ' · безналичный ' + F.num(r.card) + ' · перечисление ' + F.num(r.bank)}"><i class="live"></i><span class="rc-l">$</span><b>${F.num(r.cash)}</b></button>
      <button class="tb-btn tb-lang" data-act="lang" aria-label="Язык" data-tip="Язык интерфейса" translate="no">${I('globe')}<span class="lc">${lang[1]}</span></button>
      <button class="tb-btn theme-btn" data-act="theme" data-tip="${SM.themeTip()}" aria-label="Сменить тему">${I(SM.theme() === 'dark' ? 'sun' : 'moon')}</button>
      <button class="tb-btn bell" data-act="alerts" data-tip="Уведомления" aria-label="Уведомления${un ? ': ' + un : ''}">${I('bell')}${un ? html`<span class="bell-n">${SM.capCount(un)}</span>` : ''}</button>
      ${SM.can('sales', 2) ? html`<a class="btn btn-primary btn-sm tb-new" href="#/sales/new">${I('plus')}Продажа</a>` : ''}`);
  }

  /* ---------- Нижняя навигация на телефоне ---------- */
  const BNAV = { admin: ['dashboard', 'sales', 'products', 'cash'], head: ['dashboard', 'sales', 'debts', 'reports'], seller: ['dashboard', 'sales', 'products', 'clients'],
    storekeeper: ['dashboard', 'stock', 'receipts', 'sales'], accountant: ['dashboard', 'accounting', 'cash', 'debts'], courier: ['dashboard', 'delivery', 'notifications'] };
  function bnav(active, cnt) {
    const pref = (BNAV[SM.user.role] || []).filter((k) => SM.can(k));
    const items = pref.concat(SM.SECTIONS.map((s) => s.key).filter((k) => SM.can(k) && !pref.includes(k))).slice(0, 4);
    UI.$('#bnav').innerHTML = String(html`${items.map((k) => { const s = SM.section(k); return html`<a href="#/${k}" class="${k === active ? 'on' : ''}">${I(s.icon)}<span>${s.short}</span>${cnt[k] ? html`<span class="cnt">${SM.capCount(cnt[k].n)}</span>` : ''}</a>`; })}<button type="button" data-act="nav-open" class="${items.includes(active) ? '' : 'on'}">${I('menu')}<span>Меню</span></button>`);
  }

  /* ---------- Отрисовка страницы ---------- */
  let lastKey = null;
  function routeBar() { const b = UI.$('#routebar'); if (!b) return; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }
  SM.render = function (quiet) {
    const r = SM.route();
    let key = r.key;
    if (!key || !SM.pages[key] || !SM.section(key)) key = SM.homeKey();
    const sec = SM.section(key);
    const page = SM.pages[key];
    const cnt = counts();
    sidebar(key, cnt);
    bnav(key, cnt);
    const view = UI.$('#view');
    const changed = key !== lastKey;
    lastKey = key;
    if (changed) routeBar();
    if (!SM.can(key)) {
      topbar(sec, sec ? sec.title : '');
      view.innerHTML = String(html`<div class="page enter"><div class="locked"><div><div class="ic">${I('lock')}</div><h2>Нет доступа к разделу</h2><p>Права на раздел «${sec ? sec.title : key}» выдаёт администратор в разделе «Пользователи и роли».</p><a class="btn btn-primary mt-16" href="#/${SM.homeKey()}">${I('arrowLeft')}На главную</a></div></div></div>`);
      return;
    }
    const title = typeof page.title === 'function' ? page.title(r) : page.title || (sec && sec.title);
    topbar(sec, title);
    // при переходе в раздел — поочерёдное появление блоков; при фильтрах — без анимации
    view.innerHTML = String(html`<div class="page ${changed && !quiet ? 'enter' : ''}">${page.render(r)}</div>`);
    const pg = view.firstElementChild;
    UI.stagger(pg);
    UI.enhance(view);
    if (page.mount) page.mount(pg, r);
    UI.drawCharts(view, changed && !quiet);
    if (changed && !quiet) UI.countUp(view);
    document.title = (SM.i18n ? SM.i18n.tr(title) : title) + ' · SM AVTO BASE';
  };
  /* обновить страницу и переоткрыть карточку после изменения данных */
  SM.refresh = function () {
    const d = SM._drawer;
    SM.render(true);
    if (d) { SM._drawer = null; UI.closeAll(); d.fn.apply(null, d.args); }
  };
  SM.trackDrawer = (fn, args, el, baseHash) => {
    SM._drawer = { fn, args };
    const prev = el._onClose;
    el._onClose = () => { if (prev) prev(); if (SM._drawer && SM._drawer.fn === fn) SM._drawer = null; if (baseHash && SM.route().id) history.replaceState(null, '', baseHash); };
  };

  /* ---------- Всплывающий список уведомлений ---------- */
  SM.noteRow = (n) => { const k = SM.NOTE_KIND[n.kind] || ['info', 'info', '']; const unread = !n.live && !n.readBy.includes(SM.user.id); return html`<li class="click ${unread ? 'unread' : ''}" data-href="${n.href || ''}" data-note="${n.id}"><span class="note-ic ${k[1]}">${I(k[0])}</span><div class="grow"><b class="fs-13">${n.title}</b><div class="fs-12 muted">${n.text}</div><div class="fs-11 muted">${k[2]} · ${F.ago(n.at)}</div></div></li>`; };
  function alertsPop(btn) {
    const old = UI.$('.pop');
    if (old) { old.remove(); return; }
    const list = SM.notesFor().slice(0, 30);
    const un = SM.unread().length;
    const p = document.createElement('div');
    p.className = 'pop';
    p.innerHTML = String(html`<div class="pop-h"><b>Уведомления</b><span class="badge ${un ? 'b-bad' : 'b-ok'}">${un ? 'новых: ' + un : 'всё прочитано'}</span>${un ? html`<button class="btn btn-ghost btn-sm right" data-x="readall">Прочитать все</button>` : ''}</div>
      <div class="pop-b"><ul class="list">${list.length ? list.map(SM.noteRow) : html`<li>${UI.empty('Всё спокойно', 'Нет событий по вашей роли', 'check')}</li>`}</ul></div>
      ${SM.can('notifications') ? html`<div class="pop-f"><a class="btn btn-secondary btn-sm btn-block" href="#/notifications">Все уведомления${I('arrowRight')}</a></div>` : ''}`);
    document.body.appendChild(p);
    const r = btn.getBoundingClientRect();
    p.style.top = r.bottom + 8 + 'px';
    p.style.right = Math.max(8, innerWidth - r.right) + 'px';
    const rb = p.querySelector('[data-x=readall]');
    if (rb) rb.onclick = (e) => { e.stopPropagation(); SM.ops.markRead(); p.remove(); SM.render(true); UI.toast('Уведомления прочитаны', '', 'ok', { icon: 'bell' }); };
    setTimeout(() => document.addEventListener('click', function off(e) { if (!p.contains(e.target) || e.target.closest('a')) { p.remove(); document.removeEventListener('click', off); } }), 0);
  }

  /* ---------- Глобальный поиск: товары, клиенты, продажи ---------- */
  SM.search = function (q) {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return { products: [], clients: [], sales: [] };
    const words = s.split(/\s+/);
    const hit = (text) => { const t = text.toLowerCase(); return words.every((w) => t.includes(w)); };
    const products = SM.can('products') || SM.can('stock') ? SM.db.products.filter((p) => hit([p.code, p.oldCode, p.name, (p.alt || []).join(' '), p.brand, p.maker, SM.category(p.cat).name, Object.values(p.attrs || {}).join(' ')].join(' '))).slice(0, 8) : [];
    const clients = SM.can('clients') || SM.can('debts') ? SM.db.clients.filter((c) => hit([c.name, c.contact, c.phone, String(c.phone).replace(/\D/g, ''), c.inn, String(c.inn).replace(/\D/g, '')].join(' '))).slice(0, 6) : [];
    const sales = SM.can('sales') ? SM.db.sales.filter((x) => SM.saleVisible(x) && hit(x.no + ' ' + x.no.replace(/\D/g, '') + ' ' + SM.client(x.clientId).name)).slice(0, 6) : [];
    return { products, clients, sales };
  };
  function searchModal(initial) {
    const m = UI.modal({ title: 'Поиск по системе', sub: 'Код, название или альтернативное название товара · клиент, телефон, ИНН · номер продажи',
      body: html`<div class="input-icon">${I('search')}<input class="input input-lg" id="msearch" placeholder="Например: 205/55 R16, колодки нексия, СП-0002" autocomplete="off" enterkeyhint="search" autofocus></div><div id="msres" class="mt-12"></div>` });
    const inp = m.querySelector('#msearch');
    const box = m.querySelector('#msres');
    const draw = () => {
      const r = SM.search(inp.value);
      const none = !r.products.length && !r.clients.length && !r.sales.length;
      box.innerHTML = String(inp.value.trim().length < 2 ? html`<p class="muted fs-13">Введите хотя бы 2 символа — ищем по части слова или номера.</p>` : none ? UI.empty('Ничего не найдено', 'Попробуйте другое написание', 'search') : html`
        ${r.products.length ? html`<div class="section-t">Товары</div><ul class="list">${r.products.map((p) => html`<li class="click" data-act="open-product" data-id="${p.id}">${UI.thumb(p)}<div class="grow"><b class="fs-13">${p.name}</b><div class="fs-12 muted">${p.code} · ${SM.category(p.cat).name}</div></div><span class="fw-8 num ${SM.available(p.id) <= 0 ? 'bad-t' : ''}">${SM.available(p.id)} ${p.unit}</span></li>`)}</ul>` : ''}
        ${r.clients.length ? html`<div class="section-t">Клиенты и контрагенты</div><ul class="list">${r.clients.map((c) => html`<li class="click" data-act="open-client" data-id="${c.id}">${UI.avatar(c.name, c.id, 'sm')}<div class="grow"><b class="fs-13">${c.name}</b><div class="fs-12 muted">${c.phone}${c.inn ? ' · ИНН ' + c.inn : ''}</div></div></li>`)}</ul>` : ''}
        ${r.sales.length ? html`<div class="section-t">Продажи</div><ul class="list">${r.sales.map((s) => html`<li class="click" data-act="open-sale" data-id="${s.id}"><span class="note-ic accent">${I('cart')}</span><div class="grow"><b class="fs-13">${s.no} · ${SM.client(s.clientId).name}</b><div class="fs-12 muted">${F.date(s.date)} · ${F.cur(SM.saleCalc(s).total, s.cur)}</div></div>${UI.badge(SM.SALE_STATUS[SM.saleStatus(s)])}</li>`)}</ul>` : ''}`);
    };
    inp.value = initial || '';
    inp.addEventListener('input', draw);
    draw();
    setTimeout(() => inp.focus(), 80);
  }
  SM.searchModal = searchModal;

  function bindGlobal() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      const hr = e.target.closest('[data-href]');
      if (a) {
        const act = a.dataset.act, id = a.dataset.id;
        const inModal = a.closest('.overlay');
        const open = (fn) => { if (inModal && a.closest('#msres')) UI.closeAll(); fn(); };
        if (act === 'logout') { SM.logout(); location.replace('index.html'); }
        else if (act === 'search') searchModal();
        else if (act === 'alerts') { e.stopPropagation(); alertsPop(a); }
        else if (act === 'lang') { e.stopPropagation(); langMenu(a); }
        else if (act === 'theme') { const r = a.getBoundingClientRect(); UI.hideTip(); SM.toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); }
        else if (act === 'rate') SM.go('#/rates');
        else if (act === 'nav-open') document.body.classList.add('nav-open');
        else if (act === 'nav-close') document.body.classList.remove('nav-open');
        else if (act === 'open-sale' && SM.openSale) open(() => SM.openSale(id));
        else if (act === 'open-client' && SM.openClient) open(() => SM.openClient(id));
        else if (act === 'open-product' && SM.openProduct) open(() => SM.openProduct(id));
        else return;
        e.preventDefault();
        return;
      }
      if (hr && !e.target.closest('a,button,input,select,textarea,label')) {
        const nid = hr.dataset.note;
        if (nid) { const n = SM.db.notes.find((x) => x.id === nid); if (n && !n.readBy.includes(SM.user.id)) { n.readBy.push(SM.user.id); SM.save(); } }
        const pop = UI.$('.pop'); if (pop) pop.remove();
        const h = hr.dataset.href;
        if (h && h.startsWith('#')) { UI.closeAll(); SM.go(h); }
      }
      if (e.target.closest('.sb-link')) document.body.classList.remove('nav-open');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !UI.layers()) { e.preventDefault(); searchModal(); }
      if (e.key === 'Escape') document.body.classList.remove('nav-open');
    });
    addEventListener('hashchange', () => { UI.closeAll(); UI.closeSelect(); document.body.classList.remove('nav-open'); SM._drawer = null; SM.render(); window.scrollTo(0, 0); });
    // данные поменяли в другой вкладке — перечитываем
    addEventListener('storage', (e) => { if (e.key === SM.DB_KEY && e.newValue) { SM.load(); SM.user = SM.currentUser(); if (!SM.user) location.replace('index.html'); else SM.refresh(); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { SM.checkUpdate(); const w = SM.themeWanted(); if (w !== SM.theme()) SM.applyTheme(w); } });
  }

  /* ---------- Общие элементы страниц ---------- */
  UI.pageHead = (title, sub, actions) => html`<div class="page-head"><div class="ph-text"><h1>${title}</h1>${sub ? html`<p>${sub}</p>` : ''}</div>${actions ? html`<div class="ph-actions">${actions}</div>` : ''}</div>`;
  UI.tabs = (list, active, param = 'tab') => html`<div class="tabs" role="tablist">${list.filter(Boolean).map(([k, t, n]) => html`<button class="tab ${active === k ? 'on' : ''}" data-tab="${k}" data-param="${param}" role="tab" aria-selected="${active === k}">${t}${n != null ? html`<span class="pill">${n}</span>` : ''}</button>`)}</div>`;
  UI.bindTabs = (el) => UI.$$('[data-tab]', el).forEach((b) => (b.onclick = () => SM.setQuery({ [b.dataset.param]: b.dataset.tab }, true)));
  SM.PERIODS = [['day', 'Сегодня'], ['week', '7 дней'], ['month', '30 дней'], ['all', 'Всё время']];
  UI.periodSeg = (val, opts = SM.PERIODS) => html`<div class="seg" role="group" aria-label="Период">${opts.map(([k, t]) => html`<button class="${val === k ? 'on' : ''}" data-period="${k}">${t}</button>`)}</div>`;
  UI.bindPeriod = (el, param = 'p') => UI.$$('[data-period]', el).forEach((b) => (b.onclick = () => SM.setQuery({ [param]: b.dataset.period }, true)));
  SM.periodRange = (p) => {
    const t = SM.d.todayISO();
    const days = { day: 0, week: 6, month: 29 }[p];
    if (days == null) return { from: null, to: null, days: null, label: 'всё время' };
    return { from: SM.d.iso(SM.d.addDays(t, -days)), to: t, days: days + 1, label: { day: 'сегодня', week: '7 дней', month: '30 дней' }[p] };
  };
  SM.dayLabels = (n) => { const out = []; for (let i = n - 1; i >= 0; i--) out.push(SM.d.iso(SM.d.addDays(SM.d.todayISO(), -i))); return out; };
  /* поиск над таблицей: ввод с задержкой, без потери фокуса */
  UI.searchInput = (val, ph, param = 'q') => html`<label class="input-icon" style="flex:1 1 260px;max-width:380px">${I('search')}<input class="input" data-search="${param}" value="${val || ''}" placeholder="${ph}" autocomplete="off"></label>`;
  UI.bindSearch = (el) => UI.$$('[data-search]', el).forEach((inp) => {
    let t;
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { const pos = inp.selectionStart; SM.setQuery({ [inp.dataset.search]: inp.value }, true); const n = UI.$('[data-search="' + inp.dataset.search + '"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 220); });
  });
  UI.bindFilters = (el) => UI.$$('select[data-filter]', el).forEach((s) => s.addEventListener('change', () => SM.setQuery({ [s.dataset.filter]: s.value }, true)));
  UI.filterSelect = (param, val, list, all) => html`<select class="select input-sm" data-filter="${param}" aria-label="${all}" style="width:auto;min-width:170px;flex:0 1 220px">${UI.options(list, val, all)}</select>`;
  UI.pointOptions = (filterFn) => SM.db.points.filter((p) => (filterFn ? filterFn(p) : true)).map((p) => [p.id, p.name + (p.active ? '' : ' (отключена)')]);

  /* ---------- Запуск ---------- */
  SM.boot = function () {
    document.documentElement.setAttribute('data-theme', SM.themeWanted());
    SM.load();
    SM.user = SM.currentUser();
    if (!SM.user) { location.replace('index.html'); return; }
    shell();
    bindGlobal();
    if (SM.i18n) SM.i18n.set(SM.lang());
    SM.render();
    SM.startThemeClock();
    SM.checkUpdate();
    setInterval(SM.checkUpdate, 60000);
    // колокольчик «звенит», если есть непрочитанные
    if (SM.unread().length) setTimeout(() => { const b = UI.$('.bell'); if (b) b.classList.add('ring'); }, 900);
  };
})();
