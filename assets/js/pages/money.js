/* =========================================================
   Касса и банк (ТЗ 11), раздел бухгалтера (17), расходы (14),
   валюты, курсы и НДС (10)
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM, UI = SM.ui;
  const { html, raw, fmt: F, d: D } = SM;
  const I = UI.icon;
  const COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];
  const accAmt = (v, cur) => (cur === 'USD' ? F.usd(v) : F.m(v));
  const range = (r, def = 'day') => { const p = r.q.p || def; if (p === 'custom') return { p, from: r.q.from || D.todayISO(), to: r.q.to || D.todayISO(), label: F.date(r.q.from) + ' — ' + F.date(r.q.to) }; return Object.assign({ p }, SM.periodRange(p)); };
  const periodBox = (R) => html`<div class="row">${UI.periodSeg(R.p, SM.PERIODS.slice(0, 3).concat([['custom', 'Период']]))}${R.p === 'custom' ? html`<input class="input input-sm" type="date" data-d="from" value="${R.from}" style="width:150px"><input class="input input-sm" type="date" data-d="to" value="${R.to}" style="width:150px">` : ''}</div>`;
  const bindRange = (el) => { UI.bindPeriod(el); UI.$$('[data-d]', el).forEach((i) => (i.onchange = () => SM.setQuery({ [i.dataset.d]: i.value }, true))); };

  /* ---------- Касса и банк ---------- */
  function cashPage(r) {
    const R = range(r);
    const accs = SM.ACCOUNTS.filter((a) => SM.db.methods.some((m) => m.id === a.id && m.active));
    const rep = accs.map((a) => Object.assign({ a }, SM.accountReport(a.id, R.from, R.to)));
    const k = (x, v) => SM.toUZS(v, x.a.cur, SM.rate());
    const tot = rep.reduce((t, x) => ({ start: t.start + k(x, x.start), inc: t.inc + k(x, x.inc), out: t.out + k(x, x.out), end: t.end + k(x, x.end) }), { start: 0, inc: 0, out: 0, end: 0 });
    const flows = SM.cashFlows().filter((f) => D.inRange(f.at, R.from, R.to)).slice().reverse();
    const refunds = flows.filter((f) => f.kind === 'refund').reduce((a, f) => a - SM.toUZS(f.amount, f.cur, f.rate), 0);
    const byMethod = {};
    flows.filter((f) => f.kind === 'in').forEach((f) => (byMethod[f.acc] = (byMethod[f.acc] || 0) + SM.toUZS(f.amount, f.cur, f.rate)));
    const parts = Object.entries(byMethod).map(([id, v], i) => ({ name: SM.method(id).name, value: v, color: COLORS[i % COLORS.length] }));
    // графики: остаток счёта по дням периода; сверху — поступления и расходы по дням и общий остаток (в сумах)
    const flowsAll = SM.cashFlows().map((f) => ({ at: f.at, v: SM.toUZS(f.amount, f.cur, f.rate), acc: f.acc })).filter((f) => accs.some((a) => a.id === f.acc));
    const opening = accs.reduce((s, a) => s + SM.toUZS((SM.db.settings.opening || {})[a.id] || 0, a.cur, SM.rate()), 0);
    const spInc = SM.series(R.from, R.to, flowsAll.filter((f) => f.v > 0)), spOut = SM.series(R.from, R.to, flowsAll.filter((f) => f.v < 0).map((f) => ({ at: f.at, v: -f.v })));
    const spEnd = rep.map((x) => SM.balanceSeries(x.a.id, R.from, R.to).map((v) => k(x, v))).reduce((s, a) => s.map((v, i) => v + (a[i] || 0)));
    const KIND = { in: ['Приход', 'b-ok'], payout: ['Поставщику', 'b-warn'], refund: ['Возврат', 'b-bad'], expense: ['Расход', 'b-bad'], deposit: ['Внесение', 'b-info'], withdraw: ['Изъятие', 'b-violet'] };
    return html`
      ${UI.pageHead('Касса и банк', 'Остаток на начало, поступления, расходы, оплаты по способам, возвраты и остаток на конец · ' + R.label, html`
        <button class="btn btn-secondary" data-x="print">${I('print')}Кассовый отчёт</button>
        <button class="btn btn-secondary" data-x="export">${I('download')}Excel</button>
        ${SM.can('cash', 2) ? html`<button class="btn btn-primary" data-x="op">${I('plus')}Внесение / изъятие</button>` : ''}`)}
      <div class="row mb-16">${periodBox(R)}</div>
      <div class="grid g-4 keep-2 stagger">
        ${UI.kpi({ label: 'Остаток на начало', icon: 'history', value: F.m(tot.start), count: Math.round(tot.start), unit: 'сум', foot: 'все счета в сумах по курсу ' + F.num(SM.rate()) })}
        ${UI.kpi({ label: 'Поступления', icon: 'trendUp', value: F.m(tot.inc), count: Math.round(tot.inc), unit: 'сум', foot: html`<span class="ok-t fw-8">приход</span> за период`, cls: 'k-accent', spark: spInc, sparkColor: '#fff', sparkKey: 'cash:inc' })}
        ${UI.kpi({ label: 'Расходы и выплаты', icon: 'trendDown', value: F.m(tot.out), count: Math.round(tot.out), unit: 'сум', foot: refunds ? 'в т.ч. возвраты ' + F.short(refunds) : 'возвратов нет', spark: spOut, sparkColor: 'var(--bad)', sparkKey: 'cash:out' })}
        ${UI.kpi({ label: 'Остаток на конец', icon: 'wallet', value: F.m(tot.end), count: Math.round(tot.end), unit: 'сум', foot: UI.delta(tot.end, tot.start), spark: spEnd, sparkColor: tot.end > tot.start ? 'var(--ok)' : tot.end < tot.start ? 'var(--bad)' : 'var(--text-3)', sparkKey: 'cash:end', sparkFit: true })}
      </div>
      <div class="grid g-3 mt-16 stagger">${rep.map((x) => html`<div class="card kpi acc-tile has-spark"><div class="k-label">${I(x.a.icon)}${x.a.name}</div><div class="k-value">${accAmt(x.end, x.a.cur)}</div>
        <div class="k-foot">начало ${accAmt(x.start, x.a.cur)} · <span class="ok-t">+${accAmt(x.inc, x.a.cur)}</span> · <span class="bad-t">−${accAmt(x.out, x.a.cur)}</span></div>${UI.spark(SM.balanceSeries(x.a.id, R.from, R.to), x.end > x.start ? 'var(--ok)' : x.end < x.start ? 'var(--bad)' : 'var(--text-3)', 'cash:' + x.a.id, true)}</div>`)}</div>
      <div class="grid g-21 mt-16 stagger">
        <div class="card"><div class="card-h"><h3>${I('history')}Движение денег</h3><span class="sub">${flows.length} операций</span></div><div class="card-b">${flows.length ? html`<div class="table-wrap"><table class="table compact"><thead><tr><th>Время</th><th>Операция</th><th>Счёт</th><th class="r">Сумма</th></tr></thead><tbody>
          ${flows.map((f) => html`<tr ${f.saleId ? raw(`class="click" data-act="open-sale" data-id="${f.saleId}"`) : ''}><td class="nowrap">${F.dt(f.at)}</td><td><span class="cell-title">${f.title}</span><span class="cell-sub">${f.who}</span></td><td>${UI.badge(KIND[f.kind])} <span class="fs-12 muted">${SM.account(f.acc).name}</span></td><td class="r">${UI.signed(f.amount, f.cur)}</td></tr>`)}</tbody></table></div>` : UI.empty('Операций нет', 'за выбранный период')}</div></div>
        <div class="card"><div class="card-h"><h3>${I('card')}Поступления по способам</h3></div><div class="card-b">${parts.length ? UI.segBar(parts) : UI.empty('Поступлений нет')}</div></div>
      </div>`;
  }
  function cashOpModal() {
    const m = UI.modal({ title: 'Внесение или изъятие денег', sub: 'Например: размен в кассу, инкассация в банк', size: 'narrow',
      body: html`<form class="stack" style="gap:12px" autocomplete="off">
        <div class="choice"><label><input type="radio" name="dir" value="in" checked><span>${I('plus')}Внесение</span></label><label><input type="radio" name="dir" value="out"><span>${I('minus')}Изъятие</span></label></div>
        <div class="field"><label>Счёт</label><select class="select" name="acc">${UI.options(SM.ACCOUNTS.map((a) => [a.id, a.name]), 'cash_uzs')}</select></div>
        <div class="field"><label>Сумма <span class="req">*</span></label><input class="input" name="amount" ${UI.moneyAttrs(100000000000)} autofocus></div>
        <div class="field"><label>Основание <span class="req">*</span></label><input class="input" name="title" placeholder="Инкассация, размен…"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>Провести</button>` });
    m.querySelector('[data-ok]').onclick = () => {
      const f = m.querySelector('form'), d = UI.formData(f);
      d.amount = UI.num(d.amount);
      if (!(d.amount > 0)) return UI.invalid(f, 'amount', 'Введите сумму');
      if (!d.title) return UI.invalid(f, 'title', 'Укажите основание');
      const o = { id: SM.uid('co'), at: new Date().toISOString(), acc: d.acc, amount: d.dir === 'in' ? +d.amount : -d.amount, title: d.dir === 'in' ? 'Внесение: ' + d.title : 'Изъятие: ' + d.title, rate: SM.rate(), by: SM.user.id };
      SM.db.cashOps.push(o); SM.log(o.title, 'cash', o.id, F.cur(Math.abs(o.amount), SM.account(d.acc).cur) + ' · ' + SM.account(d.acc).name); SM.save();
      UI.closeTop(); UI.toast(o.amount > 0 ? 'Деньги внесены' : 'Деньги изъяты', o.title + ' · ' + F.cur(Math.abs(o.amount), SM.account(d.acc).cur), 'ok', { icon: o.amount > 0 ? 'plus' : 'minus' }); SM.refresh();
    };
  }

  /* ---------- Бухгалтерия ---------- */
  function accountingPage(r) {
    const tab = r.q.tab || 'pending';
    const pend = SM.db.payments.filter((p) => p.status === 'pending');
    const R = range(r, 'month');
    const can = SM.flag('confirmPay');
    const payRow = (p, actions) => { const s = p.saleId ? SM.db.sales.find((x) => x.id === p.saleId) : null; return html`<tr>
      <td class="nowrap">${F.dt(p.at)}</td><td><span class="cell-title">${SM.client(p.clientId).name}</span><span class="cell-sub">${s ? html`<a href="#" data-act="open-sale" data-id="${s.id}">${SM.saleNo(s)}</a>` : p.dir === 'out' ? 'оплата поставщику' : 'погашение долга'}${p.note ? ' · ' + p.note : ''}</span></td>
      <td>${I(SM.method(p.method).icon, 'icon-sm')} ${SM.method(p.method).name}</td><td class="r nowrap"><b>${p.dir === 'out' ? '−' : ''}${F.cur(p.amount, p.cur)}</b>${p.cur === 'USD' ? html`<span class="cell-sub">≈ ${F.cur(p.amount * p.rate)}</span>` : ''}</td>
      <td>${SM.user_(p.by).name}</td><td class="nowrap">${actions && can ? html`<button class="btn btn-ok btn-sm" data-ok="${p.id}">${I('check')}Подтвердить</button> <button class="btn btn-danger btn-sm" data-no="${p.id}">${I('x')}Отклонить</button>` : UI.badge(SM.PAY_STATUS[p.status])}</td></tr>`; };
    const head = html`<thead><tr><th>Создана</th><th>Контрагент</th><th>Способ</th><th class="r">Сумма</th><th>Кто внёс</th><th></th></tr></thead>`;
    let body;
    if (tab === 'pending') {
      body = html`<div class="note-box mb-16">${I('info')}<div>Порядок по ТЗ 11.2: продавец оформил продажу и способ оплаты → операция появилась здесь → бухгалтер проверяет поступление денег → подтверждает или отклоняет → статус продажи обновляется → после подтверждения склад может отгружать.</div></div>
        ${pend.length ? html`<div class="table-wrap"><table class="table">${head}<tbody>${pend.map((p) => payRow(p, true))}</tbody></table></div>` : UI.empty('Все оплаты подтверждены', 'Новые появятся здесь автоматически', 'check')}`;
    } else if (tab === 'journal') {
      const st = r.q.st || '', mt = r.q.mt || '';
      const list = SM.db.payments.filter((p) => D.inRange(p.at, R.from, R.to) && (!st || p.status === st) && (!mt || p.method === mt)).slice().reverse();
      body = html`<div class="row mb-16">${periodBox(R)}${UI.filterSelect('st', st, Object.entries(SM.PAY_STATUS).map(([k, v]) => [k, v[0]]), 'Все статусы')}${UI.filterSelect('mt', mt, SM.db.methods.map((m) => [m.id, m.name]), 'Все способы')}</div>
        ${list.length ? html`<div class="table-wrap"><table class="table">${head}<tbody>${list.map((p) => payRow(p, false))}</tbody></table></div>` : UI.empty('Оплат нет', 'за выбранный период')}`;
    } else if (tab === 'fx') {
      const usdSales = SM.db.sales.filter((s) => s.cur === 'USD' && s.state !== 'draft' && D.inRange(s.date, R.from, R.to));
      const usdPays = SM.db.payments.filter((p) => (p.cur === 'USD' || (p.saleId && (SM.db.sales.find((s) => s.id === p.saleId) || {}).cur === 'USD')) && D.inRange(p.at, R.from, R.to));
      const usdRc = SM.db.receipts.filter((x) => x.cur === 'USD' && x.status !== 'draft' && D.inRange(x.date, R.from, R.to));
      body = html`<div class="row mb-16">${periodBox(R)}</div>
        <div class="note-box mb-16">${I('info')}<div>Курс фиксируется в каждой операции и не меняется при обновлении справочника курсов (ТЗ 10). Ниже — операции в долларах и их сумовой эквивалент по курсу операции.</div></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Операция</th><th>Контрагент</th><th class="r">Сумма, $</th><th class="r">Курс</th><th class="r">В сумах</th></tr></thead><tbody>
          ${usdSales.map((s) => { const t = SM.saleCalc(s).total; return html`<tr class="click" data-act="open-sale" data-id="${s.id}"><td>${F.date(s.date)}</td><td>Продажа ${SM.saleNo(s)}</td><td>${SM.client(s.clientId).name}</td><td class="r">${F.usd(t)}</td><td class="r">${F.num(s.rate)}</td><td class="r fw-8">${F.m(t * s.rate)}</td></tr>`; })}
          ${usdPays.map((p) => { const s = SM.db.sales.find((x) => x.id === p.saleId); const usd = SM.conv(p.amount, p.cur, 'USD', p.rate); return html`<tr><td>${F.date(p.at)}</td><td>Оплата ${s ? SM.saleNo(s) : ''} · ${SM.method(p.method).name}</td><td>${SM.client(p.clientId).name}</td><td class="r">${F.usd(usd)}</td><td class="r">${F.num(p.rate)}</td><td class="r fw-8">${F.m(SM.toUZS(p.amount, p.cur, p.rate))}</td></tr>`; })}
          ${usdRc.map((x) => { const t = SM.receiptCalc(x).total; return html`<tr class="click" data-href="#/receipts/${x.id}"><td>${F.date(x.date)}</td><td>Поступление ${x.no}</td><td>${SM.client(x.supplierId).name}</td><td class="r">${F.usd(t)}</td><td class="r">${F.num(x.rate)}</td><td class="r fw-8">${F.m(t * x.rate)}</td></tr>`; })}
        </tbody></table></div>`;
    } else {
      const sales = SM.salesIn(R.from, R.to).filter((s) => s.vat);
      const outVat = sales.reduce((a, s) => a + SM.toUZS(SM.saleCalc(s).vat, s.cur, s.rate), 0);
      const outNet = sales.reduce((a, s) => a + SM.toUZS(SM.saleCalc(s).net, s.cur, s.rate), 0);
      const rcs = SM.db.receipts.filter((x) => x.status === 'posted' && x.vat && D.inRange(x.date, R.from, R.to));
      const inVat = rcs.reduce((a, x) => a + SM.toUZS(SM.receiptCalc(x).vat, x.cur, x.rate), 0);
      body = html`<div class="row mb-16">${periodBox(R)}</div>
        <div class="grid g-3 keep-2">
          <div class="cash-acc"><span>${I('cart')}НДС с продаж</span><b>${F.cur(outVat)}</b><div class="fs-12 muted fw-7">оборот без НДС ${F.short(outNet)}</div></div>
          <div class="cash-acc"><span>${I('inbox')}НДС в поступлениях (зачёт)</span><b>${F.cur(inVat)}</b><div class="fs-12 muted fw-7">${rcs.length} документов</div></div>
          <div class="cash-acc"><span>${I('percent')}К уплате</span><b class="${outVat - inVat > 0 ? 'bad-t' : 'ok-t'}">${F.cur(outVat - inVat)}</b><div class="fs-12 muted fw-7">ставка ${SM.vatCfg().rate}%, ${SM.vatCfg().mode === 'top' ? 'сверху' : 'в т.ч.'}</div></div></div>
        <div class="section-t">Продажи с НДС</div>
        ${sales.length ? html`<div class="table-wrap"><table class="table compact"><thead><tr><th>Продажа</th><th>Клиент</th><th class="r">Без НДС</th><th class="r">НДС</th><th class="r">Итого</th></tr></thead><tbody>${sales.map((s) => { const c = SM.saleCalc(s); return html`<tr class="click" data-act="open-sale" data-id="${s.id}"><td>${SM.saleNo(s)} · ${F.date(s.date)}</td><td>${SM.client(s.clientId).name}</td><td class="r">${F.cur(c.net, s.cur)}</td><td class="r fw-7">${F.cur(c.vat, s.cur)}</td><td class="r fw-8">${F.cur(c.total, s.cur)}</td></tr>`; })}</tbody></table></div>` : UI.empty('Нет продаж с НДС', 'за выбранный период')}
        <p class="fs-12 muted mt-12">Окончательные правила применения курсов и НДС согласовываются с Заказчиком до разработки расчётной части (ТЗ 10).</p>`;
    }
    const confirmedToday = SM.db.payments.filter((p) => p.status === 'confirmed' && D.dayOf(p.confirmedAt || p.at) === D.todayISO()).length;
    return html`
      ${UI.pageHead('Бухгалтерия', 'Подтверждение оплат, банковские и кассовые операции, валютные операции и НДС', html`<a class="btn btn-secondary" href="#/debts">${I('scale')}Взаиморасчёты</a><a class="btn btn-secondary" href="#/documents">${I('file')}Документы и акты</a><a class="btn btn-secondary" href="#/reports?tab=cash">${I('chart')}Финотчёты</a>`)}
      <div class="grid g-4 keep-2 stagger">
        ${UI.kpi({ label: 'На подтверждение', icon: 'clock', value: pend.length, count: pend.length, foot: F.cur(pend.reduce((a, p) => a + SM.toUZS(p.amount, p.cur, p.rate), 0)), cls: pend.length ? 'k-accent' : '' })}
        ${UI.kpi({ label: 'Подтверждено сегодня', icon: 'check', value: confirmedToday, count: confirmedToday })}
        ${UI.kpi({ label: 'Отклонено за 30 дней', icon: 'x', value: SM.db.payments.filter((p) => p.status === 'rejected' && D.inRange(p.at, D.iso(D.addDays(D.today(), -29)), D.todayISO())).length })}
        ${UI.kpi({ label: 'Курс $ сегодня', icon: 'dollar', value: F.num(SM.rate()), foot: 'безнал ' + F.num(SM.rate('card')) + ' · банк ' + F.num(SM.rate('bank')), href: '#/rates' })}
      </div>
      <div class="mt-16">${UI.tabs([['pending', 'На подтверждение', pend.length], ['journal', 'Журнал оплат'], ['fx', 'Валютные операции'], ['vat', 'НДС']], tab)}</div>
      <div class="card"><div class="card-b">${body}</div></div>`;
  }

  /* ---------- Расходы: одна категория «Расходы компании», на что — текстом ---------- */
  function expensesPage(r) {
    const R = range(r, 'month');
    const pt = r.q.pt || '', q = (r.q.q || '').toLowerCase();
    const list = SM.db.expenses.filter((e) => D.inRange(e.date, R.from, R.to) && (!pt || e.pointId === pt) && (!q || (e.comment || '').toLowerCase().includes(q))).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.at).localeCompare(String(a.at)));
    const act = list.filter((e) => !e.cancelled);
    const sum = act.reduce((a, e) => a + SM.toUZS(e.amount, e.cur, e.rate), 0);
    const today = act.filter((e) => e.date === D.todayISO()).reduce((a, e) => a + SM.toUZS(e.amount, e.cur, e.rate), 0);
    const usd = act.filter((e) => e.cur === 'USD').reduce((a, e) => a + e.amount, 0);
    const edit = SM.can('expenses', 2);
    return html`
      ${UI.pageHead('Расходы компании', 'Любые траты: аренда, топливо, обеды, ремонт — на что потрачено, пишется текстом', html`<button class="btn btn-secondary" data-x="export">${I('download')}Excel</button>${edit ? html`<button class="btn btn-primary" data-x="new">${I('plus')}Расход</button>` : ''}`)}
      <div class="grid g-3 keep-2 stagger">
        ${UI.kpi({ label: 'Расходы · ' + R.label, icon: 'coins', value: F.m(sum), count: Math.round(sum), unit: 'сум', foot: act.length + ' ' + F.plural(act.length, 'операция', 'операции', 'операций'), cls: 'k-accent' })}
        ${UI.kpi({ label: 'Сегодня', icon: 'calendar', value: F.m(today), count: Math.round(today), unit: 'сум', foot: 'в сумах по курсу операции' })}
        ${UI.kpi({ label: 'Из кассы в $', icon: 'dollar', value: F.usd(usd), foot: 'за выбранный период' })}
      </div>
      <div class="card mt-16"><div class="card-h">${UI.searchInput(r.q.q, 'На что потрачено')}${SM.db.points.length > 1 ? UI.filterSelect('pt', pt, UI.pointOptions(), 'Все точки') : ''}<span class="right">${periodBox(R)}</span></div>
        <div class="card-b" style="padding-top:12px">${list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>На что</th><th>Дата</th><th>Касса / счёт</th><th>Точка</th><th class="r">Сумма</th><th></th></tr></thead><tbody>
          ${list.map((e) => html`<tr class="${e.cancelled ? 'row-muted' : ''}">
            <td><span class="cell-title">${e.comment || 'Без описания'}</span><span class="cell-sub">${SM.user_(e.by).name}${e.file ? html` · ${I('paperclip')} ${e.file}` : ''}</span></td>
            <td class="nowrap">${F.date(e.date)}</td><td>${SM.account(e.account).name}</td><td>${e.pointId ? SM.point(e.pointId).name : html`<span class="muted">—</span>`}</td>
            <td class="r nowrap"><b class="${e.cancelled ? '' : 'bad-t'}">−${F.cur(e.amount, e.cur)}</b>${e.cancelled ? html`<span class="cell-sub">отменён: ${e.cancelReason || ''}</span>` : ''}</td>
            <td class="td-act">${!e.cancelled && (SM.flag('cancelOps') || SM.isAdmin()) ? html`<button type="button" class="act-btn del" data-cancel="${e.id}" data-tip="Отменить расход" aria-label="Отменить расход">${I('undo')}</button>` : ''}</td></tr>`)}</tbody></table></div>` : UI.empty('Расходов нет', 'за выбранный период', 'coins')}</div></div>`;
  }
  function expenseForm() {
    const m = UI.modal({ title: 'Новый расход', sub: 'Категория: «Расходы компании»',
      body: html`<form class="form-grid" autocomplete="off">
        <div class="field full"><label>На что расход <span class="req">*</span></label><input class="input" name="comment" placeholder="Например: аренда склада, топливо для Damas, обед сотрудникам" autofocus></div>
        <div class="field"><label>Сумма <span class="req">*</span></label><div class="input-suffix"><input class="input" name="amount" ${UI.moneyAttrs(10000000000)}><em data-cur>сум</em></div></div>
        <div class="field"><label>Касса или счёт</label><select class="select" name="account">${UI.options(SM.ACCOUNTS.map((a) => [a.id, a.name]), 'cash_uzs')}</select></div>
        <div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${D.todayISO()}"></div>
        <div class="field"><label>Магазин или склад</label><select class="select" name="pointId">${UI.options(UI.pointOptions(), '', 'Не указан')}</select></div>
        <div class="field full"><label>Чек или документ</label>${UI.fileField('file', { label: 'Прикрепить чек' })}</div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Сохранить</button>` });
    const f = m.querySelector('form');
    const sc = () => { const usd = SM.account(f.account.value).cur === 'USD'; m.querySelector('[data-cur]').textContent = usd ? '$' : 'сум'; f.amount.dataset.dec = usd ? 2 : 0; };
    f.account.addEventListener('change', sc); sc();
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f);
      if (!d.comment) return UI.invalid(f, 'comment', 'Напишите, на что потрачено');
      const amount = UI.num(d.amount);
      if (!(amount > 0)) return UI.invalid(f, 'amount', 'Введите сумму');
      const e = SM.ops.saveExpense(Object.assign(d, { cat: 'company', amount, file: f.file.files[0] ? f.file.files[0].name : '' }));
      UI.closeTop(); UI.toast('Расход записан', e.comment + ' · ' + F.cur(e.amount, e.cur), 'ok', { icon: 'coins' }); SM.refresh();
    };
  }

  /* ---------- Валюты, курсы и НДС ---------- */
  function ratesPage() {
    const rs = SM.db.rates;
    const cur = rs[rs.length - 1], prev = rs[rs.length - 2] || cur;
    const can = SM.flag('setRates');
    const vat = SM.vatCfg();
    const card = (k, t, ic) => html`<div class="card kpi ${k === 'cash' ? 'k-accent' : ''}"><div class="k-label">${I(ic)}${t}</div><div class="k-value">${F.num(cur[k])}<small>сум за $1</small></div><div class="k-foot">${UI.delta(cur[k], prev[k])} к прошлому курсу · ${F.num(prev[k])}</div></div>`;
    const last = rs.slice(-10);
    return html`
      ${UI.pageHead('Валюты, курсы и НДС', 'Сумы и доллары США · курс устанавливается вручную, отдельно для наличной, безналичной оплаты и перечисления', '')}
      <div class="grid g-3 stagger">${card('cash', 'Наличный курс', 'cash')}${card('card', 'Безналичный (карта, QR)', 'card')}${card('bank', 'Перечисление', 'bank')}</div>
      <div class="grid g-21 mt-16 stagger">
        <div class="card"><div class="card-h"><h3>${I('chart')}Динамика курса</h3></div><div class="card-b">${UI.chart({ type: 'line', height: 220, padL: 56, labels: last.map((x) => F.dm(x.at)), series: [{ name: 'Наличный', color: '#e0365e', values: last.map((x) => x.cash) }, { name: 'Безналичный', color: '#6aa8ff', values: last.map((x) => x.card) }, { name: 'Перечисление', color: '#3ddc97', values: last.map((x) => x.bank) }], fmt: (v) => F.num(v), tipFmt: (v) => F.num(v) + ' сум' })}
          ${UI.legend([{ name: 'Наличный', color: '#e0365e' }, { name: 'Безналичный', color: '#6aa8ff' }, { name: 'Перечисление', color: '#3ddc97' }])}</div></div>
        <div class="card"><div class="card-h"><h3>${I('edit')}Установить курс</h3></div><div class="card-b">${can ? html`<form class="stack" style="gap:12px" id="rateForm">
            <div class="field"><label>Наличный</label><input class="input" name="cash" ${UI.moneyAttrs(100000, 2)} value="${UI.fmtInput(cur.cash, 2)}"></div>
            <div class="field"><label>Безналичный</label><input class="input" name="card" ${UI.moneyAttrs(100000, 2)} value="${UI.fmtInput(cur.card, 2)}"></div>
            <div class="field"><label>Перечисление</label><input class="input" name="bank" ${UI.moneyAttrs(100000, 2)} value="${UI.fmtInput(cur.bank, 2)}"></div>
            <button class="btn btn-primary" type="submit">${I('check')}Сохранить курс</button>
            <p class="fs-12 muted">Новый курс применяется к новым операциям. Курс уже проведённых операций не меняется.</p></form>` : html`<div class="note-box">${I('lock')}<div>Устанавливать курс могут роли с правом «Установка курсов» (администратор, руководитель, бухгалтер).</div></div>`}</div></div>
      </div>
      <div class="grid g-2 mt-16 stagger">
        <div class="card"><div class="card-h"><h3>${I('history')}История курсов</h3></div><div class="card-b"><div class="table-wrap"><table class="table compact"><thead><tr><th>Дата</th><th class="r">Наличный</th><th class="r">Безнал</th><th class="r">Перечисл.</th><th>Кто</th></tr></thead><tbody>${rs.slice().reverse().map((x) => html`<tr><td class="nowrap">${F.dt(x.at)}</td><td class="r fw-7">${F.num(x.cash)}</td><td class="r">${F.num(x.card)}</td><td class="r">${F.num(x.bank)}</td><td>${SM.user_(x.by).name}</td></tr>`)}</tbody></table></div></div></div>
        <div class="card"><div class="card-h"><h3>${I('percent')}НДС</h3></div><div class="card-b">${SM.isAdmin() ? html`<form class="stack" style="gap:14px" id="vatForm">
            <label class="switch"><input type="checkbox" name="enabled" ${vat.enabled ? 'checked' : ''}><i></i>НДС включён</label>
            <div class="field"><label>Ставка, %</label><input class="input num" type="number" name="rate" value="${vat.rate}" min="0" max="50" step="any"></div>
            <div class="field"><label>Как считать</label><div class="choice"><label><input type="radio" name="mode" value="included" ${vat.mode !== 'top' ? 'checked' : ''}><span>В т.ч. (цена уже с НДС)</span></label><label><input type="radio" name="mode" value="top" ${vat.mode === 'top' ? 'checked' : ''}><span>Сверху цены</span></label></div></div>
            <button class="btn btn-primary" type="submit">${I('check')}Сохранить</button></form>` : html`<dl class="dl"><dt>Статус</dt><dd>${vat.enabled ? 'включён' : 'выключен'}</dd><dt>Ставка</dt><dd>${vat.rate}%</dd><dt>Расчёт</dt><dd>${vat.mode === 'top' ? 'сверху цены' : 'в т.ч. (цена с НДС)'}</dd></dl><p class="fs-12 muted mt-12">Настройки НДС меняет администратор.</p>`}
          <div class="note-box mt-16">${I('info')}<div>В документах показываются сумма без НДС, сумма НДС и итог. Пример: 1 120 000 сум в т.ч. НДС 12% = 1 000 000 + 120 000.</div></div></div></div>
      </div>`;
  }

  /* ---------- Регистрация ---------- */
  SM.page('cash', {
    title: 'Касса и банк', render: cashPage,
    mount(el, r) {
      bindRange(el);
      const on = (s, fn) => { const b = el.querySelector(s); if (b) b.onclick = fn; };
      on('[data-x=op]', cashOpModal);
      const R = range(r);
      const rows = () => { const accs = SM.ACCOUNTS; return accs.map((a) => { const x = SM.accountReport(a.id, R.from, R.to); return [a.name, a.cur, Math.round(x.start * 100) / 100, Math.round(x.inc * 100) / 100, Math.round(x.out * 100) / 100, Math.round(x.end * 100) / 100]; }); };
      on('[data-x=export]', () => UI.exportXLSX('Касса_' + (R.from || 'всё') + '_' + (R.to || ''), [['Счёт', 'Валюта', 'Начало', 'Приход', 'Расход', 'Конец'], ...rows(), [], ['Время', 'Операция', 'Контрагент / комментарий', 'Счёт', 'Сумма', 'Валюта'], ...SM.cashFlows().filter((f) => D.inRange(f.at, R.from, R.to)).map((f) => [F.dt(f.at), f.title, f.who, SM.account(f.acc).name, f.amount, f.cur])], 'Касса'));
      on('[data-x=print]', () => { const co = SM.db.settings.company; UI.printDoc('Кассовый отчёт', `<div class="doc-head"><b>${SM.esc(co.name)}</b><span>${F.dt(new Date().toISOString())}</span></div><h1>Кассовый отчёт</h1><p style="text-align:center">${R.from ? F.date(R.from) + ' — ' + F.date(R.to) : 'за всё время'}</p><table><thead><tr><th>Счёт</th><th>Валюта</th><th>Начало</th><th>Приход</th><th>Расход</th><th>Конец</th></tr></thead><tbody>${rows().map((x) => '<tr>' + x.map((v, i) => '<td' + (i > 1 ? ' class="doc-r"' : '') + '>' + (typeof v === 'number' ? F.num(v, x[1] === 'USD' ? 2 : 0) : SM.esc(v)) + '</td>').join('') + '</tr>').join('')}</tbody></table><div class="doc-sign"><div>Кассир</div><div>Гл. бухгалтер ${SM.esc(co.accountant)}</div></div>`); });
    },
  });
  SM.page('accounting', {
    title: 'Бухгалтерия', render: accountingPage,
    mount(el) {
      UI.bindTabs(el); bindRange(el); UI.bindFilters(el);
      UI.$$('[data-ok]', el).forEach((b) => (b.onclick = () => { SM.ops.confirmPayment(b.dataset.ok, true); UI.toast('Оплата подтверждена', 'Статус продажи обновлён', 'ok', { icon: 'wallet' }); SM.refresh(); }));
      UI.$$('[data-no]', el).forEach((b) => (b.onclick = async () => { const why = await UI.prompt('Отклонить оплату?', 'Продавец получит уведомление', { ok: 'Отклонить', danger: true }); if (!why) return; SM.ops.confirmPayment(b.dataset.no, false, why); UI.toast('Оплата отклонена', why, 'bad', { icon: 'x' }); SM.refresh(); }));
    },
  });
  SM.page('expenses', {
    title: 'Расходы', render: expensesPage,
    mount(el, r) {
      bindRange(el); UI.bindFilters(el); UI.bindSearch(el);
      const n = el.querySelector('[data-x=new]'); if (n) n.onclick = expenseForm;
      UI.$$('[data-cancel]', el).forEach((b) => (b.onclick = async () => { const e = SM.db.expenses.find((x) => x.id === b.dataset.cancel); const why = await UI.prompt('Отменить расход?', (e.comment || SM.expCat(e.cat).name) + ' · ' + F.cur(e.amount, e.cur), { ok: 'Отменить', danger: true }); if (!why) return; SM.ops.cancelExpense(e, why); UI.toast('Расход отменён', e.comment + ' · ' + why, 'warn', { icon: 'undo' }); SM.refresh(); }));
      const R = range(r, 'month');
      el.querySelector('[data-x=export]').onclick = () => UI.exportXLSX('Расходы_' + D.todayISO(), [['Дата', 'На что', 'Сумма', 'Валюта', 'Касса/счёт', 'Точка', 'Кто внёс', 'Статус'], ...SM.db.expenses.filter((e) => D.inRange(e.date, R.from, R.to)).map((e) => [F.date(e.date), e.comment, e.amount, e.cur, SM.account(e.account).name, e.pointId ? SM.point(e.pointId).name : '', SM.user_(e.by).name, e.cancelled ? 'отменён' : ''])], 'Расходы');
    },
  });
  SM.page('rates', {
    title: 'Валюты и НДС', render: ratesPage,
    mount(el) {
      const rf = el.querySelector('#rateForm');
      if (rf) rf.onsubmit = (e) => { e.preventDefault(); const d = UI.formData(rf); ['cash', 'card', 'bank'].forEach((k) => (d[k] = UI.num(d[k]))); if (!(d.cash > 0 && d.card > 0 && d.bank > 0)) return UI.toast('Проверьте курс', 'Все значения должны быть больше нуля', 'warn'); SM.ops.setRate(d); UI.toast('Курс $ изменён', '$1 = ' + F.num(d.cash) + ' сум (наличный) · новые операции пойдут по нему', 'ok', { icon: 'dollar' }); SM.refresh(); };
      const vf = el.querySelector('#vatForm');
      if (vf) vf.onsubmit = (e) => { e.preventDefault(); const d = UI.formData(vf); SM.db.settings.vat = { enabled: !!d.enabled, rate: +d.rate || 0, mode: vf.querySelector('[name=mode]:checked').value }; SM.log('Изменены настройки НДС', 'settings', null, (d.enabled ? 'включён ' : 'выключен ') + d.rate + '%'); SM.save(); UI.toast('Настройки НДС сохранены', (d.enabled ? 'НДС ' + d.rate + '%' : 'НДС выключен') + ' · для новых документов', 'ok', { icon: 'percent' }); SM.refresh(); };
    },
  });
})();
