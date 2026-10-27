/* =========================================================
   Товары (ТЗ 5), остатки и движение (6), поступления (7),
   перемещения (8)
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM, UI = SM.ui;
  const { html, raw, fmt: F, d: D } = SM;
  const I = UI.icon;

  const SEASONS = ['Летняя', 'Зимняя', 'Зимняя (шипы)', 'Всесезонная'];
  const ATTR_NAMES = { size: 'Размер', width: 'Ширина', profile: 'Профиль', radius: 'Диаметр', season: 'Сезон', model: 'Модель', index: 'Индекс нагрузки/скорости', pcd: 'Сверловка', et: 'Вылет', dia: 'ЦО', oem: 'OEM-номер', fits: 'Подходит для', volume: 'Объём', type: 'Тип', spec: 'Допуск', capacity: 'Ёмкость', current: 'Пусковой ток', polarity: 'Полярность', length: 'Длина', weight: 'Вес', qty: 'В упаковке' };
  const catOptions = () => SM.db.categories.filter((c) => !c.parent).flatMap((c) => [[c.id, c.name]].concat(SM.db.categories.filter((s) => s.parent === c.id).map((s) => [s.id, '— ' + s.name])));
  const attrChips = (p) => { const a = p.attrs || {}; const keys = SM.isTire(p) ? ['season', 'index'] : Object.keys(a).slice(0, 2); return html`<div class="attrs">${keys.filter((k) => a[k]).map((k) => html`<span class="chip">${a[k]}</span>`)}</div>`; };
  const costOf = (p) => (p.buy || 0) + (p.extra || 0);
  const priceUZS = (p, v = p.price, cur = p.cur) => SM.toUZS(v, cur, SM.rate());

  /* ---------- Справочник товаров ---------- */
  function productsPage(r) {
    const q = (r.q.q || '').toLowerCase(), cat = r.q.cat || '', st = r.q.st || 'active';
    const inCat = (p) => !cat || p.cat === cat || SM.category(p.cat).parent === cat;
    const words = q.split(/\s+/).filter(Boolean);
    const list = SM.db.products.filter((p) => inCat(p) && (st === 'all' || (st === 'active' ? p.active : !p.active)) &&
      (!words.length || words.every((w) => SM.productHay(p).includes(w))));
    const edit = SM.can('products', 2);
    return html`
      ${UI.pageHead('Товары', 'Единый справочник шин, запчастей и сопутствующих товаров · поиск по коду, названию, альтернативному названию, размеру и части слова', html`
        ${edit ? html`<button class="btn btn-secondary" data-x="import">${I('upload')}Импорт из Excel</button>` : ''}
        ${edit ? html`<button class="btn btn-secondary" data-x="import1c">${I('upload')}Импорт из 1С</button>` : ''}
        <button class="btn btn-secondary" data-x="export">${I('download')}Excel</button>
        ${edit ? html`<button class="btn btn-primary" data-x="new">${I('plus')}Товар</button>` : ''}`)}
      <div class="card"><div class="card-h">${UI.searchInput(r.q.q, '205/55 R16, колодки нексия, SM-00013, 1C-010211…')}${UI.filterSelect('cat', cat, catOptions(), 'Все категории')}${UI.filterSelect('st', st, [['active', 'Активные'], ['off', 'Отключённые'], ['all', 'Все статусы']])}<span class="right muted fs-13 fw-7">${list.length} ${F.plural(list.length, 'позиция', 'позиции', 'позиций')}</span></div>
        <div class="card-b" style="padding-top:12px">${list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Товар</th><th>Категория</th><th>Характеристики</th><th class="r">Себестоимость</th><th class="r">Цена</th><th class="r">Остаток</th><th></th></tr></thead><tbody>
          ${list.map((p) => { const qn = SM.qty(p.id), av = SM.available(p.id); return html`<tr class="click ${p.active ? '' : 'row-muted'}" data-act="open-product" data-id="${p.id}">
            <td><div class="row nowrap">${UI.thumb(p)}<div style="min-width:0"><span class="cell-title">${p.name}</span><span class="cell-sub"><span class="mono">${p.code}</span>${p.sku ? html` · арт. <span class="mono">${p.sku}</span>` : ''}${p.oldCode ? ' · старый ' + p.oldCode : ''}</span></div></div></td>
            <td><span class="cell-title fw-6">${SM.category(p.cat).name}</span><span class="cell-sub">${p.brand}</span></td>
            <td>${attrChips(p)}</td>
            <td class="r nowrap">${F.cur(costOf(p), p.buyCur || p.cur)}</td>
            <td class="r nowrap"><b>${F.cur(p.price, p.cur)}</b>${p.cur === 'USD' ? html`<span class="cell-sub">≈ ${F.short(priceUZS(p))} сум</span>` : ''}</td>
            <td class="r nowrap"><span class="stock-cell ${qn <= 0 ? 'zero' : SM.isLow(p) ? 'low' : ''}">${qn} ${p.unit}</span>${av !== qn ? html`<span class="cell-sub">доступно ${av}</span>` : ''}</td>
            <td class="td-act">${edit ? UI.actBtns(p.id, { editTip: 'Изменить товар', delTip: 'Удалить товар' }) : ''}</td></tr>`; })}</tbody></table></div>` : UI.empty('Товары не найдены', 'Попробуйте часть названия или кода', 'search')}</div></div>`;
  }
  SM.openProduct = function (id) {
    const p = SM.product(id);
    const pts = SM.activePoints();
    const moves = SM.db.moves.filter((m) => m.productId === id).slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const cost = costOf(p), margin = p.price && cost ? (SM.toUZS(p.price, p.cur, SM.rate()) / SM.toUZS(cost, p.buyCur || p.cur, SM.rate()) - 1) * 100 : 0;
    const body = html`
      <div class="row nowrap" style="gap:16px;align-items:flex-start">${UI.thumb(p, true)}<div class="grow"><div class="row"><span class="chip code">${p.code}</span>${p.sku ? html`<span class="chip code">арт. ${p.sku}</span>` : ''}${p.oldCode ? html`<span class="chip code">${p.oldCode}</span>` : ''}${p.active ? '' : html`<span class="badge b-bad">отключён</span>`}</div>
        <div class="fs-13 muted mt-8">${SM.category(SM.catRoot(p.cat).id).name} › ${SM.category(p.cat).name} · ${p.maker}</div>
        ${(p.alt || []).length ? html`<div class="attrs mt-8">${p.alt.map((a) => html`<span class="chip accent">«${a}»</span>`)}</div>` : ''}</div></div>
      <div class="grid g-4 keep-2 mt-16">
        <div class="cash-acc"><span>${I('inbox')}Закупка</span><b>${F.cur(p.buy, p.buyCur || p.cur)}</b></div>
        <div class="cash-acc"><span>${I('coins')}Себестоимость</span><b>${F.cur(cost, p.buyCur || p.cur)}</b><div class="fs-12 muted fw-7">+ доп. расходы ${F.cur(p.extra || 0, p.buyCur || p.cur)}</div></div>
        <div class="cash-acc"><span>${I('tag')}Цена продажи</span><b class="accent-t">${F.cur(p.price, p.cur)}</b><div class="fs-12 muted fw-7">НДС ${p.vat}%</div></div>
        <div class="cash-acc"><span>${I('trendUp')}Наценка</span><b class="${margin > 0 ? 'ok-t' : 'bad-t'}">${F.pct(margin, 0)}</b></div>
      </div>
      <div class="section-t">Характеристики</div>
      <dl class="dl">${Object.entries(p.attrs || {}).map(([k, v]) => html`<dt>${ATTR_NAMES[k] || k}</dt><dd>${v}</dd>`)}<dt>Единица</dt><dd>${p.unit}</dd><dt>Мин. остаток</dt><dd>${p.min} ${p.unit}</dd>${p.comment ? html`<dt>Комментарий</dt><dd>${p.comment}</dd>` : ''}</dl>
      <div class="section-t">Остатки по точкам</div>
      <div class="table-wrap"><table class="table compact"><thead><tr><th>Точка</th><th class="r">Остаток</th><th class="r">Резерв</th><th class="r">Доступно</th></tr></thead><tbody>
        ${pts.map((pt) => { const q = SM.qty(id, pt.id), rs = SM.reserved(id, pt.id); return html`<tr><td><span class="cell-title fw-6">${pt.name}</span></td><td class="r stock-cell ${q <= 0 ? 'zero' : ''}">${q}</td><td class="r">${rs || '—'}</td><td class="r fw-8">${q - rs}</td></tr>`; })}</tbody>
        <tfoot><tr><td>Итого</td><td class="r">${SM.qty(id)}</td><td class="r">${SM.reserved(id) || '—'}</td><td class="r">${SM.available(id)}</td></tr></tfoot></table></div>
      <div class="section-t">История движения</div>
      ${moves.length ? html`<div class="table-wrap"><table class="table compact"><thead><tr><th>Дата</th><th>Операция</th><th>Точка</th><th class="r">Кол-во</th></tr></thead><tbody>${moves.slice(0, 20).map((m) => html`<tr><td class="nowrap">${F.dt(m.at)}</td><td><span class="cell-title fw-6">${SM.MOVE_KINDS[m.kind] || m.kind}</span><span class="cell-sub">${moveDoc(m)}</span></td><td>${SM.point(m.pointId).name}</td><td class="r">${m.qty > 0 ? html`<span class="amt-in">+${m.qty}</span>` : html`<span class="amt-out">−${-m.qty}</span>`}</td></tr>`)}</tbody></table></div>` : html`<p class="muted fs-13">Движений нет</p>`}`;
    const btn = [];
    if (SM.can('products', 2)) btn.push(html`<button class="btn btn-primary" data-x="edit">${I('edit')}Изменить</button>`);
    if (SM.can('stock', 2)) btn.push(html`<button class="btn btn-secondary" data-x="adjust">${I('sliders')}Списание / корректировка</button>`);
    if (SM.can('products', 2)) btn.push(html`<button class="btn btn-ghost" data-x="toggle">${p.active ? 'Отключить' : 'Включить'}</button>`, html`<button class="btn btn-danger" data-x="delete">${I('trash')}Удалить</button>`);
    const dr = UI.drawer({ title: p.name, sub: SM.category(p.cat).name + ' · ' + p.brand, body, foot: btn.length ? html`${btn}` : null, size: 'wide' });
    SM.trackDrawer(SM.openProduct, [id], dr, '#/products');
    const on = (s, fn) => { const b = dr.querySelector(s); if (b) b.onclick = fn; };
    on('[data-x=edit]', () => productForm(p));
    on('[data-x=adjust]', () => adjustModal(p.id));
    on('[data-x=toggle]', () => { p.active = !p.active; SM.log(p.active ? 'Товар включён' : 'Товар отключён', 'product', p.id, p.name); SM.save(); UI.toast(p.active ? 'Товар включён' : 'Товар отключён', p.name, 'info', { icon: 'tag' }); SM.refresh(); });
    on('[data-x=delete]', () => SM.deleteProductAsk(p));
  };
  /* удаление товара: только если он не участвовал в продажах и поступлениях (остатки удаляются вместе с ним) */
  SM.deleteProductAsk = async function (p) {
    const n = SM.productLinks(p.id);
    if (n) return UI.toast('Нельзя удалить товар', p.name + ' есть в документах (' + n + '). Его можно отключить — он пропадёт из подбора', 'bad', { icon: 'lock' });
    if (!(await UI.confirmDelete('Удалить товар?', p.name + ' (' + p.code + ') и его остатки (' + SM.qty(p.id) + ' ' + p.unit + ') будут удалены без возможности восстановления.'))) return;
    SM.ops.deleteProduct(p); UI.closeAll(); UI.toast('Товар удалён', p.code + ' · ' + p.name, 'ok', { icon: 'trash' }); SM.refresh();
  };
  function productForm(p, opt = {}) {
    p = p || { cat: 'c-t-summer', unit: 'шт', cur: 'UZS', buyCur: 'UZS', vat: 12, min: 4, attrs: {}, alt: [], active: true };
    const a = p.attrs || {};
    const m = UI.modal({ title: p.id ? 'Изменить товар' : 'Новый товар', sub: p.id ? p.code : 'Код присвоится автоматически: ' + SM.nextProductCode(), size: 'wide',
      body: html`<form class="form-grid g3" autocomplete="off">
        <div class="field full"><label>Основное наименование <span class="req">*</span></label><input class="input" name="name" value="${p.name || ''}" autofocus></div>
        <div class="field full"><label>Альтернативные названия</label><input class="input" name="alt" value="${(p.alt || []).join(', ')}" placeholder="Как называют продавцы и клиенты: колодки нексия, тормозные ласетти"><span class="hint">Через запятую — по ним тоже работает поиск</span></div>
        <div class="field"><label>Категория</label><select class="select" name="cat">${UI.options(catOptions(), p.cat)}</select></div>
        <div class="field"><label>Производитель</label><input class="input" name="maker" value="${p.maker || ''}"></div>
        <div class="field"><label>Бренд</label><input class="input" name="brand" value="${p.brand || ''}"></div>
        <div class="field"><label>Артикул</label><input class="input" name="sku" value="${p.sku || ''}" placeholder="Артикул производителя: 1018398"></div>
        <div class="field"><label>Код в старой программе</label><input class="input" name="oldCode" value="${p.oldCode || ''}"></div>
        <div class="field"><label>Единица</label><select class="select" name="unit">${UI.options([['шт', 'шт'], ['компл', 'компл'], ['кан', 'канистра'], ['уп', 'упаковка'], ['л', 'литр'], ['кг', 'кг']], p.unit)}</select></div>
        <div class="field"><label>Мин. остаток</label><input class="input num" type="number" name="min" min="0" value="${p.min || 0}"></div>
        <div class="full tire-box form-grid g3" style="padding:14px;border-radius:14px;border:1px dashed var(--line-2)">
          <div class="field"><label>Ширина</label><input class="input num" name="width" value="${a.width || ''}" placeholder="205"></div>
          <div class="field"><label>Профиль</label><input class="input num" name="profile" value="${a.profile || ''}" placeholder="55"></div>
          <div class="field"><label>Диаметр</label><input class="input" name="radius" value="${a.radius || ''}" placeholder="R16"></div>
          <div class="field"><label>Сезон</label><select class="select" name="season">${UI.options(SEASONS.map((s) => [s, s]), a.season || 'Летняя')}</select></div>
          <div class="field"><label>Модель</label><input class="input" name="model" value="${a.model || ''}"></div>
          <div class="field"><label>Индекс нагрузки/скорости</label><input class="input" name="index" value="${a.index || ''}" placeholder="91V"></div></div>
        <div class="field full other-box"><label>Характеристики</label><textarea class="textarea" name="attrs" placeholder="OEM: 96879797&#10;Подходит для: Nexia, Cobalt">${Object.entries(a).map(([k, v]) => (ATTR_NAMES[k] || k) + ': ' + v).join('\n')}</textarea></div>
        <div class="field"><label>Закупочная цена</label><input class="input" name="buy" ${UI.moneyAttrs(null, 2)} value="${p.buy ? UI.fmtInput(p.buy, 2) : ''}"></div>
        <div class="field"><label>Доп. расходы на ед.</label><input class="input" name="extra" ${UI.moneyAttrs(null, 2)} value="${UI.fmtInput(p.extra || 0, 2)}"></div>
        <div class="field"><label>Валюта закупки</label><select class="select" name="buyCur">${UI.options([['UZS', 'Сум'], ['USD', '$']], p.buyCur || 'UZS')}</select></div>
        <div class="field"><label>Цена продажи <span class="req">*</span></label><input class="input" name="price" ${UI.moneyAttrs(null, 2)} value="${p.price ? UI.fmtInput(p.price, 2) : ''}"></div>
        <div class="field"><label>Валюта продажи</label><select class="select" name="cur">${UI.options([['UZS', 'Сум'], ['USD', '$']], p.cur)}</select></div>
        <div class="field"><label>НДС</label><select class="select" name="vat">${UI.options([['12', '12%'], ['0', 'Без НДС']], String(p.vat))}</select></div>
        <div class="field full"><label>Фото</label>${UI.fileField('photo', { label: 'Выбрать фото', accept: 'image/*' })}<span class="hint">В демо фото не загружается на сервер — у товаров без фото показывается значок категории</span></div>
        <div class="field full"><label>Комментарий</label><input class="input" name="comment" value="${p.comment || ''}"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Сохранить</button>` });
    const f = m.querySelector('form');
    const sw = () => { const tire = SM.catRoot(f.cat.value).id === 'c-tires'; f.querySelector('.tire-box').style.display = tire ? '' : 'none'; f.querySelector('.other-box').style.display = tire ? 'none' : ''; };
    f.cat.addEventListener('change', sw); sw();
    // из «Остатков» — сразу к полю «Мин. остаток» (после автофокуса окна на названии)
    if (opt.focus === 'min') setTimeout(() => { f.min.scrollIntoView({ block: 'center' }); f.min.focus(); f.min.select(); }, 120);
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f);
      if (!d.name) return UI.invalid(f, 'name', 'Укажите наименование');
      d.price = UI.num(d.price); d.buy = UI.num(d.buy); d.extra = UI.num(d.extra);
      if (!(d.price > 0)) return UI.invalid(f, 'price', 'Укажите цену продажи');
      d.sku = (d.sku || '').trim();
      const skuDup = SM.skuOwner(d.sku, p.id);
      if (skuDup) return UI.invalid(f, 'sku', 'Артикул уже есть у ' + skuDup.code + ' · ' + skuDup.name);
      const tire = SM.catRoot(d.cat).id === 'c-tires';
      let attrs = {};
      if (tire) { attrs = { size: d.width && d.profile && d.radius ? d.width + '/' + d.profile + ' ' + d.radius : '', width: d.width, profile: d.profile, radius: d.radius, season: d.season, model: d.model, index: d.index }; }
      else { const rev = Object.fromEntries(Object.entries(ATTR_NAMES).map(([k, v]) => [v.toLowerCase(), k])); (d.attrs || '').split('\n').forEach((ln) => { const i = ln.indexOf(':'); if (i > 0) { const k = ln.slice(0, i).trim(); attrs[rev[k.toLowerCase()] || k] = ln.slice(i + 1).trim(); } }); }
      Object.keys(attrs).forEach((k) => !attrs[k] && delete attrs[k]);
      const dup = SM.db.products.find((x) => x.id !== p.id && ((d.oldCode && x.oldCode === d.oldCode) || x.name.toLowerCase() === d.name.toLowerCase()));
      if (dup) return UI.toast('Такой товар уже есть', dup.code + ' · ' + dup.name, 'bad');
      const saved = SM.ops.saveProduct({ id: p.id, name: d.name, alt: d.alt ? d.alt.split(',').map((s) => s.trim()).filter(Boolean) : [], cat: d.cat, maker: d.maker, brand: d.brand, sku: d.sku, oldCode: d.oldCode, unit: d.unit, min: +d.min || 0,
        attrs, buy: +d.buy || 0, extra: +d.extra || 0, buyCur: d.buyCur, price: +d.price, cur: d.cur, vat: +d.vat, comment: d.comment, active: p.active !== false });
      UI.closeTop(); UI.toast(p.id ? 'Товар изменён' : 'Товар добавлен', saved.code + ' · ' + saved.name, 'ok', { icon: 'tire' }); SM.refresh();
    };
  }

  /* ---------- Импорт справочника из Excel (ТЗ 5.3) ---------- */
  const IMPORT_COLS = ['Код в старой программе', 'Наименование', 'Артикул', 'Альтернативные названия', 'Категория', 'Производитель', 'Бренд', 'Ед.', 'Закупочная цена', 'Доп. расходы', 'Цена продажи', 'Валюта', 'Мин. остаток', 'Размер шины', 'Сезон'];
  /* CSV: разделитель «;» или «,»; значение в кавычках может содержать разделитель и кавычки */
  function parseCSV(text) {
    const t = text.replace(/^﻿/, '');
    const sep = t.split('\n')[0].includes(';') ? ';' : ',';
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch !== '"') cell += ch; else if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cell.trim()); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
    return rows;
  }
  // числа из Excel и CSV: «1 450 000», «58000,50», неразрывные пробелы; пустое — 0
  const impNum = (v) => { const s = String(v == null ? '' : v).replace(/[\s ]/g, '').replace(',', '.'); return s === '' ? 0 : Number(s); };
  // валюта: пусто/UZS/сум — сумы, USD/$/доллар — доллары, остальное — ошибка
  const impCur = (v) => { const s = String(v || '').trim().toLowerCase(); if (!s || /^(uzs|сум|so'?m)/.test(s)) return 'UZS'; if (/^(usd|\$|долл)/.test(s)) return 'USD'; return null; };
  // пример файла в окне импорта и в шаблоне — одни и те же строки; обязательные колонки — те, без которых парсер не примет строку
  const IMPORT_REQ = ['Наименование', 'Категория', 'Цена продажи'];
  const IMPORT_SAMPLE = [
    ['1C-099001', 'Michelin Pilot Sport 4 225/45 R17 94Y', '417234', 'мишлен спорт 17', 'Летние шины', 'Michelin, Франция', 'Michelin', 'шт', 1450000, 30000, 1950000, 'UZS', 4, '225/45 R17', 'Летняя'],
    ['1C-099003', 'Масло моторное Mobil Super 3000 5W-40, 4 л', '152566', 'мобил 5w40', 'Масла и жидкости', 'ExxonMobil, США', 'Mobil', 'шт', 310000, 5000, 420000, 'UZS', 6, '', ''],
    ['1C-099002', 'Фильтр салонный MANN CU 2533', 'CU 2533', 'салонник кобальт', 'Фильтры', 'MANN-FILTER', 'MANN', 'шт', 58000, 2000, 89000, 'UZS', 10, '', ''],
  ];
  const xlSample = () => html`<div class="xl-cap">Так должен выглядеть файл в Excel — первая строка с названиями колонок, дальше товары:</div>
    <div class="xl-sample"><table><thead><tr class="xl-l"><th></th>${IMPORT_COLS.map((_, i) => html`<th>${String.fromCharCode(65 + i)}</th>`)}</tr>
      <tr class="xl-h"><th>1</th>${IMPORT_COLS.map((c) => html`<th>${c}${IMPORT_REQ.includes(c) ? html` <span class="req">*</span>` : ''}</th>`)}</tr></thead>
      <tbody>${IMPORT_SAMPLE.map((r, i) => html`<tr><td>${i + 2}</td>${r.map((v) => html`<td>${v}</td>`)}</tr>`)}<tr><td>${IMPORT_SAMPLE.length + 2}</td>${IMPORT_COLS.map(() => html`<td></td>`)}</tr></tbody></table></div>
    <ul class="xl-notes"><li><b>Обязательные колонки</b> отмечены звёздочкой: наименование, категория (как в справочнике), цена продажи. Остальные можно оставить пустыми.</li>
      <li>Цены и количество — числом без пробелов и букв: 1950000, а не «1 950 000 сум». Валюта — UZS или USD, пусто — сумы.</li>
      <li>Дубли пропускаются: если код старой программы, артикул или наименование уже есть в справочнике (или повторяются в файле), строка не добавится — причина будет в результате.</li></ul>`;
  function importModal() {
    const m = UI.modal({ title: 'Импорт товаров из Excel', sub: 'Проверка ошибок и защита от дублей: совпадение кода старой программы или названия — строка пропускается', size: 'xl',
      body: html`<div class="row"><label class="btn btn-primary">${I('upload')}Выбрать файл .xlsx / .csv<input type="file" accept=".xlsx,.xls,.csv" hidden data-x="file"></label><button class="btn btn-secondary" data-x="tpl">${I('download')}Скачать шаблон</button></div><div class="mt-16">${xlSample()}</div><div id="impRes" class="mt-16"></div>`,
      foot: html`<button class="btn btn-ghost" data-close>Закрыть</button><button class="btn btn-secondary" data-x="report" disabled>${I('download')}Результат в Excel</button><button class="btn btn-primary" data-x="go" disabled>${I('check')}Импортировать</button>` });
    let ready = [], out = [];
    const status = (x) => (x.err ? 'ошибка: ' + x.err : x.dup ? 'пропуск: ' + x.dup : x.code ? 'добавлен · ' + x.code : 'будет добавлен');
    const drawRes = () => {
      const bad = out.filter((x) => x.err), dup = out.filter((x) => x.dup), done = out.some((x) => x.code);
      m.querySelector('#impRes').innerHTML = String(html`<div class="grid g-3 keep-2"><div class="cash-acc"><span>${I('check')}${done ? 'Добавлено' : 'Будут добавлены'}</span><b class="ok-t">${ready.length}</b></div><div class="cash-acc"><span>${I('copy')}Дубли — пропуск</span><b class="warn-t">${dup.length}</b></div><div class="cash-acc"><span>${I('alert')}Ошибки</span><b class="bad-t">${bad.length}</b></div></div>
        <div class="table-wrap mt-16" style="max-height:340px;overflow:auto"><table class="table compact"><thead><tr><th>Строка</th><th>Наименование</th><th class="r">Цена</th><th>Результат</th></tr></thead><tbody>${out.map((x) => html`<tr class="${x.err ? 'row-bad' : x.dup ? 'row-warn' : ''}"><td>${x.n}</td><td>${x.name || '—'}</td><td class="r">${x.price > 0 ? F.cur(x.price, x.cur || 'UZS') : '—'}</td><td>${html`<span class="badge ${x.err ? 'b-bad' : x.dup ? 'b-warn' : 'b-ok'}">${x.err || x.dup || (x.code ? 'добавлен · ' + x.code : 'новый')}</span>`}</td></tr>`)}</tbody></table></div>`);
    };
    // ТЗ 5.3: результат импорта — построчно, с причиной пропуска; после импорта — с присвоенными кодами
    m.querySelector('[data-x=report]').onclick = () => UI.exportXLSX('Результат_импорта_' + D.todayISO(), [['Строка', 'Код в старой программе', 'Наименование', 'Артикул', 'Цена продажи', 'Валюта', 'Результат'], ...out.map((x) => [x.n, x.old, x.name, x.sku, x.price > 0 ? x.price : '', x.cur || '', status(x)])], 'Результат');
    m.querySelector('[data-x=tpl]').onclick = () => UI.exportXLSX('Шаблон_импорта_товаров', [IMPORT_COLS, ...IMPORT_SAMPLE], 'Товары');
    m.querySelector('[data-x=file]').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const res = m.querySelector('#impRes');
      res.innerHTML = '<p class="muted">Читаю файл…</p>';
      let rows;
      try {
        if (/\.csv$/i.test(file.name)) rows = parseCSV(await file.text());
        else { const X = await UI.loadXLSX(); const wb = X.read(await file.arrayBuffer()); rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }); }
      } catch (err) { res.innerHTML = String(html`<div class="note-box bad">${I('alert')}<div>Не удалось прочитать файл: ${err.message}</div></div>`); return; }
      const head = (rows[0] || []).map((h) => String(h).trim().toLowerCase());
      const col = (name) => head.indexOf(name.toLowerCase());
      if (col('Наименование') < 0 || col('Цена продажи') < 0) { res.innerHTML = String(html`<div class="note-box bad">${I('alert')}<div>В первой строке нет колонок «Наименование» и «Цена продажи» — скачайте шаблон и заполните его.</div></div>`); return; }
      // дубли внутри файла ловим и по коду старой программы, и по названию — как при проверке по справочнику
      const seen = new Set();
      out = rows.slice(1).map((r, i) => [r, i]).filter(([r]) => r.some((v) => String(v).trim())).map(([r, i]) => {
        const g = (n) => { const c = col(n); return c >= 0 ? String(r[c] == null ? '' : r[c]).trim() : ''; };
        const name = g('Наименование'), sku = g('Артикул'), old = g('Код в старой программе'), price = impNum(g('Цена продажи')), cur = impCur(g('Валюта'));
        const nums = { buy: impNum(g('Закупочная цена')), extra: impNum(g('Доп. расходы')), min: impNum(g('Мин. остаток')) };
        const catName = g('Категория').toLowerCase();
        const cat = SM.db.categories.find((c) => c.name.toLowerCase() === catName || c.name.toLowerCase().replace(' шины', '') === catName);
        const row = { n: i + 2, name, sku, old, price, cur, nums, cat: cat && cat.id, raw: g };
        const kOld = old && 'o:' + old.toLowerCase(), kSku = sku && 'a:' + SM.skuKey(sku), kName = 'n:' + name.toLowerCase();
        if (!name) row.err = 'нет наименования';
        else if (!(price > 0)) row.err = 'цена продажи не число';
        else if (!cat) row.err = 'категория «' + g('Категория') + '» не найдена';
        else if (!cur) row.err = 'валюта «' + g('Валюта') + '» — укажите UZS или USD';
        else if (Object.values(nums).some((x) => !isFinite(x) || x < 0)) row.err = 'закупка, доп. расходы или мин. остаток — не число';
        else if (SM.skuOwner(sku)) row.dup = 'артикул уже есть у ' + SM.skuOwner(sku).code;
        else if (SM.db.products.some((p) => (old && p.oldCode === old) || p.name.toLowerCase() === name.toLowerCase())) row.dup = 'уже есть в справочнике';
        else if ((kOld && seen.has(kOld)) || (kSku && seen.has(kSku)) || seen.has(kName)) row.dup = 'повтор в файле';
        if (!row.err) { if (kOld) seen.add(kOld); if (kSku) seen.add(kSku); seen.add(kName); }
        return row;
      });
      ready = out.filter((x) => !x.err && !x.dup);
      drawRes();
      m.querySelector('[data-x=go]').disabled = !ready.length;
      m.querySelector('[data-x=report]').disabled = !out.length;
    };
    m.querySelector('[data-x=go]').onclick = () => {
      ready.forEach((x) => {
        const g = x.raw, tire = SM.catRoot(x.cat).id === 'c-tires', size = g('Размер шины');
        const mm = size.match(/(\d+)\/(\d+)\s*(R[\d.]+)/);
        x.code = SM.nextProductCode();
        SM.db.products.push({ id: SM.uid('pr'), code: x.code, sku: x.sku, oldCode: x.old, name: x.name, alt: g('Альтернативные названия').split(',').map((s) => s.trim()).filter(Boolean), cat: x.cat, maker: g('Производитель'), brand: g('Бренд'), unit: g('Ед.') || 'шт',
          attrs: tire && mm ? { size, width: mm[1], profile: mm[2], radius: mm[3], season: g('Сезон') } : {}, buy: x.nums.buy, extra: x.nums.extra, buyCur: x.cur, price: x.price, cur: x.cur, vat: 12, min: x.nums.min, comment: '', active: true, createdAt: new Date().toISOString() });
      });
      SM.log('Импорт справочника из Excel', 'product', null, 'Добавлено: ' + ready.length + ', дублей пропущено: ' + out.filter((x) => x.dup).length + ', ошибок: ' + out.filter((x) => x.err).length);
      SM.save(); UI.toast('Импорт завершён', 'Добавлено товаров: ' + ready.length + ' · результат можно скачать в Excel'); SM.refresh();
      // окно остаётся открытым: в таблице — присвоенные коды, файл результата доступен
      drawRes();
      m.querySelector('[data-x=go]').disabled = true;
      m.querySelector('[data-x=file]').disabled = true;
    };
  }

  /* ---------- Импорт из 1С: обмен с сайтом (CommerceML 2: import.xml + offers.xml) и список «Номенклатура» (Excel/CSV) ---------- */
  // единицы 1С → наши; незнакомая остаётся как есть
  const C1_UNITS = [[/^(шт|штук|pcs)/, 'шт'], [/^(компл|к-т|комплект)/, 'компл'], [/^кан/, 'кан'], [/^уп/, 'уп'], [/^(л|литр)/, 'л'], [/^(кг|килограмм)/, 'кг']];
  const c1Unit = (v) => { const s = String(v || '').trim().toLowerCase().replace(/\.$/, ''); if (!s) return 'шт'; const u = C1_UNITS.find(([re]) => re.test(s)); return u ? u[1] : s; };
  const c1Season = (v) => { const s = String(v || '').toLowerCase(); return !s ? '' : /всесез/.test(s) ? 'Всесезонная' : /зим/.test(s) ? (/шип/.test(s) ? 'Зимняя (шипы)' : 'Зимняя') : /лет/.test(s) ? 'Летняя' : v; };
  // группа 1С ↔ категория: одинаковый набор слов без учёта порядка и регистра («Шины летние» = «Летние шины»)
  const c1Words = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean).sort().join(' ');
  const c1Cat = (g) => { const w = c1Words(g); const c = w && SM.db.categories.find((x) => c1Words(x.name) === w); return c ? c.id : ''; };
  const sizeAttrs = (s) => { const mm = String(s || '').match(/(\d+)\/(\d+)\s*(R[\d.]+C?)/i); return mm ? { size: mm[1] + '/' + mm[2] + ' ' + mm[3].toUpperCase(), width: mm[1], profile: mm[2], radius: mm[3].toUpperCase() } : {}; };
  // текст файла: UTF-8, а если не читается — windows-1251 (так сохраняет CSV старая 1С и Excel)
  const c1Text = async (file) => { const b = await file.arrayBuffer(); try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { return new TextDecoder('windows-1251').decode(b); } };
  const xKid = (el, n) => (el ? [...el.children].find((x) => x.localName === n) : null);
  const xKids = (el, n) => (el ? [...el.children].filter((x) => x.localName === n) : []);
  const xTxt = (el, n) => { const k = n ? xKid(el, n) : el; return k ? k.textContent.trim() : ''; };
  const xAll = (el, n) => [...el.getElementsByTagName('*')].filter((x) => x.localName === n);
  const xDoc = (t, f) => { const d = new DOMParser().parseFromString(t, 'application/xml'); if (d.getElementsByTagName('parsererror').length) throw new Error(f + ': не XML'); return d; };
  function parseCML(importText, offersText) {
    const imp = xDoc(importText, 'import.xml'), groups = {}, props = {}, vals = {};
    if (!xAll(imp, 'Товар').length) throw new Error('в import.xml нет товаров (раздел «Каталог → Товары»)');
    xAll(imp, 'Группа').forEach((g) => { const id = xTxt(g, 'Ид'); if (id) groups[id] = xTxt(g, 'Наименование'); });
    xAll(imp, 'Свойство').forEach((s) => { const id = xTxt(s, 'Ид'); if (!id) return; props[id] = xTxt(s, 'Наименование').toLowerCase(); xAll(s, 'Справочник').forEach((v) => (vals[xTxt(v, 'ИдЗначения')] = xTxt(v, 'Значение'))); });
    const items = xAll(imp, 'Товар').map((t, i) => {
      const req = {}, pr = {};
      xKids(xKid(t, 'ЗначенияРеквизитов'), 'ЗначениеРеквизита').forEach((r) => (req[xTxt(r, 'Наименование').toLowerCase()] = xTxt(r, 'Значение')));
      xKids(xKid(t, 'ЗначенияСвойств'), 'ЗначенияСвойства').forEach((v) => { const val = xTxt(v, 'Значение'); pr[props[xTxt(v, 'Ид')] || xTxt(v, 'Ид').toLowerCase()] = vals[val] || val; });
      const u = xKid(t, 'БазоваяЕдиница');
      return { n: i + 1, id: xTxt(t, 'Ид'), old: xTxt(t, 'Код') || req['код'] || '', sku: xTxt(t, 'Артикул'), name: xTxt(t, 'Наименование'), full: req['полное наименование'] || '',
        group: groups[xTxt(xKid(t, 'Группы'), 'Ид')] || '', unit: c1Unit(u && (u.textContent.trim() || u.getAttribute('НаименованиеПолное'))),
        maker: xTxt(xKid(t, 'Изготовитель'), 'Наименование') || pr['производитель'] || req['производитель'] || '', brand: pr['бренд'] || pr['марка'] || '',
        size: pr['размер'] || pr['типоразмер'] || '', season: pr['сезон'] || '', price: 0, cur: 'UZS', qty: null };
    });
    const priceTypes = [], offers = {};
    if (offersText) {
      const of = xDoc(offersText, 'offers.xml');
      xAll(of, 'ТипЦены').forEach((t) => priceTypes.push({ id: xTxt(t, 'Ид'), name: xTxt(t, 'Наименование'), cur: xTxt(t, 'Валюта') }));
      xAll(of, 'Предложение').forEach((o) => {
        const prices = {}; xAll(o, 'Цена').forEach((c) => (prices[xTxt(c, 'ИдТипаЦены')] = { v: impNum(xTxt(c, 'ЦенаЗаЕдиницу')), cur: xTxt(c, 'Валюта') }));
        const q = xKid(o, 'Количество'), qs = xAll(o, 'Количество');
        offers[xTxt(o, 'Ид').split('#')[0]] = { prices, qty: q ? impNum(q.textContent) : qs.length ? qs.reduce((a, x) => a + impNum(x.textContent), 0) : null };
      });
    }
    return { items, priceTypes, offers };
  }
  // цены и остатки из offers.xml по выбранному типу цены
  function cmlPrices(src, typeId) {
    const t = src.priceTypes.find((x) => x.id === typeId) || {};
    src.items.forEach((x) => { const o = src.offers[x.id], pc = o && o.prices[typeId]; x.price = pc ? pc.v : 0; x.cur = (pc && impCur(pc.cur || t.cur)) || impCur(t.cur) || 'UZS'; x.qty = o ? o.qty : null; });
  }
  // Excel «Номенклатура»: строка заголовков — первая, где есть «Наименование»; колонки — по названиям, порядок любой
  const C1_HEAD = [['old', /^код$/], ['name', /^наименование$/], ['sku', /^артикул$/], ['full', /^полное наименование/], ['unit', /^(ед|единица|базовая единица)/], ['group', /(группа|папка|родитель)/], ['price', /(цена|розничн)/], ['qty', /(остаток|количество|в наличии)/], ['maker', /^производитель/], ['brand', /^(бренд|марка)/], ['size', /^(размер|типоразмер)/], ['season', /^сезон/]];
  const C1_HEAD_NAMES = { old: 'Код', name: 'Наименование', sku: 'Артикул', full: 'Полное наименование', unit: 'Ед. изм.', group: 'Группа', price: 'Цена', qty: 'Остаток', maker: 'Производитель', brand: 'Бренд', size: 'Размер', season: 'Сезон' };
  function parseNom(rows) {
    const norm = (v) => String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
    const hi = rows.slice(0, 15).findIndex((r) => r.some((v) => /^наименование$/.test(norm(v))));
    if (hi < 0) throw new Error('не нашли строку с заголовком «Наименование» — это точно список «Номенклатура»?');
    const head = rows[hi].map(norm), col = {};
    C1_HEAD.forEach(([k, re]) => { const i = head.findIndex((h, j) => re.test(h) && !Object.values(col).includes(j)); if (i >= 0) col[k] = i; });
    const g = (r, k) => (col[k] == null ? '' : String(r[col[k]] == null ? '' : r[col[k]]).trim());
    const items = rows.slice(hi + 1).map((r, i) => [r, hi + 2 + i]).filter(([r]) => r.some((v) => String(v == null ? '' : v).trim())).map(([r, n]) => ({ n, old: g(r, 'old'), sku: g(r, 'sku'), name: g(r, 'name') || g(r, 'full'), full: g(r, 'full'),
      group: g(r, 'group'), unit: c1Unit(g(r, 'unit')), maker: g(r, 'maker'), brand: g(r, 'brand'), size: g(r, 'size'), season: g(r, 'season'), price: impNum(g(r, 'price')), cur: 'UZS', qty: col.qty == null || g(r, 'qty') === '' ? null : impNum(g(r, 'qty')) }));
    return { items, cols: Object.keys(col).map((k) => C1_HEAD_NAMES[k]) };
  }
  const C1_FIELDS = { price: 'цена', oldCode: 'код 1С', sku: 'артикул', maker: 'производитель', brand: 'бренд', attrs: 'размер/сезон' };
  // план: создать / обновить (совпал код 1С или артикул: цена и только пустые поля) / пропустить с причиной
  function c1Plan(items, map, upd) {
    const seen = new Set(), lc = (s) => String(s || '').toLowerCase();
    return items.map((x) => {
      const r = { ...x, cat: map[x.group || ''] || '' };
      if (!x.name) return Object.assign(r, { skip: 'нет наименования' });
      const keys = [x.old && 'o:' + lc(x.old), x.sku && 'a:' + SM.skuKey(x.sku), 'n:' + lc(x.name)].filter(Boolean);
      if (keys.some((k) => seen.has(k))) return Object.assign(r, { skip: 'повтор в файле' });
      keys.forEach((k) => seen.add(k));
      const p = (x.old && SM.db.products.find((q) => q.oldCode && lc(q.oldCode) === lc(x.old))) || (x.sku && SM.skuOwner(x.sku));
      if (p) {
        r.p = p;
        if (!upd) return Object.assign(r, { skip: 'уже есть · ' + p.code });
        const ch = {};
        if (x.price > 0 && (p.price !== x.price || p.cur !== x.cur)) Object.assign(ch, { price: x.price, cur: x.cur });
        Object.entries({ oldCode: x.old, sku: x.sku, maker: x.maker, brand: x.brand }).forEach(([k, v]) => { if (v && !p[k] && (k !== 'sku' || !SM.skuOwner(v, p.id))) ch[k] = v; });
        if (SM.isTire(p)) { const a = p.attrs || {}, na = a.size ? {} : sizeAttrs(x.size || x.name); if (x.season && !a.season) na.season = c1Season(x.season); if (Object.keys(na).length) ch.attrs = { ...a, ...na }; }
        if (!Object.keys(ch).length) return Object.assign(r, { skip: 'без изменений · ' + p.code });
        return Object.assign(r, { upd: ch, fields: Object.keys(ch).filter((k) => C1_FIELDS[k]).map((k) => C1_FIELDS[k]) });
      }
      if (SM.db.products.some((q) => lc(q.name) === lc(x.name))) return Object.assign(r, { skip: 'наименование уже есть в справочнике' });
      if (!r.cat) return Object.assign(r, { skip: x.group ? 'группа «' + x.group + '» не сопоставлена' : 'нет группы — выберите категорию' });
      if (!(x.price > 0)) return Object.assign(r, { skip: 'нет цены' });
      return Object.assign(r, { add: true });
    });
  }
  const C1_NOM_SAMPLE = [['Код', 'Наименование', 'Артикул', 'Полное наименование', 'Ед. изм.', 'Группа', 'Цена', 'Остаток'],
    ['00-00000101', 'Michelin Primacy 4+ 205/55 R16 91V', '123456', 'Шина летняя Michelin Primacy 4+ 205/55 R16 91V', 'шт', 'Шины летние', 1150000, 12],
    ['00-00000102', 'Масло моторное Mobil 1 ESP 5W-30, 4 л', '154285', 'Масло моторное синтетическое Mobil 1 ESP 5W-30, 4 л', 'кан', 'Моторные масла', 560000, 8],
    ['00-00000103', 'Колодки тормозные передние TRW GDB3534', 'GDB3534', 'Колодки тормозные дисковые передние TRW GDB3534', 'компл', 'Колодки тормозные', 320000, 5]];
  const C1_XML_SAMPLE = `<КоммерческаяИнформация ВерсияСхемы="2.05">
  <Классификатор>
    <Группы><Группа><Ид>gr-01</Ид><Наименование>Шины летние</Наименование></Группа></Группы>
  </Классификатор>
  <Каталог>
    <Товары>
      <Товар>
        <Ид>8e1f…-0101</Ид>
        <Артикул>123456</Артикул>
        <Наименование>Michelin Primacy 4+ 205/55 R16 91V</Наименование>
        <БазоваяЕдиница>шт</БазоваяЕдиница>
        <Группы><Ид>gr-01</Ид></Группы>
      </Товар>
    </Товары>
  </Каталог>
</КоммерческаяИнформация>`;
  function import1cModal() {
    let way = 'cml', src = null, map = {}, plan = [], done = false, ptype = '';
    const m = UI.modal({ title: 'Импорт из 1С', sub: 'Новые товары добавятся, совпавшие по коду 1С или артикулу — обновятся. Сначала предпросмотр, потом загрузка', size: 'xl',
      body: html`<div class="c1-ways">
          <button type="button" class="c1-way on" data-way="cml">${I('repeat')}<span><b>Обмен с сайтом (CommerceML)</b><small>два файла: import.xml и offers.xml</small></span></button>
          <button type="button" class="c1-way" data-way="xls">${I('download')}<span><b>Список «Номенклатура»</b><small>Excel .xlsx или .csv</small></span></button></div>
        <div id="c1Help" class="mt-16"></div><div id="c1Res" class="mt-16"></div>`,
      foot: html`<button class="btn btn-ghost" data-close>Закрыть</button><button class="btn btn-secondary" data-x="c1report" disabled>${I('download')}Результат в Excel</button><button class="btn btn-primary" data-x="c1go" disabled>${I('check')}Импортировать</button>` });
    const $ = (s) => m.querySelector(s);
    const opts = () => html`<label class="switch mt-12"><input type="checkbox" data-x="c1upd" checked><i></i>Обновлять найденные товары: цена и только пустые поля (заполненное не затирается)</label>`;
    const helpCML = () => html`<ol class="c1-steps">
        <li>В 1С откройте <b>Администрирование → Обмен данными → Выгрузка на сайт</b> (в «Управление торговлей» и «Бухгалтерии» — «Обмен с сайтом»).</li>
        <li>Создайте узел <b>«Выгрузка в каталог на диске»</b>, укажите папку, отметьте «Выгружать товары» и «Выгружать цены и остатки».</li>
        <li>Нажмите <b>«Выгрузить»</b> — в папке появятся <b>import.xml</b> (товары и группы) и <b>offers.xml</b> (цены и остатки). Папка с картинками не нужна.</li>
        <li>Выберите <b>оба файла сразу</b> кнопкой ниже (зажмите Ctrl). Архив zip не подходит — распакуйте.</li></ol>
      <div class="xl-cap">Так выглядит начало import.xml:</div><pre class="c1-xml">${C1_XML_SAMPLE}</pre>
      <div class="row mt-12"><label class="btn btn-primary">${I('upload')}Выбрать import.xml и offers.xml<input type="file" accept=".xml" multiple hidden data-x="c1file"></label>
        <a class="btn btn-secondary" href="assets/samples/1c-import.xml" download>${I('download')}Образец import.xml</a><a class="btn btn-secondary" href="assets/samples/1c-offers.xml" download>${I('download')}Образец offers.xml</a></div>${opts()}`;
    const helpXLS = () => html`<ol class="c1-steps">
        <li>В 1С откройте <b>Справочники → Номенклатура</b> (или «Склад → Номенклатура»), при необходимости — нужную папку.</li>
        <li><b>Ещё → Вывести список…</b> — отметьте колонки Код, Наименование, Артикул, Полное наименование, Единица, Группа (Родитель), Цена, Остаток → ОК.</li>
        <li>В открывшейся таблице: <b>Файл → Сохранить как → «Лист Excel 2007 (*.xlsx)»</b> (CSV тоже подойдёт, в том числе в кодировке Windows-1251).</li>
        <li>Выберите файл кнопкой ниже. Колонки находятся по заголовкам, порядок любой, лишние не мешают.</li></ol>
      <div class="xl-cap">Так выглядит выгрузка «Номенклатура» в Excel:</div>
      <div class="xl-sample"><table><thead><tr class="xl-l"><th></th>${C1_NOM_SAMPLE[0].map((_, i) => html`<th>${String.fromCharCode(65 + i)}</th>`)}</tr><tr class="xl-h"><th>1</th>${C1_NOM_SAMPLE[0].map((c) => html`<th>${c}</th>`)}</tr></thead>
        <tbody>${C1_NOM_SAMPLE.slice(1).map((r, i) => html`<tr><td>${i + 2}</td>${r.map((v) => html`<td>${v}</td>`)}</tr>`)}</tbody></table></div>
      <div class="row mt-12"><label class="btn btn-primary">${I('upload')}Выбрать файл .xlsx / .csv<input type="file" accept=".xlsx,.xls,.csv" hidden data-x="c1file"></label>
        <a class="btn btn-secondary" href="assets/samples/1c-nomenklatura.xlsx" download>${I('download')}Образец .xlsx</a></div>${opts()}`;
    const status = (r) => (r.done ? r.done : r.add ? 'будет создан' : r.upd ? 'будет обновлено: ' + r.fields.join(', ') : 'пропуск: ' + r.skip);
    const recalc = () => { plan = c1Plan(src.items, map, !$('[data-x=c1upd]') || $('[data-x=c1upd]').checked); drawRes(); };
    const drawRes = () => {
      const add = plan.filter((r) => r.add), up = plan.filter((r) => r.upd), sk = plan.filter((r) => r.skip);
      const groups = [...new Set(src.items.map((x) => x.group || ''))], cnt = (g) => src.items.filter((x) => (x.group || '') === g).length;
      const hasQty = src.items.some((x) => x.qty != null);
      $('#c1Res').innerHTML = String(html`
        ${way === 'cml' && src.priceTypes.length ? html`<div class="field c1-ptype"><label>Тип цены из 1С</label><select class="select" data-x="c1ptype">${UI.options(src.priceTypes.map((t) => [t.id, t.name + (t.cur ? ' · ' + t.cur : '')]), ptype)}</select></div>` : ''}
        ${way === 'cml' && !src.priceTypes.length ? html`<div class="note-box warn mt-12">${I('alert')}<div>offers.xml не выбран — цен нет: новые товары не создадутся, у найденных заполнятся только пустые поля.</div></div>` : ''}
        ${src.cols ? html`<p class="fs-13 muted">Найдены колонки: ${src.cols.join(', ')}</p>` : ''}
        <div class="section-t mt-12">Группы 1С → категории</div>
        <div class="c1-map">${groups.map((g) => html`<div class="c1-map-r ${map[g] ? '' : 'miss'}"><span class="grow"><b>${g || 'Без группы'}</b> <span class="muted fs-12">· ${cnt(g)} поз.</span></span>${I('arrowRight')}<select class="select input-sm" data-grp="${g}">${UI.options(catOptions(), map[g], '— не загружать —')}</select></div>`)}</div>
        <div class="grid g-3 keep-2 mt-16"><div class="cash-acc"><span>${I('plus')}${done ? 'Создано' : 'Будет создано'}</span><b class="ok-t">${add.length}</b></div><div class="cash-acc"><span>${I('repeat')}${done ? 'Обновлено' : 'Будет обновлено'}</span><b>${up.length}</b></div><div class="cash-acc"><span>${I('alert')}Пропущено</span><b class="warn-t">${sk.length}</b></div></div>
        ${hasQty ? html`<div class="note-box mt-12">${I('info')}<div>Остатки из 1С показаны для сверки и <b>не загружаются</b> — приход оформите через «Поступления».</div></div>` : ''}
        <div class="table-wrap mt-12" style="max-height:360px;overflow:auto"><table class="table compact c1-prev"><thead><tr><th>№</th><th>Товар</th><th>Группа → категория</th><th class="r">Цена</th><th class="r">Остаток в 1С</th><th>Результат</th></tr></thead><tbody>
          ${plan.map((r) => html`<tr class="${r.skip ? 'row-warn' : ''}" data-c1="${r.add ? 'add' : r.upd ? 'upd' : 'skip'}"><td>${r.n}</td><td><span class="cell-title">${r.name || '—'}</span><span class="cell-sub">${r.old ? html`код 1С <span class="mono">${r.old}</span>` : ''}${r.sku ? html` · арт. <span class="mono">${r.sku}</span>` : ''}${r.p ? ' · ' + r.p.code : ''}</span></td>
            <td>${r.group || '—'}${r.cat ? html`<span class="cell-sub">${SM.category(r.cat).name}</span>` : ''}</td><td class="r nowrap">${r.price > 0 ? F.cur(r.price, r.cur) : '—'}</td><td class="r">${r.qty == null ? '—' : html`<span class="muted">${r.qty} ${r.unit}</span>`}</td>
            <td><span class="badge ${r.done ? 'b-ok' : r.add ? 'b-ok' : r.upd ? 'b-info' : 'b-warn'}">${status(r)}</span></td></tr>`)}</tbody></table></div>`);
      const pt = $('[data-x=c1ptype]'); if (pt) pt.onchange = () => { ptype = pt.value; cmlPrices(src, ptype); recalc(); };
      m.querySelectorAll('[data-grp]').forEach((s) => (s.onchange = () => { map[s.dataset.grp] = s.value; recalc(); }));
      m.querySelectorAll('#c1Res select').forEach((s) => (s.disabled = done));
      $('[data-x=c1go]').disabled = done || !(add.length + up.length);
      $('[data-x=c1report]').disabled = !plan.length;
    };
    const drawHelp = () => {
      $('#c1Help').innerHTML = String(way === 'cml' ? helpCML() : helpXLS()); $('#c1Res').innerHTML = ''; src = null; plan = [];
      $('[data-x=c1go]').disabled = true; $('[data-x=c1report]').disabled = true;
      m.querySelectorAll('.c1-way').forEach((b) => b.classList.toggle('on', b.dataset.way === way));
      $('[data-x=c1upd]').onchange = () => src && !done && recalc();
      $('[data-x=c1file]').onchange = async (e) => {
        const files = [...e.target.files]; if (!files.length) return;
        const res = $('#c1Res'); res.innerHTML = '<p class="muted">Читаю файл…</p>';
        try {
          if (way === 'cml') {
            const texts = await Promise.all(files.map(c1Text));
            const offers = texts.find((t) => /<ПакетПредложений|<Предложения/.test(t)), imp = texts.find((t) => /<Каталог|<Классификатор/.test(t));
            if (!imp) throw new Error('нужен import.xml — в выбранных файлах нет каталога товаров');
            src = parseCML(imp, offers);
            const def = src.priceTypes.find((t) => /рознич/i.test(t.name)) || src.priceTypes[0];
            ptype = def ? def.id : ''; if (ptype) cmlPrices(src, ptype);
          } else {
            const f = files[0]; let rows;
            if (/\.csv$/i.test(f.name)) rows = parseCSV(await c1Text(f));
            else { const X = await UI.loadXLSX(); const wb = X.read(await f.arrayBuffer()); rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }); }
            src = parseNom(rows);
          }
        } catch (err) { src = null; res.innerHTML = String(html`<div class="note-box bad">${I('alert')}<div>Не удалось прочитать: ${err.message}</div></div>`); return; }
        src.items.forEach((x) => { const g = x.group || ''; if (!(g in map)) map[g] = c1Cat(g); });
        done = false; recalc();
      };
    };
    m.querySelectorAll('.c1-way').forEach((b) => (b.onclick = () => { if (done) return; way = b.dataset.way; drawHelp(); }));
    $('[data-x=c1report]').onclick = () => UI.exportXLSX('Результат_импорта_1С_' + D.todayISO(), [['№', 'Код 1С', 'Артикул', 'Наименование', 'Группа 1С', 'Категория', 'Цена', 'Остаток в 1С (не загружен)', 'Результат'], ...plan.map((r) => [r.n, r.old, r.sku, r.name, r.group, r.cat ? SM.category(r.cat).name : '', r.price > 0 ? r.price : '', r.qty == null ? '' : r.qty, status(r)])], 'Результат');
    $('[data-x=c1go]').onclick = () => {
      plan.forEach((r) => {
        if (r.add) {
          const tire = SM.catRoot(r.cat).id === 'c-tires';
          const p = SM.ops.saveProduct({ name: r.name, alt: [], cat: r.cat, maker: r.maker, brand: r.brand, sku: r.sku, oldCode: r.old, unit: r.unit, min: 0, attrs: tire ? { ...sizeAttrs(r.size || r.name), ...(r.season ? { season: c1Season(r.season) } : {}) } : {},
            buy: 0, extra: 0, buyCur: 'UZS', price: r.price, cur: r.cur, vat: 12, comment: r.full && r.full !== r.name ? r.full : '', active: true });
          r.done = 'создан · ' + p.code;
        } else if (r.upd) { SM.ops.saveProduct({ id: r.p.id, name: r.p.name, ...r.upd }); r.done = 'обновлён · ' + r.p.code + ': ' + r.fields.join(', '); }
      });
      const a = plan.filter((r) => r.add).length, u = plan.filter((r) => r.upd).length, s = plan.filter((r) => r.skip).length;
      SM.log('Импорт справочника из 1С', 'product', null, 'Создано: ' + a + ', обновлено: ' + u + ', пропущено: ' + s);
      SM.save(); done = true; drawRes(); UI.toast('Импорт из 1С завершён', 'Создано: ' + a + ' · обновлено: ' + u + ' · пропущено: ' + s, 'ok'); SM.refresh();
      $('[data-x=c1file]').disabled = true;
    };
    drawHelp();
  }

  /* ---------- Остатки (ТЗ 6) ---------- */
  function adjustModal(productId) {
    const pts = SM.userPoints().map((id) => SM.point(id)).filter((p) => p.active);
    let pid = productId || null;
    const m = UI.modal({ title: 'Списание или корректировка', sub: 'Ручная операция с остатком — попадёт в историю движения и историю операций', size: 'wide',
      body: html`<form class="form-grid" autocomplete="off">
        <div class="field full"><label>Товар <span class="req">*</span></label><div id="adjPick"></div><div id="adjSel" class="mt-8"></div></div>
        <div class="field"><label>Точка</label><select class="select" name="pointId">${UI.options(pts.map((p) => [p.id, p.name]), pts[0] && pts[0].id)}</select></div>
        <div class="field"><label>Операция</label><select class="select" name="kind">${UI.options([['writeoff', 'Списание (брак, повреждение)'], ['adjust', 'Корректировка (инвентаризация)']], 'writeoff')}</select></div>
        <div class="field"><label>Количество <span class="req">*</span></label><input class="input num" type="number" name="qty" step="1"><span class="hint" data-h>Для корректировки: «+» — излишек, «−» — недостача</span></div>
        <div class="field"><label>Причина <span class="req">*</span></label><input class="input" name="reason" placeholder="Например: порез боковины при хранении"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Провести</button>` });
    const f = m.querySelector('form');
    const showSel = () => { m.querySelector('#adjSel').innerHTML = pid ? String(html`<div class="row nowrap">${UI.thumb(SM.product(pid))}<div class="grow"><b>${SM.product(pid).name}</b><div class="fs-12 muted">на точке: ${SM.qty(pid, f.pointId.value)} ${SM.product(pid).unit}</div></div></div>`) : ''; };
    SM.productPicker(m.querySelector('#adjPick'), { point: () => f.pointId.value, onPick: (p) => { pid = p.id; showSel(); } });
    f.pointId.addEventListener('change', showSel); showSel();
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f);
      if (!pid) return UI.toast('Выберите товар', '', 'warn');
      let q = Math.round(+d.qty);
      if (!q) return UI.invalid(f, 'qty', 'Укажите количество');
      if (!d.reason) return UI.invalid(f, 'reason', 'Укажите причину');
      if (d.kind === 'writeoff') q = -Math.abs(q);
      if (SM.qty(pid, d.pointId) + q < 0) return UI.invalid(f, 'qty', 'Остаток не может стать меньше нуля');
      SM.ops.adjustStock(pid, d.pointId, q, d.kind, d.reason);
      UI.closeTop(); UI.toast(d.kind === 'writeoff' ? 'Списано' : 'Остаток скорректирован', SM.product(pid).name + ': ' + (q > 0 ? '+' : '') + q); SM.refresh();
    };
  }
  /* карандаш в остатках: поставить точное количество на точке (разница уходит корректировкой) */
  function stockEditModal(pid) {
    const p = SM.product(pid);
    const pts = SM.userPoints().map((id) => SM.point(id)).filter((x) => x.active);
    const m = UI.modal({ title: 'Изменить остаток', sub: p.name + ' · ' + p.code, size: 'narrow',
      body: html`<form class="stack" style="gap:12px" autocomplete="off">
        <div class="field"><label>Магазин или склад</label><select class="select" name="pointId">${UI.options(pts.map((x) => [x.id, x.name + ' · сейчас ' + SM.qty(pid, x.id) + ' ' + p.unit]), pts[0] && pts[0].id)}</select></div>
        <div class="field"><label>Новый остаток, ${p.unit} <span class="req">*</span></label><input class="input num" type="number" name="qty" min="0" max="100000" step="1" autofocus><span class="hint" data-h></span></div>
        <div class="field"><label>Причина <span class="req">*</span></label><input class="input" name="reason" placeholder="Например: пересчёт на складе"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Сохранить</button>` });
    const f = m.querySelector('form');
    const sync = () => { f.qty.value = SM.qty(pid, f.pointId.value); m.querySelector('[data-h]').textContent = 'Сейчас: ' + SM.qty(pid, f.pointId.value) + ' ' + p.unit + ', в резерве ' + SM.reserved(pid, f.pointId.value); };
    f.pointId.addEventListener('change', sync); sync();
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f);
      if (d.qty === '' || +d.qty < 0) return UI.invalid(f, 'qty', 'Укажите количество (0 и больше)');
      if (!d.reason) return UI.invalid(f, 'reason', 'Укажите причину — запись попадёт в историю');
      const diff = SM.ops.setStock(pid, d.pointId, +d.qty, d.reason);
      UI.closeTop();
      UI.toast(diff ? 'Остаток изменён' : 'Остаток не изменился', p.name + ' · ' + SM.point(d.pointId).name + ': ' + d.qty + ' ' + p.unit + (diff ? ' (' + (diff > 0 ? '+' : '') + diff + ')' : ''), diff ? 'ok' : 'info', { icon: 'layers' });
      SM.refresh();
    };
  }
  /* корзина в остатках: обнулить товар на всех доступных точках */
  async function stockClearAsk(pid) {
    const p = SM.product(pid), pts = SM.userPoints().filter((id) => SM.qty(pid, id) > 0);
    if (!pts.length) return UI.toast('Остаток уже нулевой', p.name, 'info', { icon: 'layers' });
    if (!(await UI.confirmDelete('Обнулить остаток?', p.name + ': ' + pts.map((id) => SM.point(id).name + ' — ' + SM.qty(pid, id) + ' ' + p.unit).join(', ') + '. Товар останется в справочнике, списание попадёт в историю движения.'))) return;
    pts.forEach((id) => SM.ops.setStock(pid, id, 0, 'Обнуление остатка'));
    UI.toast('Остаток обнулён', p.name, 'ok', { icon: 'trash' }); SM.refresh();
  }
  function stockPage(r) {
    const tab = r.q.tab || 'stock', q = (r.q.q || '').toLowerCase(), cat = r.q.cat || '', pt = r.q.pt || '', low = r.q.low === '1';
    const pts = SM.activePoints().filter((p) => SM.pointVisible(p.id));
    const words = q.split(/\s+/).filter(Boolean);
    const prods = SM.db.products.filter((p) => p.active && (!cat || p.cat === cat || SM.category(p.cat).parent === cat) && (!low || SM.isLow(p)) &&
      (!words.length || words.every((w) => SM.productHay(p).includes(w))));
    const head = UI.pageHead('Остатки', 'По каждому складу и магазину: остаток, резерв (черновики продаж и перемещения в пути) и доступное количество', html`
      <button class="btn btn-secondary" data-x="export">${I('download')}Excel</button>
      ${SM.can('stock', 2) ? html`<button class="btn btn-primary" data-x="adjust">${I('sliders')}Списание / корректировка</button>` : ''}`);
    if (tab === 'moves') {
      const R = SM.periodRange(r.q.p || 'month');
      const kind = r.q.kind || '';
      const mv = SM.db.moves.filter((m) => D.inRange(m.at, R.from, R.to) && (!pt || m.pointId === pt) && (!kind || m.kind === kind) && SM.pointVisible(m.pointId) && (!words.length || words.every((w) => (SM.product(m.productId).name + ' ' + SM.product(m.productId).code + ' ' + (m.doc || '') + ' ' + moveDoc(m)).toLowerCase().includes(w)))).slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
      return html`${head}${UI.tabs([['stock', 'Остатки'], ['moves', 'Движение товара']], tab)}
        <div class="card"><div class="card-h">${UI.searchInput(r.q.q, 'Товар или документ')}${UI.filterSelect('pt', pt, pts.map((p) => [p.id, p.name]), 'Все точки')}${UI.filterSelect('kind', kind, Object.entries(SM.MOVE_KINDS), 'Все операции')}<span class="right">${UI.periodSeg(r.q.p || 'month')}</span></div>
          <div class="card-b" style="padding-top:12px">${mv.length ? html`<div class="table-wrap"><table class="table compact"><thead><tr><th>Дата</th><th>Товар</th><th>Точка</th><th>Операция</th><th>Документ</th><th class="r">Кол-во</th><th>Автор</th></tr></thead><tbody>
            ${mv.slice(0, 300).map((m) => html`<tr><td class="nowrap"><div class="dir-cell">${dirIc(m.qty > 0)}<span>${F.dt(m.at)}</span></div></td><td><div class="row nowrap">${UI.thumb(SM.product(m.productId))}<div style="min-width:0"><span class="cell-title">${SM.product(m.productId).name}</span><span class="cell-sub mono">${SM.product(m.productId).code}</span></div></div></td><td>${SM.point(m.pointId).name}</td><td>${SM.MOVE_KINDS[m.kind] || m.kind}</td><td>${moveDoc(m)}</td><td class="r">${m.qty > 0 ? html`<span class="amt-in">+${m.qty}</span>` : html`<span class="amt-out">−${-m.qty}</span>`}</td><td>${SM.user_(m.by).name}</td></tr>`)}</tbody></table></div>` : UI.empty('Движений нет', 'за выбранный период')}</div></div>`;
    }
    const cols = pt ? [SM.point(pt)] : pts, prodEdit = SM.can('products', 2), acts = prodEdit || SM.can('stock', 2);
    return html`${head}${UI.tabs([['stock', 'Остатки'], ['moves', 'Движение товара']], tab)}
      <div class="card"><div class="card-h">${UI.searchInput(r.q.q, 'Код, название, размер')}${UI.filterSelect('cat', cat, catOptions(), 'Все категории')}${UI.filterSelect('pt', pt, pts.map((p) => [p.id, p.name]), 'Все точки')}<label class="switch right"><input type="checkbox" data-x="low" ${low ? 'checked' : ''}><i></i>Только низкий остаток</label></div>
        <div class="card-b" style="padding-top:12px">${prods.length ? html`<div class="table-wrap"><table class="table compact matrix ${cols.length > 2 ? 'no-stack' : ''}"><thead><tr><th style="text-align:left">Товар</th>${cols.map((p) => html`<th title="${p.address}">${p.name.replace('Магазин ', '').replace(/[«»]/g, '')}</th>`)}<th>Всего</th><th>Мин. остаток</th><th>Резерв</th><th>Доступно</th>${acts ? html`<th></th>` : ''}</tr></thead><tbody>
          ${prods.map((p) => { const tot = pt ? SM.qty(p.id, pt) : SM.qty(p.id), rs = pt ? SM.reserved(p.id, pt) : SM.reserved(p.id); return html`<tr class="click ${SM.isLow(p) ? 'row-warn' : ''}" data-act="open-product" data-id="${p.id}"><td style="min-width:240px"><div class="row nowrap">${UI.thumb(p)}<div style="min-width:0"><span class="cell-title">${p.name}</span><span class="cell-sub"><span class="mono">${p.code}</span>${p.sku ? html` · арт. <span class="mono">${p.sku}</span>` : ''}</span></div></div></td>
            ${cols.map((c) => { const v = SM.qty(p.id, c.id); return html`<td class="stock-cell ${v <= 0 ? 'zero' : ''}">${v}</td>`; })}<td class="stock-cell ${SM.isLow(p) ? 'low' : ''}">${tot}</td><td class="c min-cell">${p.min || 0}</td><td class="c">${rs || html`<span class="muted">—</span>`}</td><td class="c fw-8">${tot - rs}</td>${acts ? html`<td class="td-act">${UI.actBtns(p.id, { editTip: prodEdit ? 'Изменить товар и мин. остаток' : 'Изменить остаток', del: SM.can('stock', 2), delTip: 'Обнулить остаток' })}</td>` : ''}</tr>`; })}</tbody></table></div>` : UI.empty('Ничего не найдено', '', 'layers')}</div></div>`;
  }

  // значок направления движения: приход — зелёная стрелка вверх, расход — красная вниз
  const dirIc = (inn) => html`<span class="dir-ic ${inn ? 'in' : 'out'}" title="${inn ? 'Приход' : 'Расход'}">${I(inn ? 'arrowUp' : 'arrowDown')}</span>`;
  // в движениях продажи записаны по s.no («СП-0004», «Отмена СП-0004») — показываем как «№ 4» (SM.saleNo); поиск идёт и по записанному
  const moveDoc = (m) => (['sale', 'return'].includes(m.kind) ? String(m.doc || '').replace(/СП-0*(\d+)/, (_, n) => '№ ' + n) : m.doc || '');

  /* ---------- Поступления (ТЗ 7) ---------- */
  function receiptForm() {
    const suppliers = SM.db.clients.filter((c) => c.kind !== 'client');
    const pts = SM.userPoints().map((id) => SM.point(id)).filter((p) => p.active);
    const st = { items: [], files: [] };
    const m = UI.modal({ title: 'Новое поступление', sub: 'После проведения остатки на выбранном складе увеличатся, цены продажи обновятся в карточках', size: 'xl',
      body: html`<form autocomplete="off"><div class="form-grid g3">
        <div class="field"><label>Поставщик <span class="req">*</span></label><div class="row nowrap"><div class="grow"><select class="select" name="supplierId">${UI.options(suppliers.map((c) => [c.id, c.name]), '', suppliers.length ? 'Выберите поставщика' : 'Поставщиков нет — добавьте')}</select></div><button type="button" class="btn btn-secondary btn-icon" data-x="new-sup" data-tip="Новый поставщик" aria-label="Новый поставщик">${I('plus')}</button></div></div>
        <div class="field"><label>Склад назначения</label><select class="select" name="pointId">${UI.options(pts.map((p) => [p.id, p.name]), (pts.find((p) => p.type === 'warehouse') || pts[0] || {}).id)}</select></div>
        <div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${D.todayISO()}"></div>
        <div class="field"><label>Валюта</label><select class="select" name="cur">${UI.options([['UZS', 'Сум'], ['USD', '$ США']], 'UZS')}</select></div>
        <div class="field"><label>Курс $</label><input class="input" name="rate" ${UI.moneyAttrs(100000, 2)} value="${UI.fmtInput(SM.rate('bank'))}"></div>
        <label class="switch" style="align-self:end;margin-bottom:10px"><input type="checkbox" name="vat" checked><i></i>С НДС ${SM.vatCfg().rate}%</label></div>
        <div class="section-t">Товары</div><div id="rcPick"></div>
        <div class="table-wrap mt-12"><table class="table compact no-stack"><thead><tr><th>Товар</th><th class="r" style="width:90px">Кол-во</th><th class="r" style="width:120px">Закупка</th><th class="r" style="width:110px">Доп. расходы</th><th class="r" style="width:120px">Цена продажи</th><th class="r">Себестоимость</th><th></th></tr></thead><tbody id="rcLines"></tbody></table></div>
        <div class="row between mt-12"><div class="field" style="flex:1 1 300px"><label>Комментарий</label><input class="input" name="comment" placeholder="№ накладной, ГТД, контейнер"></div><div class="field" style="flex:0 1 380px"><label>Файлы</label>${UI.fileField('files', { label: 'Прикрепить файлы', multiple: true })}</div></div>
        <div class="totals mt-16" id="rcTot" style="max-width:380px;margin-left:auto"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-secondary" data-x="draft">Черновик</button><button class="btn btn-primary" data-x="post">${I('check')}Провести</button>` });
    const f = m.querySelector('form');
    const cur = () => f.cur.value;
    const draw = () => {
      m.querySelector('#rcLines').innerHTML = st.items.length ? st.items.map((l, i) => { const p = SM.product(l.productId); return String(html`<tr data-i="${i}"><td><span class="cell-title">${p.name}</span><span class="cell-sub mono">${p.code}</span></td>
        <td><input class="input input-sm num" type="number" min="1" data-k="qty" value="${l.qty}"></td><td><input class="input input-sm" ${UI.moneyAttrs(null, 2)} data-k="buy" value="${UI.fmtInput(l.buy, 2)}"></td>
        <td><input class="input input-sm" ${UI.moneyAttrs(null, 2)} data-k="extra" value="${UI.fmtInput(l.extra, 2)}"></td><td><input class="input input-sm" ${UI.moneyAttrs(null, 2)} data-k="price" value="${UI.fmtInput(l.price, 2)}"></td>
        <td class="r nowrap fw-8" data-cost>${F.cur(l.buy + l.extra, cur())}</td><td><button type="button" class="btn btn-icon btn-sm" data-del="${i}">${I('x')}</button></td></tr>`); }).join('') : '<tr><td colspan="7">' + String(UI.empty('Добавьте товары через поиск', '', 'inbox')) + '</td></tr>';
      tot();
    };
    const tot = () => { const c = SM.receiptCalc({ items: st.items, vat: f.vat.checked }); m.querySelector('#rcTot').innerHTML = String(html`<div class="row"><span>Позиций</span><b>${st.items.length}</b></div><div class="row"><span>НДС ${SM.vatCfg().rate}%</span><b>${f.vat.checked ? F.cur(c.vat, cur()) : html`<span class="muted fw-6">не облагается</span>`}</b></div><div class="row"><span>Доп. расходы</span><b>${F.cur(c.extra, cur())}</b></div><div class="row grand"><span>Сумма поставщику</span><b>${F.cur(c.total, cur())}</b></div>`); };
    SM.productPicker(m.querySelector('#rcPick'), { point: () => f.pointId.value, onPick: (p) => { if (!st.items.some((l) => l.productId === p.id)) { const k = (v, c) => Math.round(SM.conv(v, c || 'UZS', cur(), UI.num(f.rate.value)) * 100) / 100; st.items.push({ productId: p.id, qty: 1, buy: k(p.buy, p.buyCur), extra: k(p.extra || 0, p.buyCur), price: k(p.price, p.cur) }); } draw(); } });
    m.querySelector('#rcLines').addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; const tr = e.target.closest('tr'), l = st.items[+tr.dataset.i]; l[k] = k === 'qty' ? +e.target.value || 0 : UI.num(e.target.value); if (k !== 'qty') delete l.src; tr.querySelector('[data-cost]').textContent = F.cur(l.buy + l.extra, cur()); tot(); });
    m.querySelector('#rcLines').addEventListener('click', (e) => { const d = e.target.closest('[data-del]'); if (d) { st.items.splice(+d.dataset.del, 1); draw(); } });
    // смена валюты пересчитывает уже введённые цены по курсу документа — иначе «1 450 000 сум» станут «$1 450 000»
    // считаем всегда от исходных цен строки (src), чтобы туда-обратно не копилась погрешность округления
    let prevCur = cur();
    f.cur.addEventListener('change', () => {
      const rt = UI.num(f.rate.value) || SM.rate('bank');
      st.items.forEach((l) => { const src = l.src || (l.src = { cur: prevCur, buy: l.buy, extra: l.extra, price: l.price }); ['buy', 'extra', 'price'].forEach((k) => (l[k] = src.cur === cur() ? src[k] : Math.round(SM.conv(src[k], src.cur, cur(), rt) * 100) / 100)); });
      prevCur = cur(); draw();
    });
    f.vat.addEventListener('change', tot);
    // поставщика можно завести прямо из поступления
    m.querySelector('[data-x=new-sup]').onclick = () => SM.clientForm({ kind: 'supplier', type: 'legal' }, (c) => {
      f.supplierId.insertAdjacentHTML('beforeend', String(html`<option value="${c.id}">${c.name}</option>`));
      f.supplierId.value = c.id;
    });
    draw();
    const save = (post) => {
      const d = UI.formData(f);
      if (!d.supplierId) return UI.invalid(f, 'supplierId', 'Выберите поставщика');
      if (!st.items.length) return UI.toast('Добавьте товары', '', 'warn');
      if (st.items.some((l) => !(l.qty > 0))) return UI.toast('Проверьте количество', '', 'warn');
      const files = Array.from(f.files.files || []).map((x) => x.name);
      const rc = SM.ops.saveReceipt({ date: d.date, supplierId: d.supplierId, pointId: d.pointId, cur: d.cur, rate: UI.num(d.rate), vat: d.vat, items: st.items.map(({ src, ...l }) => l), comment: d.comment, files }, post);
      UI.closeTop(); UI.toast(post ? 'Поступление проведено' : 'Черновик сохранён', rc.no + ' · ' + SM.client(rc.supplierId).name + (post ? ' · остатки увеличены' : ''), 'ok', { icon: 'inbox' }); SM.go('#/receipts/' + rc.id);
    };
    m.querySelector('[data-x=draft]').onclick = () => save(false);
    m.querySelector('[data-x=post]').onclick = () => save(true);
  }
  SM.openReceipt = function (id) {
    const rc = SM.db.receipts.find((x) => x.id === id);
    if (!rc) return;
    const c = SM.receiptCalc(rc);
    const body = html`
      <dl class="dl"><dt>Поставщик</dt><dd><a href="#" data-act="open-client" data-id="${rc.supplierId}">${SM.client(rc.supplierId).name}</a></dd><dt>Склад</dt><dd>${SM.point(rc.pointId).name}</dd>
        <dt>Дата</dt><dd>${F.date(rc.date)}</dd><dt>Валюта, курс</dt><dd>${rc.cur === 'USD' ? '$' : 'сум'} · курс ${F.num(rc.rate)}</dd><dt>Принял</dt><dd>${SM.user_(rc.by).name}</dd>${rc.comment ? html`<dt>Комментарий</dt><dd>${rc.comment}</dd>` : ''}
        ${rc.files && rc.files.length ? html`<dt>Файлы</dt><dd>${rc.files.map((x) => html`<span class="chip">${I('paperclip')}${x}</span> `)}</dd>` : ''}</dl>
      <div class="section-t">Товары</div>
      <div class="table-wrap"><table class="table compact"><thead><tr><th>Товар</th><th class="r">Кол-во</th><th class="r">Закупка</th><th class="r">Доп.</th><th class="r">Себест.</th><th class="r">Цена продажи</th><th class="r">Сумма</th></tr></thead><tbody>
        ${rc.items.map((l) => { const p = SM.product(l.productId); return html`<tr><td><span class="cell-title">${p.name}</span><span class="cell-sub mono">${p.code}</span></td><td class="r">${l.qty}</td><td class="r nowrap">${F.cur(l.buy, rc.cur)}</td><td class="r nowrap">${F.cur(l.extra || 0, rc.cur)}</td><td class="r nowrap fw-7">${F.cur(l.buy + (l.extra || 0), rc.cur)}</td><td class="r nowrap">${F.cur(l.price, rc.cur)}</td><td class="r nowrap fw-8">${F.cur(l.qty * l.buy, rc.cur)}</td></tr>`; })}</tbody></table></div>
      <div class="totals mt-12" style="max-width:360px;margin-left:auto">${rc.vat ? html`<div class="row"><span>в т.ч. НДС</span><b>${F.cur(c.vat, rc.cur)}</b></div>` : ''}<div class="row"><span>Доп. расходы</span><b>${F.cur(c.extra, rc.cur)}</b></div><div class="row grand"><span>Итого поставщику</span><b>${F.cur(c.total, rc.cur)}</b></div>${rc.cur === 'USD' ? html`<div class="row"><span>В сумах</span><b>${F.cur(SM.receiptTotalUZS(rc))}</b></div>` : ''}</div>
      ${rc.status === 'cancelled' ? html`<div class="note-box bad mt-16">${I('x')}<div>Отменено: ${rc.cancelReason} · ${F.dt(rc.cancelledAt)}</div></div>` : ''}`;
    const btn = [];
    if (rc.status === 'draft' && SM.can('receipts', 2)) btn.push(html`<button class="btn btn-primary" data-x="post">${I('check')}Провести</button>`);
    if (rc.status !== 'cancelled' && (SM.flag('cancelOps') || SM.isAdmin())) btn.push(html`<button class="btn btn-danger" data-x="cancel">${I('undo')}Отменить</button>`);
    const dr = UI.drawer({ title: 'Поступление ' + rc.no, sub: SM.client(rc.supplierId).name + ' · ' + F.cur(c.total, rc.cur), head: html`<span class="note-ic ok">${I('inbox')}</span>`, body: html`<div class="row mb-16">${UI.badge(SM.RECEIPT_STATUS[rc.status])}</div>${body}`, foot: btn.length ? html`${btn}` : null, size: 'wide' });
    SM.trackDrawer(SM.openReceipt, [id], dr, '#/receipts');
    const on = (s, fn) => { const b = dr.querySelector(s); if (b) b.onclick = fn; };
    on('[data-x=post]', () => { SM.ops.saveReceipt(rc, true); UI.toast('Проведено', rc.no); SM.refresh(); });
    on('[data-x=cancel]', async () => {
      // отмена проведённого поступления не должна увести остаток в минус, если товар уже продан или перемещён
      const short = rc.status === 'posted' && rc.items.find((l) => SM.qty(l.productId, rc.pointId) < l.qty);
      if (short) return UI.toast('Отменить нельзя', SM.product(short.productId).name + ': на складе ' + SM.qty(short.productId, rc.pointId) + ' из ' + short.qty + ' — товар уже продан или перемещён', 'bad');
      const why = await UI.prompt('Отменить поступление ' + rc.no + '?', 'Остатки уменьшатся корректирующей записью', { ok: 'Отменить', danger: true }); if (!why) return; SM.ops.cancelReceipt(rc, why); UI.toast('Поступление отменено', rc.no, 'warn'); SM.refresh(); });
  };
  // первые два товара поступления названием с количеством, остальные — «+ ещё N»
  const rcGoods = (x) => html`${x.items.slice(0, 2).map((l, i) => html`${i ? html`<br>` : ''}${SM.product(l.productId).name} × ${l.qty}`)}${x.items.length > 2 ? html`<br><span class="muted">+ ещё ${x.items.length - 2}</span>` : ''}`;
  function receiptsPage(r) {
    const st = r.q.st || '';
    const list = SM.db.receipts.filter((x) => (!st || x.status === st) && SM.pointVisible(x.pointId)).slice().reverse();
    return html`${UI.pageHead('Поступления', 'Приход товара от поставщиков: закупка, доп. расходы, себестоимость, цена продажи, НДС, валюта и курс', SM.can('receipts', 2) ? html`<button class="btn btn-primary" data-x="new">${I('plus')}Новое поступление</button>` : '')}
      <div class="card"><div class="card-h">${UI.filterSelect('st', st, Object.entries(SM.RECEIPT_STATUS).map(([k, v]) => [k, v[0]]), 'Все статусы')}</div>
        <div class="card-b" style="padding-top:12px">${list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Документ</th><th>Поставщик</th><th>Склад</th><th class="r">Позиций</th><th class="r">Сумма</th><th>Статус</th></tr></thead><tbody>
          ${list.map((x) => html`<tr class="click" data-rc="${x.id}"><td><div class="dir-cell">${dirIc(true)}<div><span class="cell-title">${x.no}</span><span class="cell-sub">${F.date(x.date)}</span><span class="rc-goods">${rcGoods(x)}</span></div></div></td><td>${SM.client(x.supplierId).name}</td><td>${SM.point(x.pointId).name}</td><td class="r">${x.items.length} · ${x.items.reduce((a, l) => a + l.qty, 0)} ед.</td><td class="r nowrap fw-8">${F.cur(SM.receiptCalc(x).total, x.cur)}</td><td>${UI.badge(SM.RECEIPT_STATUS[x.status])}</td></tr>`)}</tbody></table></div>` : UI.empty('Поступлений нет', '', 'inbox')}</div></div>`;
  }

  /* ---------- Перемещения (ТЗ 8) ---------- */
  function transferForm() {
    const pts = SM.activePoints();
    const mine = SM.userPoints();
    const st = { items: [] };
    const m = UI.modal({ title: 'Новое перемещение', sub: 'Остатки изменятся, когда получатель подтвердит приёмку', size: 'wide',
      body: html`<form autocomplete="off"><div class="form-grid">
        <div class="field"><label>Откуда</label><select class="select" name="from">${UI.options(pts.filter((p) => mine.includes(p.id)).map((p) => [p.id, p.name]), mine.includes('w1') ? 'w1' : mine[0])}</select></div>
        <div class="field"><label>Куда</label><select class="select" name="to">${UI.options(pts.map((p) => [p.id, p.name]), 'p1')}</select></div>
        <div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${D.todayISO()}"></div>
        <div class="field"><label>Ответственный</label><select class="select" name="responsible">${UI.options(SM.db.users.filter((u) => ['storekeeper', 'seller', 'admin'].includes(u.role)).map((u) => [u.id, u.name]), SM.user.id)}</select></div></div>
        <div class="section-t">Товары</div><div id="tfPick"></div><ul class="list mt-8" id="tfLines"></ul>
        <div class="field mt-12"><label>Комментарий</label><input class="input" name="comment"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Создать</button>` });
    const f = m.querySelector('form');
    const draw = () => { m.querySelector('#tfLines').innerHTML = st.items.length ? st.items.map((l, i) => { const p = SM.product(l.productId), av = SM.available(l.productId, f.from.value); return String(html`<li data-i="${i}">${UI.thumb(p)}<div class="grow"><b class="fs-13">${p.name}</b><div class="fs-12 ${l.qty > av ? 'bad-t' : 'muted'}">доступно ${av} ${p.unit}</div></div><input class="input input-sm num" type="number" min="1" style="width:90px" data-k="qty" value="${l.qty}"><button type="button" class="btn btn-icon btn-sm" data-del="${i}">${I('x')}</button></li>`); }).join('') : String(html`<li>${UI.empty('Добавьте товары', '', 'repeat')}</li>`); };
    SM.productPicker(m.querySelector('#tfPick'), { point: () => f.from.value, onPick: (p) => { if (!st.items.some((l) => l.productId === p.id)) st.items.push({ productId: p.id, qty: 1 }); draw(); } });
    m.querySelector('#tfLines').addEventListener('change', (e) => { if (e.target.dataset.k) { st.items[+e.target.closest('li').dataset.i].qty = Math.max(1, Math.round(+e.target.value || 1)); draw(); } });
    m.querySelector('#tfLines').addEventListener('click', (e) => { const d = e.target.closest('[data-del]'); if (d) { st.items.splice(+d.dataset.del, 1); draw(); } });
    f.from.addEventListener('change', draw); draw();
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f);
      if (d.from === d.to) return UI.invalid(f, 'to', 'Точки отправления и получения совпадают');
      if (!st.items.length) return UI.toast('Добавьте товары', '', 'warn');
      const over = st.items.find((l) => l.qty > SM.available(l.productId, d.from));
      if (over) return UI.toast('Не хватает товара', SM.product(over.productId).name + ': доступно ' + SM.available(over.productId, d.from), 'bad');
      const t = SM.ops.saveTransfer({ date: d.date, from: d.from, to: d.to, items: st.items, responsible: d.responsible, comment: d.comment });
      UI.closeTop(); UI.toast('Перемещение создано', t.no); SM.go('#/transfers/' + t.id);
    };
  }
  SM.openTransfer = function (id) {
    const t = SM.db.transfers.find((x) => x.id === id);
    if (!t) return;
    const body = html`
      <div class="row nowrap mb-16" style="gap:14px"><div class="cash-acc grow"><span>${I('warehouse')}Откуда</span><b class="fs-15">${SM.point(t.from).name}</b></div><span class="accent-t">${I('arrowRight')}</span><div class="cash-acc grow"><span>${I('store')}Куда</span><b class="fs-15">${SM.point(t.to).name}</b></div></div>
      <dl class="dl"><dt>Дата</dt><dd>${F.date(t.date)}</dd><dt>Ответственный</dt><dd>${SM.user_(t.responsible).name}</dd>${t.comment ? html`<dt>Комментарий</dt><dd>${t.comment}</dd>` : ''}</dl>
      <div class="section-t">Товары</div><ul class="list">${t.items.map((l) => html`<li>${UI.thumb(SM.product(l.productId))}<div class="grow"><b class="fs-13">${SM.product(l.productId).name}</b><div class="fs-12 muted mono">${SM.product(l.productId).code}</div></div><b>${l.qty} ${SM.product(l.productId).unit}</b></li>`)}</ul>
      <div class="section-t">История</div><ul class="timeline">${t.history.slice().reverse().map((h, i) => html`<li class="${i === 0 ? 'on' : ''}"><b>${h.text}</b><small>${F.dt(h.at)} · ${SM.user_(h.uid).name}</small></li>`)}</ul>`;
    const can = SM.can('transfers', 2) || (t.status === 'sent' && SM.pointVisible(t.to) && SM.can('stock', 1));
    const btn = [];
    if (can && t.status === 'created') btn.push(html`<button class="btn btn-primary" data-st="sent">${I('send')}Отправить</button>`);
    if (can && t.status === 'sent') btn.push(html`<button class="btn btn-ok" data-st="accepted">${I('check')}Принять</button>`);
    if (can && (t.status === 'created' || t.status === 'sent')) btn.push(html`<button class="btn btn-danger" data-st="cancelled">${I('x')}Отменить</button>`);
    const dr = UI.drawer({ title: 'Перемещение ' + t.no, sub: SM.point(t.from).name + ' → ' + SM.point(t.to).name, head: html`<span class="note-ic info">${I('repeat')}</span>`, body: html`<div class="row mb-16">${UI.badge(SM.TRANSFER_STATUS[t.status])}</div>${body}`, foot: btn.length ? html`${btn}` : null });
    SM.trackDrawer(SM.openTransfer, [id], dr, '#/transfers');
    UI.$$('[data-st]', dr).forEach((b) => (b.onclick = async () => {
      const s = b.dataset.st;
      let why = '';
      if (s === 'cancelled') { why = await UI.prompt('Отменить перемещение?', '', { ok: 'Отменить', danger: true }); if (!why) return; }
      if (s === 'accepted') { const over = t.items.find((l) => l.qty > SM.qty(l.productId, t.from)); if (over) return UI.toast('На складе отправителя нет товара', SM.product(over.productId).name, 'bad'); }
      SM.ops.transferStatus(t, s, why); UI.toast('Перемещение ' + t.no, SM.TRANSFER_STATUS[s][0]); SM.refresh();
    }));
  };
  function transfersPage(r) {
    const st = r.q.st || '';
    const list = SM.db.transfers.filter((t) => (!st || t.status === st) && (SM.pointVisible(t.from) || SM.pointVisible(t.to))).slice().reverse();
    return html`${UI.pageHead('Перемещения', 'Между складами и магазинами · статусы: создано → отправлено → принято', SM.can('transfers', 2) ? html`<button class="btn btn-primary" data-x="new">${I('plus')}Новое перемещение</button>` : '')}
      <div class="card"><div class="card-h">${UI.filterSelect('st', st, Object.entries(SM.TRANSFER_STATUS).map(([k, v]) => [k, v[0]]), 'Все статусы')}</div>
        <div class="card-b" style="padding-top:12px">${list.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Документ</th><th>Откуда → куда</th><th class="r">Товаров</th><th>Ответственный</th><th>Статус</th></tr></thead><tbody>
          ${list.map((t) => html`<tr class="click" data-tf="${t.id}"><td><span class="cell-title">${t.no}</span><span class="cell-sub">${F.date(t.date)}</span></td><td><span class="cell-title fw-6">${SM.point(t.from).name}</span><span class="cell-sub">→ ${SM.point(t.to).name}</span></td><td class="r">${t.items.length} · ${t.items.reduce((a, l) => a + l.qty, 0)} ед.</td><td>${SM.user_(t.responsible).name}</td><td>${UI.badge(SM.TRANSFER_STATUS[t.status])}</td></tr>`)}</tbody></table></div>` : UI.empty('Перемещений нет', '', 'repeat')}</div></div>`;
  }

  /* ---------- Регистрация страниц ---------- */
  SM.page('products', {
    title: 'Товары', render: productsPage,
    mount(el, r) {
      UI.bindSearch(el); UI.bindFilters(el);
      const on = (s, fn) => { const b = el.querySelector(s); if (b) b.onclick = fn; };
      on('[data-x=new]', () => productForm(null));
      on('[data-x=import]', importModal);
      on('[data-x=import1c]', import1cModal);
      UI.$$('[data-edit]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); productForm(SM.product(b.dataset.edit)); }));
      UI.$$('[data-del]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); SM.deleteProductAsk(SM.product(b.dataset.del)); }));
      on('[data-x=export]', () => UI.exportXLSX('Товары_' + D.todayISO(), [['Код', 'Артикул', 'Код старой программы', 'Наименование', 'Альтернативные названия', 'Категория', 'Производитель', 'Бренд', 'Ед.', 'Закупка', 'Доп. расходы', 'Валюта закупки', 'Цена', 'Валюта', 'НДС, %', 'Остаток', 'Доступно', 'Активен'],
        ...SM.db.products.map((p) => [p.code, p.sku || '', p.oldCode, p.name, (p.alt || []).join(', '), SM.category(p.cat).name, p.maker, p.brand, p.unit, p.buy, p.extra, p.buyCur, p.price, p.cur, p.vat, SM.qty(p.id), SM.available(p.id), p.active ? 'да' : 'нет'])], 'Товары'));
      if (r.id) SM.openProduct(r.id);
    },
  });
  SM.page('stock', {
    title: 'Остатки', render: stockPage,
    mount(el, r) {
      UI.bindSearch(el); UI.bindFilters(el); UI.bindTabs(el); UI.bindPeriod(el);
      const lw = el.querySelector('[data-x=low]'); if (lw) lw.onchange = () => SM.setQuery({ low: lw.checked ? '1' : '' }, true);
      const a = el.querySelector('[data-x=adjust]'); if (a) a.onclick = () => adjustModal(null);
      // карандаш строки: с правом на товары — форма товара сразу на поле «Мин. остаток» (п.18b); иначе — правка количества
      UI.$$('[data-edit]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); if (SM.can('products', 2)) productForm(SM.product(b.dataset.edit), { focus: 'min' }); else stockEditModal(b.dataset.edit); }));
      UI.$$('[data-del]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); stockClearAsk(b.dataset.del); }));
      el.querySelector('[data-x=export]').onclick = () => {
        // на вкладке «Движение товара» выгружается движение с теми же фильтрами, что на экране
        if (r.q.tab === 'moves') { const R = SM.periodRange(r.q.p || 'month'), q = (r.q.q || '').toLowerCase().split(/\s+/).filter(Boolean);
          const mv = SM.db.moves.filter((m) => D.inRange(m.at, R.from, R.to) && (!r.q.pt || m.pointId === r.q.pt) && (!r.q.kind || m.kind === r.q.kind) && SM.pointVisible(m.pointId) && q.every((w) => (SM.product(m.productId).name + ' ' + SM.product(m.productId).code + ' ' + (m.doc || '') + ' ' + moveDoc(m)).toLowerCase().includes(w))).sort((a, b) => String(b.at).localeCompare(String(a.at)));
          return UI.exportXLSX('Движение_товара_' + D.todayISO(), [['Дата', 'Код', 'Товар', 'Точка', 'Операция', 'Документ', 'Кол-во', 'Автор'], ...mv.map((m) => [F.dt(m.at), SM.product(m.productId).code, SM.product(m.productId).name, SM.point(m.pointId).name, SM.MOVE_KINDS[m.kind] || m.kind, moveDoc(m), m.qty, SM.user_(m.by).name])], 'Движение'); }
        const pts = SM.activePoints().filter((p) => SM.pointVisible(p.id)); UI.exportXLSX('Остатки_' + D.todayISO(), [['Код', 'Товар', ...pts.map((p) => p.name), 'Всего', 'Резерв', 'Доступно', 'Мин.'], ...SM.db.products.map((p) => [p.code, p.name, ...pts.map((x) => SM.qty(p.id, x.id)), SM.qty(p.id), SM.reserved(p.id), SM.available(p.id), p.min])], 'Остатки'); };
    },
  });
  SM.page('receipts', {
    title: 'Поступления', render: receiptsPage,
    mount(el, r) {
      UI.bindFilters(el);
      UI.$$('[data-rc]', el).forEach((x) => (x.onclick = () => SM.openReceipt(x.dataset.rc)));
      const n = el.querySelector('[data-x=new]'); if (n) n.onclick = receiptForm;
      if (r.q.new && SM.can('receipts', 2)) { history.replaceState(null, '', '#/receipts'); receiptForm(); }
      if (r.id) SM.openReceipt(r.id);
    },
  });
  SM.page('transfers', {
    title: 'Перемещения', render: transfersPage,
    mount(el, r) {
      UI.bindFilters(el);
      UI.$$('[data-tf]', el).forEach((x) => (x.onclick = () => SM.openTransfer(x.dataset.tf)));
      const n = el.querySelector('[data-x=new]'); if (n) n.onclick = transferForm;
      if (r.q.new && SM.can('transfers', 2)) { history.replaceState(null, '', '#/transfers'); transferForm(); }
      if (r.id) SM.openTransfer(r.id);
    },
  });
})();
