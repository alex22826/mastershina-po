/* =========================================================
   Продажи (ТЗ 9, 11), клиенты (12), задолженности и акт сверки (13),
   доставка (15)
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM, UI = SM.ui;
  const { html, raw, fmt: F, d: D } = SM;
  const I = UI.icon;

  /* ---------- Подбор товара: поиск по коду, названию, альтернативным названиям, размеру ---------- */
  const PICK_MAX = 100; // больше в выпадающем списке не рисуем — дальше помогает поиск
  // inline() → блок, где список стоит открытым (пустая продажа: список виден сразу); null — обычный выпадающий
  SM.productPicker = function (wrap, { point, onPick, placeholder = 'Найти товар: код, название, размер, «колодки нексия»…', showStock = true, inline = () => null }) {
    wrap.classList.add('picker');
    wrap.innerHTML = String(html`<label class="input-icon">${I('search')}<input class="input" placeholder="${placeholder}" autocomplete="off" aria-label="Поиск товара"></label>`);
    const inp = wrap.querySelector('input');
    let menu = null, act = 0, found = [];
    const close = () => { if (menu) { menu.remove(); menu = null; } };
    const mark = (text, words) => { let t = SM.esc(text); words.forEach((w) => { if (w.length > 1) t = t.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); }); return t; };
    const draw = () => {
      const q = inp.value.trim().toLowerCase();
      close();
      // без запроса — весь каталог по алфавиту (ничего не выделено, Enter не добавит случайный товар); запрос сужает список
      const words = q ? q.split(/\s+/) : [];
      if (!q && act === 0) act = -1;
      const all = SM.db.products.filter((p) => p.active).filter((p) => {
        if (!words.length) return true;
        const hay = SM.productHay(p);
        return words.every((w) => hay.includes(w));
      }).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      found = all.slice(0, PICK_MAX);
      const host = inline();
      menu = document.createElement('div');
      menu.className = host ? 'picker-menu picker-inline' : 'picker-menu';
      const pt = point();
      menu.innerHTML = found.length ? found.map((p, i) => {
        const av = pt ? SM.available(p.id, pt) : SM.available(p.id);
        const altHit = (p.alt || []).find((a) => words.every((w) => a.toLowerCase().includes(w)));
        return '<div class="picker-opt' + (i === act ? ' act' : '') + '" data-i="' + i + '">' + String(UI.thumb(p)) + '<div class="grow"><b>' + mark(p.name, words) + '</b><small>' + SM.esc(p.code) + (p.sku ? ' · арт. ' + mark(p.sku, words) : '') + ' · ' + SM.esc(SM.category(p.cat).name) + (altHit ? ' · «' + mark(altHit, words) + '»' : '') + ' · ' + SM.esc(F.cur(p.price, p.cur)) + '</small></div>' +
          (showStock ? '<div class="stock ' + (av <= 0 ? 'bad-t' : av <= (p.min || 0) ? 'warn-t' : 'ok-t') + '">' + av + ' ' + SM.esc(p.unit) + '<div class="muted fw-6">' + (pt ? 'на точке' : 'всего') + '</div></div>' : '') + '</div>';
      }).join('') + (all.length > found.length ? '<div class="csel-empty">' + SM.esc('Показаны первые ' + found.length + ' из ' + all.length + ' — уточните поиск') + '</div>' : '') : '<div class="csel-empty">Ничего не найдено. Ищем по части кода, названия, размера или по названию «как говорят клиенты»</div>';
      if (host) { host.innerHTML = ''; host.appendChild(menu); } else wrap.appendChild(menu);
      menu.addEventListener('mousedown', (e) => { const o = e.target.closest('.picker-opt'); if (o) { e.preventDefault(); pick(+o.dataset.i); } });
    };
    // после выбора фокус остаётся в поле, но список сам не открывается — откроется по вводу, нажатию на поле или ↓
    let quiet = false;
    const pick = (i) => { const p = found[i]; if (!p) return; const had = document.activeElement === inp; inp.value = ''; close(); act = 0; onPick(p); if (had || !inline()) { quiet = true; inp.focus(); quiet = false; } };
    inp.addEventListener('input', () => { act = 0; draw(); });
    inp.addEventListener('focus', () => { if (!quiet) draw(); });
    inp.addEventListener('click', () => { if (!menu) draw(); });
    inp.addEventListener('blur', () => setTimeout(() => { if (!inline()) close(); }, 150));
    inp.addEventListener('keydown', (e) => {
      if (!menu) { if (e.key === 'ArrowDown') { e.preventDefault(); draw(); } return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, Math.min(found.length - 1, act + (e.key === 'ArrowDown' ? 1 : -1))); UI.$$('.picker-opt', menu).forEach((o, k) => o.classList.toggle('act', k === act)); const a = menu.querySelector('.act'); if (a) a.scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter') { e.preventDefault(); pick(act); }
      if (e.key === 'Escape' && !inline()) close();
    });
    return { focus: () => inp.focus(), draw };
  };

  /* ---------- Список продаж ---------- */
  const STS = ['draft', 'await', 'partial', 'paid', 'ready', 'shipped', 'done', 'cancelled'];
  const stColor = (k) => { const c = SM.SALE_STATUS[k][1].replace('b-', ''); return 'var(--' + (c === 'accent' ? 'glow' : c) + ')'; };
  // кто может менять и удалять продажу
  SM.canEditSale = (s) => SM.can('sales', 2) && (s.state === 'draft' || (s.state === 'posted' && !s.shippedAt)) && (!SM.flag('ownOnly') || s.sellerId === SM.user.id);
  SM.canDeleteSale = (s) => SM.isAdmin() || SM.flag('cancelOps') || (SM.can('sales', 2) && s.state === 'draft' && (!SM.flag('ownOnly') || s.sellerId === SM.user.id));
  SM.deleteSaleAsk = async (s) => {
    const txt = s.state === 'draft' ? 'Черновик и резерв товара будут удалены.' : s.shippedAt ? 'Товар уже отгружен — остатки не изменятся. Оплаты, доставка и документы продажи тоже удалятся.' : 'Товар вернётся на склад, оплаты, доставка и документы этой продажи удалятся. Запись останется в истории операций.';
    if (!(await UI.confirmDelete('Удалить продажу ' + SM.saleNo(s) + '?', txt))) return false;
    SM.ops.deleteSale(s); UI.closeAll(); UI.toast('Продажа удалена', SM.saleNo(s) + ' · ' + SM.client(s.clientId).name, 'ok', { icon: 'trash' }); SM.refresh();
    return true;
  };
  function salesList(r) {
    const q = (r.q.q || '').toLowerCase(), st = r.q.st || '', pt = r.q.pt || '', sl = r.q.sl || '', p = r.q.p || 'all';
    const R = SM.periodRange(p);
    const base = SM.db.sales.filter((s) => SM.saleVisible(s) && D.inRange(s.date, R.from, R.to) && (!pt || s.pointId === pt) && (!sl || s.sellerId === sl) &&
      (!q || (SM.saleHay(s) + ' ' + SM.client(s.clientId).name + ' ' + SM.client(s.clientId).phone).toLowerCase().includes(q)));
    const cnt = {}; base.forEach((s) => { const k = SM.saleStatus(s); cnt[k] = (cnt[k] || 0) + 1; });
    const list = base.filter((s) => !st || SM.saleStatus(s) === st).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const total = list.filter((s) => s.state !== 'cancelled' && s.state !== 'draft').reduce((a, s) => a + SM.saleTotalUZS(s), 0);
    const seeSellers = !SM.flag('ownOnly');
    // статусы — одним выпадающим списком с количеством в каждом
    const stSel = html`<select class="select input-sm" data-filter="st" aria-label="Статус" style="width:auto;min-width:210px;flex:0 1 240px"><option value="" data-count="${base.length}">Все статусы</option>${STS.map((k) => html`<option value="${k}" data-dot="${stColor(k)}" data-count="${cnt[k] || 0}" ${st === k ? raw('selected') : ''}>${SM.SALE_STATUS[k][0]}</option>`)}</select>`;
    return html`
      ${UI.pageHead('Продажи', 'Оформление, оплата, сборка и отгрузка · ' + list.length + ' ' + F.plural(list.length, 'документ', 'документа', 'документов') + ' на ' + F.cur(total), html`
        <button class="btn btn-secondary" data-x="export">${I('download')}Excel</button>
        ${SM.can('sales', 2) ? html`<a class="btn btn-primary" href="#/sales/new">${I('plus')}Новая продажа</a>` : ''}`)}
      <div class="card">
        <div class="card-h">${UI.searchInput(r.q.q, '№ продажи, клиент, телефон')}${stSel}${SM.db.points.length > 1 ? UI.filterSelect('pt', pt, UI.pointOptions(), 'Все точки') : ''}${seeSellers ? UI.filterSelect('sl', sl, SM.db.users.filter((u) => u.role === 'seller' || u.role === 'admin').map((u) => [u.id, u.name]), 'Все продавцы') : ''}<span class="right">${UI.periodSeg(p)}</span></div>
        <div class="card-b" style="padding-top:12px">${list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Продажа</th><th>Клиент</th><th>Точка · продавец</th><th class="r">Сумма</th><th>Оплата</th><th>Статус</th><th></th></tr></thead><tbody>
          ${list.map((s) => { const c = SM.saleCalc(s); return html`<tr class="click ${SM.overdue(s) ? 'row-bad' : ''} ${s.state === 'cancelled' ? 'row-muted' : ''}" data-act="open-sale" data-id="${s.id}">
            <td><span class="cell-title">${SM.saleNo(s)} ${s.source === 'site' ? html`<span class="chip site">${I('globe')}сайт</span>` : ''}</span><span class="cell-sub">${F.date(s.date)}</span></td>
            <td><span class="cell-title">${SM.client(s.clientId).name}</span><span class="cell-sub">${SM.client(s.clientId).phone}</span></td>
            <td><span class="cell-title fw-6">${SM.point(s.pointId).name}</span><span class="cell-sub">${SM.user_(s.sellerId).name}</span></td>
            <td class="r nowrap"><b>${F.cur(c.total, s.cur)}</b>${s.cur === 'USD' ? html`<span class="cell-sub">≈ ${F.short(SM.saleTotalUZS(s))} сум</span>` : ''}</td>
            <td>${s.state === 'draft' || s.state === 'cancelled' ? html`<span class="muted">—</span>` : UI.badge(SM.payStatus(s))}${c.debt > 0 && s.state === 'posted' ? html`<span class="cell-sub ${SM.overdue(s) ? 'bad-t' : ''}">долг ${F.cur(c.debt, s.cur)}</span>` : ''}</td>
            <td>${UI.badge(SM.SALE_STATUS[SM.saleStatus(s)])}</td>
            <td class="td-act">${UI.actBtns(s.id, { edit: SM.canEditSale(s), del: SM.canDeleteSale(s), editTip: 'Изменить продажу', delTip: 'Удалить продажу' })}</td></tr>`; })}</tbody></table></div>` : UI.empty('Продаж не найдено', 'Измените фильтры или оформите новую продажу', 'cart')}</div>
      </div>`;
  }

  /* ---------- Форма продажи ---------- */
  function saleForm(r) {
    const editing = r.q.edit ? SM.db.sales.find((s) => s.id === r.q.edit && SM.canEditSale(s)) : null;
    const postedEdit = editing && editing.state === 'posted';
    return html`
      ${UI.pageHead(editing ? (postedEdit ? 'Изменение ' : 'Черновик ') + SM.saleNo(editing) : 'Новая продажа', postedEdit ? 'Продажа уже проведена: при сохранении старые товары вернутся на склад, новые спишутся' : 'Выберите клиента и точку, добавьте товары — остаток на точке виден сразу', html`<a class="btn btn-ghost" href="#/sales">${I('arrowLeft')}К списку</a>`)}
      <form id="saleForm" class="grid g-21" autocomplete="off" novalidate>
        <div class="stack">
          <div class="card"><div class="card-h"><h3>${I('user')}Клиент и точка</h3></div><div class="card-b">
            <div class="form-grid">
              <div class="field full"><label>Клиент <span class="req">*</span></label><div class="row nowrap"><div class="grow"><select class="select" name="clientId" data-title="Клиент"></select></div><button type="button" class="btn btn-secondary" data-x="new-client">${I('plus')}<span>Новый</span></button></div></div>
              <div class="field"><label>Магазин или склад <span class="req">*</span></label><select class="select" name="pointId"></select></div>
              <div class="field"><label>Дата</label><input class="input" type="date" name="date"></div>
            </div></div></div>
          <div class="card"><div class="card-h"><h3>${I('cart')}Товары</h3><span class="sub" id="lineCount"></span></div><div class="card-b">
            <div id="picker"></div>
            <div class="line-head mt-16"><span>Товар</span><span>Кол-во</span><span>Цена</span><span>Скидка %</span><span class="r">Сумма</span><span></span></div>
            <div class="lines mt-8" id="lines"></div>
            <div class="form-grid mt-16">
              <div class="field"><label>Комментарий</label><input class="input" name="comment" placeholder="Например: клиент заберёт после шиномонтажа"></div>
            </div></div></div>
          <div class="card"><div class="card-h"><h3>${I('wallet')}Оплата</h3><span class="sub">можно несколькими способами</span></div><div class="card-b">
            <div class="stack" style="gap:8px" id="pays"></div>
            <div class="row mt-12"><button type="button" class="btn btn-secondary btn-sm" data-x="add-pay">${I('plus')}Способ оплаты</button><button type="button" class="btn btn-ghost btn-sm" data-x="pay-all">Оплатить остаток</button></div>
            <div class="totals mt-12" id="payTotals"></div>
            ${SM.flag('credit') ? html`<hr class="divider"><label class="switch"><input type="checkbox" name="credit"><i></i>Продажа в долг</label><div class="field mt-12 hide" id="dueBox"><label>Оплатить до</label><input class="input" type="date" name="due"></div>` : ''}
            <p class="fs-12 muted mt-12">${SM.flag('confirmPay') ? 'Оплаты будут сразу подтверждены.' : 'Оплаты уйдут бухгалтеру на подтверждение (ТЗ 11.2).'}</p></div></div>
          <div class="card"><div class="card-h"><h3>${I('truck')}Получение</h3></div><div class="card-b">
            <div class="choice"><label><input type="radio" name="receive" value="pickup" checked><span>${I('store')}Самовывоз</span></label><label><input type="radio" name="receive" value="delivery"><span>${I('truck')}Доставка</span></label></div>
            <div class="field mt-12 hide" id="addrBox"><label>Адрес доставки</label><input class="input" name="address" placeholder="Адрес клиента"><span class="hint">После проведения создастся заявка в разделе «Доставка»</span></div></div></div>
        </div>
        <div class="stack" style="position:sticky;top:84px;align-self:start">
          <div class="card glass"><div class="card-h"><h3>${I('dollar')}Валюта и НДС</h3></div><div class="card-b">
            <div class="choice" role="radiogroup" aria-label="Валюта"><label><input type="radio" name="cur" value="UZS" checked><span>Сум</span></label><label><input type="radio" name="cur" value="USD"><span>$ США</span></label></div>
            <div class="form-grid mt-12"><div class="field"><label>Курс по форме оплаты</label><select class="select input-sm" name="rateType">${UI.options(Object.entries(SM.RATE_TYPES), 'cash')}</select></div>
              <div class="field"><label>Курс $ (сохранится в продаже)</label><input class="input input-sm num" name="rate" readonly></div></div>
            <div class="row nowrap mt-12" style="align-items:end;gap:16px"><label class="switch" style="margin-bottom:10px"><input type="checkbox" name="vat" ${SM.vatCfg().enabled ? 'checked' : ''}><i></i>НДС</label>
              <div class="field" style="flex:1"><label>НДС, %</label><input class="input input-sm num" type="number" name="vatRate" min="0" max="100" step="0.5" value="${SM.vatCfg().rate}" ${SM.vatCfg().enabled ? '' : 'disabled'}></div></div>
            <div class="field mt-12"><label>Скидка на весь документ, %</label><input class="input input-sm num" type="number" name="docDisc" min="0" max="${Math.min(100, SM.discountMax())}" step="0.5" value="0"><span class="hint">Ваш лимит скидки: ${SM.discountMax()}%</span></div>
            <hr class="divider"><div class="totals" id="totals"></div>
            ${postedEdit ? html`<div class="row mt-16"><button type="submit" class="btn btn-primary grow">${I('check')}Сохранить изменения</button></div><p class="fs-12 muted mt-8">Остатки пересчитаются автоматически, оплаты сохранятся.</p>` : html`<div class="row mt-16"><button type="button" class="btn btn-secondary grow" data-x="draft">${I('edit')}Черновик</button><button type="submit" class="btn btn-primary grow">${I('check')}Провести</button></div>
            <p class="fs-12 muted mt-8">Черновик резервирует товар. Проведение списывает его с точки.</p>`}</div></div>
            </div></div>
        </div>
      </form>`;
  }
  function mountSaleForm(el, r) {
    const form = UI.$('#saleForm', el);
    const editing = r.q.edit ? SM.db.sales.find((s) => s.id === r.q.edit && SM.canEditSale(s)) : null;
    const postedEdit = editing && editing.state === 'posted';
    const myPoints = SM.userPoints().filter((p) => SM.point(p).active);
    const st = editing ? { items: editing.items.map((l) => Object.assign({}, l)), pays: [] } : { items: [], pays: [] };
    const sel = (n) => form.querySelector('[name=' + n + ']');
    // клиенты: сначала свои
    const fillClients = (selId) => {
      const cl = SM.db.clients.filter((c) => c.kind !== 'supplier').slice().sort((a, b) => (b.sellerId === SM.user.id) - (a.sellerId === SM.user.id) || a.name.localeCompare(b.name));
      sel('clientId').innerHTML = String(UI.options(cl.map((c) => [c.id, c.name + (c.phone ? ' · ' + c.phone : '')]), selId, 'Выберите клиента'));
      sel('clientId').value = selId || '';
    };
    fillClients(editing ? editing.clientId : r.q.client || '');
    sel('pointId').innerHTML = String(UI.options(myPoints.map((p) => [p, SM.point(p).name]), editing ? editing.pointId : myPoints[0]));
    sel('date').value = editing ? editing.date : D.todayISO();
    if (editing) { sel('docDisc').value = editing.docDisc; sel('comment').value = editing.comment; form.querySelector('[name=cur][value=' + editing.cur + ']').checked = true; sel('rateType').value = editing.rateType; sel('vat').checked = editing.vat; const ev = SM.vatCfg(editing); sel('vatRate').value = ev.rate; }
    const vatOn = () => { sel('vatRate').disabled = !sel('vat').checked; };
    vatOn();
    UI.enhance(form);
    const cur = () => form.querySelector('[name=cur]:checked').value;
    const rate = () => SM.rate(sel('rateType').value);
    const pointId = () => sel('pointId').value;
    const syncRate = () => (sel('rate').value = F.num(rate()));
    syncRate();
    const fmtC = (v) => F.cur(v, cur());
    const priceIn = (p) => SM.conv(p.price, p.cur, cur(), rate());
    // ТЗ 9.3: снижение цены вручную — тоже скидка. Итог строки (цена, скидка строки и документа)
    // не может быть ниже «цена из карточки × (1 − лимит роли)»
    const minPrice = (pid) => priceIn(SM.product(pid)) * (1 - SM.discountMax() / 100);
    const effPrice = (l) => l.price * (1 - (l.disc || 0) / 100) * (1 - (+sel('docDisc').value || 0) / 100);
    // при редактировании черновика его собственный резерв не мешает
    const avail = (pid) => SM.available(pid, pointId()) + (editing && editing.pointId === pointId() ? editing.items.filter((l) => l.productId === pid).reduce((a, l) => a + l.qty, 0) : 0);

    // процент вводится руками: обрезаем в 0..max и пишем обратно в поле
    const clampPct = (inp, max) => { const v = +inp.value || 0, c = Math.min(Math.max(v, 0), max); if (c !== v) inp.value = c; return c; };
    // НДС этой продажи: ставка и режим из блока «Валюта и НДС». «Сверху» (по умолчанию) — итог вырос на %,
    // «в цене» — итог тот же, НДС выделяется из него; сохраняются в продаже (их же берут карточка и документы)
    // НДС вкл — сверху цены (Алексей 22.10, п.10); продажа, сохранённая раньше «в цене», так и считается
    const vatMode = () => (editing && SM.vatIncl(editing) ? 'included' : 'top');
    const vatCfgForm = () => ({ enabled: true, rate: clampPct(sel('vatRate'), 100), mode: vatMode() });
    const calc = () => {
      const fake = { items: st.items, docDisc: +sel('docDisc').value || 0, vat: sel('vat').checked, vatCfg: vatCfgForm(), cur: cur(), id: '__new' };
      const c = SM.saleCalc(fake);
      const paid = st.pays.reduce((a, p) => a + SM.conv(+p.amount || 0, SM.method(p.method).cur, cur(), SM.rate(SM.method(p.method).rate)), 0);
      return Object.assign(c, { paidNow: paid, rest: Math.max(0, c.total - paid) });
    };
    // предел суммы в строке оплаты: остаток к оплате (с учётом других строк и уже внесённых оплат) в валюте способа
    const already = () => (editing ? SM.saleCalc(editing).paid + SM.saleCalc(editing).pending : 0);
    const payMax = (i) => {
      const c = calc(), p = st.pays[i], m = SM.method(p.method);
      const others = st.pays.reduce((a, q, j) => (j === i ? a : a + SM.conv(+q.amount || 0, SM.method(q.method).cur, cur(), SM.rate(SM.method(q.method).rate))), 0);
      return Math.round(SM.conv(Math.max(0, c.total - already() - others), cur(), m.cur, SM.rate(m.rate)) * 100) / 100;
    };
    const syncPayMax = () => UI.$$('#pays [data-pk=amount]', el).forEach((inp) => UI.setMax(inp, payMax(+inp.closest('.pay-row').dataset.pi)));
    let picker = null;
    const drawLines = () => {
      const box = UI.$('#lines', el);
      UI.$('#lineCount', el).textContent = st.items.length ? st.items.length + ' поз. · ' + st.items.reduce((a, l) => a + (+l.qty || 0), 0) + ' ед.' : '';
      box.innerHTML = st.items.length ? st.items.map((l, i) => {
        const p = SM.product(l.productId), av = avail(l.productId), over = +l.qty > av;
        return String(html`<div class="line" data-i="${i}">
          <div class="ln-name"><b>${p.name}</b><small>${p.code} · <span class="ln-avail ${over ? 'bad-t' : 'ok-t'}">доступно ${av} ${p.unit}</span>${p.cur !== cur() ? html` · база ${F.cur(p.price, p.cur)}` : ''}</small></div>
          <div class="field"><label class="ln-cap">Кол-во</label><input class="input input-sm num ${over ? 'is-over' : ''}" type="number" min="1" step="1" data-k="qty" value="${l.qty}" aria-label="Количество"></div>
          <div class="field"><label class="ln-cap">Цена</label><input class="input input-sm" ${UI.moneyAttrs(null, cur() === 'USD' ? 2 : 0)} data-k="price" value="${UI.fmtInput(Math.round(l.price * 100) / 100, 2)}" aria-label="Цена"></div>
          <div class="field"><label class="ln-cap">Скидка %</label><input class="input input-sm num" type="number" min="0" max="100" step="0.5" data-k="disc" value="${l.disc || 0}" aria-label="Скидка, %"></div>
          <div class="ln-sum"><span class="ln-cap">Сумма</span><span data-sum>${fmtC(SM.lineSum(l))}</span></div>
          <button type="button" class="btn btn-icon btn-sm" data-del="${i}" aria-label="Убрать">${I('x')}</button></div>`);
      }).join('') : '';
      // пока товаров нет — вместо пустой таблицы сразу список каталога, поиск над ним сужает
      UI.$('.line-head', el).hidden = !st.items.length;
      if (!st.items.length && picker) picker.draw();
    };
    const drawTotals = () => {
      const c = calc();
      UI.$('#totals', el).innerHTML = String(html`
        <div class="row"><span>Сумма товаров</span><b>${fmtC(c.sub + c.lineDisc)}</b></div>
        ${c.lineDisc + c.docDisc > 0 ? html`<div class="row"><span>Скидки</span><b class="bad-t">−${fmtC(c.lineDisc + c.docDisc)}</b></div>` : ''}
        ${sel('vat').checked ? html`<div class="row"><span>Без НДС</span><b>${fmtC(c.net)}</b></div><div class="row"><span>${vatMode() === 'included' ? 'в т.ч. НДС' : 'НДС'} ${vatCfgForm().rate}%</span><b>${fmtC(c.vat)}</b></div>` : ''}
        <div class="row grand"><span>Итого</span><b>${fmtC(c.total)}</b></div>
        ${cur() === 'USD' ? html`<div class="row"><span>В сумах по курсу ${F.num(rate())}</span><b>${F.cur(c.total * rate())}</b></div>` : ''}`);
      UI.$('#payTotals', el).innerHTML = String(html`<div class="row"><span>Оплачено сейчас</span><b class="ok-t">${fmtC(c.paidNow)}</b></div><div class="row"><span>${sel('credit') && sel('credit').checked ? 'В долг' : 'Остаток'}</span><b class="${c.rest > c.eps ? 'warn-t' : 'ok-t'}">${fmtC(c.rest)}</b></div>`);
      syncPayMax();
    };
    const drawPays = () => {
      const box = UI.$('#pays', el);
      box.innerHTML = st.pays.length ? st.pays.map((p, i) => String(html`<div class="pay-row" data-pi="${i}">
        <select class="select input-sm" data-pk="method" aria-label="Способ оплаты">${UI.options(SM.methods().map((m) => [m.id, m.name]), p.method)}</select>
        <input class="input input-sm" ${UI.moneyAttrs(payMax(i), SM.method(p.method).cur === 'USD' ? 2 : 0)} data-pk="amount" value="${p.amount ? UI.fmtInput(p.amount, 2) : ''}" placeholder="Сумма" aria-label="Сумма">
        <span class="fs-12 fw-7 muted">${SM.method(p.method).cur === 'USD' ? '$' : 'сум'}</span>
        <button type="button" class="btn btn-icon btn-sm" data-pdel="${i}" aria-label="Убрать">${I('x')}</button></div>`)).join('') : '<p class="muted fs-13">Оплата не указана — продажа будет ждать оплаты.</p>';
      UI.enhance(box);
    };
    const redraw = () => { drawLines(); drawTotals(); };

    picker = SM.productPicker(UI.$('#picker', el), { point: pointId, inline: () => (st.items.length ? null : UI.$('#lines', el)), onPick: (p) => {
      const ex = st.items.find((l) => l.productId === p.id);
      if (ex) ex.qty = +ex.qty + 1; else st.items.push({ productId: p.id, qty: 1, price: Math.round(priceIn(p) * 100) / 100, disc: 0 });
      if (avail(p.id) <= 0) UI.toast('Нет в наличии на точке', p.name + ' — доступно 0. Выберите другую точку или сделайте перемещение', 'warn');
      redraw();
    } });
    UI.$('#lines', el).addEventListener('input', (e) => {
      const k = e.target.dataset.k; if (!k) return;
      const row = e.target.closest('.line'), l = st.items[+row.dataset.i];
      l[k] = k === 'price' ? UI.num(e.target.value) : +e.target.value || 0;
      if (k === 'disc') l.disc = clampPct(e.target, 100);
      if (k === 'disc' && l.disc > SM.discountMax()) { l.disc = SM.discountMax(); e.target.value = l.disc; UI.toast('Скидка ограничена', 'Ваш лимит — ' + SM.discountMax() + '% (настраивается по ролям)', 'warn'); }
      row.querySelector('[data-sum]').textContent = fmtC(SM.lineSum(l));
      if (k === 'qty') { const av = avail(l.productId); row.querySelector('.ln-avail').className = 'ln-avail ' + (l.qty > av ? 'bad-t' : 'ok-t'); }
      drawTotals();
    });
    // цену проверяем, когда ввод закончен (иначе первая цифра сразу упрётся в минимум)
    UI.$('#lines', el).addEventListener('change', (e) => {
      if (e.target.dataset.k !== 'price') return;
      const row = e.target.closest('.line'), l = st.items[+row.dataset.i], min = minPrice(l.productId);
      if (l.price >= min - calc().eps) return;
      l.price = Math.ceil(min * 100) / 100; UI.setMoney(e.target, l.price);
      row.querySelector('[data-sum]').textContent = fmtC(SM.lineSum(l)); drawTotals();
      UI.toast('Цена ограничена', 'Ниже ' + fmtC(min) + ' — это скидка больше вашего лимита ' + SM.discountMax() + '%', 'warn');
    });
    UI.$('#lines', el).addEventListener('click', (e) => { const d = e.target.closest('[data-del]'); if (d) { st.items.splice(+d.dataset.del, 1); redraw(); } });
    UI.$('#pays', el).addEventListener('input', (e) => { const k = e.target.dataset.pk; if (k === 'amount') { st.pays[+e.target.closest('.pay-row').dataset.pi].amount = UI.num(e.target.value); drawTotals(); syncPayMax(); } });
    UI.$('#pays', el).addEventListener('change', (e) => { const k = e.target.dataset.pk; if (k === 'method') { st.pays[+e.target.closest('.pay-row').dataset.pi].method = e.target.value; drawPays(); drawTotals(); } });
    UI.$('#pays', el).addEventListener('click', (e) => { const d = e.target.closest('[data-pdel]'); if (d) { st.pays.splice(+d.dataset.pdel, 1); drawPays(); drawTotals(); } });
    form.querySelector('[data-x=add-pay]').onclick = () => { const c = calc(); const m = SM.methods()[0]; st.pays.push({ method: m.id, amount: Math.round(SM.conv(Math.max(0, c.rest - already()), cur(), m.cur, SM.rate(m.rate)) * 100) / 100 || '' }); drawPays(); drawTotals(); };
    form.querySelector('[data-x=pay-all]').onclick = () => {
      const c = calc();
      if (c.rest - already() <= c.eps) return;
      if (!st.pays.length) st.pays.push({ method: SM.methods()[0].id, amount: 0 });
      const p = st.pays[st.pays.length - 1], m = SM.method(p.method);
      p.amount = Math.round(((+p.amount || 0) + SM.conv(c.rest - already(), cur(), m.cur, SM.rate(m.rate))) * 100) / 100;
      drawPays(); drawTotals();
    };
    // смена валюты или курса — цены строк пересчитываются
    let prevCur = cur(), prevRate = rate();
    const reprice = () => { const nc = cur(), nr = rate(); st.items.forEach((l) => { const base = SM.conv(l.price, prevCur, 'UZS', prevRate); l.price = Math.round(SM.conv(base, 'UZS', nc, nr) * 100) / 100; }); prevCur = nc; prevRate = nr; syncRate(); redraw(); };
    form.querySelectorAll('[name=cur]').forEach((x) => x.addEventListener('change', reprice));
    sel('rateType').addEventListener('change', reprice);
    sel('pointId').addEventListener('change', drawLines);
    sel('vat').addEventListener('change', () => { vatOn(); drawTotals(); });
    sel('vatRate').addEventListener('input', drawTotals);
    sel('docDisc').addEventListener('input', () => { clampPct(sel('docDisc'), 100); if (+sel('docDisc').value > SM.discountMax()) { sel('docDisc').value = SM.discountMax(); UI.toast('Скидка ограничена', 'Ваш лимит — ' + SM.discountMax() + '%', 'warn'); } drawTotals(); });
    if (sel('credit')) sel('credit').addEventListener('change', () => { UI.$('#dueBox', el).classList.toggle('hide', !sel('credit').checked); if (!sel('due').value) sel('due').value = D.iso(D.addDays(D.today(), 14)); drawTotals(); });
    form.querySelectorAll('[name=receive]').forEach((x) => x.addEventListener('change', () => { const dlv = form.querySelector('[name=receive]:checked').value === 'delivery'; UI.$('#addrBox', el).classList.toggle('hide', !dlv); if (dlv && !sel('address').value) sel('address').value = SM.client(sel('clientId').value).address || ''; }));
    if (editing) { form.querySelector('[name=receive][value=' + editing.receive + ']').checked = true; if (editing.receive === 'delivery') UI.$('#addrBox', el).classList.remove('hide'); if (sel('credit') && editing.credit) { sel('credit').checked = true; UI.$('#dueBox', el).classList.remove('hide'); sel('due').value = editing.due || ''; } }
    form.querySelector('[data-x=new-client]').onclick = () => SM.clientForm(null, (c) => { fillClients(c.id); UI.enhance(form); });
    drawPays(); redraw();

    const submit = (post) => {
      const d = UI.formData(form);
      if (!d.clientId) return UI.invalid(form, 'clientId', 'Выберите клиента или создайте нового');
      if (!st.items.length) return UI.toast('Добавьте товары', 'В продаже нет ни одной позиции', 'warn');
      if (st.items.some((l) => !(l.qty > 0) || !(l.price > 0))) return UI.toast('Проверьте строки', 'Количество и цена должны быть больше нуля', 'warn');
      const c = calc();
      if (postedEdit) post = true; // проверки как при проведении
      const cheap = st.items.find((l) => effPrice(l) < minPrice(l.productId) - c.eps);
      if (cheap) return UI.toast('Скидка больше лимита', SM.product(cheap.productId).name + ': с учётом цены и скидки на документ — не больше ' + SM.discountMax() + '%', 'bad');
      if (post) {
        const over = st.items.find((l) => l.qty > avail(l.productId));
        if (over) return UI.toast('Не хватает товара', SM.product(over.productId).name + ': доступно ' + avail(over.productId), 'bad');
        if (c.paidNow > c.total + c.eps) return UI.toast('Оплата больше суммы', 'Уменьшите сумму оплаты', 'warn');
        if (c.rest > c.eps && st.pays.length && !d.credit && !confirm('Оплата меньше суммы продажи. Провести как частично оплаченную?')) return;
      }
      const s = SM.ops.saveSale({ id: editing ? editing.id : null, date: d.date, clientId: d.clientId, pointId: d.pointId, items: st.items, docDisc: d.docDisc, cur: cur(), rateType: d.rateType, rate: rate(), vat: d.vat, vatCfg: vatCfgForm(),
        receive: d.receive, address: d.address, credit: !!d.credit, due: d.due, comment: d.comment, payments: post || postedEdit ? st.pays : [] }, post && !postedEdit);
      UI.toast(postedEdit ? 'Продажа изменена' : post ? 'Продажа оформлена' : 'Черновик сохранён', SM.saleNo(s) + (postedEdit ? ' · остатки пересчитаны' : post ? ' · товар списан с точки' : ' · товар зарезервирован'), 'ok', { icon: 'cart' });
      location.hash = '#/sales/' + s.id;
    };
    form.onsubmit = (e) => { e.preventDefault(); submit(true); };
    form.querySelector('[data-x=draft]').onclick = () => submit(false);
  }

  /* ---------- Карточка продажи ---------- */
  SM.openSale = function (id) {
    const s = SM.db.sales.find((x) => x.id === id);
    if (!s) return UI.toast('Продажа не найдена', '', 'warn');
    // прямая ссылка не открывает чужую продажу (ТЗ 3.3: продавец видит свои продажи)
    if (!SM.saleVisible(s)) return UI.toast('Нет доступа к продаже', SM.saleNo(s) + ' оформлена другим продавцом или на другой точке', 'warn');
    const c = SM.saleCalc(s), stt = SM.saleStatus(s), cl = SM.client(s.clientId);
    const dlv = SM.db.deliveries.find((x) => x.saleId === s.id);
    const fl = ['draft', 'await', 'paid', 'ready', 'shipped', 'done'];
    const at = stt === 'partial' ? 1 : fl.indexOf(stt);
    const fmtC = (v) => F.cur(v, s.cur);
    const canPay = s.state === 'posted' && c.debt > 0 && (SM.can('sales', 2) || SM.can('cash', 2));
    const body = html`
      ${stt === 'cancelled' ? html`<div class="note-box bad mb-16">${I('x')}<div><b>Отменена.</b> ${s.cancelReason || ''} · ${F.dt(s.cancelledAt)}</div></div>` : html`<div class="steps mb-16">${['Черновик', 'Оплата', 'Оплачено', 'Собрано', 'Отгружено', 'Завершено'].map((t, i) => html`<div class="st ${i < at || stt === 'done' ? 'done' : i === at ? 'cur' : ''}"><i></i>${t}</div>`)}</div>`}
      ${SM.overdue(s) ? html`<div class="note-box bad mb-16">${I('alert')}<div>Просрочена оплата: долг ${fmtC(c.debt)}, срок был ${F.date(s.due)}</div></div>` : ''}
      ${s.state !== 'draft' ? html`<div class="row mb-16 sale-docs">${['invoice', 'receipt', 'waybill', 'facture', 'noprice'].map((t) => html`<button class="btn btn-secondary btn-sm" data-doc="${t}">${I('file')}${SM.DOC_TYPES[t].name}</button>`)}</div>` : ''}
      <div class="totals sale-sum mb-16">
        <div class="sale-sum-k"><div><span>Итого</span><b>${fmtC(c.total)}</b></div><div><span>Оплачено</span><b class="ok-t">${fmtC(c.paid)}</b></div><div><span>Долг</span><b class="${c.debt > 0 ? 'bad-t' : 'ok-t'}">${fmtC(c.debt)}</b></div></div>
        ${c.lineDisc + c.docDisc > 0 ? html`<div class="row"><span>Скидки${s.docDisc ? ' (на документ ' + s.docDisc + '%)' : ''}</span><b class="bad-t">−${fmtC(c.lineDisc + c.docDisc)}</b></div>` : ''}
        ${s.vat && SM.vatCfg(s).enabled ? html`<div class="row"><span>Без НДС</span><b>${fmtC(c.net)}</b></div><div class="row"><span>${SM.vatIncl(s) ? 'в т.ч. НДС' : 'НДС'} ${SM.vatCfg(s).rate}%</span><b>${fmtC(c.vat)}</b></div>` : ''}
        ${c.pending > 0 ? html`<div class="row"><span>На проверке у бухгалтера</span><b class="warn-t">${fmtC(c.pending)}</b></div>` : ''}
      </div>
      <dl class="dl dl-2 mb-16 sale-req">
        <dt>Клиент</dt><dd><a href="#" data-act="open-client" data-id="${cl.id}">${cl.name}</a>${cl.phone ? html`<div class="fs-12 muted">${cl.phone}</div>` : ''}</dd>
        <dt>Продавец</dt><dd>${SM.user_(s.sellerId).name}</dd>
        <dt>Точка</dt><dd>${SM.point(s.pointId).name}</dd>
        <dt>Дата</dt><dd>${F.date(s.date)}${s.source === 'site' ? html` <span class="chip site">${I('globe')}заказ с сайта</span>` : ''}</dd>
        <dt>Валюта и курс</dt><dd>${s.cur === 'USD' ? 'Доллары США' : 'Сумы'} · $ = ${F.num(s.rate)} (${SM.RATE_TYPES[s.rateType] || 'наличный'})</dd>
        <dt>Получение</dt><dd>${SM.RECEIVE[s.receive]}${dlv ? html` · <a href="#/delivery?open=${dlv.id}">${dlv.no}</a> ${UI.badge(SM.DELIVERY_STATUS[dlv.status])}` : ''}</dd>
        ${s.credit && s.due ? html`<dt>В долг до</dt><dd class="${SM.overdue(s) ? 'bad-t' : ''}">${F.date(s.due)}</dd>` : ''}
        ${s.comment ? html`<dt>Комментарий</dt><dd>${s.comment}</dd>` : ''}
      </dl>
      <div class="section-t">Товары</div>
      <div class="table-wrap"><table class="table compact"><thead><tr><th>Товар</th><th class="r">Кол-во</th><th class="r">Цена</th><th class="r">Скидка</th><th class="r">Сумма</th></tr></thead><tbody>
        ${s.items.map((l) => { const p = SM.product(l.productId); return html`<tr><td><span class="cell-title">${p.name}</span><span class="cell-sub">${p.code}</span></td><td class="r">${l.qty} ${p.unit}</td><td class="r nowrap">${fmtC(l.price)}</td><td class="r">${l.disc ? l.disc + '%' : '—'}</td><td class="r nowrap fw-8">${fmtC(SM.lineSum(l))}</td></tr>`; })}</tbody></table></div>
      <div class="section-t">Оплаты</div>
      ${c.pays.length ? html`<ul class="list">${c.pays.map((p) => html`<li><span class="note-ic ${p.status === 'confirmed' ? 'ok' : p.status === 'pending' ? 'warn' : 'bad'}">${I(SM.method(p.method).icon)}</span><div class="grow"><b class="fs-13">${F.cur(p.amount, p.cur)} · ${SM.method(p.method).name}</b><div class="fs-12 muted">${F.dt(p.at)} · ${SM.user_(p.by).name}${p.cur !== s.cur ? ' · курс ' + F.num(p.rate) : ''}${p.note ? ' · ' + p.note : ''}${p.comment ? ' · ' + p.comment : ''}</div></div>
        ${p.status === 'pending' && SM.flag('confirmPay') ? html`<button class="btn btn-ok btn-sm" data-pay-ok="${p.id}">${I('check')}Подтвердить</button><button class="btn btn-danger btn-sm" data-pay-no="${p.id}">${I('x')}</button>` : UI.badge(SM.PAY_STATUS[p.status])}</li>`)}</ul>` : html`<p class="muted fs-13">Оплат нет${s.credit ? ' — продажа в долг' : ''}</p>`}
      <div class="section-t">История</div>
      <ul class="timeline">${s.history.slice().reverse().map((h, i) => html`<li class="${i === 0 ? 'on' : ''}"><b>${h.text}</b><small>${F.dt(h.at)} · ${SM.user_(h.uid).name}</small></li>`)}</ul>`;
    const btn = [];
    if (SM.canEditSale(s)) btn.push(html`<a class="btn ${s.state === 'draft' ? 'btn-primary' : 'btn-secondary'}" href="#/sales/new?edit=${s.id}">${I('edit')}${s.state === 'draft' ? 'Открыть черновик' : 'Изменить'}</a>`);
    if (canPay) btn.push(html`<button class="btn btn-primary" data-x="pay">${I('wallet')}Принять оплату</button>`);
    if (SM.flag('ship') && SM.canReady(s)) btn.push(html`<button class="btn btn-soft" data-x="ready">${I('box')}Собрано</button>`);
    if (SM.flag('ship') && s.state === 'posted' && s.readyAt && !s.shippedAt) btn.push(html`<button class="btn btn-primary" data-x="ship">${I('truck')}Отгрузить</button>`);
    if (s.state === 'posted' && s.shippedAt && (c.debt === 0 || s.credit) && (SM.flag('ship') || SM.isAdmin() || SM.can('sales', 2))) btn.push(html`<button class="btn btn-ok" data-x="done">${I('check')}Завершить</button>`);
    if (s.state === 'posted' && (SM.flag('cancelOps') || SM.isAdmin())) btn.push(html`<button class="btn btn-ghost" data-x="cancel">${I('undo')}Отменить</button>`);
    if (SM.canDeleteSale(s)) btn.push(html`<button class="btn btn-danger" data-x="delete">${I('trash')}Удалить</button>`);
    // этап, оплата, отгрузка — без повторов («Оплачено» синим этапом и зелёной оплатой — один бейдж)
    const tags = [SM.SALE_STATUS[stt], SM.payStatus(s)].concat(s.state !== 'draft' && s.state !== 'cancelled' ? [SM.shipStatus(s)] : []).filter((b, i, a) => b[0] !== '—' && a.findIndex((x) => x[0] === b[0]) === i);
    const dr = UI.drawer({ title: 'Продажа ' + SM.saleNo(s), sub: F.cur(c.total, s.cur) + ' · ' + cl.name, head: html`<span class="note-ic accent">${I('cart')}</span>`, body: html`<div class="row mb-16">${tags.map((b) => UI.badge(b))}</div>${body}`, foot: btn.length ? html`${btn}` : null, size: 'wide' });
    SM.trackDrawer(SM.openSale, [id], dr, '#/sales');
    const on = (sel, fn) => { const b = dr.querySelector(sel); if (b) b.onclick = fn; };
    on('[data-x=ready]', () => { SM.ops.saleReady(s); UI.toast('Собрано', SM.saleNo(s) + ' готово к отгрузке', 'ok', { icon: 'box' }); SM.refresh(); });
    on('[data-x=ship]', () => { SM.ops.saleShip(s); UI.toast('Отгружено', SM.saleNo(s), 'ok', { icon: 'truck' }); SM.refresh(); });
    on('[data-x=done]', () => { SM.ops.saleDone(s); UI.toast('Продажа завершена', SM.saleNo(s)); SM.refresh(); });
    on('[data-x=pay]', () => SM.payModal({ sale: s }));
    on('[data-x=delete]', () => SM.deleteSaleAsk(s));
    on('[data-x=cancel]', async () => {
      const why = await UI.prompt(s.state === 'draft' ? 'Удалить черновик ' + SM.saleNo(s) + '?' : 'Отменить продажу ' + SM.saleNo(s) + '?', s.state === 'draft' ? 'Резерв товара снимется.' : s.shippedAt ? 'Товар уже отгружен — остатки не изменятся, оформите возврат отдельно.' : 'Товар вернётся на точку корректирующей записью. Документ не удаляется (ТЗ 21).', { ok: 'Отменить', danger: true });
      if (!why) return;
      SM.ops.saleCancel(s, why); UI.toast('Продажа отменена', SM.saleNo(s) + ' · товар возвращён на склад', 'warn', { icon: 'undo' }); SM.refresh();
    });
    UI.$$('[data-pay-ok]', dr).forEach((b) => (b.onclick = () => { SM.ops.confirmPayment(b.dataset.payOk, true); UI.toast('Оплата подтверждена', 'Статус продажи обновлён', 'ok', { icon: 'wallet' }); SM.refresh(); }));
    UI.$$('[data-pay-no]', dr).forEach((b) => (b.onclick = async () => { const why = await UI.prompt('Отклонить оплату?', 'Деньги не поступили или сумма не совпадает', { ok: 'Отклонить', danger: true }); if (!why) return; SM.ops.confirmPayment(b.dataset.payNo, false, why); UI.toast('Оплата отклонена', why, 'warn'); SM.refresh(); }));
    UI.$$('[data-doc]', dr).forEach((b) => (b.onclick = () => SM.docFromSale && SM.docFromSale(b.dataset.doc, s)));
  };

  /* ---------- Приём оплаты / погашение долга (ТЗ 11.1, 13) ---------- */
  SM.payModal = function ({ sale, clientId, dir = 'in' }) {
    const cid = sale ? sale.clientId : clientId;
    const cl = SM.client(cid);
    // предел: долг без оплат, которые уже ждут проверки бухгалтера
    const debt = sale ? Math.max(0, SM.saleCalc(sale).debt - SM.saleCalc(sale).pending) : Math.abs(SM.balance(cid));
    const debtCur = sale ? sale.cur : 'UZS';
    const out = dir === 'out';
    const m = UI.modal({ title: out ? 'Оплата поставщику' : sale ? 'Оплата по ' + SM.saleNo(sale) : 'Погашение задолженности', sub: cl.name + ' · ' + (out ? 'мы должны ' : 'долг ') + F.cur(debt, debtCur),
      body: html`<form class="form-grid" autocomplete="off">
        <div class="field"><label>Способ</label><select class="select" name="method">${UI.options(SM.methods().map((x) => [x.id, x.name]), out ? 'bank' : 'cash_uzs')}</select></div>
        <div class="field"><label>Сумма <span class="req">*</span></label><div class="input-suffix"><input class="input" name="amount" ${UI.moneyAttrs(0)} autofocus><em data-cur>сум</em></div><span class="hint" data-hint></span></div>
        <div class="field full"><label>Комментарий</label><input class="input" name="note" placeholder="Номер платёжки, чека…"></div>
        <p class="full fs-12 muted">${SM.flag('confirmPay') ? 'Операция будет сразу подтверждена.' : 'Оплата уйдёт бухгалтеру на подтверждение.'} Курс $ берётся текущий и сохраняется в операции.</p></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Провести</button>` });
    const f = m.querySelector('form');
    const sync = () => {
      const me = SM.method(f.method.value), full = Math.round(SM.conv(debt, debtCur, me.cur, SM.rate(me.rate)) * 100) / 100;
      m.querySelector('[data-cur]').textContent = me.cur === 'USD' ? '$' : 'сум';
      // больше долга ввести нельзя (ТЗ 13): поле само остановится на пределе
      f.amount.dataset.dec = me.cur === 'USD' ? 2 : 0;
      UI.setMax(f.amount, full);
      if (UI.num(f.amount.value) > full) UI.setMoney(f.amount, full);
      m.querySelector('[data-hint]').innerHTML = (out ? 'Мы должны: ' : 'Весь долг: ') + '<a href="#" data-full>' + SM.esc(F.cur(full, me.cur)) + '</a> · больше ввести нельзя';
      m.querySelector('[data-full]').onclick = (e) => { e.preventDefault(); UI.setMoney(f.amount, full); };
    };
    f.method.addEventListener('change', sync); sync();
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f);
      const amount = UI.num(d.amount);
      if (!(debt > 0)) return UI.invalid(f, 'amount', 'Долга нет — платить нечего');
      if (!(amount > 0)) return UI.invalid(f, 'amount', 'Введите сумму');
      if (!sale && !out) SM.ops.repayDebt(cid, { method: d.method, amount, note: d.note });
      else SM.ops.addPayment(sale || null, { method: d.method, amount, note: d.note, clientId: cid, dir });
      UI.closeTop();
      UI.toast(SM.flag('confirmPay') ? (out ? 'Оплата поставщику проведена' : 'Оплата принята') : 'Оплата отправлена бухгалтеру', F.cur(amount, SM.method(d.method).cur) + ' · ' + cl.name, SM.flag('confirmPay') ? 'ok' : 'info', { icon: out ? 'send' : 'wallet' });
      SM.refresh();
    };
  };

  /* ---------- Контрагенты (ТЗ 12) ---------- */
  SM.clientForm = function (c, after) {
    c = c || { kind: 'client', type: 'person', sellerId: SM.user.role === 'seller' ? SM.user.id : '' };
    const sellers = SM.db.users.filter((u) => u.role === 'seller' || u.role === 'admin').map((u) => [u.id, u.name]);
    const m = UI.modal({ title: c.id ? 'Карточка: ' + c.name : c.kind === 'supplier' ? 'Новый поставщик' : 'Новый клиент или контрагент', size: 'wide',
      body: html`<form class="form-grid" autocomplete="off">
        <div class="field"><label>Вид</label><select class="select" name="kind">${UI.options([['client', 'Клиент (покупатель)'], ['supplier', 'Поставщик'], ['both', 'Клиент и поставщик']], c.kind)}</select></div>
        <div class="field"><label>Тип лица</label><div class="choice"><label><input type="radio" name="type" value="person" ${c.type !== 'legal' ? 'checked' : ''}><span>${I('user')}Физлицо</span></label><label><input type="radio" name="type" value="legal" ${c.type === 'legal' ? 'checked' : ''}><span>${I('bank')}Юрлицо / ИП</span></label></div></div>
        <div class="field full"><label>Название или Ф.И.О. <span class="req">*</span></label><input class="input" name="name" value="${c.name || ''}" autofocus></div>
        <div class="field"><label>Контактное лицо</label><input class="input" name="contact" value="${c.contact || ''}"></div>
        <div class="field"><label>Телефон <span class="req">*</span></label><input class="input" name="phone" value="${c.phone || ''}" placeholder="+998 __ ___-__-__" inputmode="tel"></div>
        <div class="field full"><label>Адрес</label><input class="input" name="address" value="${c.address || ''}"></div>
        <div class="field legal"><label>ИНН</label><input class="input" name="inn" value="${c.inn || ''}" inputmode="numeric"></div>
        <div class="field legal"><label>Банк</label><input class="input" name="bank" value="${c.bank || ''}"></div>
        <div class="field legal"><label>МФО</label><input class="input" name="mfo" value="${c.mfo || ''}" inputmode="numeric"></div>
        <div class="field legal"><label>Расчётный счёт</label><input class="input" name="account" value="${c.account || ''}" inputmode="numeric"></div>
        <div class="field"><label>Ответственный продавец</label><select class="select" name="sellerId">${UI.options(sellers, c.sellerId, 'Не назначен')}</select></div>
        <div class="field"><label>Комментарий</label><input class="input" name="comment" value="${c.comment || ''}"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Сохранить</button>` });
    const f = m.querySelector('form');
    const legal = () => UI.$$('.legal', f).forEach((x) => (x.style.display = f.querySelector('[name=type]:checked').value === 'legal' ? '' : 'none'));
    f.querySelectorAll('[name=type]').forEach((x) => x.addEventListener('change', legal)); legal();
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f);
      if (!d.name) return UI.invalid(f, 'name', 'Укажите название или Ф.И.О.');
      if (!d.phone) return UI.invalid(f, 'phone', 'Укажите телефон');
      const dup = SM.db.clients.find((x) => x.id !== c.id && (x.phone.replace(/\D/g, '') === d.phone.replace(/\D/g, '') || (d.inn && x.inn && x.inn.replace(/\D/g, '') === d.inn.replace(/\D/g, ''))));
      if (dup && !confirm('Похожий контрагент уже есть: ' + dup.name + '. Всё равно сохранить?')) return;
      const saved = SM.ops.saveClient(Object.assign({ id: c.id }, d));
      UI.closeTop(); UI.toast(c.id ? 'Контрагент изменён' : 'Контрагент создан', saved.name, 'ok', { icon: 'users' });
      if (after) after(saved); else SM.refresh();
    };
  };
  SM.openClient = function (id) {
    const c = SM.client(id);
    const L = SM.ledger(id);
    const sales = SM.db.sales.filter((s) => s.clientId === id && SM.saleVisible(s)).slice().reverse();
    const pays = SM.db.payments.filter((p) => p.clientId === id).slice().reverse();
    const docs = SM.db.documents.filter((d) => d.clientId === id).slice().reverse();
    const b = L.balance;
    const body = html`
      <div class="grid g-3 keep-2">
        <div class="cash-acc"><span>${I('scale')}Сальдо</span><b class="${b > 0.5 ? 'bad-t' : b < -0.5 ? 'warn-t' : 'ok-t'}">${F.cur(Math.abs(b))}</b><div class="fs-12 muted fw-7">${b > 0.5 ? 'должен нам' : b < -0.5 ? 'мы должны' : 'расчёты закрыты'}</div></div>
        <div class="cash-acc"><span>${I('cart')}Продажи</span><b>${sales.filter((s) => s.state !== 'draft' && s.state !== 'cancelled').length}</b><div class="fs-12 muted fw-7">на ${F.short(SM.sumUZS(sales.filter((s) => s.state === 'posted' || s.state === 'done')))} сум</div></div>
        <div class="cash-acc"><span>${I('history')}Начальный остаток</span><b>${F.short(L.opening)}</b><div class="fs-12 muted fw-7">перенос из старой программы</div></div>
      </div>
      <div class="section-t">Карточка</div>
      <dl class="dl">
        <dt>Вид</dt><dd>${{ client: 'Клиент', supplier: 'Поставщик', both: 'Клиент и поставщик' }[c.kind]} · ${c.type === 'legal' ? 'юрлицо / ИП' : 'физлицо'}</dd>
        ${c.contact ? html`<dt>Контакт</dt><dd>${c.contact}</dd>` : ''}
        <dt>Телефон</dt><dd><a href="tel:${String(c.phone).replace(/[^\d+]/g, '')}">${c.phone}</a></dd>
        ${c.address ? html`<dt>Адрес</dt><dd>${c.address}</dd>` : ''}
        ${c.inn ? html`<dt>Реквизиты</dt><dd>ИНН ${c.inn}<div class="fs-12 muted">${c.bank}, МФО ${c.mfo}, р/с ${c.account}</div></dd>` : ''}
        <dt>Ответственный</dt><dd>${c.sellerId ? SM.user_(c.sellerId).name : '—'}</dd>
        ${c.comment ? html`<dt>Комментарий</dt><dd>${c.comment}</dd>` : ''}
      </dl>
      <div class="section-t">Продажи</div>
      ${sales.length ? html`<ul class="list">${sales.slice(0, 8).map((s) => html`<li class="click" data-act="open-sale" data-id="${s.id}"><div class="grow"><b class="fs-13">${SM.saleNo(s)} · ${F.cur(SM.saleCalc(s).total, s.cur)}</b><div class="fs-12 muted">${F.date(s.date)} · ${SM.point(s.pointId).name}</div></div>${UI.badge(SM.SALE_STATUS[SM.saleStatus(s)])}</li>`)}</ul>` : html`<p class="muted fs-13">Продаж нет</p>`}
      <div class="section-t">Оплаты</div>
      ${pays.length ? html`<ul class="list">${pays.slice(0, 8).map((p) => html`<li><span class="note-ic ${p.dir === 'in' ? 'ok' : 'warn'}">${I(SM.method(p.method).icon)}</span><div class="grow"><b class="fs-13">${p.dir === 'in' ? '' : '−'}${F.cur(p.amount, p.cur)} · ${SM.method(p.method).name}</b><div class="fs-12 muted">${F.dt(p.at)}${p.note ? ' · ' + p.note : ''}</div></div>${UI.badge(SM.PAY_STATUS[p.status])}</li>`)}</ul>` : html`<p class="muted fs-13">Оплат нет</p>`}
      ${docs.length ? html`<div class="section-t">Документы</div><ul class="list">${docs.map((d) => html`<li class="click" data-href="#/documents?open=${d.id}"><span class="note-ic">${I('file')}</span><div class="grow"><b class="fs-13">${SM.DOC_TYPES[d.type].name} ${d.no}</b><div class="fs-12 muted">${F.date(d.date)}</div></div></li>`)}</ul>` : ''}`;
    const btn = [];
    if (SM.can('debts')) btn.push(html`<button class="btn btn-secondary" data-x="act">${I('file')}Акт сверки</button>`);
    if (b > 0.5 && (SM.can('debts', 2) || SM.can('sales', 2))) btn.push(html`<button class="btn btn-primary" data-x="pay">${I('wallet')}Погасить долг</button>`);
    if (b < -0.5 && SM.can('cash', 2)) btn.push(html`<button class="btn btn-primary" data-x="payout">${I('send')}Оплатить поставщику</button>`);
    if (SM.can('clients', 2)) btn.push(html`<button class="btn btn-ghost" data-x="edit">${I('edit')}Изменить</button>`, html`<button class="btn btn-danger" data-x="delete">${I('trash')}Удалить</button>`);
    if (SM.can('sales', 2) && c.kind !== 'supplier') btn.push(html`<a class="btn btn-ghost" href="#/sales/new?client=${c.id}">${I('plus')}Продажа</a>`);
    const dr = UI.drawer({ title: c.name, sub: c.phone + (c.inn ? ' · ИНН ' + c.inn : ''), head: UI.avatar(c.name, c.id, 'lg'), body, foot: btn.length ? html`${btn}` : null });
    SM.trackDrawer(SM.openClient, [id], dr, '#/clients');
    const on = (sel, fn) => { const x = dr.querySelector(sel); if (x) x.onclick = fn; };
    on('[data-x=act]', () => SM.actModal(id));
    on('[data-x=pay]', () => SM.payModal({ clientId: id }));
    on('[data-x=payout]', () => SM.payModal({ clientId: id, dir: 'out' }));
    on('[data-x=edit]', () => SM.clientForm(c));
    on('[data-x=delete]', () => SM.deleteClientAsk(c));
  };
  function clientsPage(r) {
    const q = (r.q.q || '').toLowerCase(), tab = r.q.tab || 'all';
    const base = SM.db.clients.filter((c) => (!SM.flag('ownOnly') || c.sellerId === SM.user.id || c.kind === 'client'));
    const list = base.filter((c) => (tab === 'all' || (tab === 'client' ? c.kind !== 'supplier' : c.kind !== 'client')) && (!q || [c.name, c.contact, c.phone, String(c.phone).replace(/\D/g, ''), c.inn, String(c.inn).replace(/\D/g, '')].join(' ').toLowerCase().includes(q)));
    const n = (k) => base.filter((c) => (k === 'client' ? c.kind !== 'supplier' : c.kind !== 'client')).length;
    // кнопка по вкладке: «Новый поставщик» сразу с видом «поставщик» и юрлицом (SM.clientForm), «Новый клиент», на «Все» — общая
    const newBtn = (cls = 'btn-primary') => SM.can('clients', 2) ? html`<button class="btn ${cls}" data-x="new" data-kind="${tab}">${I('plus')}${{ supplier: 'Новый поставщик', client: 'Новый клиент' }[tab] || 'Новый контрагент'}</button>` : '';
    const none = tab === 'supplier' && !q ? UI.empty('Поставщиков пока нет', html`<p>Добавьте поставщика — он появится в поступлениях и взаиморасчётах</p>${newBtn('btn-secondary')}`, 'users') : UI.empty('Никого не найдено', 'Измените поиск или добавьте контрагента', 'users');
    return html`
      ${UI.pageHead('Контрагенты', 'Покупатели и поставщики: контакты, реквизиты, история и задолженность', newBtn())}
      ${UI.tabs([['all', 'Все', base.length], ['client', 'Клиенты', n('client')], ['supplier', 'Поставщики', n('supplier')]], tab)}
      <div class="card"><div class="card-h">${UI.searchInput(r.q.q, 'Название, Ф.И.О., телефон, ИНН')}</div>
        <div class="card-b" style="padding-top:12px">${list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Контрагент</th><th>Тип</th><th>Телефон</th><th>Ответственный</th><th class="r">Сальдо</th><th></th></tr></thead><tbody>
          ${list.map((c) => { const b = SM.balance(c.id); return html`<tr class="click" data-act="open-client" data-id="${c.id}"><td><div class="row nowrap">${UI.avatar(c.name, c.id, 'sm')}<div><span class="cell-title">${c.name}</span><span class="cell-sub">${c.contact || c.address || ''}</span></div></div></td>
            <td><span class="chip">${c.kind === 'supplier' ? 'поставщик' : c.kind === 'both' ? 'клиент/поставщик' : 'клиент'}</span> <span class="chip">${c.type === 'legal' ? 'юрлицо' : 'физлицо'}</span></td><td class="nowrap">${c.phone}</td><td>${c.sellerId ? SM.user_(c.sellerId).name : html`<span class="muted">—</span>`}</td>
            <td class="r nowrap">${Math.abs(b) < 0.5 ? html`<span class="muted">0</span>` : html`<b class="${b > 0 ? 'bad-t' : 'warn-t'}">${b > 0 ? '' : '−'}${F.m(Math.abs(b))}</b><span class="cell-sub">${b > 0 ? 'должен нам' : 'мы должны'}</span>`}</td>
            <td class="td-act">${SM.can('clients', 2) ? UI.actBtns(c.id, { editTip: 'Изменить контрагента', delTip: 'Удалить контрагента' }) : ''}</td></tr>`; })}</tbody></table></div>` : none}</div></div>`;
  }
  /* удаление контрагента: только без операций, иначе сломаются продажи и взаиморасчёты */
  SM.deleteClientAsk = async function (c) {
    const n = SM.clientLinks(c.id);
    if (n) return UI.toast('Нельзя удалить ' + c.name, 'У контрагента есть операции (' + n + '): сначала удалите его продажи и оплаты', 'bad', { icon: 'lock' });
    if (!(await UI.confirmDelete('Удалить контрагента?', c.name + ' будет удалён без возможности восстановления.'))) return;
    SM.ops.deleteClient(c); UI.closeAll(); UI.toast('Контрагент удалён', c.name, 'ok', { icon: 'trash' }); SM.refresh();
  };

  /* ---------- Задолженности и акт сверки (ТЗ 13) ---------- */
  SM.actHTML = function (clientId, from, to, no) {
    const c = SM.client(clientId), co = SM.db.settings.company, a = SM.actData(clientId, from, to);
    const m = (v) => (Math.abs(v) < 0.5 ? '' : F.num(Math.round(v)));
    return `<div class="doc-head"><div><b>${SM.esc(co.name)}</b><br>ИНН ${SM.esc(co.inn)}</div><div class="doc-r">${no ? '№ ' + SM.esc(no) + '<br>' : ''}${F.date(D.todayISO())}</div></div>
      <h1>Акт сверки взаимных расчётов</h1><p style="text-align:center">за период с ${F.date(from)} по ${F.date(to)}<br>между ${SM.esc(co.name)} и ${SM.esc(c.name)}</p>
      <table><thead><tr><th>Дата</th><th>Документ</th><th>Дебет (нам должны), сум</th><th>Кредит (мы должны), сум</th></tr></thead><tbody>
      <tr><td colspan="2"><b>Сальдо на ${F.date(from)}</b></td><td class="doc-r"><b>${a.start > 0 ? m(a.start) : ''}</b></td><td class="doc-r"><b>${a.start < 0 ? m(-a.start) : ''}</b></td></tr>
      ${a.ops.map((o) => `<tr><td>${F.date(o.at)}</td><td>${SM.esc(o.doc)}</td><td class="doc-r">${m(o.debit)}</td><td class="doc-r">${m(o.credit)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Операций за период нет</td></tr>'}
      <tr><td colspan="2"><b>Обороты за период</b></td><td class="doc-r"><b>${m(a.debit)}</b></td><td class="doc-r"><b>${m(a.credit)}</b></td></tr>
      <tr><td colspan="2"><b>Сальдо на ${F.date(to)}</b></td><td class="doc-r"><b>${a.end > 0 ? m(a.end) : ''}</b></td><td class="doc-r"><b>${a.end < 0 ? m(-a.end) : ''}</b></td></tr></tbody></table>
      <p>По данным ${SM.esc(co.name)} на ${F.date(to)} ${Math.abs(a.end) < 0.5 ? 'задолженность отсутствует' : a.end > 0 ? 'задолженность в пользу ' + SM.esc(co.name) + ' — <b>' + F.cur(a.end) + '</b>' : 'задолженность в пользу ' + SM.esc(c.name) + ' — <b>' + F.cur(-a.end) + '</b>'}.</p>
      <p class="muted" style="font-size:11px">Операции в долларах пересчитаны по курсу, зафиксированному в каждой операции.</p>
      <div class="doc-sign"><div>От ${SM.esc(co.name)}<br>Директор ${SM.esc(co.director)}</div><div>Гл. бухгалтер ${SM.esc(co.accountant)}</div><div>От ${SM.esc(c.name)}</div></div>`;
  };
  SM.actModal = function (clientId) {
    const c = SM.client(clientId);
    let from = D.iso(D.addDays(D.today(), -30)), to = D.todayISO();
    const m = UI.modal({ title: 'Акт сверки', sub: c.name, size: 'wide',
      body: html`<div class="row mb-16"><div class="field" style="flex:1 1 150px"><label>С</label><input class="input" type="date" name="from" value="${from}"></div><div class="field" style="flex:1 1 150px"><label>По</label><input class="input" type="date" name="to" value="${to}"></div></div><div class="doc-preview" id="actPrev"></div>`,
      foot: html`<button class="btn btn-ghost" data-close>Закрыть</button><button class="btn btn-secondary" data-x="xlsx">${I('download')}Excel</button><button class="btn btn-secondary" data-x="doc">${I('download')}Сохранить .doc</button><button class="btn btn-primary" data-x="print">${I('print')}Печать</button>` });
    const prev = m.querySelector('#actPrev');
    const draw = () => { from = m.querySelector('[name=from]').value; to = m.querySelector('[name=to]').value; prev.innerHTML = SM.actHTML(clientId, from, to); };
    m.querySelectorAll('input[type=date]').forEach((x) => x.addEventListener('change', draw));
    draw();
    // номер присваивается один раз на акт: печать и сохранение того же периода не плодят новые номера
    let reg = null;
    const register = () => { if (!reg || reg.from !== from || reg.to !== to) reg = { from, to, no: SM.ops.createDoc('act', { clientId, from, to }).no }; return reg.no; };
    m.querySelector('[data-x=print]').onclick = () => { const no = register(); UI.printDoc('Акт сверки ' + no, SM.actHTML(clientId, from, to, no)); };
    m.querySelector('[data-x=doc]').onclick = () => { const no = register(); UI.saveDoc('Акт_сверки_' + no, 'Акт сверки', SM.actHTML(clientId, from, to, no)); };
    m.querySelector('[data-x=xlsx]').onclick = () => {
      const a = SM.actData(clientId, from, to);
      UI.exportXLSX('Акт_сверки_' + c.name.replace(/[^\wа-яё]+/gi, '_'), [['Дата', 'Документ', 'Дебет, сум', 'Кредит, сум'], ['', 'Сальдо на ' + F.date(from), a.start > 0 ? Math.round(a.start) : '', a.start < 0 ? Math.round(-a.start) : ''],
        ...a.ops.map((o) => [F.date(o.at), o.doc, Math.round(o.debit) || '', Math.round(o.credit) || '']), ['', 'Обороты', Math.round(a.debit), Math.round(a.credit)], ['', 'Сальдо на ' + F.date(to), a.end > 0 ? Math.round(a.end) : '', a.end < 0 ? Math.round(-a.end) : '']], 'Акт сверки');
    };
  };
  function debtsPage(r) {
    const tab = r.q.tab || 'recv', q = (r.q.q || '').toLowerCase();
    const own = SM.flag('ownOnly');
    const rows = SM.db.clients.filter((c) => !own || c.sellerId === SM.user.id).map((c) => {
      const L = SM.ledger(c.id);
      return { c, opening: L.opening, debit: L.ops.reduce((a, o) => a + o.debit, 0), credit: L.ops.reduce((a, o) => a + o.credit, 0), bal: L.balance };
    });
    const recv = rows.filter((x) => x.bal > 0.5), pay = rows.filter((x) => x.bal < -0.5);
    const credit = SM.db.sales.filter((s) => s.state === 'posted' && SM.saleCalc(s).debt > 0 && SM.saleVisible(s));
    const overdue = credit.filter(SM.overdue);
    const filt = (list) => list.filter((x) => !q || x.c.name.toLowerCase().includes(q));
    const tbl = (list) => list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Контрагент</th><th class="r">Нач. остаток</th><th class="r">Отгрузки / поступления</th><th class="r">Оплаты</th><th class="r">Сальдо</th><th></th></tr></thead><tbody>
      ${list.sort((a, b) => Math.abs(b.bal) - Math.abs(a.bal)).map((x) => html`<tr class="click" data-act="open-client" data-id="${x.c.id}"><td><span class="cell-title">${x.c.name}</span><span class="cell-sub">${x.c.phone}${x.c.sellerId ? ' · ' + SM.user_(x.c.sellerId).name : ''}</span></td>
        <td class="r nowrap">${F.m(x.opening)}</td><td class="r nowrap">${F.m(x.c.kind === 'supplier' ? x.credit : x.debit)}</td><td class="r nowrap">${F.m(x.c.kind === 'supplier' ? x.debit : x.credit)}</td>
        <td class="r nowrap"><b class="${x.bal > 0 ? 'bad-t' : 'warn-t'}">${F.m(Math.abs(x.bal))}</b></td>
        <td class="r nowrap"><button class="btn btn-ghost btn-sm" data-act-client="${x.c.id}">${I('file')}Акт</button>${x.bal > 0 && (SM.can('debts', 2) || SM.can('sales', 2)) ? html`<button class="btn btn-soft btn-sm" data-pay-client="${x.c.id}">${I('wallet')}Погасить</button>` : ''}${x.bal < 0 && SM.can('cash', 2) ? html`<button class="btn btn-soft btn-sm" data-payout-client="${x.c.id}">${I('send')}Оплатить</button>` : ''}</td></tr>`)}</tbody></table></div>` : UI.empty('Задолженностей нет', '', 'check');
    return html`
      ${UI.pageHead('Задолженности и взаиморасчёты', 'Сальдо в сумах: операции в $ пересчитаны по курсу каждой операции', '')}
      <div class="grid g-4 keep-2 stagger">
        ${UI.kpi({ label: 'Нам должны (дебиторка)', icon: 'trendUp', value: F.m(recv.reduce((a, x) => a + x.bal, 0)), count: Math.round(recv.reduce((a, x) => a + x.bal, 0)), unit: 'сум', foot: recv.length + ' контрагентов', cls: 'k-accent' })}
        ${UI.kpi({ label: 'Мы должны (кредиторка)', icon: 'trendDown', value: F.m(-pay.reduce((a, x) => a + x.bal, 0)), count: Math.round(-pay.reduce((a, x) => a + x.bal, 0)), unit: 'сум', foot: pay.length + ' поставщиков' })}
        ${UI.kpi({ label: 'Продажи в долг', icon: 'cart', value: credit.length, count: credit.length, foot: 'с неоплаченным остатком' })}
        ${UI.kpi({ label: 'Просрочено', icon: 'alert', value: overdue.length, count: overdue.length, foot: overdue.length ? F.cur(overdue.reduce((a, s) => a + SM.toUZS(SM.saleCalc(s).debt, s.cur, s.rate), 0)) : 'просрочек нет' })}
      </div>
      <div class="mt-16">${UI.tabs([['recv', 'Нам должны', recv.length], ['pay', 'Мы должны', pay.length], ['sales', 'Продажи в долг', credit.length]], tab)}</div>
      <div class="card"><div class="card-h">${UI.searchInput(r.q.q, 'Контрагент')}</div><div class="card-b" style="padding-top:12px">
        ${tab === 'recv' ? tbl(filt(recv)) : tab === 'pay' ? tbl(filt(pay)) : credit.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Продажа</th><th>Клиент</th><th class="r">Сумма</th><th class="r">Долг</th><th>Срок</th></tr></thead><tbody>${credit.filter((s) => !q || SM.client(s.clientId).name.toLowerCase().includes(q)).map((s) => { const c = SM.saleCalc(s); return html`<tr class="click ${SM.overdue(s) ? 'row-bad' : ''}" data-act="open-sale" data-id="${s.id}"><td><span class="cell-title">${SM.saleNo(s)}</span><span class="cell-sub">${F.date(s.date)} · ${SM.user_(s.sellerId).name}</span></td><td>${SM.client(s.clientId).name}</td><td class="r nowrap">${F.cur(c.total, s.cur)}</td><td class="r nowrap"><b class="bad-t">${F.cur(c.debt, s.cur)}</b></td><td>${s.due ? html`<span class="${SM.overdue(s) ? 'bad-t fw-8' : ''}">${F.date(s.due)}</span>${SM.overdue(s) ? html`<span class="cell-sub bad-t">просрочено на ${D.diffDays(D.todayISO(), s.due)} дн.</span>` : html`<span class="cell-sub">через ${D.diffDays(s.due, D.todayISO())} дн.</span>`}` : html`<span class="muted">без срока</span>`}</td></tr>`; })}</tbody></table></div>` : UI.empty('Продаж в долг нет', '', 'check')}
      </div></div>`;
  }

  /* ---------- Доставка (ТЗ 15) ---------- */
  SM.openDelivery = function (id) {
    const x = SM.db.deliveries.find((d) => d.id === id);
    if (!x) return;
    const s = x.saleId ? SM.db.sales.find((z) => z.id === x.saleId) : null;
    const edit = SM.can('delivery', 2) && x.status !== 'delivered' && x.status !== 'cancelled';
    const body = html`
      <dl class="dl">
        <dt>Клиент</dt><dd>${SM.client(x.clientId).name}</dd><dt>Телефон</dt><dd><a href="tel:${String(x.phone).replace(/[^\d+]/g, '')}">${x.phone}</a></dd>
        <dt>Адрес</dt><dd>${x.address}</dd>${s ? html`<dt>Продажа</dt><dd><a href="#" data-act="open-sale" data-id="${s.id}">${SM.saleNo(s)}</a> · ${UI.badge(SM.payStatus(s))}</dd>` : ''}
        <dt>Вид</dt><dd class="dd-edit"><span>${SM.DELIVERY_KIND[x.kind]} · ${x.paid ? 'платная' + (x.cost ? ', ' + F.cur(x.cost, 'UZS') : '') : 'бесплатная'}</span>${edit ? html`<button type="button" class="btn btn-icon btn-sm" data-x="cost" title="Изменить стоимость и направление" aria-label="Изменить стоимость и направление">${I('edit')}</button>` : ''}</dd>${x.direction ? html`<dt>Направление</dt><dd>${x.direction}</dd>` : ''}
        ${x.driverId ? html`<dt>Водитель</dt><dd>${SM.driver(x.driverId).name}<div class="fs-12 muted">${SM.driver(x.driverId).phone}</div></dd>` : ''}${x.carId ? html`<dt>Автомобиль</dt><dd>${SM.car(x.carId).model} · ${SM.car(x.carId).plate}</dd>` : ''}
        ${x.comment ? html`<dt>Комментарий</dt><dd>${x.comment}</dd>` : ''}
      </dl>
      ${s ? html`<div class="section-t">Товары</div><ul class="list">${s.items.map((l) => html`<li>${UI.thumb(SM.product(l.productId))}<div class="grow"><b class="fs-13">${SM.product(l.productId).name}</b></div><b>${l.qty} ${SM.product(l.productId).unit}</b></li>`)}</ul>` : ''}
      <div class="section-t">История</div><ul class="timeline">${x.history.slice().reverse().map((h, i) => html`<li class="${i === 0 ? 'on' : ''}"><b>${h.text}</b><small>${F.dt(h.at)} · ${SM.user_(h.uid).name}</small></li>`)}</ul>`;
    const btn = [];
    if (edit) {
      if (x.status === 'new' || x.status === 'assigned') btn.push(html`<button class="btn btn-primary" data-x="next">${I('arrowRight')}${x.status === 'new' ? 'Назначить' : 'Передать водителю'}</button>`);
      if (x.status === 'handed') btn.push(html`<button class="btn btn-ok" data-x="next">${I('check')}Доставлена</button>`);
      btn.push(html`<button class="btn btn-danger" data-x="cancel">${I('x')}Отменить</button>`);
    }
    const dr = UI.drawer({ title: 'Доставка ' + x.no, sub: SM.DELIVERY_STATUS[x.status][0] + ' · ' + SM.client(x.clientId).name, head: html`<span class="note-ic info">${I('truck')}</span>`, body, foot: btn.length ? html`${btn}` : null });
    SM.trackDrawer(SM.openDelivery, [id], dr, '#/delivery');
    const on = (sel, fn) => { const b = dr.querySelector(sel); if (b) b.onclick = fn; };
    // своя доставка без водителя или автомобиля — то же окно, что при переносе на доске; с водителем — сразу
    on('[data-x=next]', async () => {
      const nx = { new: 'assigned', assigned: 'handed', handed: 'delivered' }[x.status];
      let p = { driverId: x.driverId || null, carId: x.carId || null };
      if ((nx === 'assigned' || nx === 'handed') && x.kind === 'own' && (!p.driverId || !p.carId)) { p = await dlvAssignModal(x, nx); if (!p) return; }
      p.status = nx;
      const dname = p.driverId ? SM.driver(p.driverId).name : '', car = p.carId ? SM.car(p.carId).model : '';
      SM.ops.deliveryUpdate(x, p, nx === 'assigned' ? 'Назначен водитель ' + dname + (car ? ', ' + car : '') : SM.DELIVERY_STATUS[nx][0]);
      UI.toast('Доставка ' + x.no, SM.DELIVERY_STATUS[nx][0]); SM.refresh();
    });
    on('[data-x=cancel]', async () => { const why = await UI.prompt('Отменить доставку ' + x.no + '?', '', { ok: 'Отменить', danger: true }); if (!why) return; SM.ops.deliveryUpdate(x, { status: 'cancelled' }, 'Отменена: ' + why); SM.refresh(); });
    on('[data-x=cost]', () => dlvCostModal(x));
  };
  // стоимость, платная, направление — короткое окно от карандаша в строке «Вид» (п.14); права и статус — как у кнопок карточки
  function dlvCostModal(x) {
    if (!SM.can('delivery', 2) || x.status === 'delivered' || x.status === 'cancelled') return;
    const m = UI.modal({ title: 'Стоимость доставки ' + x.no, sub: SM.DELIVERY_KIND[x.kind], size: 'narrow',
      body: html`<form class="form-grid" autocomplete="off">
        <div class="field"><label>Стоимость, сум</label><input class="input" name="cost" ${UI.moneyAttrs(100000000)} value="${UI.fmtInput(x.cost || 0)}"></div>
        <label class="switch" style="align-self:end;margin-bottom:10px"><input type="checkbox" name="paid" ${x.paid ? 'checked' : ''}><i></i>Платная</label>
        <div class="field full"><label>Направление</label><input class="input" name="direction" placeholder="Район, город" value="${x.direction || ''}"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Сохранить</button>` });
    const f = m.querySelector('form');
    UI.enhance(m);
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f), p = { cost: UI.num(d.cost) || 0, paid: !!d.paid, direction: String(d.direction || '').trim() };
      const what = [];
      if (p.cost !== (x.cost || 0) || p.paid !== !!x.paid) what.push(p.paid ? 'платная' + (p.cost ? ', ' + F.cur(p.cost, 'UZS') : '') : 'бесплатная' + (p.cost ? ', ' + F.cur(p.cost, 'UZS') : ''));
      if (p.direction !== (x.direction || '')) what.push('направление: ' + (p.direction || '—'));
      UI.closeTop();
      if (!what.length) return;
      SM.ops.deliveryUpdate(x, p, 'Изменены стоимость/направление: ' + what.join(' · '));
      UI.toast('Доставка ' + x.no, 'Стоимость и направление сохранены', 'ok', { icon: 'truck' }); SM.refresh();
    };
  }
  function deliveryForm() {
    const sales = SM.db.sales.filter((s) => s.state === 'posted' && !SM.db.deliveries.some((d) => d.saleId === s.id && d.status !== 'cancelled'));
    const m = UI.modal({ title: 'Заявка на доставку', size: 'wide',
      body: html`<form class="form-grid" autocomplete="off">
        <div class="field full"><label>Продажа</label><select class="select" name="saleId">${UI.options(sales.map((s) => [s.id, SM.saleNo(s) + ' · ' + SM.client(s.clientId).name]), '', 'Без продажи (указать клиента)')}</select></div>
        <div class="field"><label>Клиент</label><select class="select" name="clientId">${UI.options(SM.db.clients.filter((c) => c.kind !== 'supplier').map((c) => [c.id, c.name]), '', 'Выберите клиента')}</select></div>
        <div class="field"><label>Телефон</label><input class="input" name="phone"></div>
        <div class="field full"><label>Адрес <span class="req">*</span></label><input class="input" name="address"></div>
        <div class="field"><label>Вид доставки</label><select class="select" name="kind">${UI.options(Object.entries(SM.DELIVERY_KIND), 'own')}</select></div>
        <div class="field"><label>Направление</label><input class="input" name="direction" placeholder="Район, город"></div>
        <div class="field"><label>Стоимость, сум</label><input class="input" name="cost" ${UI.moneyAttrs(100000000)} value="0"></div>
        <label class="switch" style="align-self:end;margin-bottom:10px"><input type="checkbox" name="paid"><i></i>Платная</label>
        <div class="field full"><label>Комментарий</label><input class="input" name="comment"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Создать заявку</button>` });
    const f = m.querySelector('form');
    f.saleId.addEventListener('change', () => { const s = SM.db.sales.find((x) => x.id === f.saleId.value); if (s) { const c = SM.client(s.clientId); f.clientId.value = c.id; f.phone.value = c.phone; f.address.value = c.address || ''; } });
    f.clientId.addEventListener('change', () => { const c = SM.client(f.clientId.value); if (c.phone) { f.phone.value = c.phone; if (!f.address.value) f.address.value = c.address || ''; } });
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f);
      if (!d.clientId) return UI.invalid(f, 'clientId', 'Выберите клиента');
      if (!d.address) return UI.invalid(f, 'address', 'Укажите адрес');
      const x = SM.ops.createDelivery({ saleId: d.saleId || null, clientId: d.clientId, phone: d.phone, address: d.address, kind: d.kind, direction: d.direction, cost: UI.num(d.cost), paid: !!d.paid, comment: d.comment, driverId: null, carId: null });
      UI.closeTop(); UI.toast('Заявка на доставку создана', x.no + ' · ' + SM.client(d.clientId).name, 'ok', { icon: 'truck' }); SM.refresh();
    };
  }
  /* ---------- Канбан доставки: перенос карточки в другую колонку ---------- */
  const DLV_ORDER = ['new', 'assigned', 'handed', 'delivered'];
  // можно ли перенести заявку в колонку: вперёд — да; назад — на один шаг; «Отменена» — только «Вернуть» в «Новая»
  const dlvMoveCheck = (x, to) => {
    if (to === x.status) return { ok: false };
    if (x.status === 'cancelled') {
      if (to !== 'new') return { ok: false, why: 'Отменённую заявку можно вернуть только в «Новая»' };
      const s = x.saleId && SM.db.sales.find((z) => z.id === x.saleId);
      if (s && s.state === 'cancelled') return { ok: false, why: 'Продажа отменена — заявку не вернуть' };
      if (s && SM.db.deliveries.some((d) => d !== x && d.saleId === s.id && d.status !== 'cancelled')) return { ok: false, why: 'У продажи уже есть другая заявка на доставку' };
      return { ok: true };
    }
    if (to === 'cancelled') return x.status === 'delivered' ? { ok: false, why: 'Доставленную заявку не отменить' } : { ok: true };
    const fi = DLV_ORDER.indexOf(x.status), ti = DLV_ORDER.indexOf(to);
    if (ti > fi || ti === fi - 1) return { ok: true };
    return { ok: false, why: 'Назад — только на один шаг: в «' + SM.DELIVERY_STATUS[DLV_ORDER[fi - 1]][0] + '»' };
  };
  // соседние колонки для кнопок «←»/«→» на карточке
  const dlvSteps = (x) => x.status === 'cancelled' ? { back: 'new' } : { prev: DLV_ORDER[DLV_ORDER.indexOf(x.status) - 1], next: DLV_ORDER[DLV_ORDER.indexOf(x.status) + 1] };
  // своя доставка без водителя и автомобиля: спрашиваем их в окне; null — окно закрыли
  const dlvAssignModal = (x, to) => new Promise((res) => {
    let done = false;
    const final = to !== 'assigned';
    const m = UI.modal({ title: 'Водитель для ' + x.no, sub: 'Для своей доставки нужны водитель и автомобиль' + (final ? '. Отгрузка будет отмечена' : ''), size: 'narrow',
      body: html`<form class="form-grid" autocomplete="off">
        <div class="field full"><label>Водитель <span class="req">*</span></label><select class="select" name="driverId">${UI.options(SM.db.drivers.filter((d) => d.active).map((d) => [d.id, d.name + ' · ' + d.phone]), x.driverId, 'Выберите водителя')}</select></div>
        <div class="field full"><label>Автомобиль <span class="req">*</span></label><select class="select" name="carId">${UI.options(SM.db.cars.filter((c) => c.active).map((c) => [c.id, c.model + ' · ' + c.plate]), x.carId, 'Выберите автомобиль')}</select></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('arrowRight')}${SM.DELIVERY_STATUS[to][0]}</button>`,
      onClose: () => { if (!done) res(null); } });
    const f = m.querySelector('form');
    UI.enhance(m);
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f);
      if (!d.driverId) return UI.invalid(f, 'driverId', 'Выберите водителя');
      if (!d.carId) return UI.invalid(f, 'carId', 'Выберите автомобиль');
      done = true; UI.closeTop(); res({ driverId: d.driverId, carId: d.carId });
    };
  });
  // перенос: шаги проходят по порядку, как кнопками в карточке — с отгрузкой и завершением продажи
  SM.moveDelivery = async function (x, to) {
    const chk = dlvMoveCheck(x, to);
    if (!chk.ok) { if (chk.why) UI.toast('Нельзя перенести', chk.why, 'warn', { icon: 'truck' }); return false; }
    if (to === 'cancelled') {
      const why = await UI.prompt('Отменить доставку ' + x.no + '?', '', { ok: 'Отменить', danger: true });
      if (!why) return false;
      SM.ops.deliveryUpdate(x, { status: 'cancelled' }, 'Отменена: ' + why);
      UI.toast('Доставка ' + x.no, SM.DELIVERY_STATUS.cancelled[0], 'warn', { icon: 'truck' });
      return true;
    }
    const fi = DLV_ORDER.indexOf(x.status), ti = DLV_ORDER.indexOf(to);
    if (ti < fi || x.status === 'cancelled') {
      // возврат: из «Назначена» — сразу; из «Передана», «Доставлена», «Отменена» — после подтверждения, с откатом отметки продажи
      const name = SM.DELIVERY_STATUS[to][0], s = x.saleId && SM.db.sales.find((z) => z.id === x.saleId), undo = SM.dlvSaleBack(x, to);
      if (x.status !== 'assigned') {
        const txt = (x.status === 'cancelled' ? 'Заявка снова будет в работе' + (x.driverId || x.carId ? ', водитель и автомобиль сохранятся' : '') + '. ' : '')
          + (undo === 'done' ? 'Продажа ' + SM.saleNo(s) + ' снова станет «Отгружено», не завершённой. ' : undo === 'ship' ? 'Отметка отгрузки по продаже ' + SM.saleNo(s) + ' снимется — товар снова «Собрано». ' : '')
          + 'Остатки на складе не изменятся.';
        if (!(await UI.confirm('Вернуть ' + x.no + ' в «' + name + '»?', txt, { ok: x.status === 'cancelled' ? 'Вернуть' : 'Вернуть в «' + name + '»' }))) return false;
      }
      SM.ops.deliveryBack(x, to);
      UI.toast('Заявка возвращена в «' + name + '»', x.no, 'info', { icon: 'undo' });
      return true;
    }
    let patch = {};
    if (x.kind === 'own' && (!x.driverId || !x.carId)) { patch = await dlvAssignModal(x, to); if (!patch) return false; }
    else if (ti >= 2 && !(await UI.confirm(to === 'handed' ? 'Передать водителю ' + x.no + '?' : 'Отметить ' + x.no + ' доставленной?',
      to === 'handed' ? 'Товар будет отмечен как отгруженный.' : 'Оплаченная продажа завершится.', { ok: SM.DELIVERY_STATUS[to][0] }))) return false;
    for (let i = fi + 1; i <= ti; i++) {
      const nx = DLV_ORDER[i], p = Object.assign(i === fi + 1 ? patch : {}, { status: nx });
      const drv = p.driverId || x.driverId, car = p.carId || x.carId;
      SM.ops.deliveryUpdate(x, p, nx === 'assigned' && drv ? 'Назначен водитель ' + SM.driver(drv).name + (car ? ', ' + SM.car(car).model : '') : SM.DELIVERY_STATUS[nx][0]);
    }
    UI.toast('Доставка ' + x.no, SM.DELIVERY_STATUS[to][0], 'ok', { icon: 'truck' });
    return true;
  };
  // мышь — перетаскивание сразу; палец — после удержания 0,3 с, чтобы свайп по доске прокручивал колонки
  let dlvNoClick = false;
  function bindBoardDrag(el) {
    const board = el.querySelector('.board');
    if (!board || !SM.can('delivery', 2)) return;
    let d = null, raf = 0;
    const laneAt = (x, y) => { const n = document.elementFromPoint(x, y); return n && n.closest('.lane[data-lane]'); };
    const clearLanes = () => board.querySelectorAll('.lane').forEach((l) => { l.classList.remove('drop-ok', 'drop-no'); delete l.dataset.why; });
    const mark = (lane) => {
      clearLanes();
      if (!lane || lane.dataset.lane === d.from) return;
      const chk = dlvMoveCheck(d.x, lane.dataset.lane);
      lane.classList.add(chk.ok ? 'drop-ok' : 'drop-no');
      if (!chk.ok) lane.dataset.why = SM.i18n ? SM.i18n.tr(chk.why) : chk.why;
    };
    const move = (x, y) => { d.cx = x; d.cy = y; d.ghost.style.transform = 'translate(' + (x - d.dx) + 'px, ' + (y - d.dy) + 'px) rotate(1.5deg)'; mark(laneAt(x, y)); };
    const start = () => {
      d.on = true;
      const r = d.t.getBoundingClientRect();
      d.dx = d.x0 - r.left; d.dy = d.y0 - r.top;
      d.ghost = d.t.cloneNode(true);
      d.ghost.classList.remove('landed'); d.ghost.classList.add('ticket-ghost'); d.ghost.style.width = r.width + 'px';
      document.body.appendChild(d.ghost);
      d.t.classList.add('drag-src'); board.classList.add('dragging'); document.body.classList.add('is-dragging');
      move(d.cx, d.cy);
      if (d.touch && navigator.vibrate) navigator.vibrate(12);
      // у края доски она сама прокручивается — так на телефоне можно дотянуть до соседней колонки
      const tick = () => {
        if (!d || !d.on) return;
        const b = board.getBoundingClientRect();
        if (d.cx < b.left + 56) board.scrollLeft -= 12; else if (d.cx > b.right - 56) board.scrollLeft += 12;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      if (!d || e.pointerId !== d.pid) return;
      if (!d.on) {
        const far = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
        d.cx = e.clientX; d.cy = e.clientY;
        if (d.touch) { if (far > 8) finish(false); return; } // палец поехал раньше удержания — это прокрутка
        if (far > 5) start();
        return;
      }
      e.preventDefault();
      move(e.clientX, e.clientY);
    };
    const noScroll = (e) => { if (d && d.on) e.preventDefault(); };
    const finish = async (drop) => {
      const cur = d; d = null;
      cancelAnimationFrame(raf); clearTimeout(cur.timer);
      removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onCancel);
      document.removeEventListener('touchmove', noScroll);
      if (!cur.on) return;
      cur.ghost.remove(); cur.t.classList.remove('drag-src'); board.classList.remove('dragging'); document.body.classList.remove('is-dragging');
      clearLanes();
      dlvNoClick = true; setTimeout(() => (dlvNoClick = false), 0); // клик после переноса не открывает карточку
      const lane = drop && laneAt(cur.cx, cur.cy);
      if (!lane || lane.dataset.lane === cur.from) return;
      if (await SM.moveDelivery(cur.x, lane.dataset.lane)) { SM._dlvLanded = cur.x.id; SM.refresh(); }
    };
    const onUp = (e) => { if (d && e.pointerId === d.pid) finish(true); };
    const onCancel = (e) => { if (d && e.pointerId === d.pid) finish(false); };
    board.addEventListener('pointerdown', (e) => {
      const t = e.target.closest('.ticket.can-drag');
      if (!t || d || e.target.closest('[data-step]') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      d = { t, pid: e.pointerId, x: SM.db.deliveries.find((z) => z.id === t.dataset.dlv), from: t.closest('.lane').dataset.lane, x0: e.clientX, y0: e.clientY, cx: e.clientX, cy: e.clientY, touch: e.pointerType !== 'mouse', on: false };
      if (d.touch) d.timer = setTimeout(() => { if (d && !d.on) start(); }, 300);
      addEventListener('pointermove', onMove, { passive: false }); addEventListener('pointerup', onUp); addEventListener('pointercancel', onCancel);
      document.addEventListener('touchmove', noScroll, { passive: false });
    });
    board.addEventListener('contextmenu', (e) => { if (e.target.closest('.ticket.can-drag')) e.preventDefault(); });
  }

  function deliveryPage(r) {
    const kind = r.q.kind || '';
    const list = SM.db.deliveries.filter((d) => !kind || d.kind === kind);
    const lanes = ['new', 'assigned', 'handed', 'delivered', 'cancelled'];
    const drag = SM.can('delivery', 2);
    // кнопки шага: то же, что перенос в соседнюю колонку; у «Отменена» — «Вернуть» в «Новая»
    const steps = (d) => {
      if (!drag) return '';
      const st = dlvSteps(d), b = (dir, to, icon, tip, label) => html`<button type="button" class="t-step ${dir}" data-step="${dir}" data-to="${to}" data-tip="${tip}" aria-label="${tip}">${I(icon)}${label || ''}</button>`;
      return html`<div class="t-steps">${st.prev ? b('prev', st.prev, 'arrowLeft', 'Назад: ' + SM.DELIVERY_STATUS[st.prev][0]) : ''}${st.back ? b('back', st.back, 'undo', 'Вернуть в «Новая»', 'Вернуть') : ''}${st.next ? b('next', st.next, 'arrowRight', 'Вперёд: ' + SM.DELIVERY_STATUS[st.next][0]) : ''}</div>`;
    };
    const ticket = (d) => html`<div class="ticket ${drag ? 'can-drag' : ''} ${SM._dlvLanded === d.id ? 'landed' : ''}" data-dlv="${d.id}"><div class="t-top"><span>${d.no}</span>${d.saleId ? html`<span>· ${SM.saleNo(SM.db.sales.find((s) => s.id === d.saleId))}</span>` : ''}<span class="right">${F.dm(d.createdAt)}</span></div>
      <b>${SM.client(d.clientId).name}</b><div class="t-sub">${I('pin')}${d.address}</div>${d.driverId ? html`<div class="t-sub">${I('user')}${SM.driver(d.driverId).name}${d.carId ? ' · ' + SM.car(d.carId).plate : ''}</div>` : ''}
      <div class="t-foot"><span class="chip">${SM.DELIVERY_KIND[d.kind]}</span>${d.cost ? html`<span class="chip accent">${F.short(d.cost)} сум</span>` : html`<span class="chip">бесплатно</span>`}</div>${steps(d)}</div>`;
    return html`
      ${UI.pageHead('Доставка', 'Заявки: водитель, автомобиль, стоимость и статус. GPS-мониторинг — вне текущего объёма (ТЗ 15)', html`
        ${SM.can('delivery', 2) ? html`<button class="btn btn-primary" data-x="new">${I('plus')}Новая заявка</button>` : ''}`)}
      <div class="row mb-16">${UI.filterSelect('kind', kind, Object.entries(SM.DELIVERY_KIND), 'Все виды доставки')}${drag ? html`<span class="board-hint right">${I('move')}<span class="h-mouse">Перетащите карточку в другую колонку, чтобы сменить статус</span><span class="h-touch">Удерживайте карточку и перетащите в другую колонку</span></span>` : ''}</div>
      <div class="board">${lanes.map((st) => { const l = list.filter((d) => d.status === st); return html`<div class="lane" data-lane="${st}"><div class="lane-h"><i class="dot" style="background:var(--${SM.DELIVERY_STATUS[st][1].replace('b-', '')})"></i>${SM.DELIVERY_STATUS[st][0]}<span class="pill">${l.length}</span></div>${l.length ? l.map(ticket) : html`<p class="muted fs-12" style="padding:8px">Пусто</p>`}</div>`; })}</div>
      <div class="note-box mt-16">${I('truck')}<div><b>Отслеживание доставки по GPS.</b> Здесь менеджеры смогут видеть, куда движется товар: машина с заказом на карте в связке с GPS-мониторингом, по каждой заявке, водителю и автомобилю. Подключается отдельным этапом.</div></div>`;
  }

  /* ---------- Регистрация страниц ---------- */
  SM.page('sales', {
    title: (r) => (r.id === 'new' ? 'Новая продажа' : 'Продажи'),
    render: (r) => (r.id === 'new' && SM.can('sales', 2) ? saleForm(r) : salesList(r)),
    mount(el, r) {
      if (r.id === 'new' && SM.can('sales', 2)) return mountSaleForm(el, r);
      UI.bindSearch(el); UI.bindFilters(el); UI.bindPeriod(el);
      // карандаш и корзина в строке (не открывают карточку продажи)
      UI.$$('[data-edit]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); location.hash = '#/sales/new?edit=' + b.dataset.edit; }));
      UI.$$('[data-del]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); SM.deleteSaleAsk(SM.db.sales.find((s) => s.id === b.dataset.del)); }));
      const ex = el.querySelector('[data-x=export]');
      if (ex) ex.onclick = () => UI.exportXLSX('Продажи_' + D.todayISO(), [['№', 'Дата', 'Клиент', 'Точка', 'Продавец', 'Валюта', 'Курс', 'Сумма', 'Оплачено', 'Долг', 'Сумма в сумах', 'Статус'],
        ...SM.db.sales.filter((s) => SM.saleVisible(s)).map((s) => { const c = SM.saleCalc(s); return [SM.saleNo(s), F.date(s.date), SM.client(s.clientId).name, SM.point(s.pointId).name, SM.user_(s.sellerId).name, s.cur, s.rate, Math.round(c.total * 100) / 100, Math.round(c.paid * 100) / 100, Math.round(c.debt * 100) / 100, Math.round(SM.saleTotalUZS(s)), SM.SALE_STATUS[SM.saleStatus(s)][0]]; })], 'Продажи');
      if (r.id && r.id !== 'new') SM.openSale(r.id);
    },
  });
  SM.page('clients', {
    title: 'Контрагенты', render: clientsPage,
    mount(el, r) {
      UI.bindSearch(el); UI.bindTabs(el);
      UI.$$('[data-x=new]', el).forEach((b) => (b.onclick = () => SM.clientForm(b.dataset.kind === 'supplier' ? { kind: 'supplier', type: 'legal' } : b.dataset.kind === 'client' ? { kind: 'client', type: 'person', sellerId: SM.user.role === 'seller' ? SM.user.id : '' } : null)));
      UI.$$('[data-edit]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); SM.clientForm(SM.client(b.dataset.edit)); }));
      UI.$$('[data-del]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); SM.deleteClientAsk(SM.client(b.dataset.del)); }));
      if (r.q.new && SM.can('clients', 2)) { history.replaceState(null, '', '#/clients'); SM.clientForm(null); }
      if (r.id) SM.openClient(r.id);
    },
  });
  SM.page('debts', {
    title: 'Задолженности', render: debtsPage,
    mount(el) {
      UI.bindSearch(el); UI.bindTabs(el);
      UI.$$('[data-act-client]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); SM.actModal(b.dataset.actClient); }));
      UI.$$('[data-pay-client]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); SM.payModal({ clientId: b.dataset.payClient }); }));
      UI.$$('[data-payout-client]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); SM.payModal({ clientId: b.dataset.payoutClient, dir: 'out' }); }));
    },
  });
  SM.page('delivery', {
    title: 'Доставка', render: deliveryPage,
    mount(el, r) {
      UI.bindFilters(el);
      UI.$$('[data-dlv]', el).forEach((t) => (t.onclick = () => { if (!dlvNoClick) SM.openDelivery(t.dataset.dlv); }));
      // «←»/«→»/«Вернуть» на карточке: карточку не открывают
      UI.$$('[data-step]', el).forEach((b) => (b.onclick = async (e) => {
        e.stopPropagation();
        const x = SM.db.deliveries.find((z) => z.id === b.closest('[data-dlv]').dataset.dlv);
        if (x && (await SM.moveDelivery(x, b.dataset.to))) { SM._dlvLanded = x.id; SM.refresh(); }
      }));
      bindBoardDrag(el);
      SM._dlvLanded = null; // подсветка перенесённой карточки — один раз
      const n = el.querySelector('[data-x=new]'); if (n) n.onclick = deliveryForm;
      if (r.q.open) SM.openDelivery(r.q.open);
    },
  });
})();
