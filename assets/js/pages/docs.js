/* =========================================================
   Документы (ТЗ 16) и отчёты (ТЗ 18)
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM, UI = SM.ui;
  const { html, raw, fmt: F, d: D } = SM;
  const I = UI.icon;
  const E = SM.esc;

  /* ---------- Сумма прописью (для счёта и счёт-фактуры) ---------- */
  const U1 = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const U1F = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const TEENS = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const HUND = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  function tri(n, fem) { const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10; const out = [HUND[h]]; if (t === 1) out.push(TEENS[u]); else out.push(TENS[t], (fem ? U1F : U1)[u]); return out.filter(Boolean).join(' '); }
  SM.inWords = function (num, cur = 'UZS') {
    let n = Math.floor(Math.abs(num));
    const cents = Math.round((Math.abs(num) - n) * 100);
    if (n === 0) return 'ноль ' + (cur === 'USD' ? 'долларов США' : 'сум');
    const groups = [['', '', ''], ['тысяча', 'тысячи', 'тысяч'], ['миллион', 'миллиона', 'миллионов'], ['миллиард', 'миллиарда', 'миллиардов']];
    const parts = [];
    for (let g = 0; n > 0 && g < groups.length; g++) { const v = n % 1000; if (v) parts.unshift(tri(v, g === 1) + (g ? ' ' + F.plural(v, ...groups[g]) : '')); n = Math.floor(n / 1000); }
    const s = parts.join(' ').replace(/\s+/g, ' ').trim();
    const w = s.charAt(0).toUpperCase() + s.slice(1);
    return cur === 'USD' ? w + ' ' + F.plural(Math.floor(num), 'доллар', 'доллара', 'долларов') + ' США ' + String(cents).padStart(2, '0') + ' центов' : w + ' сум';
  };

  /* ---------- Шаблоны документов (реквизиты подставляются автоматически) ---------- */
  const req = (o) => `${E(o.name)}${o.inn ? ', ИНН ' + E(o.inn) : ''}${o.address ? ', ' + E(o.address) : ''}${o.account ? '<br>р/с ' + E(o.account) + (o.bank ? ' в ' + E(o.bank) : '') + (o.mfo ? ', МФО ' + E(o.mfo) : '') : ''}${o.phone ? '<br>тел. ' + E(o.phone) : ''}`;
  function itemsTable(s, { prices = true, vatCols = false } = {}) {
    const c = SM.saleCalc(s), v = SM.vatCfg(s);
    const rows = s.items.map((l, i) => {
      // в счёт-фактуре скидка на документ распределяется по строкам, в остальных — отдельной строкой итогов
      const p = SM.product(l.productId), sum = SM.lineSum(l), sp = SM.vatSplit(SM.lineSum(l) * (1 - (s.docDisc || 0) / 100), s.vat, v);
      if (!prices) return `<tr><td>${i + 1}</td><td>${E(p.name)}<br><span class="muted">${E(p.code)}</span></td><td>${E(p.unit)}</td><td class="doc-r">${l.qty}</td></tr>`;
      if (vatCols) return `<tr><td>${i + 1}</td><td>${E(p.name)}</td><td>${E(p.unit)}</td><td class="doc-r">${l.qty}</td><td class="doc-r">${F.num(sp.net / l.qty, s.cur === 'USD' ? 2 : 0)}</td><td class="doc-r">${F.num(sp.net, s.cur === 'USD' ? 2 : 0)}</td><td class="doc-r">${s.vat && v.enabled ? v.rate + '%' : 'без НДС'}</td><td class="doc-r">${F.num(sp.vat, s.cur === 'USD' ? 2 : 0)}</td><td class="doc-r">${F.num(sp.total, s.cur === 'USD' ? 2 : 0)}</td></tr>`;
      return `<tr><td>${i + 1}</td><td>${E(p.name)}</td><td>${E(p.unit)}</td><td class="doc-r">${l.qty}</td><td class="doc-r">${F.num(l.price, s.cur === 'USD' ? 2 : 0)}</td><td class="doc-r">${l.disc ? l.disc + '%' : ''}</td><td class="doc-r">${F.num(sum, s.cur === 'USD' ? 2 : 0)}</td></tr>`;
    }).join('');
    const curName = s.cur === 'USD' ? '$' : 'сум';
    if (!prices) return `<table><thead><tr><th>№</th><th>Наименование</th><th>Ед.</th><th>Кол-во</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3"><b>Всего мест</b></td><td class="doc-r"><b>${s.items.reduce((a, l) => a + l.qty, 0)}</b></td></tr></tfoot></table>`;
    if (vatCols) return `<table><thead><tr><th>№</th><th>Наименование</th><th>Ед.</th><th>Кол-во</th><th>Цена без НДС</th><th>Стоимость без НДС</th><th>Ставка</th><th>Сумма НДС</th><th>С НДС, ${curName}</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="5"><b>Итого</b></td><td class="doc-r"><b>${F.num(c.net, s.cur === 'USD' ? 2 : 0)}</b></td><td></td><td class="doc-r"><b>${F.num(c.vat, s.cur === 'USD' ? 2 : 0)}</b></td><td class="doc-r"><b>${F.num(c.total, s.cur === 'USD' ? 2 : 0)}</b></td></tr></tfoot></table>`;
    return `<table><thead><tr><th>№</th><th>Наименование</th><th>Ед.</th><th>Кол-во</th><th>Цена, ${curName}</th><th>Скидка</th><th>Сумма, ${curName}</th></tr></thead><tbody>${rows}</tbody></table>
      <table style="width:auto;margin-left:auto"><tbody>${s.docDisc ? `<tr><td>Скидка на документ ${s.docDisc}%</td><td class="doc-r">−${F.cur(c.docDisc, s.cur)}</td></tr>` : ''}${s.vat && v.enabled ? `<tr><td>Без НДС</td><td class="doc-r">${F.cur(c.net, s.cur)}</td></tr><tr><td>НДС ${v.rate}%</td><td class="doc-r">${F.cur(c.vat, s.cur)}</td></tr>` : '<tr><td colspan="2">Без НДС</td></tr>'}<tr><td><b>Итого к оплате</b></td><td class="doc-r"><b>${F.cur(c.total, s.cur)}</b></td></tr></tbody></table>`;
  }
  SM.docHTML = function (doc) {
    const co = SM.db.settings.company;
    const s = doc.saleId ? SM.db.sales.find((x) => x.id === doc.saleId) : null;
    const cl = SM.client(doc.clientId || (s && s.clientId));
    const t = SM.DOC_TYPES[doc.type].name;
    const head = (title) => `<div class="doc-head"><div><b>${E(co.name)}</b><br>${E(co.address)}<br>тел. ${E(co.phone)}</div><div class="doc-r">№ ${E(doc.no)}<br>от ${F.date(doc.date)}${s ? '<br>к продаже ' + E(s.no) : ''}</div></div><h1>${title} № ${E(doc.no)} от ${F.date(doc.date)}</h1>`;
    const note = doc.note ? `<p><b>Примечание:</b> ${E(doc.note)}</p>` : '';
    const words = s ? `<p>Всего к оплате: <b>${E(SM.inWords(SM.saleCalc(s).total, s.cur))}</b>${s.vat && SM.vatCfg(s).enabled ? ', в т.ч. НДС ' + F.cur(SM.saleCalc(s).vat, s.cur) : ''}.</p>` : '';
    switch (doc.type) {
      case 'invoice': return head('Счёт на оплату') + `<p><b>Поставщик:</b> ${req(co)}</p><p><b>Покупатель:</b> ${req(cl)}</p>${itemsTable(s)}${words}<p class="muted">Счёт действителен 3 банковских дня. Курс $ зафиксирован: ${F.num(s.rate)} сум.</p>${note}<div class="doc-sign"><div>Директор ${E(co.director)}</div><div>Гл. бухгалтер ${E(co.accountant)}</div></div>`;
      case 'receipt': { const pt = SM.point(s.pointId); return `<div class="doc-head"><div><b>${E(co.name)}</b><br>${E(pt.name)}, ${E(pt.address)}</div><div class="doc-r">${F.dt(s.postedAt || doc.at)}</div></div><h1>Товарный чек № ${E(doc.no)}</h1><p>Покупатель: ${E(cl.name)}</p>${itemsTable(s)}${words}${note}<div class="doc-sign"><div>Продавец ${E(SM.user_(s.sellerId).name)}</div><div>Покупатель</div></div>`; }
      case 'waybill': return head('Накладная') + `<p><b>Отправитель:</b> ${E(co.name)}, ${E(SM.point(s.pointId).name)}</p><p><b>Получатель:</b> ${req(cl)}</p>${itemsTable(s)}${words}${note}<div class="doc-sign"><div>Отпустил</div><div>Получил</div></div>`;
      case 'facture': return head('Счёт-фактура') + `<p><b>Поставщик:</b> ${req(co)}</p><p><b>Покупатель:</b> ${req(cl)}</p>${itemsTable(s, { vatCols: true })}${words}${note}<div class="doc-sign"><div>Руководитель ${E(co.director)}</div><div>Гл. бухгалтер ${E(co.accountant)}</div><div>Получил</div></div>`;
      case 'noprice': return head('Накладная (без цен)') + `<p><b>Отправитель:</b> ${E(co.name)}, ${E(SM.point(s.pointId).name)}</p><p><b>Получатель:</b> ${E(cl.name)}${cl.address ? ', ' + E(cl.address) : ''}</p>${itemsTable(s, { prices: false })}${note}<div class="doc-sign"><div>Отпустил</div><div>Водитель</div><div>Получил</div></div>`;
      case 'act': return SM.actHTML(doc.clientId, doc.from, doc.to, doc.no);
      case 'contract': return head('Договор поставки') + `<p>${E(co.name)} (Поставщик), в лице директора ${E(co.director)}, и ${E(cl.name)} (Покупатель)${cl.contact ? ', в лице ' + E(cl.contact) : ''}, заключили договор о нижеследующем.</p>
        <p><b>1. Предмет.</b> Поставщик передаёт Покупателю шины, автомобильные запчасти и сопутствующие товары по накладным, являющимся неотъемлемой частью договора.</p>
        <p><b>2. Цена и оплата.</b> Цены указываются в счетах в сумах или долларах США; при оплате в сумах применяется курс, зафиксированный в счёте. Оплата — ${E(doc.fields.terms || 'в течение 14 дней с момента отгрузки')}.</p>
        <p><b>3. Поставка.</b> Самовывоз со склада Поставщика или доставка по согласованию сторон.</p><p><b>4. Срок действия:</b> ${E(doc.fields.until || 'до 31.12.' + new Date().getFullYear())}.</p>${note}
        <table><tbody><tr><td style="width:50%"><b>Поставщик</b><br>${req(co)}</td><td><b>Покупатель</b><br>${req(cl)}</td></tr></tbody></table><div class="doc-sign"><div>${E(co.director)}</div><div>${E(cl.contact || cl.name)}</div></div>`;
    }
    return '<p>' + E(t) + '</p>';
  };
  function docPreview(doc) {
    const t = SM.DOC_TYPES[doc.type].name;
    const m = UI.modal({ title: t + ' ' + doc.no, sub: SM.client(doc.clientId).name + ' · ' + F.date(doc.date), size: 'xl',
      body: html`<div class="doc-preview">${raw(SM.docHTML(doc))}</div>`,
      foot: html`<button class="btn btn-ghost" data-close>Закрыть</button><button class="btn btn-secondary" data-x="doc">${I('download')}Сохранить .doc</button><button class="btn btn-primary" data-x="print">${I('print')}Печать / PDF</button>` });
    m.querySelector('[data-x=print]').onclick = () => UI.printDoc(t + ' ' + doc.no, SM.docHTML(doc));
    m.querySelector('[data-x=doc]').onclick = () => UI.saveDoc(t.replace(/\s+/g, '_') + '_' + doc.no, t, SM.docHTML(doc));
  }
  /* из карточки продажи: найти уже созданный документ этого типа или сформировать новый с номером */
  SM.docFromSale = function (type, s) {
    let doc = SM.db.documents.find((d) => d.saleId === s.id && d.type === type);
    if (!doc) { doc = SM.ops.createDoc(type, { saleId: s.id, clientId: s.clientId }); UI.toast('Документ сформирован', SM.DOC_TYPES[type].name + ' ' + doc.no); }
    docPreview(doc);
  };
  function newDocModal() {
    const sales = SM.db.sales.filter((s) => s.state !== 'draft' && s.state !== 'cancelled' && SM.saleVisible(s)).slice().reverse();
    const m = UI.modal({ title: 'Сформировать документ', sub: 'Реквизиты подставятся автоматически, номер присвоится при сохранении', size: 'wide',
      body: html`<form class="form-grid" autocomplete="off">
        <div class="field"><label>Вид документа</label><select class="select" name="type">${UI.options(Object.entries(SM.DOC_TYPES).map(([k, v]) => [k, v.name]), 'invoice')}</select></div>
        <div class="field sale-f"><label>Продажа</label><select class="select" name="saleId">${UI.options(sales.map((s) => [s.id, s.no + ' · ' + SM.client(s.clientId).name + ' · ' + F.cur(SM.saleCalc(s).total, s.cur)]), sales[0] && sales[0].id)}</select></div>
        <div class="field cl-f"><label>Контрагент</label><select class="select" name="clientId">${UI.options(SM.db.clients.map((c) => [c.id, c.name]), 'c1')}</select></div>
        <div class="field act-f"><label>Период с</label><input class="input" type="date" name="from" value="${D.iso(D.addDays(D.today(), -30))}"></div>
        <div class="field act-f"><label>по</label><input class="input" type="date" name="to" value="${D.todayISO()}"></div>
        <div class="field ctr-f"><label>Условия оплаты</label><input class="input" name="terms" value="в течение 14 дней с момента отгрузки"></div>
        <div class="field ctr-f"><label>Срок действия</label><input class="input" name="until" value="до 31.12.${new Date().getFullYear()}"></div>
        <div class="field full"><label>Примечание (редактируемое поле)</label><input class="input" name="note" placeholder="Появится в документе"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('file')}Сформировать</button>` });
    const f = m.querySelector('form');
    const sw = () => { const t = f.type.value, bySale = !['act', 'contract'].includes(t); UI.$$('.sale-f', f).forEach((x) => (x.style.display = bySale ? '' : 'none')); UI.$$('.cl-f', f).forEach((x) => (x.style.display = bySale ? 'none' : '')); UI.$$('.act-f', f).forEach((x) => (x.style.display = t === 'act' ? '' : 'none')); UI.$$('.ctr-f', f).forEach((x) => (x.style.display = t === 'contract' ? '' : 'none')); };
    f.type.addEventListener('change', sw); sw();
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f), bySale = !['act', 'contract'].includes(d.type);
      if (bySale && !d.saleId) return UI.toast('Нет проведённых продаж', '', 'warn');
      const s = bySale ? SM.db.sales.find((x) => x.id === d.saleId) : null;
      const doc = SM.ops.createDoc(d.type, { saleId: s ? s.id : null, clientId: s ? s.clientId : d.clientId, from: d.from, to: d.to, note: d.note, fields: { terms: d.terms, until: d.until } });
      UI.closeTop(); UI.toast('Документ сформирован', SM.DOC_TYPES[d.type].name + ' ' + doc.no); SM.refresh(); docPreview(doc);
    };
  }
  /* продавец видит документы своих продаж и своих клиентов, склад — своих точек */
  const docVisible = (d) => { const s = d.saleId && SM.db.sales.find((x) => x.id === d.saleId); return s ? SM.saleVisible(s) : !SM.flag('ownOnly') || SM.client(d.clientId).sellerId === SM.user.id; };
  function documentsPage(r) {
    const type = r.q.type || '', q = (r.q.q || '').toLowerCase();
    const all = SM.db.documents.filter(docVisible);
    const list = all.filter((d) => (!type || d.type === type) && (!q || (d.no + ' ' + SM.client(d.clientId).name).toLowerCase().includes(q))).slice().reverse();
    return html`
      ${UI.pageHead('Документы', 'Счёт, товарный чек, накладная, счёт-фактура, акт сверки, договор, накладная без цен · печать и сохранение в файл', SM.can('documents', 2) || SM.can('sales', 2) ? html`<button class="btn btn-primary" data-x="new">${I('plus')}Сформировать</button>` : '')}
      <div class="grid g-4 keep-2 stagger mb-16">${['invoice', 'facture', 'waybill', 'act'].map((t) => UI.kpi({ label: SM.DOC_TYPES[t].name, icon: 'file', value: all.filter((d) => d.type === t).length, count: all.filter((d) => d.type === t).length, foot: 'в истории' }))}</div>
      <div class="card"><div class="card-h">${UI.searchInput(r.q.q, '№ документа или контрагент')}${UI.filterSelect('type', type, Object.entries(SM.DOC_TYPES).map(([k, v]) => [k, v.name]), 'Все виды')}</div>
        <div class="card-b" style="padding-top:12px">${list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Документ</th><th>Контрагент</th><th>Основание</th><th>Сформировал</th><th></th></tr></thead><tbody>
          ${list.map((d) => html`<tr class="click" data-doc="${d.id}"><td><span class="cell-title">${SM.DOC_TYPES[d.type].name}</span><span class="cell-sub mono">${d.no} · ${F.date(d.date)}</span></td><td>${SM.client(d.clientId).name}</td><td>${d.saleId ? (SM.db.sales.find((s) => s.id === d.saleId) || {}).no : d.type === 'act' ? F.date(d.from) + ' — ' + F.date(d.to) : '—'}</td><td>${SM.user_(d.by).name}<span class="cell-sub">${F.dt(d.at)}</span></td><td class="r"><span class="btn btn-ghost btn-sm">${I('eye')}Открыть</span></td></tr>`)}</tbody></table></div>` : UI.empty('Документов нет', 'Сформируйте документ по продаже или контрагенту', 'file')}</div></div>`;
  }

  /* ---------- Отчёты (ТЗ 18): фильтры и выгрузка в Excel ----------
     Вкладка видна, только если у роли есть доступ к соответствующему разделу:
     продавец не видит кассу и расходы, склад — деньги и долги (ТЗ 3). */
  const TABS = [['stock', 'Остатки', () => SM.can('stock') || SM.can('products')], ['sales', 'Продажи', () => SM.can('sales')], ['cash', 'Оплаты и касса', () => SM.can('cash') || SM.can('accounting')],
    ['debts', 'Задолженности', () => SM.can('debts')], ['sellers', 'Работа продавцов', () => SM.can('sales') && SM.can('debts')], ['expenses', 'Расходы', () => SM.can('expenses')]];
  const tabsFor = () => TABS.filter((t) => t[2]());
  const reportTab = (r) => { const ok = tabsFor().map((t) => t[0]); return ok.includes(r.q.tab) ? r.q.tab : ok.includes('sales') ? 'sales' : ok[0]; };
  function buildReport(tab, r) {
    const R = SM.periodRange(r.q.p || 'month');
    const own = SM.flag('ownOnly');
    // продавец — только свои продажи, склад — только по своим точкам
    const sales = SM.salesIn(R.from, R.to, (s) => SM.saleVisible(s));
    if (!tab) return { title: 'Нет доступных отчётов', cols: [''], rows: [], num: [] };
    if (tab === 'stock') {
      const pts = SM.activePoints().filter((p) => SM.pointVisible(p.id));
      const mode = r.q.m || 'all';
      if (mode === 'low') return { title: 'Товары с нулевым или низким остатком', cols: ['Код', 'Товар', 'Остаток', 'Мин.', 'Доступно'], rows: SM.db.products.filter((p) => p.active && SM.isLow(p)).map((p) => [p.code, p.name, SM.qty(p.id), p.min, SM.available(p.id)]), num: [2, 3, 4], sw: [['all', 'По точкам'], ['value', 'В деньгах'], ['low', 'Нулевой / низкий']] };
      if (mode === 'value') return { title: 'Остатки в деньгах (по себестоимости и ценам продажи)', cols: ['Точка', 'Единиц', 'По себестоимости, сум', 'По ценам продажи, сум'], rows: pts.map((pt) => { let u = 0, c = 0, s = 0; SM.db.products.forEach((p) => { const q = SM.qty(p.id, pt.id); if (q > 0) { u += q; c += q * SM.toUZS((p.buy || 0) + (p.extra || 0), p.buyCur || p.cur, SM.rate()); s += q * SM.toUZS(p.price, p.cur, SM.rate()); } }); return [pt.name, u, Math.round(c), Math.round(s)]; }), num: [1, 2, 3], total: true, sw: [['all', 'По точкам'], ['value', 'В деньгах'], ['low', 'Нулевой / низкий']] };
      // «Всего» — по точкам, доступным пользователю (у склада — только его точки)
      const vis = (fn, pid) => SM.db.points.filter((p) => SM.pointVisible(p.id)).reduce((a, x) => a + fn(pid, x.id), 0);
      return { title: 'Общий остаток и остатки по складам и магазинам', cols: ['Код', 'Товар', ...pts.map((p) => p.name), 'Всего', 'Резерв', 'Доступно'], rows: SM.db.products.filter((p) => p.active).map((p) => [p.code, p.name, ...pts.map((x) => SM.qty(p.id, x.id)), vis(SM.qty, p.id), vis(SM.reserved, p.id), vis(SM.available, p.id)]), num: [...pts.map((_, i) => i + 2), pts.length + 2, pts.length + 3, pts.length + 4], total: true, wide: true, sw: [['all', 'По точкам'], ['value', 'В деньгах'], ['low', 'Нулевой / низкий']] };
    }
    if (tab === 'sales') {
      const g = r.q.g || 'day';
      const key = { day: (s) => [F.date(s.date)], point: (s) => [SM.point(s.pointId).name], client: (s) => [SM.client(s.clientId).name], seller: (s) => [SM.user_(s.sellerId).name] }[g];
      let groups = {};
      if (g === 'product' || g === 'category') {
        sales.forEach((s) => { const k2 = SM.saleCalc(s); const kf = k2.sub ? k2.total / k2.sub : 1; s.items.forEach((l) => { const p = SM.product(l.productId); const name = g === 'product' ? p.name : SM.category(SM.catRoot(p.cat).id).name; const x = (groups[name] = groups[name] || { n: new Set(), q: 0, sum: 0 }); x.n.add(s.id); x.q += l.qty; x.sum += SM.toUZS(SM.lineSum(l) * kf, s.cur, s.rate); }); });
      } else sales.forEach((s) => { const name = key(s)[0]; const x = (groups[name] = groups[name] || { n: new Set(), q: 0, sum: 0 }); x.n.add(s.id); x.q += s.items.reduce((a, l) => a + l.qty, 0); x.sum += SM.saleTotalUZS(s); });
      const rows = Object.entries(groups).map(([k, x]) => [k, x.n.size, x.q, Math.round(x.sum)]).sort((a, b) => (g === 'day' ? 0 : b[3] - a[3]));
      const days = SM.dayLabels(Math.min(R.days || 30, 30));
      return { title: 'Продажи · ' + R.label, cols: [{ day: 'День', point: 'Магазин / склад', product: 'Товар', category: 'Категория', client: 'Клиент', seller: 'Продавец' }[g], 'Продаж', 'Единиц', 'Сумма, сум'], rows, num: [1, 2, 3], total: true, period: true,
        sw: [['day', 'По дням'], ['point', 'По точкам'], ['product', 'По товарам'], ['category', 'По категориям'], ['client', 'По клиентам'], ['seller', 'По продавцам']], swParam: 'g',
        chart: UI.chart({ type: 'bar', height: 200, labels: days.map((d) => F.dm(d)), series: [{ name: 'Продажи', color: '#e0365e', values: days.map((d) => SM.sumUZS(sales.filter((s) => s.date === d))) }], tipFmt: (v) => F.cur(v) }) };
    }
    if (tab === 'cash') {
      const pays = SM.db.payments.filter((p) => p.dir === 'in' && D.inRange(p.at, R.from, R.to));
      const m = {};
      pays.forEach((p) => { const k = SM.method(p.method).name + '|' + p.cur; const x = (m[k] = m[k] || { ok: 0, pend: 0, no: 0, uzs: 0 }); if (p.status === 'confirmed') { x.ok += p.amount; x.uzs += SM.toUZS(p.amount, p.cur, p.rate); } else if (p.status === 'pending') x.pend += p.amount; else x.no += p.amount; });
      return { title: 'Оплаты по способам и валютам · ' + R.label, cols: ['Способ', 'Валюта', 'Подтверждено', 'На проверке', 'Отклонено', 'Подтверждено в сумах'], rows: Object.entries(m).map(([k, x]) => { const [n, c] = k.split('|'); return [n, c === 'USD' ? '$' : 'сум', x.ok, x.pend, x.no, Math.round(x.uzs)]; }), num: [2, 3, 4, 5], total: true, period: true,
        extra: html`<div class="section-t">Кассовый отчёт</div><div class="table-wrap"><table class="table compact"><thead><tr><th>Счёт</th><th class="r">Начало</th><th class="r">Приход</th><th class="r">Расход</th><th class="r">Конец</th></tr></thead><tbody>${SM.ACCOUNTS.map((a) => { const x = SM.accountReport(a.id, R.from, R.to); const f = (v) => (a.cur === 'USD' ? F.usd(v) : F.m(v)); return html`<tr><td>${a.name}</td><td class="r">${f(x.start)}</td><td class="r ok-t">+${f(x.inc)}</td><td class="r bad-t">−${f(x.out)}</td><td class="r fw-8">${f(x.end)}</td></tr>`; })}</tbody></table></div>` };
    }
    if (tab === 'debts') {
      const mode = r.q.m || 'clients';
      const mineClient = (id) => !own || SM.client(id).sellerId === SM.user.id;
      if (mode === 'history') return { title: 'История погашения (оплаты без привязки к продаже и по продажам в долг)', cols: ['Дата', 'Контрагент', 'Способ', 'Сумма', 'Валюта', 'Статус'], rows: SM.db.payments.filter((p) => { const s = p.saleId && SM.db.sales.find((x) => x.id === p.saleId); return p.dir === 'in' && (s ? s.credit && SM.saleVisible(s) : mineClient(p.clientId)); }).map((p) => [F.date(p.at), SM.client(p.clientId).name, SM.method(p.method).name, p.amount, p.cur, SM.PAY_STATUS[p.status][0]]), num: [3], sw: [['clients', 'По клиентам'], ['sellers', 'По продавцам'], ['overdue', 'Просроченные'], ['history', 'История погашения']] };
      if (mode === 'overdue') return { title: 'Просроченные долги', cols: ['Продажа', 'Клиент', 'Продавец', 'Срок', 'Дней просрочки', 'Долг, сум'], rows: SM.db.sales.filter((s) => SM.overdue(s) && SM.saleVisible(s)).map((s) => [s.no, SM.client(s.clientId).name, SM.user_(s.sellerId).name, F.date(s.due), D.diffDays(D.todayISO(), s.due), Math.round(SM.toUZS(SM.saleCalc(s).debt, s.cur, s.rate))]), num: [4, 5], total: true, sw: [['clients', 'По клиентам'], ['sellers', 'По продавцам'], ['overdue', 'Просроченные'], ['history', 'История погашения']] };
      if (mode === 'sellers') { const m = {}; SM.db.clients.filter((c) => mineClient(c.id)).forEach((c) => { const b = SM.balance(c.id); if (b > 0.5) { const k = c.sellerId ? SM.user_(c.sellerId).name : 'Без продавца'; m[k] = m[k] || [0, 0]; m[k][0]++; m[k][1] += b; } }); return { title: 'Дебиторская задолженность по продавцам', cols: ['Продавец', 'Клиентов-должников', 'Сумма долга, сум'], rows: Object.entries(m).map(([k, v]) => [k, v[0], Math.round(v[1])]), num: [1, 2], total: true, sw: [['clients', 'По клиентам'], ['sellers', 'По продавцам'], ['overdue', 'Просроченные'], ['history', 'История погашения']] }; }
      return { title: 'Общая дебиторская задолженность по клиентам', cols: ['Клиент', 'Телефон', 'Продавец', 'Долг, сум'], rows: SM.db.clients.filter((c) => SM.balance(c.id) > 0.5 && mineClient(c.id)).map((c) => [c.name, c.phone, c.sellerId ? SM.user_(c.sellerId).name : '', Math.round(SM.balance(c.id))]), num: [3], total: true, sw: [['clients', 'По клиентам'], ['sellers', 'По продавцам'], ['overdue', 'Просроченные'], ['history', 'История погашения']] };
    }
    if (tab === 'sellers') {
      const users = SM.db.users.filter((u) => u.role === 'seller' && (!own || u.id === SM.user.id));
      return { title: 'Работа продавцов · ' + R.label, cols: ['Продавец', 'Продаж', 'Сумма, сум', 'Товаров, ед.', 'Клиентов', 'Наличные', 'Безнал / QR', 'Перечисление', 'Продаж в долг', 'Текущие долги клиентов, сум'], period: true, total: true, num: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        rows: users.map((u) => { const l = sales.filter((s) => s.sellerId === u.id); const pays = SM.db.payments.filter((p) => p.status === 'confirmed' && p.dir === 'in' && l.some((s) => s.id === p.saleId)); const by = (ids) => Math.round(pays.filter((p) => ids.includes(p.method)).reduce((a, p) => a + SM.toUZS(p.amount, p.cur, p.rate), 0));
          return [u.name, l.length, Math.round(SM.sumUZS(l)), l.reduce((a, s) => a + s.items.reduce((b, x) => b + x.qty, 0), 0), new Set(l.map((s) => s.clientId)).size, by(['cash_uzs', 'cash_usd']), by(['card', 'qr', 'corp']), by(['bank']), l.filter((s) => s.credit).length, Math.round(SM.db.clients.filter((c) => c.sellerId === u.id).reduce((a, c) => a + Math.max(0, SM.balance(c.id)), 0))]; }) };
    }
    const g = r.q.g || 'cat';
    const ex = SM.db.expenses.filter((e) => !e.cancelled && D.inRange(e.date, R.from, R.to));
    const key = { cat: (e) => SM.expCat(e.cat).name, emp: (e) => e.employee || '—', point: (e) => (e.pointId ? SM.point(e.pointId).name : '—'), car: (e) => (e.car ? SM.car(e.car).model + ' · ' + SM.car(e.car).plate : 'Без автомобиля') }[g];
    const m = {};
    ex.forEach((e) => { const k = key(e); m[k] = m[k] || [0, 0]; m[k][0]++; m[k][1] += SM.toUZS(e.amount, e.cur, e.rate); });
    const dlv = SM.db.deliveries.filter((d) => d.status !== 'cancelled' && D.inRange(d.createdAt, R.from, R.to)).reduce((a, d) => a + (d.cost || 0), 0);
    return { title: 'Расходы · ' + R.label, cols: [{ cat: 'Категория', emp: 'Сотрудник', point: 'Точка', car: 'Автомобиль' }[g], 'Операций', 'Сумма, сум'], rows: Object.entries(m).sort((a, b) => b[1][1] - a[1][1]).map(([k, v]) => [k, v[0], Math.round(v[1])]), num: [1, 2], total: true, period: true,
      sw: [['cat', 'По категориям'], ['emp', 'По сотрудникам'], ['point', 'По точкам'], ['car', 'По автомобилям']], swParam: 'g', extra: html`<p class="fs-13 muted mt-12">Стоимость доставок за период (по заявкам): <b class="text-2">${F.cur(dlv)}</b></p>` };
  }
  function reportsPage(r) {
    const tab = reportTab(r);
    const rep = buildReport(tab, r);
    const swP = rep.swParam || 'm';
    const sw = rep.sw ? html`<div class="seg">${rep.sw.map(([k, t]) => html`<button class="${(r.q[swP] || rep.sw[0][0]) === k ? 'on' : ''}" data-sw="${k}" data-swp="${swP}">${t}</button>`)}</div>` : '';
    const tot = rep.total && rep.rows.length ? rep.cols.map((_, i) => (i === 0 ? 'Итого' : rep.num.includes(i) ? rep.rows.reduce((a, x) => a + (+x[i] || 0), 0) : '')) : null;
    const cell = (v, i) => (rep.num.includes(i) && typeof v === 'number' ? F.num(v, Math.abs(v) < 1000 && v % 1 ? 2 : 0) : v);
    return html`
      ${UI.pageHead('Отчёты', 'Остатки, продажи, оплаты и касса, задолженности, работа продавцов, расходы · фильтры и выгрузка в Excel', html`<button class="btn btn-primary" data-x="export">${I('download')}Выгрузить в Excel</button>`)}
      ${UI.tabs(tabsFor().map((t) => [t[0], t[1]]), tab)}
      <div class="row mb-16">${sw}${rep.period ? html`<span class="right">${UI.periodSeg(r.q.p || 'month')}</span>` : ''}</div>
      <div class="card"><div class="card-h"><h3>${I('chart')}${rep.title}</h3><span class="sub right">${rep.rows.length} строк</span></div><div class="card-b">
        ${rep.chart ? html`<div class="mb-16">${rep.chart}</div>` : ''}
        ${rep.rows.length ? html`<div class="table-wrap"><table class="table compact ${rep.wide ? 'no-stack' : ''}"><thead><tr>${rep.cols.map((c, i) => html`<th class="${rep.num.includes(i) ? 'r' : ''}">${c}</th>`)}</tr></thead><tbody>${rep.rows.map((row) => html`<tr>${row.map((v, i) => html`<td class="${rep.num.includes(i) ? 'r num' : ''} ${i === 0 ? 'fw-7' : ''}">${cell(v, i)}</td>`)}</tr>`)}</tbody>
          ${tot ? html`<tfoot><tr>${tot.map((v, i) => html`<td class="${rep.num.includes(i) ? 'r num' : ''}">${typeof v === 'number' ? F.num(v) : v}</td>`)}</tr></tfoot>` : ''}</table></div>` : UI.empty('Нет данных', 'Измените период или раздел отчёта', 'chart')}
        ${rep.extra || ''}</div></div>`;
  }

  SM.page('documents', {
    title: 'Документы', render: documentsPage,
    mount(el, r) {
      UI.bindSearch(el); UI.bindFilters(el);
      const n = el.querySelector('[data-x=new]'); if (n) n.onclick = newDocModal;
      UI.$$('[data-doc]', el).forEach((x) => (x.onclick = () => docPreview(SM.db.documents.find((d) => d.id === x.dataset.doc))));
      if (r.q.open) { const d = SM.db.documents.find((x) => x.id === r.q.open); if (d && docVisible(d)) docPreview(d); }
    },
  });
  SM.page('reports', {
    title: 'Отчёты', render: reportsPage,
    mount(el, r) {
      UI.bindTabs(el); UI.bindPeriod(el);
      UI.$$('[data-sw]', el).forEach((b) => (b.onclick = () => SM.setQuery({ [b.dataset.swp]: b.dataset.sw }, true)));
      el.querySelector('[data-x=export]').onclick = () => { const tab = reportTab(r), rep = buildReport(tab, r); UI.exportXLSX(rep.title.replace(/[^\wа-яё]+/gi, '_').slice(0, 60), [rep.cols, ...rep.rows], (TABS.find((t) => t[0] === tab) || [0, 'Отчёт'])[1]); };
    },
  });
})();
