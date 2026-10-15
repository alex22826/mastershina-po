/* =========================================================
   SM AVTO BASE — ядро: утилиты, хранилище, вход, роли и права,
   расчёты (остатки, резерв, продажи, долги, касса) и операции.
   Данные — демо в localStorage; в рабочей версии это API сервера.
   ========================================================= */
(function () {
  'use strict';
  const SM = (window.SM = window.SM || {});

  /* ---------- Безопасный HTML ---------- */
  class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
  function toHTML(v) {
    if (v == null || v === false || v === true) return '';
    if (v instanceof Raw) return v.s;
    if (Array.isArray(v)) return v.map(toHTML).join('');
    return esc(v);
  }
  SM.esc = esc;
  SM.raw = (s) => new Raw(String(s));
  SM.html = (strings, ...vals) => {
    let out = '';
    strings.forEach((s, i) => { out += s; if (i < vals.length) out += toHTML(vals[i]); });
    return new Raw(out);
  };
  SM.capCount = (n, max = 99) => (n > max ? max + '+' : String(n));

  /* ---------- Даты ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const D = (SM.d = {
    today() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; },
    iso(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); },
    todayISO() { return D.iso(D.today()); },
    parse(s) {
      if (s instanceof Date) return s;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
      return new Date(s);
    },
    addDays(dt, n) { const x = new Date(D.parse(dt)); x.setDate(x.getDate() + n); return x; },
    dayOf(s) { return D.iso(D.parse(s)); },
    diffDays(a, b) { return Math.round((D.parse(D.dayOf(a)) - D.parse(D.dayOf(b))) / 86400000); },
    inRange(s, from, to) { const d = D.dayOf(s); return (!from || d >= from) && (!to || d <= to); },
    at(dayOffset, h = 10, m = 0) { const x = D.addDays(D.today(), dayOffset); x.setHours(h, m, 0, 0); return x.toISOString(); },
  });

  /* ---------- Форматирование ---------- */
  const nf = (d) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
  const NF0 = nf(0), NF1 = nf(1), NF2 = nf(2);
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  SM.MONTHS = MONTHS;
  const F = (SM.fmt = {
    num(v, d = 0) { return (d === 0 ? NF0 : d === 1 ? NF1 : d === 2 ? NF2 : nf(d)).format(Number(v) || 0); },
    // сумма в валюте: сумы без копеек, доллары с центами
    cur(v, cur = 'UZS') { return cur === 'USD' ? '$' + F.num(v, 2) : F.num(Math.round(v)) + ' сум'; },
    m(v) { return F.num(Math.round(v)); },
    usd(v) { return '$' + F.num(v, 2); },
    short(v) {
      const a = Math.abs(v), s = v < 0 ? '−' : '';
      if (a >= 1e9) return s + NF2.format(a / 1e9) + ' млрд';
      if (a >= 1e6) return s + NF1.format(a / 1e6) + ' млн';
      if (a >= 1e3) return s + NF0.format(a / 1e3) + ' тыс';
      return s + NF0.format(a);
    },
    pct(v, d = 1) { return F.num(v, d) + '%'; },
    date(s) { if (!s) return '—'; const x = D.parse(s); return pad(x.getDate()) + '.' + pad(x.getMonth() + 1) + '.' + x.getFullYear(); },
    dm(s) { if (!s) return '—'; const x = D.parse(s); return x.getDate() + ' ' + MONTHS[x.getMonth()]; },
    dt(s) { if (!s) return '—'; const x = D.parse(s); return pad(x.getDate()) + '.' + pad(x.getMonth() + 1) + '.' + x.getFullYear() + ' ' + pad(x.getHours()) + ':' + pad(x.getMinutes()); },
    time(s) { const x = D.parse(s); return pad(x.getHours()) + ':' + pad(x.getMinutes()); },
    ago(s) {
      const m = Math.round((Date.now() - D.parse(s)) / 60000);
      if (m < 1) return 'только что';
      if (m < 60) return m + ' мин назад';
      const h = Math.round(m / 60);
      if (h < 24) return h + ' ч назад';
      const d = Math.round(h / 24);
      return d + ' ' + F.plural(d, 'день', 'дня', 'дней') + ' назад';
    },
    plural(n, one, few, many) {
      const a = Math.abs(n) % 100, b = a % 10;
      if (a > 10 && a < 20) return many;
      if (b > 1 && b < 5) return few;
      if (b === 1) return one;
      return many;
    },
    phone(s) { return s || '—'; },
  });

  /* ---------- Хранилище ---------- */
  const DB_KEY = 'sm.db.v1';
  const SESSION_KEY = 'sm.session';
  SM.DB_VERSION = 2; // 2 — упрощённые демо-данные (2 контрагента, 2 продажи, 5 товаров)
  SM.DB_KEY = DB_KEY;
  let memo = {};

  function shiftDates(obj, deltaDays) {
    // демо: все даты сдвигаются к сегодняшнему дню, чтобы данные были «свежими»
    const reD = /^\d{4}-\d{2}-\d{2}$/, reDT = /^\d{4}-\d{2}-\d{2}T/;
    const ms = deltaDays * 86400000;
    (function walk(o) {
      for (const k in o) {
        const v = o[k];
        if (typeof v === 'string') { if (reD.test(v)) o[k] = D.iso(D.addDays(v, deltaDays)); else if (reDT.test(v)) o[k] = new Date(Date.parse(v) + ms).toISOString(); }
        else if (v && typeof v === 'object') walk(v);
      }
    })(obj);
  }
  SM.load = function () {
    let db = null;
    try { db = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) { db = null; }
    if (!db || db.version !== SM.DB_VERSION) { db = SM.seed(); SM.db = db; persist(); }
    const today = D.todayISO();
    if (db.demo && db.baseDay !== today) { shiftDates(db, D.diffDays(today, db.baseDay)); db.baseDay = today; SM.db = db; persist(); }
    // документы, оформленные до фиксации НДС, получают текущие настройки — дальше они не меняются
    const noVat = db.sales.filter((s) => s.state !== 'draft' && !s.vatCfg).concat(db.receipts.filter((r) => r.status !== 'draft' && !r.vatCfg));
    if (noVat.length) { noVat.forEach((x) => (x.vatCfg = Object.assign({}, db.settings.vat))); SM.db = db; persist(); }
    SM.db = db; memo = {};
    return db;
  };
  function persist() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(SM.db)); }
    catch (e) { console.warn('Не удалось сохранить данные', e); }
  }
  SM.save = function () { SM.db.rev = (SM.db.rev || 0) + 1; memo = {}; persist(); SM.emit('change'); };
  SM.resetDemo = function () { try { localStorage.removeItem(DB_KEY); } catch (e) { /* без хранилища */ } SM.db = SM.seed(); persist(); memo = {}; };
  SM.memo = function (key, fn) { if (!(key in memo)) memo[key] = fn(); return memo[key]; };
  SM.uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  // сквозная нумерация документов: СП-0006, ПТ-0003…
  SM.nextNo = function (prefix) {
    const c = (SM.db.counters = SM.db.counters || {});
    c[prefix] = (c[prefix] || 0) + 1;
    return prefix + '-' + String(c[prefix]).padStart(4, '0');
  };

  /* ---------- События ---------- */
  const listeners = {};
  SM.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  SM.emit = (ev, data) => { (listeners[ev] || []).forEach((fn) => fn(data)); };

  /* ---------- Вход / сессия ---------- */
  SM.sha256 = async function (str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  SM.passHash = (login, pass) => SM.sha256(login.trim().toLowerCase() + ':' + pass + ':sm-avto');
  SM.login = async function (login, pass) {
    const db = SM.db || SM.load();
    const l = String(login || '').trim().toLowerCase();
    const u = db.users.find((x) => x.login.toLowerCase() === l);
    const hash = await SM.passHash(l, pass || '');
    if (!u || u.passHash !== hash) {
      SM.log('Неудачная попытка входа', 'user', u ? u.id : null, 'Логин: ' + (l || '—'), u || { id: null, name: 'Гость' });
      SM.save();
      return { ok: false, error: 'wrong' };
    }
    if (!u.active) return { ok: false, error: 'blocked' };
    localStorage.setItem(SESSION_KEY, JSON.stringify({ uid: u.id, at: Date.now() }));
    u.lastLogin = new Date().toISOString();
    SM.log('Вход в систему', 'user', u.id, '', u);
    SM.save();
    return { ok: true, user: u };
  };
  SM.currentUser = function () {
    let raw = null;
    try { raw = localStorage.getItem(SESSION_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      if (Date.now() - s.at > 12 * 3600 * 1000) { SM.logout(true); return null; }
      const u = (SM.db || SM.load()).users.find((x) => x.id === s.uid);
      return u && u.active ? u : null;
    } catch (e) { return null; }
  };
  SM.logout = function (silent) {
    if (!silent && SM.user) { SM.log('Выход из системы', 'user', SM.user.id, ''); SM.save(); }
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* без хранилища */ }
  };

  /* ---------- Разделы и права (ТЗ, раздел 3) ---------- */
  SM.LEVELS = ['Нет доступа', 'Просмотр', 'Изменение', 'Полный'];
  SM.SECTIONS = [
    { key: 'dashboard', title: 'Главная', group: 'Главное', icon: 'home', short: 'Главная' },
    { key: 'notifications', title: 'Уведомления', group: 'Главное', icon: 'bell', short: 'Увед.' },
    { key: 'sales', title: 'Продажи', group: 'Продажи', icon: 'cart', short: 'Продажи' },
    { key: 'clients', title: 'Клиенты и контрагенты', group: 'Продажи', icon: 'users', short: 'Клиенты' },
    { key: 'debts', title: 'Задолженности', group: 'Продажи', icon: 'scale', short: 'Долги' },
    { key: 'delivery', title: 'Доставка', group: 'Продажи', icon: 'truck', short: 'Доставка' },
    { key: 'products', title: 'Товары', group: 'Склад', icon: 'tire', short: 'Товары' },
    { key: 'stock', title: 'Остатки', group: 'Склад', icon: 'layers', short: 'Остатки' },
    { key: 'receipts', title: 'Поступления', group: 'Склад', icon: 'inbox', short: 'Приход' },
    { key: 'cash', title: 'Касса и банк', group: 'Финансы', icon: 'wallet', short: 'Касса' },
    { key: 'accounting', title: 'Бухгалтерия', group: 'Финансы', icon: 'calc', short: 'Бухгалт.' },
    { key: 'expenses', title: 'Расходы', group: 'Финансы', icon: 'coins', short: 'Расходы' },
    { key: 'rates', title: 'Валюты и НДС', group: 'Финансы', icon: 'percent', short: 'Курсы' },
    { key: 'documents', title: 'Документы', group: 'Документы и отчёты', icon: 'file', short: 'Докум.' },
    { key: 'reports', title: 'Отчёты', group: 'Документы и отчёты', icon: 'chart', short: 'Отчёты' },
    { key: 'users', title: 'Пользователи и роли', group: 'Администрирование', icon: 'shield', short: 'Роли' },
    { key: 'refs', title: 'Справочники', group: 'Администрирование', icon: 'book', short: 'Справ.' },
    { key: 'history', title: 'История операций', group: 'Администрирование', icon: 'history', short: 'История' },
  ];
  SM.section = (k) => SM.SECTIONS.find((s) => s.key === k);
  // права на действия (кроме уровня доступа к разделу)
  SM.FLAGS = [
    { key: 'confirmPay', title: 'Подтверждение оплат', hint: 'бухгалтер проверяет поступление и подтверждает или отклоняет оплату (ТЗ 11.2)' },
    { key: 'ship', title: 'Сборка и отгрузка', hint: '«Готово к отгрузке» и «Отгружено» у продаж' },
    { key: 'setRates', title: 'Установка курсов', hint: 'ручная установка курса $ (ТЗ 10)' },
    { key: 'credit', title: 'Продажа в долг', hint: 'оформление продажи без полной оплаты' },
    { key: 'ownOnly', title: 'Только свои продажи', hint: 'продавец видит свои продажи и долги своих клиентов' },
    { key: 'cancelOps', title: 'Отмена проведённых операций', hint: 'отмена создаёт корректирующую запись, ничего не удаляется (ТЗ 21)' },
  ];
  const L = (o) => o;
  const ALL = (lv) => Object.fromEntries(SM.SECTIONS.map((s) => [s.key, lv]));
  SM.ROLES = {
    admin: {
      title: 'Администратор', desc: 'Пользователи, роли, справочники, все операции и отчёты',
      perms: ALL(3), flags: { confirmPay: true, ship: true, setRates: true, credit: true, cancelOps: true }, discountMax: 100,
    },
    head: {
      title: 'Руководитель', desc: 'Общая сводка, продажи, оплаты, долги, расходы, остатки, касса, отчёты',
      perms: Object.assign(ALL(1), L({ users: 0, refs: 0, rates: 2, sales: 1 })), flags: { setRates: true, credit: true }, discountMax: 30,
    },
    seller: {
      title: 'Продавец', desc: 'Клиенты, поиск товаров и остатков, продажи, скидки, долг, заявки на доставку',
      perms: L({ dashboard: 1, notifications: 1, sales: 2, clients: 2, debts: 1, delivery: 2, products: 1, stock: 1, documents: 2, reports: 1 }),
      flags: { credit: true, ownOnly: true }, discountMax: 10,
    },
    storekeeper: {
      title: 'Сотрудник склада', desc: 'Приём, списание и отгрузка; заявки и остатки по своим складам',
      perms: L({ dashboard: 1, notifications: 1, sales: 1, delivery: 1, products: 2, stock: 2, receipts: 2, transfers: 2, documents: 1, reports: 1 }),
      flags: { ship: true }, discountMax: 0,
    },
    accountant: {
      title: 'Бухгалтер', desc: 'Подтверждение оплат, касса и банк, долги, документы, акты сверки, финотчёты',
      perms: L({ dashboard: 1, notifications: 1, sales: 1, clients: 1, debts: 2, cash: 3, accounting: 3, expenses: 2, rates: 2, documents: 2, reports: 1, receipts: 1, history: 1 }),
      flags: { confirmPay: true, setRates: true, cancelOps: true }, discountMax: 0,
    },
    courier: {
      title: 'Сотрудник по доставке', desc: 'Заявки на доставку, водитель и автомобиль, стоимость, направление и статус',
      perms: L({ dashboard: 1, notifications: 1, delivery: 2 }), flags: {}, discountMax: 0,
    },
  };
  SM.roleOf = (u = SM.user) => (SM.db.roles && SM.db.roles[u.role]) || SM.ROLES[u.role];
  SM.level = (section, u = SM.user) => { if (!u) return 0; const r = SM.roleOf(u); return (r && r.perms[section]) || 0; };
  SM.can = (section, lv = 1, u = SM.user) => SM.level(section, u) >= lv;
  SM.flag = (f, u = SM.user) => { if (!u) return false; const r = SM.roleOf(u); return !!(r && r.flags[f]); };
  SM.discountMax = (u = SM.user) => { const r = SM.roleOf(u); return r ? r.discountMax || 0 : 0; };
  SM.isAdmin = (u = SM.user) => !!u && u.role === 'admin';
  // склад видит только свои точки; у остальных — все
  SM.userPoints = (u = SM.user) => (u && u.points && u.points.length && u.role !== 'admin' && u.role !== 'head' && u.role !== 'accountant' ? u.points : SM.db.points.map((p) => p.id));
  SM.pointVisible = (pid, u = SM.user) => SM.userPoints(u).includes(pid);

  /* ---------- Справочники ---------- */
  const byId = (list, id) => list.find((x) => x.id === id);
  SM.user_ = (id) => byId(SM.db.users, id) || { id, name: '—', role: '' };
  SM.point = (id) => byId(SM.db.points, id) || { id, name: '—', type: 'shop' };
  SM.product = (id) => byId(SM.db.products, id) || { id, name: 'Товар удалён', code: '—', unit: 'шт', price: 0, cur: 'UZS' };
  SM.client = (id) => byId(SM.db.clients, id) || { id, name: '—' };
  SM.driver = (id) => byId(SM.db.drivers, id);
  SM.car = (id) => byId(SM.db.cars, id);
  SM.category = (id) => byId(SM.db.categories, id) || { id, name: '—' };
  SM.catRoot = (id) => { let c = SM.category(id); while (c && c.parent) c = SM.category(c.parent); return c; };
  SM.isTire = (p) => SM.catRoot(p.cat).id === 'c-tires';
  SM.activePoints = () => SM.db.points.filter((p) => p.active);

  /* способы оплаты: тип курса нужен для пересчёта $ (ТЗ 10: разные курсы для форм оплаты) */
  SM.METHODS_DEFAULT = [
    { id: 'cash_uzs', name: 'Наличные, сум', cur: 'UZS', rate: 'cash', icon: 'cash' },
    { id: 'cash_usd', name: 'Наличные, $', cur: 'USD', rate: 'cash', icon: 'dollar' },
    { id: 'card', name: 'Карта / терминал', cur: 'UZS', rate: 'card', icon: 'card' },
    { id: 'qr', name: 'QR-оплата', cur: 'UZS', rate: 'card', icon: 'qr' },
    { id: 'bank', name: 'Перечисление на р/с', cur: 'UZS', rate: 'bank', icon: 'bank' },
    { id: 'corp', name: 'Корпоративная карта', cur: 'UZS', rate: 'card', icon: 'card' },
  ];
  SM.methods = () => SM.db.methods.filter((m) => m.active);
  SM.method = (id) => byId(SM.db.methods, id) || { id, name: id, cur: 'UZS', rate: 'cash', icon: 'cash' };
  SM.RATE_TYPES = { cash: 'Наличный', card: 'Безналичный (карта, QR)', bank: 'Перечисление' };

  /* ---------- Валюта, курс, НДС ---------- */
  SM.rate = (type = 'cash') => { const r = SM.db.rates[SM.db.rates.length - 1]; return r ? r[type] || r.cash : 12650; };
  SM.rateRow = () => SM.db.rates[SM.db.rates.length - 1];
  SM.conv = function (amount, from, to, rate) {
    if (from === to) return amount;
    if (from === 'USD' && to === 'UZS') return amount * rate;
    if (from === 'UZS' && to === 'USD') return amount / rate;
    return amount;
  };
  SM.toUZS = (amount, cur, rate) => SM.conv(amount, cur, 'UZS', rate);
  /* настройки НДС: у проведённого документа — свои, зафиксированные при оформлении
     (как курс, ТЗ 10); без документа — текущие из «Валюты и НДС» */
  SM.vatCfg = (doc) => (doc && doc.vatCfg) || SM.db.settings.vat;
  SM.vatSnap = () => Object.assign({}, SM.db.settings.vat);
  /* НДС: «в т.ч.» (цена уже с НДС) или «сверху». Ставка по умолчанию 12% (ТЗ 10) */
  SM.vatSplit = function (amount, on = true, cfg) {
    const v = cfg || SM.vatCfg();
    if (!on || !v.enabled) return { net: amount, vat: 0, total: amount };
    if (v.mode === 'top') { const vat = amount * v.rate / 100; return { net: amount, vat, total: amount + vat }; }
    const vat = amount * v.rate / (100 + v.rate);
    return { net: amount - vat, vat, total: amount };
  };

  /* ---------- Остатки (ТЗ 6): движение товара — единственный источник ---------- */
  SM.stockMap = () => SM.memo('stock', () => {
    const m = {};
    for (const mv of SM.db.moves) {
      const p = (m[mv.productId] = m[mv.productId] || {});
      p[mv.pointId] = (p[mv.pointId] || 0) + mv.qty;
    }
    return m;
  });
  /* резерв: черновики продаж и отправленные (ещё не принятые) перемещения */
  SM.reserveMap = () => SM.memo('reserve', () => {
    const m = {};
    const add = (pid, point, q) => { const p = (m[pid] = m[pid] || {}); p[point] = (p[point] || 0) + q; };
    SM.db.sales.filter((s) => s.state === 'draft').forEach((s) => s.items.forEach((l) => add(l.productId, s.pointId, l.qty)));
    SM.db.transfers.filter((t) => t.status === 'sent' || t.status === 'created').forEach((t) => t.items.forEach((l) => add(l.productId, t.from, l.qty)));
    return m;
  });
  SM.qty = (pid, point) => { const s = SM.stockMap()[pid] || {}; return point ? s[point] || 0 : Object.values(s).reduce((a, b) => a + b, 0); };
  SM.reserved = (pid, point) => { const s = SM.reserveMap()[pid] || {}; return point ? s[point] || 0 : Object.values(s).reduce((a, b) => a + b, 0); };
  SM.available = (pid, point) => SM.qty(pid, point) - SM.reserved(pid, point);
  SM.isLow = (p, point) => { const q = SM.qty(p.id, point); return q <= (p.min || 0); };
  SM.lowStock = () => SM.memo('low', () => SM.db.products.filter((p) => p.active && SM.qty(p.id) <= (p.min || 0)));
  SM.addMove = (productId, pointId, qty, kind, doc, at) => SM.db.moves.push({ id: SM.uid('mv'), at: at || new Date().toISOString(), productId, pointId, qty, kind, doc, by: SM.user ? SM.user.id : null });
  SM.MOVE_KINDS = { initial: 'Начальный остаток', receipt: 'Поступление', 'transfer-out': 'Перемещение: отправлено', 'transfer-in': 'Перемещение: принято', sale: 'Продажа', return: 'Возврат', writeoff: 'Списание', adjust: 'Корректировка', 'receipt-cancel': 'Отмена поступления' };

  /* ---------- Продажи (ТЗ 9) ---------- */
  SM.lineSum = (l) => l.qty * l.price * (1 - (l.disc || 0) / 100);
  SM.saleCalc = function (s) {
    const sub = s.items.reduce((a, l) => a + SM.lineSum(l), 0);
    const lineDisc = s.items.reduce((a, l) => a + l.qty * l.price * (l.disc || 0) / 100, 0);
    const docDisc = sub * (s.docDisc || 0) / 100;
    const base = sub - docDisc;
    const v = SM.vatSplit(base, s.vat, SM.vatCfg(s));
    const pays = SM.db.payments.filter((p) => p.saleId === s.id && p.dir === 'in');
    const inCur = (p) => SM.conv(p.amount, p.cur, s.cur, p.rate);
    const paid = pays.filter((p) => p.status === 'confirmed').reduce((a, p) => a + inCur(p), 0);
    const pending = pays.filter((p) => p.status === 'pending').reduce((a, p) => a + inCur(p), 0);
    const eps = s.cur === 'USD' ? 0.005 : 0.5;
    const debt = Math.max(0, v.total - paid);
    return { sub, lineDisc, docDisc, net: v.net, vat: v.vat, total: v.total, paid, pending, debt: debt < eps ? 0 : debt, pays, eps };
  };
  SM.saleTotalUZS = (s) => SM.toUZS(SM.saleCalc(s).total, s.cur, s.rate);
  /* статусы продажи (ТЗ 9.2) */
  SM.SALE_STATUS = {
    draft: ['Черновик', 'b-slate'], await: ['Ожидает оплаты', 'b-warn'], partial: ['Частично оплачено', 'b-violet'], paid: ['Оплачено', 'b-info'],
    ready: ['Готово к отгрузке', 'b-accent'], shipped: ['Отгружено', 'b-info'], done: ['Завершено', 'b-ok'], cancelled: ['Отменено', 'b-bad'],
  };
  SM.SALE_FLOW = ['draft', 'await', 'paid', 'ready', 'shipped', 'done'];
  /* Как продажа «двигается» по статусам. Порядок проверок важен:
     отменена/черновик/завершена → отгружена → собрана → дальше по деньгам.
     «Готово к отгрузке» склад ставит только после подтверждённой оплаты
     или если продажа оформлена в долг (см. SM.canReady). */
  SM.saleStatus = function (s) {
    if (s.state === 'cancelled') return 'cancelled';
    if (s.state === 'draft') return 'draft';
    if (s.state === 'done') return 'done';
    if (s.shippedAt) return 'shipped';
    if (s.readyAt) return 'ready';
    const c = SM.saleCalc(s);
    if (c.debt === 0) return 'paid';
    if (c.paid > 0) return 'partial';
    return 'await';
  };
  SM.payStatus = function (s) {
    const c = SM.saleCalc(s);
    if (s.state === 'draft' || s.state === 'cancelled') return ['—', 'b-slate'];
    if (c.debt === 0) return ['Оплачено', 'b-ok'];
    if (c.pending > 0) return ['На проверке', 'b-warn'];
    if (c.paid > 0) return ['Частично', 'b-violet'];
    return [s.credit ? 'В долг' : 'Не оплачено', s.credit ? 'b-bad' : 'b-warn'];
  };
  SM.shipStatus = (s) => (s.shippedAt ? ['Отгружено', 'b-ok'] : s.readyAt ? ['Собрано', 'b-accent'] : ['Не отгружено', 'b-slate']);
  SM.canReady = (s) => s.state === 'posted' && !s.readyAt && !s.shippedAt && (SM.saleCalc(s).debt === 0 || s.credit);
  SM.saleVisible = (s, u = SM.user) => (SM.flag('ownOnly', u) ? s.sellerId === u.id : true) && (u.role === 'storekeeper' ? SM.pointVisible(s.pointId, u) : true);
  SM.overdue = (s) => s.state === 'posted' && s.due && SM.saleCalc(s).debt > 0 && D.dayOf(s.due) < D.todayISO();
  SM.RECEIVE = { pickup: 'Самовывоз', delivery: 'Доставка' };

  /* ---------- Контрагенты и взаиморасчёты (ТЗ 12–13) ----------
     Сальдо в сумах: «+» — контрагент должен нам, «−» — мы должны ему.
     Операции в $ пересчитаны по курсу, сохранённому в самой операции. */
  SM.ledger = function (clientId) {
    return SM.memo('ledger:' + clientId, () => {
      const c = SM.client(clientId);
      const ops = [];
      // удалённый черновик (отменён, не проводился) во взаиморасчёты не попадает
      SM.db.sales.filter((s) => s.clientId === clientId && s.state !== 'draft' && !(s.state === 'cancelled' && !s.postedAt)).forEach((s) => {
        ops.push({ at: s.date, doc: 'Продажа ' + s.no, ref: s.id, kind: 'sale', debit: SM.saleTotalUZS(s), credit: 0 });
        if (s.state === 'cancelled') ops.push({ at: s.cancelledAt || s.date, doc: 'Отмена продажи ' + s.no, ref: s.id, kind: 'cancel', debit: 0, credit: SM.saleTotalUZS(s) });
      });
      SM.db.payments.filter((p) => p.clientId === clientId && p.status === 'confirmed').forEach((p) => {
        const v = SM.toUZS(p.amount, p.cur, p.rate);
        if (p.dir === 'in') ops.push({ at: p.at, doc: 'Оплата · ' + SM.method(p.method).name + (p.saleId ? ' (' + (SM.db.sales.find((s) => s.id === p.saleId) || {}).no + ')' : ''), ref: p.id, kind: 'pay', debit: 0, credit: v });
        else ops.push({ at: p.at, doc: (p.refund ? 'Возврат денег · ' : 'Оплата поставщику · ') + SM.method(p.method).name, ref: p.id, kind: 'payout', debit: v, credit: 0 });
      });
      SM.db.receipts.filter((r) => r.supplierId === clientId && r.status !== 'draft').forEach((r) => {
        ops.push({ at: r.date, doc: 'Поступление ' + r.no, ref: r.id, kind: 'receipt', debit: 0, credit: SM.receiptTotalUZS(r) });
        if (r.status === 'cancelled') ops.push({ at: r.cancelledAt || r.date, doc: 'Отмена поступления ' + r.no, ref: r.id, kind: 'cancel', debit: SM.receiptTotalUZS(r), credit: 0 });
      });
      (SM.db.adjustments || []).filter((a) => a.clientId === clientId).forEach((a) => ops.push({ at: a.at, doc: 'Корректировка: ' + a.reason, ref: a.id, kind: 'adjust', debit: a.amount > 0 ? a.amount : 0, credit: a.amount < 0 ? -a.amount : 0 }));
      ops.sort((a, b) => String(a.at).localeCompare(String(b.at)));
      const opening = c.opening || 0;
      let bal = opening;
      ops.forEach((o) => { bal += o.debit - o.credit; o.balance = bal; });
      return { opening, ops, balance: bal };
    });
  };
  SM.balance = (clientId) => SM.ledger(clientId).balance;
  /* акт сверки за период: сальдо на начало, операции, сальдо на конец */
  SM.actData = function (clientId, from, to) {
    const L2 = SM.ledger(clientId);
    let start = L2.opening;
    L2.ops.forEach((o) => { if (D.dayOf(o.at) < from) start += o.debit - o.credit; });
    const ops = L2.ops.filter((o) => D.inRange(o.at, from, to));
    const debit = ops.reduce((a, o) => a + o.debit, 0), credit = ops.reduce((a, o) => a + o.credit, 0);
    return { start, ops, debit, credit, end: start + debit - credit };
  };
  SM.receiptCalc = function (r) {
    const sum = r.items.reduce((a, l) => a + l.qty * l.buy, 0);
    const extra = r.items.reduce((a, l) => a + l.qty * (l.extra || 0), 0);
    const v = SM.vatSplit(sum, r.vat, SM.vatCfg(r));
    return { sum, extra, net: v.net, vat: v.vat, total: v.total, cost: sum + extra };
  };
  SM.receiptTotalUZS = (r) => SM.toUZS(SM.receiptCalc(r).total, r.cur, r.rate);

  /* ---------- Касса и счета (ТЗ 11.3) ---------- */
  SM.ACCOUNTS = [
    { id: 'cash_uzs', name: 'Касса, сум', cur: 'UZS', icon: 'cash' },
    { id: 'cash_usd', name: 'Касса, $', cur: 'USD', icon: 'dollar' },
    { id: 'card', name: 'Терминал (карты)', cur: 'UZS', icon: 'card' },
    { id: 'qr', name: 'QR-платежи', cur: 'UZS', icon: 'qr' },
    { id: 'bank', name: 'Расчётный счёт', cur: 'UZS', icon: 'bank' },
    { id: 'corp', name: 'Корпоративная карта', cur: 'UZS', icon: 'card' },
  ];
  SM.account = (id) => SM.ACCOUNTS.find((a) => a.id === id) || { id, name: SM.method(id).name, cur: SM.method(id).cur, icon: 'wallet' };
  /* все движения денег: подтверждённые оплаты (приход/выдача) и расходы */
  SM.cashFlows = () => SM.memo('flows', () => {
    const out = [];
    SM.db.payments.filter((p) => p.status === 'confirmed').forEach((p) => {
      const sale = p.saleId ? SM.db.sales.find((s) => s.id === p.saleId) : null;
      out.push({ at: p.confirmedAt || p.at, acc: p.method, amount: p.dir === 'in' ? p.amount : -p.amount, cur: p.cur, rate: p.rate,
        kind: p.dir === 'in' ? 'in' : p.refund ? 'refund' : 'payout', title: p.dir === 'in' ? 'Оплата' + (sale ? ' по ' + sale.no : '') : p.refund ? 'Возврат клиенту' : 'Оплата поставщику',
        who: SM.client(p.clientId).name, ref: p.id, saleId: p.saleId });
    });
    SM.db.expenses.filter((e) => !e.cancelled).forEach((e) => out.push({ at: e.date + 'T12:00:00', acc: e.account, amount: -e.amount, cur: e.cur, rate: e.rate || SM.rate(), kind: 'expense', title: SM.expCat(e.cat).name, who: e.comment || '', ref: e.id }));
    (SM.db.cashOps || []).forEach((o) => out.push({ at: o.at, acc: o.acc, amount: o.amount, cur: SM.account(o.acc).cur, rate: o.rate || SM.rate(), kind: o.amount > 0 ? 'deposit' : 'withdraw', title: o.title, who: o.comment || '', ref: o.id }));
    return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  });
  /* отчёт по счёту за период: начало, приход, расход, конец (в валюте счёта) */
  SM.accountReport = function (acc, from, to) {
    const open = (SM.db.settings.opening || {})[acc] || 0;
    let start = open, inc = 0, out = 0;
    SM.cashFlows().filter((f) => f.acc === acc).forEach((f) => {
      const d = D.dayOf(f.at);
      if (from && d < from) start += f.amount;
      else if ((!from || d >= from) && (!to || d <= to)) { if (f.amount > 0) inc += f.amount; else out += -f.amount; }
    });
    return { start, inc, out, end: start + inc - out };
  };
  // пока одна категория — «Расходы компании», а на что потрачено, пишут текстом
  SM.EXP_CATS_DEFAULT = [{ id: 'company', name: 'Расходы компании' }];
  SM.expCat = (id) => byId(SM.db.expCats, id) || { id, name: id };

  /* ---------- Доставка (ТЗ 15) ---------- */
  SM.DELIVERY_STATUS = { new: ['Новая', 'b-warn'], assigned: ['Назначена', 'b-info'], handed: ['Передана водителю', 'b-violet'], delivered: ['Доставлена', 'b-ok'], cancelled: ['Отменена', 'b-bad'] };
  SM.DELIVERY_KIND = { own: 'Своя доставка', third: 'Сторонняя служба', pickup: 'Самовывоз' };
  SM.TRANSFER_STATUS = { created: ['Создано', 'b-slate'], sent: ['Отправлено', 'b-warn'], accepted: ['Принято', 'b-ok'], cancelled: ['Отменено', 'b-bad'] };
  SM.RECEIPT_STATUS = { draft: ['Черновик', 'b-slate'], posted: ['Проведено', 'b-ok'], cancelled: ['Отменено', 'b-bad'] };
  SM.PAY_STATUS = { pending: ['На проверке', 'b-warn'], confirmed: ['Подтверждено', 'b-ok'], rejected: ['Отклонено', 'b-bad'] };
  SM.DOC_TYPES = {
    invoice: { name: 'Счёт на оплату', prefix: 'СЧ' }, receipt: { name: 'Товарный чек', prefix: 'ТЧ' }, waybill: { name: 'Накладная', prefix: 'НК' },
    facture: { name: 'Счёт-фактура', prefix: 'СФ' }, noprice: { name: 'Накладная без цен', prefix: 'НБ' }, act: { name: 'Акт сверки', prefix: 'АС' }, contract: { name: 'Договор поставки', prefix: 'ДГ' },
  };

  /* ---------- История операций и уведомления (ТЗ 20–21) ---------- */
  SM.log = function (action, entity, entityId, detail, u = SM.user) {
    SM.db.history.push({ id: SM.uid('h'), at: new Date().toISOString(), uid: u ? u.id : null, uname: u ? u.name : 'Система', action, entity, entityId, detail: detail || '' });
  };
  /* уведомление для ролей (и/или конкретных людей) */
  SM.notify = function (kind, title, text, href, roles, uids) {
    SM.db.notes.push({ id: SM.uid('n'), at: new Date().toISOString(), kind, title, text, href, roles: roles || [], uids: uids || [], readBy: SM.user ? [SM.user.id] : [] });
  };
  SM.NOTE_KIND = {
    sale: ['cart', 'accent', 'Новая продажа'], pay: ['wallet', 'warn', 'Оплата на подтверждение'], payok: ['check', 'ok', 'Оплата подтверждена'], payno: ['x', 'bad', 'Оплата отклонена'],
    ship: ['box', 'info', 'Заявка на отгрузку'], transfer: ['repeat', 'info', 'Перемещение'], delivery: ['truck', 'info', 'Доставка'], cancel: ['x', 'bad', 'Отмена операции'],
    debt: ['scale', 'bad', 'Задолженность'], low: ['alert', 'warn', 'Низкий остаток'], receipt: ['inbox', 'ok', 'Поступление'], site: ['globe', 'info', 'Заказ с сайта'],
  };
  SM.notesFor = function (u = SM.user) {
    const stored = SM.db.notes.filter((n) => n.roles.includes(u.role) || n.uids.includes(u.id) || (u.role === 'admin' && n.roles.length));
    // «живые» предупреждения: низкий остаток (склад, админ) и просроченные долги
    const live = [];
    if (['admin', 'storekeeper', 'head'].includes(u.role)) SM.lowStock().slice(0, 12).forEach((p) => live.push({ id: 'low-' + p.id, live: true, kind: 'low', at: new Date().toISOString(), title: p.name, text: 'Осталось ' + SM.qty(p.id) + ' ' + p.unit + ' при минимуме ' + p.min, href: '#/stock?q=' + encodeURIComponent(p.code) }));
    if (['admin', 'head', 'accountant', 'seller'].includes(u.role)) SM.db.sales.filter((s) => SM.overdue(s) && SM.saleVisible(s, u)).forEach((s) => live.push({ id: 'od-' + s.id, live: true, kind: 'debt', at: s.due + 'T09:00:00', title: SM.client(s.clientId).name, text: 'Просрочена оплата по ' + s.no + ': ' + F.cur(SM.saleCalc(s).debt, s.cur), href: '#/sales/' + s.id }));
    return live.concat(stored.slice().sort((a, b) => String(b.at).localeCompare(String(a.at))));
  };
  SM.unread = (u = SM.user) => SM.notesFor(u).filter((n) => !n.live && !n.readBy.includes(u.id));

  /* ---------- Операции ----------
     Каждая операция: меняет данные, пишет историю, рассылает уведомления, сохраняет. */
  const ops = (SM.ops = {});
  const me = () => SM.user;

  ops.saveSale = function (data, post) {
    const isNew = !data.id;
    const s = isNew ? { id: SM.uid('s'), no: SM.nextNo('СП'), createdAt: new Date().toISOString(), state: 'draft', history: [] } : SM.db.sales.find((x) => x.id === data.id);
    const wasDraft = s.state === 'draft';
    // изменение проведённой (ещё не отгруженной) продажи: старые строки возвращаются на склад, новые списываются
    const repost = !isNew && s.state === 'posted' && !s.shippedAt ? { items: s.items.map((l) => Object.assign({}, l)), pointId: s.pointId } : null;
    Object.assign(s, { date: data.date, clientId: data.clientId, sellerId: data.sellerId || me().id, pointId: data.pointId, items: data.items, docDisc: +data.docDisc || 0,
      cur: data.cur, rateType: data.rateType, rate: +data.rate, vat: !!data.vat, vatCfg: SM.vatSnap(), receive: data.receive, credit: !!data.credit, due: data.credit ? data.due : null, comment: data.comment || '', source: data.source || s.source || 'office' });
    if (isNew) SM.db.sales.push(s);
    s.history.push({ at: new Date().toISOString(), uid: me().id, text: isNew ? 'Создана' : 'Изменена' });
    if (post && wasDraft) {
      s.state = 'posted';
      s.postedAt = new Date().toISOString();
      // ТЗ 9.1: после проведения товар автоматически списывается с выбранной точки
      s.items.forEach((l) => SM.addMove(l.productId, s.pointId, -l.qty, 'sale', s.no));
      s.history.push({ at: s.postedAt, uid: me().id, text: 'Проведена, товар списан с точки «' + SM.point(s.pointId).name + '»' });
      SM.notify('sale', 'Новая продажа ' + s.no, SM.client(s.clientId).name + ' · ' + F.cur(SM.saleCalc(s).total, s.cur), '#/sales/' + s.id, ['admin', 'head', 'storekeeper']);
    }
    if (repost) {
      repost.items.forEach((l) => SM.addMove(l.productId, repost.pointId, l.qty, 'return', 'Изменение ' + s.no));
      s.items.forEach((l) => SM.addMove(l.productId, s.pointId, -l.qty, 'sale', 'Изменение ' + s.no));
      s.history.push({ at: new Date().toISOString(), uid: me().id, text: 'Изменён состав — остатки пересчитаны' });
    }
    // оплаты, указанные при оформлении — уходят бухгалтеру на подтверждение (ТЗ 11.2)
    (data.payments || []).filter((p) => p.amount > 0).forEach((p) => ops.addPayment(s, p, true));
    if (data.receive === 'delivery' && post && !SM.db.deliveries.some((d) => d.saleId === s.id)) ops.createDelivery({ saleId: s.id, clientId: s.clientId, address: data.address || SM.client(s.clientId).address, phone: SM.client(s.clientId).phone, kind: 'own', paid: false, cost: 0 }, true);
    SM.log(isNew ? 'Создана продажа' : 'Изменена продажа', 'sale', s.id, s.no + (post ? ' · проведена' : ' · черновик'));
    SM.save();
    return s;
  };
  ops.addPayment = function (s, p, silent) {
    const m = SM.method(p.method);
    const pay = { id: SM.uid('p'), at: new Date().toISOString(), saleId: s ? s.id : null, clientId: s ? s.clientId : p.clientId, method: p.method, amount: +p.amount, cur: m.cur, rate: SM.rate(m.rate), dir: p.dir || 'in', refund: !!p.refund,
      status: 'pending', by: me().id, note: p.note || '' };
    // руководитель/бухгалтер/админ с правом подтверждения — оплата сразу подтверждена
    if (SM.flag('confirmPay')) { pay.status = 'confirmed'; pay.confirmedBy = me().id; pay.confirmedAt = pay.at; }
    SM.db.payments.push(pay);
    if (s) s.history.push({ at: pay.at, uid: me().id, text: 'Оплата ' + F.cur(pay.amount, pay.cur) + ' · ' + m.name + (pay.status === 'pending' ? ' — на проверке' : ' — подтверждена') });
    if (pay.status === 'pending') SM.notify('pay', 'Оплата на подтверждение', (s ? s.no + ' · ' : '') + SM.client(pay.clientId).name + ' · ' + F.cur(pay.amount, pay.cur) + ' · ' + m.name, '#/accounting', ['accountant', 'admin']);
    SM.log('Добавлена оплата', 'payment', pay.id, F.cur(pay.amount, pay.cur) + ' · ' + m.name + (s ? ' · ' + s.no : ''));
    if (!silent) SM.save();
    return pay;
  };
  /* погашение долга клиента без выбора продажи (ТЗ 13): сумма разносится по его открытым продажам,
     начиная со старой; остаток (долг из старой программы, аванс) — оплатой без привязки к продаже */
  ops.repayDebt = function (clientId, p) {
    const m = SM.method(p.method), rate = SM.rate(m.rate);
    let left = +p.amount;
    SM.db.sales.filter((s) => s.clientId === clientId && s.state === 'posted').sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach((s) => {
      const c = SM.saleCalc(s), open = c.debt - c.pending;
      if (left < 0.005 || open <= c.eps) return;
      const part = Math.min(left, Math.round(SM.conv(open, s.cur, m.cur, rate) * 100) / 100);
      ops.addPayment(s, { method: p.method, amount: part, note: p.note }, true);
      left -= part;
    });
    if (left >= 0.005) ops.addPayment(null, { method: p.method, amount: Math.round(left * 100) / 100, note: p.note, clientId }, true);
    SM.save();
  };
  ops.confirmPayment = function (id, ok, comment) {
    const p = SM.db.payments.find((x) => x.id === id);
    p.status = ok ? 'confirmed' : 'rejected';
    p.confirmedBy = me().id; p.confirmedAt = new Date().toISOString(); p.comment = comment || '';
    const s = p.saleId ? SM.db.sales.find((x) => x.id === p.saleId) : null;
    if (s) {
      s.history.push({ at: p.confirmedAt, uid: me().id, text: (ok ? 'Оплата подтверждена: ' : 'Оплата отклонена: ') + F.cur(p.amount, p.cur) + (comment ? ' · ' + comment : '') });
      SM.notify(ok ? 'payok' : 'payno', (ok ? 'Оплата подтверждена · ' : 'Оплата отклонена · ') + s.no, SM.client(s.clientId).name + ' · ' + F.cur(p.amount, p.cur) + (comment ? ' · ' + comment : ''), '#/sales/' + s.id, ['admin'], [s.sellerId]);
      if (ok && SM.saleCalc(s).debt === 0 && !s.readyAt) SM.notify('ship', 'Можно собирать ' + s.no, 'Оплата получена полностью · ' + SM.point(s.pointId).name, '#/sales/' + s.id, ['storekeeper']);
    }
    SM.log(ok ? 'Оплата подтверждена' : 'Оплата отклонена', 'payment', p.id, F.cur(p.amount, p.cur) + (s ? ' · ' + s.no : '') + (comment ? ' · ' + comment : ''));
    SM.save();
  };
  ops.saleReady = function (s) {
    s.readyAt = new Date().toISOString();
    s.history.push({ at: s.readyAt, uid: me().id, text: 'Собрано, готово к отгрузке' });
    SM.notify('ship', 'Готово к отгрузке · ' + s.no, SM.client(s.clientId).name + ' · ' + SM.point(s.pointId).name, '#/sales/' + s.id, ['admin', 'courier'], [s.sellerId]);
    SM.log('Готово к отгрузке', 'sale', s.id, s.no); SM.save();
  };
  ops.saleShip = function (s) {
    s.shippedAt = new Date().toISOString();
    s.history.push({ at: s.shippedAt, uid: me().id, text: 'Отгружено' });
    SM.log('Отгрузка', 'sale', s.id, s.no); SM.save();
  };
  ops.saleDone = function (s) {
    s.state = 'done'; s.doneAt = new Date().toISOString();
    s.history.push({ at: s.doneAt, uid: me().id, text: 'Завершено' });
    SM.log('Продажа завершена', 'sale', s.id, s.no); SM.save();
  };
  ops.saleCancel = function (s, reason) {
    const wasPosted = s.state === 'posted';
    s.state = 'cancelled'; s.cancelledAt = new Date().toISOString(); s.cancelReason = reason;
    // ТЗ 21: проведённое не удаляется — товар возвращается корректирующей записью
    if (wasPosted && !s.shippedAt) s.items.forEach((l) => SM.addMove(l.productId, s.pointId, l.qty, 'return', 'Отмена ' + s.no));
    SM.db.payments.filter((p) => p.saleId === s.id && p.status === 'pending').forEach((p) => { p.status = 'rejected'; p.comment = 'Продажа отменена'; });
    SM.db.deliveries.filter((d) => d.saleId === s.id && d.status !== 'delivered').forEach((d) => (d.status = 'cancelled'));
    s.history.push({ at: s.cancelledAt, uid: me().id, text: 'Отменена: ' + reason });
    SM.notify('cancel', 'Отменена продажа ' + s.no, reason, '#/sales/' + s.id, ['admin', 'head', 'accountant', 'storekeeper']);
    SM.log('Отмена продажи', 'sale', s.id, s.no + ' · ' + reason); SM.save();
  };

  ops.saveReceipt = function (data, post) {
    const isNew = !data.id;
    const r = isNew ? { id: SM.uid('r'), no: SM.nextNo('ПТ'), status: 'draft', by: me().id, createdAt: new Date().toISOString() } : SM.db.receipts.find((x) => x.id === data.id);
    Object.assign(r, { date: data.date, supplierId: data.supplierId, pointId: data.pointId, cur: data.cur, rate: +data.rate, vat: !!data.vat, vatCfg: r.status === 'draft' ? SM.vatSnap() : r.vatCfg, items: data.items, comment: data.comment || '', files: data.files || r.files || [] });
    if (isNew) SM.db.receipts.push(r);
    if (post && r.status === 'draft') {
      r.status = 'posted'; r.postedAt = new Date().toISOString();
      // ТЗ 7: после проведения остатки увеличиваются на выбранном складе; цены продажи обновляются в карточке
      r.items.forEach((l) => {
        SM.addMove(l.productId, r.pointId, l.qty, 'receipt', r.no);
        const p = SM.product(l.productId);
        if (l.price > 0) { p.price = l.price; p.cur = r.cur; }
        p.buy = l.buy; p.buyCur = r.cur; p.extra = l.extra || 0;
      });
      SM.notify('receipt', 'Поступление ' + r.no, SM.client(r.supplierId).name + ' → ' + SM.point(r.pointId).name, '#/receipts/' + r.id, ['admin', 'head', 'accountant']);
    }
    SM.log(isNew ? 'Создано поступление' : 'Изменено поступление', 'receipt', r.id, r.no + (post ? ' · проведено' : ''));
    SM.save();
    return r;
  };
  ops.cancelReceipt = function (r, reason) {
    if (r.status === 'posted') r.items.forEach((l) => SM.addMove(l.productId, r.pointId, -l.qty, 'receipt-cancel', 'Отмена ' + r.no));
    r.status = 'cancelled'; r.cancelledAt = new Date().toISOString(); r.cancelReason = reason;
    SM.notify('cancel', 'Отменено поступление ' + r.no, reason, '#/receipts/' + r.id, ['admin', 'head', 'accountant', 'storekeeper']);
    SM.log('Отмена поступления', 'receipt', r.id, r.no + ' · ' + reason); SM.save();
  };

  ops.saveTransfer = function (data) {
    const t = { id: SM.uid('t'), no: SM.nextNo('ПМ'), date: data.date, from: data.from, to: data.to, items: data.items, responsible: data.responsible, comment: data.comment || '', status: 'created', by: me().id,
      history: [{ at: new Date().toISOString(), uid: me().id, text: 'Создано' }] };
    SM.db.transfers.push(t);
    SM.notify('transfer', 'Перемещение ' + t.no, SM.point(t.from).name + ' → ' + SM.point(t.to).name, '#/transfers/' + t.id, ['storekeeper', 'admin']);
    SM.log('Создано перемещение', 'transfer', t.id, t.no); SM.save();
    return t;
  };
  /* статусы: создано → отправлено → принято; остатки меняются при приёмке (ТЗ 8) */
  ops.transferStatus = function (t, st, reason) {
    const at = new Date().toISOString();
    if (st === 'accepted') t.items.forEach((l) => { SM.addMove(l.productId, t.from, -l.qty, 'transfer-out', t.no, at); SM.addMove(l.productId, t.to, l.qty, 'transfer-in', t.no, at); });
    t.status = st;
    t.history.push({ at, uid: me().id, text: SM.TRANSFER_STATUS[st][0] + (reason ? ': ' + reason : '') });
    SM.notify(st === 'cancelled' ? 'cancel' : 'transfer', 'Перемещение ' + t.no + ': ' + SM.TRANSFER_STATUS[st][0].toLowerCase(), SM.point(t.from).name + ' → ' + SM.point(t.to).name, '#/transfers/' + t.id, ['storekeeper', 'admin']);
    SM.log('Перемещение: ' + SM.TRANSFER_STATUS[st][0].toLowerCase(), 'transfer', t.id, t.no + (reason ? ' · ' + reason : '')); SM.save();
  };
  ops.adjustStock = function (productId, pointId, qty, kind, reason) {
    SM.addMove(productId, pointId, qty, kind, reason);
    SM.log(kind === 'writeoff' ? 'Списание товара' : 'Корректировка остатка', 'product', productId, SM.product(productId).name + ' · ' + SM.point(pointId).name + ' · ' + (qty > 0 ? '+' : '') + qty + ' · ' + reason);
    SM.save();
  };

  ops.saveExpense = function (d) {
    const e = { id: SM.uid('e'), date: d.date, cat: d.cat, amount: +d.amount, cur: SM.account(d.account).cur, rate: SM.rate(), account: d.account, employee: d.employee || '', pointId: d.pointId || '', car: d.car || '', comment: d.comment || '', file: d.file || '', by: me().id, at: new Date().toISOString() };
    SM.db.expenses.push(e);
    SM.log('Расход', 'expense', e.id, SM.expCat(e.cat).name + ' · ' + F.cur(e.amount, e.cur)); SM.save();
    return e;
  };
  ops.cancelExpense = function (e, reason) { e.cancelled = true; e.cancelReason = reason; SM.log('Отмена расхода', 'expense', e.id, SM.expCat(e.cat).name + ' · ' + F.cur(e.amount, e.cur) + ' · ' + reason); SM.save(); };

  ops.createDelivery = function (d, silent) {
    const x = Object.assign({ id: SM.uid('d'), no: SM.nextNo('ДС'), status: 'new', createdAt: new Date().toISOString(), by: me().id, history: [{ at: new Date().toISOString(), uid: me().id, text: 'Заявка создана' }] }, d);
    SM.db.deliveries.push(x);
    SM.notify('delivery', 'Новая заявка на доставку ' + x.no, SM.client(x.clientId).name + ' · ' + (x.address || ''), '#/delivery', ['courier', 'admin']);
    SM.log('Заявка на доставку', 'delivery', x.id, x.no);
    if (!silent) SM.save();
    return x;
  };
  ops.deliveryUpdate = function (x, patch, text) {
    Object.assign(x, patch);
    x.history.push({ at: new Date().toISOString(), uid: me().id, text });
    const s = x.saleId ? SM.db.sales.find((z) => z.id === x.saleId) : null;
    if (patch.status === 'handed' && s && !s.shippedAt) { s.shippedAt = new Date().toISOString(); s.history.push({ at: s.shippedAt, uid: me().id, text: 'Отгружено водителю (' + x.no + ')' }); }
    if (patch.status === 'delivered' && s && s.state === 'posted' && SM.saleCalc(s).debt === 0) { s.state = 'done'; s.doneAt = new Date().toISOString(); s.history.push({ at: s.doneAt, uid: me().id, text: 'Доставлено клиенту — продажа завершена' }); }
    if (patch.status) SM.notify(patch.status === 'cancelled' ? 'cancel' : 'delivery', 'Доставка ' + x.no + ': ' + SM.DELIVERY_STATUS[x.status][0].toLowerCase(), SM.client(x.clientId).name, '#/delivery', ['admin', 'courier'], s ? [s.sellerId] : []);
    SM.log('Доставка ' + x.no, 'delivery', x.id, text); SM.save();
  };

  ops.setRate = function (r) {
    SM.db.rates.push({ id: SM.uid('rt'), at: new Date().toISOString(), cash: +r.cash, card: +r.card, bank: +r.bank, by: me().id });
    SM.log('Установлен курс $', 'rate', null, 'наличный ' + r.cash + ', безналичный ' + r.card + ', перечисление ' + r.bank); SM.save();
  };
  ops.saveClient = function (d) {
    let c = d.id ? SM.client(d.id) : null;
    if (!c || !c.createdAt) { c = { id: SM.uid('c'), createdAt: new Date().toISOString(), opening: 0 }; SM.db.clients.push(c); SM.log('Новый контрагент', 'client', c.id, d.name); }
    else SM.log('Изменён контрагент', 'client', c.id, d.name);
    Object.assign(c, d, { id: c.id });
    SM.save();
    return c;
  };
  ops.saveProduct = function (d) {
    let p = d.id ? SM.db.products.find((x) => x.id === d.id) : null;
    if (!p) { p = { id: SM.uid('pr'), code: d.code || nextCode(), createdAt: new Date().toISOString(), active: true }; SM.db.products.push(p); SM.log('Новый товар', 'product', p.id, d.name); }
    else SM.log('Изменён товар', 'product', p.id, d.name);
    Object.assign(p, d, { id: p.id, code: d.code || p.code });
    SM.save();
    return p;
  };
  function nextCode() { const n = SM.db.products.reduce((m, p) => Math.max(m, +(String(p.code).match(/\d+/) || [0])[0]), 0) + 1; return 'SM-' + String(n).padStart(5, '0'); }
  SM.nextProductCode = nextCode;
  ops.createDoc = function (type, d) {
    const doc = { id: SM.uid('doc'), no: SM.nextNo(SM.DOC_TYPES[type].prefix), type, date: D.todayISO(), at: new Date().toISOString(), by: me().id, saleId: d.saleId || null, clientId: d.clientId || null, from: d.from, to: d.to, note: d.note || '', fields: d.fields || {} };
    SM.db.documents.push(doc);
    SM.log('Сформирован документ', 'doc', doc.id, SM.DOC_TYPES[type].name + ' ' + doc.no);
    SM.save();
    return doc;
  };
  /* ---------- Удаление (с переспросом в интерфейсе). След остаётся в истории операций ---------- */
  // продажа: не отгруженный товар возвращается на склад; оплаты, доставка и документы продажи удаляются вместе с ней
  ops.deleteSale = function (s) {
    if (s.state === 'posted' && !s.shippedAt) s.items.forEach((l) => SM.addMove(l.productId, s.pointId, l.qty, 'return', 'Удаление ' + s.no));
    SM.db.payments = SM.db.payments.filter((p) => p.saleId !== s.id);
    SM.db.deliveries = SM.db.deliveries.filter((d) => d.saleId !== s.id);
    SM.db.documents = SM.db.documents.filter((d) => d.saleId !== s.id);
    SM.db.sales = SM.db.sales.filter((x) => x.id !== s.id);
    SM.notify('cancel', 'Удалена продажа ' + s.no, SM.client(s.clientId).name + ' · ' + F.cur(SM.saleCalc(s).total, s.cur), '#/history', ['admin', 'head', 'accountant']);
    SM.log('Удалена продажа', 'sale', null, s.no + ' · ' + SM.client(s.clientId).name);
    SM.save();
  };
  // что мешает удалить контрагента / товар (связанные операции)
  SM.clientLinks = (id) => SM.db.sales.filter((s) => s.clientId === id).length + SM.db.receipts.filter((r) => r.supplierId === id).length + SM.db.payments.filter((p) => p.clientId === id && !p.saleId).length;
  SM.productLinks = (id) => SM.db.sales.filter((s) => s.items.some((l) => l.productId === id)).length + SM.db.receipts.filter((r) => r.items.some((l) => l.productId === id)).length + SM.db.transfers.filter((t) => t.items.some((l) => l.productId === id)).length;
  ops.deleteClient = function (c) {
    SM.db.clients = SM.db.clients.filter((x) => x.id !== c.id);
    SM.db.documents = SM.db.documents.filter((d) => d.clientId !== c.id);
    SM.log('Удалён контрагент', 'client', null, c.name); SM.save();
  };
  ops.deleteProduct = function (p) {
    SM.db.moves = SM.db.moves.filter((m) => m.productId !== p.id);
    SM.db.products = SM.db.products.filter((x) => x.id !== p.id);
    SM.log('Удалён товар', 'product', null, p.code + ' · ' + p.name); SM.save();
  };
  ops.deleteUser = function (u) {
    SM.db.users = SM.db.users.filter((x) => x.id !== u.id);
    SM.log('Удалён пользователь', 'user', null, u.name + ' · ' + u.login); SM.save();
  };
  // остаток товара на точке: поставить нужное количество (разница — корректировкой)
  ops.setStock = function (productId, pointId, target, reason) {
    const diff = Math.round(target) - SM.qty(productId, pointId);
    if (!diff) return 0;
    SM.addMove(productId, pointId, diff, diff < 0 ? 'writeoff' : 'adjust', reason);
    // остаток кэшируется до SM.save(), поэтому в журнал пишем целевое значение, а не SM.qty
    SM.log('Изменён остаток', 'product', productId, SM.product(productId).name + ' · ' + SM.point(pointId).name + ': ' + Math.round(target) + ' (' + (diff > 0 ? '+' : '') + diff + ') · ' + reason);
    SM.save();
    return diff;
  };
  ops.markRead = function (ids) { const u = me(); SM.db.notes.forEach((n) => { if ((!ids || ids.includes(n.id)) && !n.readBy.includes(u.id)) n.readBy.push(u.id); }); SM.save(); };
})();
