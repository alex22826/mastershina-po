/* =========================================================
   Главная (ТЗ 4): содержимое зависит от роли пользователя
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM, UI = SM.ui;
  const { html, raw, fmt: F, d: D } = SM;
  const I = UI.icon;

  /* продажи (проведённые и завершённые) за период */
  SM.salesIn = (from, to, filter) => SM.db.sales.filter((s) => (s.state === 'posted' || s.state === 'done') && D.inRange(s.date, from, to) && (!filter || filter(s)));
  SM.sumUZS = (list) => list.reduce((a, s) => a + SM.saleTotalUZS(s), 0);
  SM.paymentsIn = (from, to) => SM.db.payments.filter((p) => p.dir === 'in' && p.status === 'confirmed' && D.inRange(p.confirmedAt || p.at, from, to));
  SM.receivables = () => SM.db.clients.reduce((a, c) => { const b = SM.balance(c.id); return b > 0 ? a + b : a; }, 0);
  SM.payables = () => SM.db.clients.reduce((a, c) => { const b = SM.balance(c.id); return b < 0 ? a - b : a; }, 0);
  const COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];

  /* график за выбранный период: до 2 месяцев — по дням (не меньше 14 дней), длиннее — по месяцам */
  function periodChart(R) {
    const sales = SM.salesIn(R.from, R.to);
    const from = R.from || sales.reduce((m, s) => (D.dayOf(s.date) < m ? D.dayOf(s.date) : m), today());
    const to = R.to || today();
    const span = D.diffDays(to, from) + 1;
    if (span <= 62) {
      const days = []; for (let i = Math.max(span, 14) - 1; i >= 0; i--) days.push(D.iso(D.addDays(to, -i)));
      const vals = days.map((d) => SM.sumUZS(SM.salesIn(d, d)));
      return { title: 'Продажи по дням', body: UI.chart({ type: 'bar', height: 230, labels: days.map((d) => F.dm(d)), tipLabels: days.map((d) => F.date(d)), series: [{ name: 'Продажи', color: '#e0365e', values: vals }], tipFmt: (v) => F.cur(v) }) };
    }
    const months = [], f = D.parse(from), t = D.parse(to);
    for (let y = f.getFullYear(), m = f.getMonth(); y < t.getFullYear() || (y === t.getFullYear() && m <= t.getMonth()); m === 11 ? (y++, m = 0) : m++) months.push([y, m]);
    const key = (y, m) => y + '-' + String(m + 1).padStart(2, '0');
    const sums = {}; sales.forEach((s) => { const k = D.dayOf(s.date).slice(0, 7); sums[k] = (sums[k] || 0) + SM.saleTotalUZS(s); });
    return { title: 'Продажи по месяцам', body: UI.chart({ type: 'bar', height: 230, labels: months.map(([y, m]) => SM.MONTHS[m]), tipLabels: months.map(([y, m]) => SM.MONTHS[m] + ' ' + y), series: [{ name: 'Продажи', color: '#e0365e', values: months.map(([y, m]) => sums[key(y, m)] || 0) }], tipFmt: (v) => F.cur(v) }) };
  }
  const DASH_PERIODS = [['day', 'Сегодня'], ['yesterday', 'Вчера'], ['week', '7 дней'], ['month', '30 дней'], ['year', 'Год'], ['all', 'Всё время'], ['custom', 'Свои даты']];
  /* период главной из адреса: ?p=…, для своих дат ещё ?from=…&to=… */
  function dashRange(q) {
    const p = DASH_PERIODS.some(([k]) => k === q.p) ? q.p : 'week';
    if (p !== 'custom') return Object.assign({ p }, SM.periodRange(p));
    let from = q.from || D.iso(D.addDays(today(), -6)), to = q.to || today();
    if (from > to) [from, to] = [to, from];
    if (to > today()) to = today();
    if (from > to) from = to;
    return { p, from, to, days: D.diffDays(to, from) + 1, label: (from.slice(0, 4) !== to.slice(0, 4) || to.slice(0, 4) !== today().slice(0, 4)) ? F.dm(from) + ' ' + from.slice(0, 4) + ' — ' + F.dm(to) + ' ' + to.slice(0, 4) : F.dm(from) + ' — ' + F.dm(to) };
  }
  function payByMethod(from, to) {
    const m = {};
    SM.paymentsIn(from, to).forEach((p) => (m[p.method] = (m[p.method] || 0) + SM.toUZS(p.amount, p.cur, p.rate)));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ name: SM.method(k).name, value: v, color: COLORS[i % COLORS.length] }));
  }
  const saleLi = (s, extra) => html`<li class="click" data-act="open-sale" data-id="${s.id}"><span class="note-ic accent">${I(s.source === 'site' ? 'globe' : 'cart')}</span><div class="grow"><b class="fs-13">${SM.saleNo(s)} · ${SM.client(s.clientId).name}</b><div class="fs-12 muted">${F.date(s.date)} · ${SM.point(s.pointId).name} · ${F.cur(SM.saleCalc(s).total, s.cur)}</div></div>${extra || UI.badge(SM.SALE_STATUS[SM.saleStatus(s)])}</li>`;
  const card = (title, icon, body, action) => html`<div class="card"><div class="card-h"><h3>${I(icon)}${title}</h3>${action ? html`<span class="right">${action}</span>` : ''}</div><div class="card-b">${body}</div></div>`;
  const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'; };
  const today = () => D.todayISO();

  /* ---------- Руководитель и администратор ---------- */
  function managerView(r) {
    const R = dashRange(r.q);
    const prevFrom = R.days ? D.iso(D.addDays(R.from, -R.days)) : null, prevTo = R.days ? D.iso(D.addDays(R.from, -1)) : null;
    const sToday = SM.salesIn(today(), today());
    const sPer = SM.salesIn(R.from, R.to), sPrev = R.days ? SM.salesIn(prevFrom, prevTo) : [];
    const pays = payByMethod(R.from, R.to);
    const paySum = pays.reduce((a, x) => a + x.value, 0);
    const recv = SM.receivables();
    const queue = SM.db.sales.filter((s) => ['await', 'partial', 'paid', 'ready'].includes(SM.saleStatus(s))).slice().reverse();
    const pend = SM.db.payments.filter((x) => x.status === 'pending');
    const expPer = SM.db.expenses.filter((e) => !e.cancelled && D.inRange(e.date, R.from, R.to));
    const expSum = expPer.reduce((a, e) => a + SM.toUZS(e.amount, e.cur, e.rate), 0);
    const cashU = SM.accountReport('cash_uzs', today(), today()), cashD = SM.accountReport('cash_usd', today(), today()), bank = SM.accountReport('bank', today(), today());
    const low = SM.lowStock();
    const units = SM.db.products.reduce((a, x) => a + Math.max(0, SM.qty(x.id)), 0);
    const chart = periodChart(R);
    // продажи по дням периода («Сегодня» — нарастающим итогом после каждой продажи)
    const spark = SM.series(R.from, R.to, SM.salesIn(null, null).map((s) => ({ at: s.date, v: SM.saleTotalUZS(s) })));
    return html`
      ${UI.pageHead(greet() + ', ' + SM.user.name.split(' ')[0], 'Сводка по компании · ' + F.date(today()) + ' · курс $ ' + F.num(SM.rate()), html`${UI.periodDrop(R, DASH_PERIODS)}${SM.can('sales', 2) ? html`<a class="btn btn-primary" href="#/sales/new">${I('plus')}Новая продажа</a>` : ''}`)}
      <div class="grid g-4 keep-2 stagger">
        ${UI.kpi({ label: 'Продажи сегодня', icon: 'cart', value: F.m(SM.sumUZS(sToday)), count: Math.round(SM.sumUZS(sToday)), unit: 'сум', foot: html`${sToday.length} ${F.plural(sToday.length, 'продажа', 'продажи', 'продаж')}`, href: '#/sales', cls: 'k-accent' })}
        ${UI.kpi({ label: 'Продажи · ' + R.label, icon: 'trendUp', value: F.m(SM.sumUZS(sPer)), count: Math.round(SM.sumUZS(sPer)), unit: 'сум', foot: R.days ? html`${UI.delta(SM.sumUZS(sPer), SM.sumUZS(sPrev))} к прошлому периоду` : html`${sPer.length} ${F.plural(sPer.length, 'продажа', 'продажи', 'продаж')}`, spark, sparkKey: 'dash:sales', sparkColor: '#e0365e', href: '#/reports?tab=sales' })}
        ${UI.kpi({ label: 'Поступило оплат · ' + R.label, icon: 'wallet', value: F.m(paySum), count: Math.round(paySum), unit: 'сум', foot: pend.length ? html`<span class="badge b-warn b-pulse">${pend.length} на проверке</span>` : 'все оплаты подтверждены', href: SM.can('accounting') ? '#/accounting' : '#/cash' })}
        ${UI.kpi({ label: 'Дебиторская задолженность', icon: 'scale', value: F.m(recv), count: Math.round(recv), unit: 'сум', foot: html`мы должны поставщикам: ${F.short(SM.payables())}`, href: '#/debts' })}
      </div>
      <div class="grid g-21 mt-16 stagger">
        ${card(chart.title, 'chart', chart.body, html`<a class="btn btn-ghost btn-sm" href="#/reports?tab=sales">Отчёт${I('arrowRight')}</a>`)}
        ${card('Оплаты по способам', 'card', pays.length ? html`<div class="row" style="justify-content:center">${UI.donut(pays, { value: F.short(paySum), label: R.p === 'custom' ? 'за период' : R.label })}</div>${UI.segBar(pays, { height: 8 })}` : UI.empty('Нет оплат', 'за выбранный период'))}
      </div>
      <div class="grid g-3 mt-16 stagger">
        ${card('Новые заказы и отгрузка', 'inbox', queue.length ? html`<ul class="list">${queue.slice(0, 5).map((s) => saleLi(s))}</ul>` : UI.empty('Очередь пуста'), html`<a class="btn btn-ghost btn-sm" href="#/sales">Все${I('arrowRight')}</a>`)}
        ${card('Касса сегодня и расходы', 'wallet', html`<div class="grid g-2" style="gap:10px">
            <div class="cash-acc"><span>${I('cash')}Касса, сум</span><b>${F.m(cashU.end)}</b></div>
            <div class="cash-acc"><span>${I('dollar')}Касса, $</span><b>${F.usd(cashD.end)}</b></div>
            <div class="cash-acc"><span>${I('bank')}Расчётный счёт</span><b>${F.short(bank.end)}</b></div>
            <div class="cash-acc"><span>${I('coins')}Расходы · ${R.label}</span><b class="bad-t">${F.short(expSum)}</b></div></div>`, SM.can('cash') ? html`<a class="btn btn-ghost btn-sm" href="#/cash">Касса${I('arrowRight')}</a>` : '')}
        ${card('Остатки товаров', 'layers', html`<div class="row between"><div><div class="fs-12 muted fw-7">На всех точках</div><div class="fs-18 fw-8 num">${F.num(units)} ед.</div></div><div class="r"><div class="fs-12 muted fw-7">Позиций</div><div class="fs-18 fw-8">${SM.db.products.length}</div></div></div>
            <div class="section-t mt-16">Низкий остаток</div>${low.length ? html`<ul class="list">${low.slice(0, 4).map((x) => html`<li class="click" data-act="open-product" data-id="${x.id}">${UI.thumb(x)}<div class="grow"><b class="fs-13 ellipsis" style="display:block">${x.name}</b><div class="fs-12 muted">мин. ${x.min} ${x.unit}</div></div><span class="badge b-warn">${SM.qty(x.id)} ${x.unit}</span></li>`)}</ul>` : html`<p class="muted fs-13">Всего хватает</p>`}`, html`<a class="btn btn-ghost btn-sm" href="#/stock">Остатки${I('arrowRight')}</a>`)}
      </div>`;
  }

  /* ---------- Продавец ---------- */
  function sellerView() {
    const mine = (s) => s.sellerId === SM.user.id;
    const sT = SM.salesIn(today(), today(), mine), sW = SM.salesIn(D.iso(D.addDays(today(), -6)), today(), mine);
    const all = SM.db.sales.filter(mine).slice().reverse();
    const drafts = all.filter((s) => s.state === 'draft');
    const myClients = SM.db.clients.filter((c) => c.sellerId === SM.user.id);
    const debts = myClients.map((c) => ({ c, b: SM.balance(c.id) })).filter((x) => x.b > 0).sort((a, b) => b.b - a.b);
    return html`
      ${UI.pageHead(greet() + ', ' + SM.user.name.split(' ')[0], 'Ваши продажи и клиенты · ' + SM.user.points.map((p) => SM.point(p).name).join(', '), html`<a class="btn btn-primary" href="#/sales/new">${I('plus')}Новая продажа</a>`)}
      <div class="grid g-4 keep-2 stagger">
        ${UI.kpi({ label: 'Мои продажи сегодня', icon: 'cart', value: F.m(SM.sumUZS(sT)), count: Math.round(SM.sumUZS(sT)), unit: 'сум', foot: sT.length + ' шт.', cls: 'k-accent' })}
        ${UI.kpi({ label: 'За 7 дней', icon: 'trendUp', value: F.m(SM.sumUZS(sW)), count: Math.round(SM.sumUZS(sW)), unit: 'сум', foot: sW.length + ' шт.', sparkKey: 'dash:sales7', spark: SM.dayLabels(7).map((d) => SM.sumUZS(SM.salesIn(d, d, mine))) })}
        ${UI.kpi({ label: 'Долги моих клиентов', icon: 'scale', value: F.m(debts.reduce((a, x) => a + x.b, 0)), count: Math.round(debts.reduce((a, x) => a + x.b, 0)), unit: 'сум', foot: debts.length + ' ' + F.plural(debts.length, 'клиент', 'клиента', 'клиентов'), href: '#/debts' })}
        ${UI.kpi({ label: 'Черновики (резерв)', icon: 'edit', value: drafts.length, count: drafts.length, foot: 'товар отложен для клиента', href: '#/sales?st=draft' })}
      </div>
      <div class="grid g-3 mt-16 stagger">
        <a class="card clickable kpi" href="#/sales/new" style="text-decoration:none;color:inherit"><div class="k-label">${I('plus')}Быстро</div><div class="fs-18 fw-8 mt-8">Оформить продажу</div><p class="muted fs-13 mt-4">Клиент, товары, скидка, валюта, комбинированная оплата</p></a>
        <div class="card clickable kpi" data-act="search"><div class="k-label">${I('search')}Поиск</div><div class="fs-18 fw-8 mt-8">Найти товар и остаток</div><p class="muted fs-13 mt-4">По коду, размеру, альтернативному названию: «колодки нексия»</p></div>
        <a class="card clickable kpi" href="#/clients?new=1" style="text-decoration:none;color:inherit"><div class="k-label">${I('users')}Клиенты</div><div class="fs-18 fw-8 mt-8">Новый клиент</div><p class="muted fs-13 mt-4">Физлицо или компания с реквизитами</p></a>
      </div>
      <div class="grid g-21 mt-16 stagger">
        ${card('Мои последние продажи', 'cart', all.length ? html`<ul class="list">${all.slice(0, 6).map((s) => saleLi(s))}</ul>` : UI.empty('Продаж пока нет'), html`<a class="btn btn-ghost btn-sm" href="#/sales">Все${I('arrowRight')}</a>`)}
        ${card('Должники', 'scale', debts.length ? html`<ul class="list">${debts.map((x) => html`<li class="click" data-act="open-client" data-id="${x.c.id}">${UI.avatar(x.c.name, x.c.id, 'sm')}<div class="grow"><b class="fs-13">${x.c.name}</b><div class="fs-12 muted">${x.c.phone}</div></div><b class="bad-t num">${F.short(x.b)}</b></li>`)}</ul>` : UI.empty('Долгов нет', '', 'check'))}
      </div>`;
  }

  /* ---------- Склад ---------- */
  function storeView() {
    const vis = SM.db.sales.filter((s) => SM.saleVisible(s) && s.state === 'posted');
    const toPick = vis.filter((s) => SM.canReady(s));
    const toShip = vis.filter((s) => s.readyAt && !s.shippedAt);
    const units = SM.db.products.reduce((a, x) => a + Math.max(0, SM.qty(x.id)), 0);
    const low = SM.lowStock();
    const actBtn = (s) => SM.flag('ship') ? (SM.canReady(s) ? html`<button class="btn btn-soft btn-sm" data-x="ready" data-id="${s.id}">${I('box')}Собрано</button>` : html`<button class="btn btn-primary btn-sm" data-x="ship" data-id="${s.id}">${I('truck')}Отгрузить</button>`) : '';
    return html`
      ${UI.pageHead(greet() + ', ' + SM.user.name.split(' ')[0], 'Склад: ' + SM.user.points.map((p) => SM.point(p).name).join(', '), html`<a class="btn btn-primary" href="#/receipts?new=1">${I('inbox')}Поступление</a>`)}
      <div class="grid g-4 keep-2 stagger">
        ${UI.kpi({ label: 'Собрать заказы', icon: 'box', value: toPick.length, count: toPick.length, foot: 'оплачены или в долг', cls: toPick.length ? 'k-accent' : '' })}
        ${UI.kpi({ label: 'Ждут отгрузки', icon: 'truck', value: toShip.length, count: toShip.length, foot: 'собраны, клиент или водитель забирает' })}
        ${UI.kpi({ label: 'Товаров на складе', icon: 'layers', value: F.num(units), count: units, unit: 'ед.', foot: SM.db.products.length + ' позиций', href: '#/stock' })}
        ${UI.kpi({ label: 'Низкий остаток', icon: 'alert', value: low.length, count: low.length, foot: 'позиций ниже минимума', href: '#/stock?low=1' })}
      </div>
      <div class="grid g-21 mt-16 stagger">
        ${card('Заявки на сборку и отгрузку', 'box', toPick.length + toShip.length ? html`<ul class="list">${toPick.concat(toShip).map((s) => saleLi(s, actBtn(s)))}</ul>` : UI.empty('Заявок нет', 'Все заказы отгружены', 'check'))}
        ${card('Низкий остаток', 'alert', low.length ? html`<ul class="list">${low.map((x) => html`<li class="click" data-act="open-product" data-id="${x.id}">${UI.thumb(x)}<div class="grow"><b class="fs-13">${x.name}</b><div class="fs-12 muted">мин. ${x.min} ${x.unit}</div></div><span class="badge b-warn">${SM.qty(x.id)} ${x.unit}</span></li>`)}</ul>` : UI.empty('Всего хватает', '', 'check'), html`<a class="btn btn-ghost btn-sm" href="#/stock">Остатки${I('arrowRight')}</a>`)}
      </div>`;
  }

  /* ---------- Бухгалтер ---------- */
  function buhView() {
    const pend = SM.db.payments.filter((p) => p.status === 'pending');
    const pendSum = pend.reduce((a, p) => a + SM.toUZS(p.amount, p.cur, p.rate), 0);
    const cash = SM.accountReport('cash_uzs', today(), today());
    const exp7 = SM.db.expenses.filter((e) => !e.cancelled && D.inRange(e.date, D.iso(D.addDays(today(), -6)), today()));
    const debts = SM.db.clients.map((c) => ({ c, b: SM.balance(c.id) })).filter((x) => Math.abs(x.b) > 0.5).sort((a, b) => b.b - a.b);
    return html`
      ${UI.pageHead(greet() + ', ' + SM.user.name.split(' ')[0], 'Оплаты, касса и взаиморасчёты', html`<a class="btn btn-primary" href="#/accounting">${I('check')}Подтвердить оплаты</a>`)}
      <div class="grid g-4 keep-2 stagger">
        ${UI.kpi({ label: 'Оплаты на проверке', icon: 'wallet', value: pend.length, count: pend.length, foot: F.cur(pendSum), href: '#/accounting', cls: pend.length ? 'k-accent' : '' })}
        ${UI.kpi({ label: 'Касса, сум (сейчас)', icon: 'cash', value: F.m(cash.end), count: Math.round(cash.end), unit: 'сум', foot: html`приход сегодня <b class="ok-t">+${F.short(cash.inc)}</b>`, href: '#/cash' })}
        ${UI.kpi({ label: 'Дебиторка', icon: 'scale', value: F.m(SM.receivables()), count: Math.round(SM.receivables()), unit: 'сум', foot: 'кредиторка ' + F.short(SM.payables()), href: '#/debts' })}
        ${UI.kpi({ label: 'Расходы за 7 дней', icon: 'coins', value: F.m(exp7.reduce((a, e) => a + SM.toUZS(e.amount, e.cur, e.rate), 0)), unit: 'сум', foot: exp7.length + ' операций', href: '#/expenses' })}
      </div>
      <div class="grid g-21 mt-16 stagger">
        ${card('Оплаты на подтверждение', 'check', pend.length ? html`<ul class="list">${pend.map((p) => { const s = SM.db.sales.find((x) => x.id === p.saleId); return html`<li><span class="note-ic warn">${I(SM.method(p.method).icon)}</span><div class="grow"><b class="fs-13">${F.cur(p.amount, p.cur)} · ${SM.method(p.method).name}</b><div class="fs-12 muted">${s ? SM.saleNo(s) + ' · ' : ''}${SM.client(p.clientId).name} · ${F.ago(p.at)}</div></div><button class="btn btn-ok btn-sm" data-x="pay-ok" data-id="${p.id}">${I('check')}Подтвердить</button></li>`; })}</ul>` : UI.empty('Всё подтверждено', '', 'check'), html`<a class="btn btn-ghost btn-sm" href="#/accounting">Бухгалтерия${I('arrowRight')}</a>`)}
        ${card('Взаиморасчёты', 'scale', debts.length ? html`<ul class="list">${debts.slice(0, 6).map((x) => html`<li class="click" data-act="open-client" data-id="${x.c.id}">${UI.avatar(x.c.name, x.c.id, 'sm')}<div class="grow"><b class="fs-13">${x.c.name}</b><div class="fs-12 muted">${x.b > 0 ? 'должен нам' : 'мы должны'}</div></div><b class="num ${x.b > 0 ? 'bad-t' : 'warn-t'}">${F.short(Math.abs(x.b))}</b></li>`)}</ul>` : UI.empty('Долгов нет'))}
      </div>`;
  }

  /* ---------- Доставка ---------- */
  function courierView() {
    const list = SM.db.deliveries.filter((d) => d.status !== 'cancelled');
    const by = (st) => list.filter((d) => d.status === st);
    return html`
      ${UI.pageHead(greet() + ', ' + SM.user.name.split(' ')[0], 'Заявки на доставку', html`<a class="btn btn-primary" href="#/delivery">${I('truck')}Доска доставки</a>`)}
      <div class="grid g-4 keep-2 stagger">
        ${['new', 'assigned', 'handed', 'delivered'].map((st, i) => UI.kpi({ label: SM.DELIVERY_STATUS[st][0], icon: ['inbox', 'user', 'truck', 'check'][i], value: by(st).length, count: by(st).length, href: '#/delivery', cls: st === 'new' && by(st).length ? 'k-accent' : '' }))}
      </div>
      <div class="mt-16">${card('Требуют действия', 'truck', by('new').concat(by('assigned'), by('handed')).length ? html`<ul class="list">${by('new').concat(by('assigned'), by('handed')).map((d) => html`<li class="click" data-href="#/delivery?open=${d.id}"><span class="note-ic info">${I('truck')}</span><div class="grow"><b class="fs-13">${d.no} · ${SM.client(d.clientId).name}</b><div class="fs-12 muted">${d.address}</div></div>${UI.badge(SM.DELIVERY_STATUS[d.status])}</li>`)}</ul>` : UI.empty('Все заявки выполнены', '', 'check'))}</div>`;
  }

  SM.page('dashboard', {
    title: 'Главная',
    render(r) {
      const role = SM.user.role;
      if (role === 'seller') return sellerView();
      if (role === 'storekeeper') return storeView();
      if (role === 'accountant') return buhView();
      if (role === 'courier') return courierView();
      return managerView(r);
    },
    mount(el) {
      UI.bindPeriod(el);
      if (UI.$('[data-x=period-dd]', el)) UI.bindPeriodDrop(el, dashRange(SM.route().q), DASH_PERIODS);
      UI.$$('[data-x=ready]', el).forEach((b) => (b.onclick = () => { const s = SM.db.sales.find((x) => x.id === b.dataset.id); SM.ops.saleReady(s); UI.toast('Собрано', SM.saleNo(s) + ' готово к отгрузке'); SM.refresh(); }));
      UI.$$('[data-x=ship]', el).forEach((b) => (b.onclick = () => { const s = SM.db.sales.find((x) => x.id === b.dataset.id); SM.ops.saleShip(s); UI.toast('Отгружено', SM.saleNo(s)); SM.refresh(); }));
      UI.$$('[data-x=pay-ok]', el).forEach((b) => (b.onclick = () => { SM.ops.confirmPayment(b.dataset.id, true); UI.toast('Оплата подтверждена'); SM.refresh(); }));
    },
  });
})();
