/* =========================================================
   Конструктор договоров — вкладка «Документов»: форма, живой предпросмотр листа,
   черновики и отправка в Didox (демо: подпись E-IMZO и статусы имитируются, наружу ничего не уходит)
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM, UI = SM.ui;
  const { html, raw, fmt: F, d: D } = SM;
  const I = UI.icon;
  const E = SM.esc;

  const TPL = {
    sale: { name: 'Договор купли-продажи шин и дисков', title: 'ДОГОВОР КУПЛИ-ПРОДАЖИ ШИН И ДИСКОВ', we: 'Продавец', they: 'Покупатель', wg: 'Продавца', tg: 'Покупателя', td: 'Покупателю' },
    supply: { name: 'Договор поставки (оптовый покупатель)', title: 'ДОГОВОР ПОСТАВКИ', we: 'Поставщик', they: 'Покупатель', wg: 'Поставщика', tg: 'Покупателя', td: 'Покупателю' },
    service: { name: 'Договор на шиномонтаж и хранение шин', title: 'ДОГОВОР НА ШИНОМОНТАЖ И ХРАНЕНИЕ ШИН', we: 'Исполнитель', they: 'Заказчик', wg: 'Исполнителя', tg: 'Заказчика', td: 'Заказчику' },
  };
  const STATUS = { draft: ['Черновик', 'b-slate'], sent: ['Отправлен', 'b-info'], signed: ['Подписан контрагентом', 'b-ok'], rejected: ['Отклонён', 'b-bad'] };
  const OPTS = [
    ['prepay', 'Предоплата', 'часть суммы до отгрузки'],
    ['warranty', 'Гарантия', '12 месяцев на заводские дефекты'],
    ['penalty', 'Штрафы за просрочку', 'пеня 0,1% в день, не более 10%'],
    ['storage', 'Хранение шин', 'сезонное хранение на складе'],
  ];
  const DELIVERY = ['Самовывоз со склада', 'Доставка по Ташкенту за счёт Продавца', 'Доставка транспортной компанией за счёт Покупателя'];

  /* договоры лежат в db.contracts; у старой базы массива нет — появляется при первом обращении с двумя примерами */
  const list = () => {
    if (!Array.isArray(SM.db.contracts)) {
      const y = new Date().getFullYear();
      SM.db.contracts = [
        { id: 'ctr-demo1', no: `Д-${y}/001`, tpl: 'supply', clientId: 'c1', date: D.iso(D.addDays(D.today(), -6)), city: 'Ташкент', amount: 126000000, cur: 'UZS', payDays: 14, delivery: DELIVERY[1], opts: { prepay: true, prepayPct: 30, warranty: true, penalty: true, storage: false },
          status: 'signed', didoxId: '6f1c2a90e4d7b35a', at: new Date(Date.now() - 6 * 864e5).toISOString(), by: 'u-admin' },
        { id: 'ctr-demo2', no: `Д-${y}/002`, tpl: 'service', clientId: 'c2', date: D.iso(D.addDays(D.today(), -2)), city: 'Ташкент', amount: 1600000, cur: 'UZS', payDays: 3, delivery: DELIVERY[0], opts: { prepay: false, prepayPct: 50, warranty: false, penalty: false, storage: true },
          status: 'rejected', didoxId: '9b0e47c1d2a8f613', at: new Date(Date.now() - 2 * 864e5).toISOString(), by: 'u-admin' },
      ];
    }
    // тестовый черновик для демо-отправки из «Документов»: если черновиков нет — добавляется один раз (сохранится в базу при обычном сохранении)
    const a = SM.db.contracts;
    if (!a.some((c) => c.status === 'draft' || c.test)) {
      const y = new Date().getFullYear(), pre = `Д-${y}/`;
      const n = a.filter((c) => String(c.no).startsWith(pre)).reduce((m, c) => Math.max(m, parseInt(c.no.slice(pre.length), 10) || 0), 0);
      a.push({ id: 'ctr-test', no: pre + String(n + 1).padStart(3, '0'), tpl: 'sale', clientId: 'c1', saleId: '', date: D.todayISO(), city: 'Ташкент', amount: 12400000, cur: 'UZS', payDays: 14, delivery: DELIVERY[0],
        opts: { prepay: false, prepayPct: 30, warranty: true, penalty: false, storage: false }, status: 'draft', title: 'Тестовый договор', test: true, at: new Date().toISOString(), by: 'u-admin' });
    }
    return a;
  };
  const nextNo = () => {
    const y = new Date().getFullYear(), pre = `Д-${y}/`;
    const n = list().filter((c) => c.no.startsWith(pre)).reduce((a, c) => Math.max(a, parseInt(c.no.slice(pre.length), 10) || 0), 0);
    return pre + String(n + 1).padStart(3, '0');
  };
  const blank = () => ({ id: null, no: nextNo(), tpl: 'sale', clientId: '', saleId: '', date: D.todayISO(), city: 'Ташкент', amount: '', cur: 'UZS', payDays: 14, delivery: DELIVERY[0],
    opts: { prepay: false, prepayPct: 30, warranty: false, penalty: false, storage: false }, status: 'draft' });
  let st = null;

  /* ---------- Текст договора ---------- */
  const gap = (v, w = 160) => (v ? E(v) : `<span style="display:inline-block;min-width:${w}px;border-bottom:1px solid #999">&nbsp;</span>`);
  const req = (o) => `<b>${gap(o.name)}</b><br>ИНН: ${gap(o.inn, 90)}<br>Адрес: ${gap(o.address)}<br>Тел.: ${gap(o.phone, 90)}${o.account ? '<br>р/с ' + E(o.account) + (o.bank ? ', ' + E(o.bank) : '') + (o.mfo ? ', МФО ' + E(o.mfo) : '') : ''}`;
  const money = (c) => (c.amount ? F.num(+c.amount, c.cur === 'USD' ? 2 : 0) + (c.cur === 'USD' ? ' долларов США' : ' сум') : '');
  SM.contractHTML = function (c) {
    const t = TPL[c.tpl] || TPL.sale, co = SM.db.settings.company, cl = c.clientId ? SM.client(c.clientId) : {};
    const o = c.opts || {};
    const P = [];
    const sec = (title, text) => P.push(`<p><b>${P.length + 1}. ${title}.</b> ${text}</p>`);
    if (c.tpl === 'service') sec('Предмет договора', `${t.we} оказывает ${t.td} услуги шиномонтажа, балансировки и ремонта колёс легковых и грузовых автомобилей, а ${t.they} принимает и оплачивает услуги по прейскуранту ${t.wg}.`);
    else if (c.tpl === 'supply') sec('Предмет договора', `${t.we} обязуется поставлять ${t.td} партиями шины, диски и сопутствующие товары, а ${t.they} — принимать и оплачивать их. Ассортимент, количество и цена партии указываются в заявках и накладных, являющихся неотъемлемой частью договора.`);
    else sec('Предмет договора', `${t.we} передаёт в собственность ${t.tg} автомобильные шины и диски, а ${t.they} принимает товар и оплачивает его. Наименование, количество и цена указываются в накладной.`);
    sec('Цена и порядок оплаты', `Общая сумма договора составляет <b>${gap(money(c))}</b>${c.amount ? ' (' + E(SM.inWords(+c.amount, c.cur)) + ')' : ''}, в т.ч. НДС. Оплата производится в течение ${E(c.payDays || '—')} банковских дней с даты ${c.tpl === 'service' ? 'оказания услуг' : 'отгрузки'} перечислением на расчётный счёт ${t.wg}.`);
    if (o.prepay) sec('Предоплата', `${t.they} вносит предоплату в размере ${E(o.prepayPct || 0)}% от суммы договора в течение 3 банковских дней с даты подписания. Остаток оплачивается в срок, указанный в п. 2.`);
    if (c.tpl !== 'service') sec('Условия доставки', `${E(c.delivery || DELIVERY[0])}. Право собственности и риск случайной гибели переходят к ${t.td} с момента подписания накладной.`);
    if (o.warranty) sec('Гарантия', `${t.we} предоставляет гарантию 12 месяцев на заводские дефекты шин и дисков при соблюдении правил эксплуатации. Гарантия не распространяется на механические повреждения и износ.`);
    if (o.penalty) sec('Ответственность за просрочку', `За просрочку оплаты ${t.they} уплачивает пеню 0,1% от неоплаченной суммы за каждый день просрочки, но не более 10% от суммы договора.`);
    if (o.storage) sec('Хранение шин', `${t.we} принимает шины ${t.tg} на сезонное хранение на своём складе по акту приёма-передачи и возвращает их по первому требованию. Стоимость хранения — по прейскуранту.`);
    sec('Электронный документооборот', 'Договор, накладные и счета-фактуры оформляются в электронном виде через оператора ЭДО Didox и подписываются электронной цифровой подписью (E-IMZO), что равносильно собственноручной подписи.');
    sec('Срок действия', `Договор вступает в силу с момента подписания и действует до 31.12.${new Date(c.date || Date.now()).getFullYear()}.`);
    return `<div class="doc-head"><div>г. ${gap(c.city, 90)}</div><div class="doc-r">${c.date ? F.date(c.date) : gap('', 90)}</div></div>
      <h1>${t.title}<br>№ ${gap(c.no, 80)}</h1>
      <p>${E(co.name)}, именуемое в дальнейшем «${t.we}», в лице директора ${E(co.director)}, с одной стороны, и ${gap(cl.name, 200)}, именуемое в дальнейшем «${t.they}»${cl.contact ? ', в лице ' + E(cl.contact) : ''}, с другой стороны, заключили настоящий договор о нижеследующем.</p>
      ${P.join('')}
      <p><b>${P.length + 1}. Реквизиты и подписи сторон</b></p>
      <table><tbody><tr><td style="width:50%"><b>${t.we}</b><br>${req(co)}</td><td><b>${t.they}</b><br>${req(cl)}</td></tr></tbody></table>
      <div class="doc-sign"><div>${t.we} · ${E(co.director)}</div><div>${t.they}${cl.contact ? ' · ' + E(cl.contact) : ''}</div></div>`;
  };

  /* ---------- Экран ---------- */
  const salesOf = (cid) => (cid ? SM.db.sales.filter((s) => s.clientId === cid && s.state !== 'draft' && s.state !== 'cancelled' && SM.saleVisible(s)).slice().reverse() : []);
  function form(edit) {
    const dis = edit ? '' : raw('disabled');
    const sales = salesOf(st.clientId);
    const cl = st.clientId ? SM.client(st.clientId) : null;
    return html`<form id="ctr-form" class="stack" style="gap:16px" autocomplete="off">
      <div class="field"><label>1. Шаблон</label><select class="select" name="tpl" ${dis}>${UI.options(Object.entries(TPL).map(([k, v]) => [k, v.name]), st.tpl)}</select></div>
      <div class="field"><label>2. Контрагент <span class="req">*</span></label><select class="select" name="clientId" ${dis}>${UI.options(SM.db.clients.map((c) => [c.id, c.name]), st.clientId, 'Выберите из справочника клиентов')}</select>
        <span class="hint">${cl ? html`ИНН ${cl.inn || '—'} · ${cl.phone || 'без телефона'}` : 'Название, ИНН, адрес и телефон подставятся в договор'}</span></div>
      <div class="form-grid g3">
        <div class="field"><label>3. Номер</label><input class="input mono" name="no" value="${st.no}" ${dis}></div>
        <div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${st.date}" ${dis}></div>
        <div class="field"><label>Город</label><input class="input" name="city" value="${st.city}" ${dis}></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>4. Сумма</label><input class="input num" name="amount" inputmode="decimal" value="${st.amount}" placeholder="0" ${dis}></div>
        <div class="field"><label>Валюта</label><div class="choice">${[['UZS', 'сум'], ['USD', '$']].map(([k, t]) => html`<label><input type="radio" name="cur" value="${k}" ${st.cur === k ? raw('checked') : ''} ${dis}><span>${t}</span></label>`)}</div></div>
        ${sales.length ? html`<div class="field full"><label>Подставить сумму из продажи</label><select class="select" name="saleId" ${dis}>${UI.options(sales.map((s) => [s.id, SM.saleNo(s) + ' · ' + F.date(s.date) + ' · ' + F.cur(SM.saleCalc(s).total, s.cur)]), st.saleId, 'Не подставлять')}</select></div>` : ''}
        <div class="field"><label>5. Срок оплаты, банк. дней</label><input class="input num" name="payDays" inputmode="numeric" value="${st.payDays}" ${dis}></div>
        <div class="field"><label>Условия доставки</label><select class="select" name="delivery" ${dis}>${UI.options(DELIVERY.map((d) => [d, d]), st.delivery)}</select></div>
      </div>
      <div class="field"><label>6. Дополнительные пункты</label><div class="ctr-opts">
        ${OPTS.map(([k, t, h]) => html`<div class="ctr-opt"><label class="switch"><input type="checkbox" name="opt_${k}" ${st.opts[k] ? raw('checked') : ''} ${dis}><i></i><span><b class="fs-13">${t}</b><span class="cell-sub">${h}</span></span></label>
          ${k === 'prepay' ? html`<span class="ctr-pct"><input class="input input-sm num" name="prepayPct" inputmode="numeric" value="${st.opts.prepayPct}" aria-label="Предоплата, %" ${st.opts.prepay && edit ? '' : raw('disabled')}>%</span>` : ''}</div>`)}
      </div></div>
    </form>`;
  }
  const rowsOf = () => list().filter((c) => !SM.flag('ownOnly') || SM.client(c.clientId).sellerId === SM.user.id).slice().reverse();
  function contractsList(edit) {
    const rows = rowsOf();
    return html`<div class="card" id="ctr-list"><div class="card-h"><h3>${I('file')}Договоры</h3><span class="sub right">${rows.length} · статусы Didox</span></div><div class="card-b" style="padding-top:12px">
      ${rows.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Договор</th><th>Контрагент</th><th class="r">Сумма</th><th>Статус Didox</th><th></th></tr></thead><tbody>
        ${rows.map((c) => html`<tr data-ctr="${c.id}"><td><span class="cell-title mono">${c.no}</span><span class="cell-sub">${(TPL[c.tpl] || TPL.sale).name} · ${F.date(c.date)}</span></td><td>${SM.client(c.clientId).name}</td><td class="r num">${c.amount ? F.cur(+c.amount, c.cur) : '—'}</td>
          <td>${UI.badge(STATUS[c.status] || STATUS.draft)}${c.didoxId ? html`<span class="cell-sub mono">Didox ${c.didoxId}</span>` : ''}</td>
          <td class="r nowrap"><button type="button" class="btn btn-ghost btn-sm" data-open="${c.id}">${I('eye')}Открыть</button>${edit ? html`<button type="button" class="btn btn-ghost btn-sm" data-again="${c.id}">${I('repeat')}Повторить</button>` : ''}</td></tr>`)}</tbody></table></div>` : UI.empty('Договоров пока нет', 'Заполните форму и сохраните черновик', 'file')}</div></div>`;
  }
  function page() {
    const edit = SM.can('contracts', 2);
    if (!st) st = blank();
    const t = st.id ? list().find((c) => c.id === st.id) : null;
    return html`
      ${UI.pageHead('Конструктор договоров', 'Шаблон, контрагент из справочника, условия и дополнительные пункты — договор собирается справа · подпись и отправка через Didox', html`<span class="chip accent">${I('info')}Демо: без реальной отправки в Didox</span>`)}
      <div class="ctr-grid mb-16">
        <div class="card glass"><div class="card-h"><h3>${I('edit')}${st.id ? 'Договор ' + st.no : 'Новый договор'}</h3>${t ? html`<span class="right">${UI.badge(STATUS[t.status])}</span>` : ''}</div>
          <div class="card-b">${form(edit)}
            <div class="ctr-actions">${edit ? html`<button type="button" class="btn btn-secondary" data-x="save">${I('check')}Сохранить черновик</button>` : ''}
              <button type="button" class="btn btn-secondary" data-x="print">${I('print')}Печать / PDF</button>
              ${edit ? html`<button type="button" class="btn btn-primary" data-x="didox">${I('send')}Отправить в Didox</button>` : ''}
              ${st.id && edit ? html`<button type="button" class="btn btn-ghost" data-x="new">${I('plus')}Новый</button>` : ''}</div>
            ${edit ? '' : html`<div class="note-box mt-12">${I('info')}<div>Просмотр: создавать и отправлять договоры может роль с правом «Изменение» на документы.</div></div>`}</div></div>
        <div class="ctr-paper"><div class="ctr-paper-h"><span class="label">Предпросмотр · лист A4</span><span class="chip">${I('zap')}обновляется при вводе</span></div><div class="doc-preview" id="ctr-sheet">${raw(SM.contractHTML(st))}</div></div>
      </div>
      ${contractsList(edit)}`;
  }

  /* ---------- Didox (имитация) ---------- */
  const didoxId = () => Array.from({ length: 16 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  function saveCur(status) {
    let c = st.id && list().find((x) => x.id === st.id);
    if (c && c.status !== 'draft') c = null; // отправленный не меняем — сохраняем копией с новым номером
    if (!c) {
      if (st.id) st.no = nextNo();
      c = { id: SM.uid('ctr'), at: new Date().toISOString(), by: SM.user.id }; list().push(c);
    }
    Object.assign(c, JSON.parse(JSON.stringify(Object.assign({}, st, { id: c.id }))), { status: status || 'draft' });
    st.id = c.id;
    SM.log('Договор: черновик', 'contract', c.id, c.no + ' · ' + SM.client(c.clientId).name);
    SM.save();
    return c;
  }
  function didoxModal(c) {
    const co = SM.db.settings.company;
    const STEPS = [['Подписан нами', 'ЭЦП E-IMZO ' + co.name], ['Отправлен контрагенту', SM.client(c.clientId).name + (SM.client(c.clientId).inn ? ', ИНН ' + SM.client(c.clientId).inn : '')], ['Подписан контрагентом', 'ответная подпись в Didox']];
    const m = UI.modal({ title: 'Отправить в Didox', sub: c.no + ' · ' + SM.client(c.clientId).name, size: 'wide',
      body: html`<div class="note-box warn mb-16">${I('alert')}<div><b>Демо: без реальной отправки в Didox.</b> Подпись и статусы имитируются — документ никуда не уходит.</div></div>
        <div class="field mb-16"><label>Ключ ЭЦП (E-IMZO)</label><div class="dx-keys">
          <label class="dx-key"><input type="radio" name="key" checked><span>${I('shield')}<span><b>${co.name}</b><span class="cell-sub">ИНН ${co.inn} · директор ${co.director} · E-IMZO, действует до 31.12.${new Date().getFullYear() + 1}</span></span></span></label></div></div>
        <ol class="dx-steps">${STEPS.map(([t, s], i) => html`<li class="dx-step" data-step="${i}"><span class="dx-ic">${I('check')}</span><span><b>${t}</b><span class="cell-sub">${s}</span></span></li>`)}</ol>
        <p class="fs-13 muted mt-12 dx-id"></p>`,
      foot: html`<button class="btn btn-ghost" data-close>Закрыть</button><button class="btn btn-primary" data-x="sign">${I('send')}Подписать и отправить</button>` });
    const btn = m.querySelector('[data-x=sign]');
    const step = (i, cls) => m.querySelector(`[data-step="${i}"]`).classList.add(cls);
    btn.onclick = () => {
      btn.disabled = true; btn.lastChild.textContent = 'Отправляем…';
      c.didoxId = didoxId();
      step(0, 'run');
      setTimeout(() => { step(0, 'done'); step(1, 'run'); m.querySelector('.dx-id').textContent = 'Документ в Didox: ' + c.didoxId; }, 900);
      setTimeout(() => { step(1, 'done'); step(2, 'run'); c.status = 'sent'; SM.log('Договор отправлен в Didox', 'contract', c.id, c.no); SM.save(); SM.refresh(); }, 1800);
      setTimeout(() => { step(2, 'done'); c.status = 'signed'; SM.log('Договор подписан контрагентом', 'contract', c.id, c.no); SM.save(); SM.refresh(); btn.lastChild.textContent = 'Готово'; UI.toast('Подписан контрагентом', c.no + ' · Didox ' + c.didoxId + ' · демо'); }, 4600);
    };
  }

  /* для списка «Документов»: те же договоры, статусы и окно Didox; «Открыть» — договор в конструкторе */
  SM.contracts = { list, STATUS, TPL, didox: didoxModal,
    open(id) { const c = list().find((x) => x.id === id); if (!c) return; st = JSON.parse(JSON.stringify(c)); location.hash = '#/contracts'; } };

  SM.page('contracts', {
    title: 'Конструктор договоров', render: page,
    mount(el) {
      const f = el.querySelector('#ctr-form'), sheet = el.querySelector('#ctr-sheet');
      const redraw = () => (sheet.innerHTML = SM.contractHTML(st));
      const read = (e) => {
        const n = e.target.name;
        if (!n) return;
        if (n.startsWith('opt_')) { st.opts[n.slice(4)] = e.target.checked; if (n === 'opt_prepay') f.prepayPct.disabled = !e.target.checked; }
        else if (n === 'prepayPct') st.opts.prepayPct = e.target.value.replace(/[^\d]/g, '').slice(0, 3);
        else if (n === 'amount') st.amount = e.target.value.replace(/[^\d.]/g, '');
        else if (n === 'saleId') { st.saleId = e.target.value; const s = SM.db.sales.find((x) => x.id === st.saleId); if (s) { st.amount = String(Math.round(SM.saleCalc(s).total * 100) / 100); st.cur = s.cur; SM.refresh(); return; } }
        else st[n] = e.target.value;
        if (n === 'clientId') { st.saleId = ''; SM.refresh(); return; } // подсказка и продажи клиента — перерисовкой
        redraw();
      };
      if (f) { f.addEventListener('input', read); f.addEventListener('change', read); f.addEventListener('submit', (e) => e.preventDefault()); }
      const on = (x, fn) => { const b = el.querySelector(`[data-x=${x}]`); if (b) b.onclick = fn; };
      const need = () => { if (st.clientId) return true; f.clientId.closest('.field').classList.add('is-invalid'); UI.toast('Выберите контрагента', 'Без контрагента договор не сохранить', 'warn'); return false; };
      on('save', () => { if (!need()) return; const c = saveCur(); UI.toast('Черновик сохранён', c.no); SM.refresh(); });
      on('print', () => UI.printDoc((TPL[st.tpl] || TPL.sale).name + ' ' + st.no, SM.contractHTML(st)));
      on('didox', () => { if (!need()) return; let c = st.id && list().find((x) => x.id === st.id); if (!c || c.status !== 'draft') c = saveCur(); SM.refresh(); didoxModal(c); });
      on('new', () => { st = blank(); SM.refresh(); });
      UI.$$('[data-open]', el).forEach((b) => (b.onclick = () => { st = JSON.parse(JSON.stringify(list().find((c) => c.id === b.dataset.open))); SM.refresh(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
      UI.$$('[data-again]', el).forEach((b) => (b.onclick = () => { const c = JSON.parse(JSON.stringify(list().find((x) => x.id === b.dataset.again))); st = Object.assign(c, { id: null, no: nextNo(), date: D.todayISO(), status: 'draft', didoxId: '' }); SM.refresh(); window.scrollTo({ top: 0, behavior: 'smooth' }); UI.toast('Договор повторён', 'Новый номер ' + st.no + ' — проверьте условия и сохраните'); }));
    },
  });
})();
