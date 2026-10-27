/* =========================================================
   SM AVTO BASE — компоненты интерфейса: иконки, окна, подсказки,
   свои выпадающие списки, таблицы-карточки, графики, анимации,
   выгрузка в Excel, печать документов.
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM;
  const { html, raw, fmt: F } = SM;
  const UI = (SM.ui = {});

  /* ---------- Иконки (24×24, линия 2px) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L22 8H6.2"/>',
    tire: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5M5.3 5.3l3.5 3.5M15.2 15.2l3.5 3.5M5.3 18.7l3.5-3.5M15.2 8.8l3.5-3.5"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7l10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    truck: '<path d="M1 4h14v12H1z"/><path d="M15 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v13H5a2 2 0 0 1-2-2V5"/><circle cx="16" cy="13.5" r="1.3"/>',
    scale: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0Z"/><path d="m19 7-3 7a3 3 0 0 0 6 0Z"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14v4M8 18h.01M12 18h.01"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    excel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 8 8 8M16 8l-8 8"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>', arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>', arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    move: '<path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>', chevronDown: '<path d="m6 9 6 6 6-6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18M7 6h1v4M16.7 13.9l.7.7-2.8 2.8"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    bank: '<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    trendUp: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>', trendDown: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    lang: '<path d="M4 5h9M8.5 3v2M6 5c1 3.5 3.5 6 6.5 7.5M11 5c-1 3.5-3.5 6-7 7.5"/><path d="m13 21 4-9 4 9M14.5 18h5"/>',
    store: '<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8M10 21v-5h4v5"/>',
    warehouse: '<path d="M2 21V8l10-5 10 5v13"/><path d="M6 21v-9h12v9M6 15h12M6 18h12"/>',
    tag: '<path d="M12 2H2v10l9.3 9.3a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7" cy="7" r="1.5"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    paperclip: '<path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
    battery: '<rect x="2" y="7" width="18" height="12" rx="2"/><path d="M6 4v3M16 4v3M6 13h4M14 13h4M16 11v4"/>',
    droplet: '<path d="M12 2.7 6.3 8.3a8 8 0 1 0 11.4 0z"/>',
    wheel: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2.5V10M12 14v7.5M2.5 12H10M14 12h7.5"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2a5.6 5.6 0 0 0 5.4-5.6C22 6 17.5 2 12 2z"/>',
  };
  UI.icons = P;
  // width/height по умолчанию — 18px; CSS компонентов (кнопки, меню, карточки) их переопределяет
  UI.icon = (name, cls) => raw('<svg class="' + (cls || '') + '" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.info) + '</svg>');
  const I = UI.icon;
  UI.logoMark = () => html`<span class="logo-mark" aria-hidden="true">S</span>`;

  /* ---------- Мелкие помощники ---------- */
  UI.$ = (sel, root = document) => root.querySelector(sel);
  UI.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const AV = ['#9c1c3a', '#7c3aed', '#0e7490', '#b45309', '#15803d', '#be185d', '#1d4ed8', '#4d7c0f'];
  UI.avatarColor = (k) => { let h = 0; String(k).split('').forEach((c) => (h = (h * 31 + c.charCodeAt(0)) >>> 0)); return AV[h % AV.length]; };
  UI.initials = (name) => String((SM.i18n ? SM.i18n.staff(name) : name) || '?').replace(/[«»"]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
  UI.avatar = (name, id, cls = '') => html`<span class="avatar ${cls}" style="background:${UI.avatarColor(id || name)}">${UI.initials(name)}</span>`;
  UI.badge = ([t, c], extra = '') => html`<span class="badge ${c} ${extra}">${t}</span>`;
  UI.empty = (title, text, icon = 'inbox') => html`<div class="empty">${I(icon)}<b>${title}</b>${text || ''}</div>`;
  UI.options = (list, val, empty) => html`${empty != null ? html`<option value="">${empty}</option>` : ''}${list.map((x) => html`<option value="${x[0]}" ${String(x[0]) === String(val) ? raw('selected') : ''}>${x[1]}</option>`)}`;
  UI.formData = (form) => {
    const d = {};
    new FormData(form).forEach((v, k) => { d[k] = typeof v === 'string' ? v.trim() : v; });
    UI.$$('input[type=checkbox]', form).forEach((c) => { if (c.name) d[c.name] = c.checked; });
    return d;
  };
  UI.money = (v, cur = 'UZS') => html`<span class="money">${cur === 'USD' ? '$' + F.num(v, 2) : F.num(Math.round(v))}${cur === 'USD' ? '' : html`<small>сум</small>`}</span>`;
  UI.signed = (v, cur = 'UZS') => { const f = (x) => (cur === 'USD' ? '$' + F.num(x, 2) : F.m(x)); return Math.abs(v) < 0.005 ? html`<span class="amt-zero">0</span>` : v > 0 ? html`<span class="amt-in">+${f(v)}</span>` : html`<span class="amt-out">−${f(-v)}</span>`; };
  UI.thumb = (p, lg) => { if (p.photo) return html`<span class="thumb photo ${lg ? 'lg' : ''}"><img src="${p.photo}" alt="" loading="lazy" decoding="async"></span>`; const icon = SM.isTire(p) ? 'tire' : p.cat === 'c-wheels' ? 'wheel' : p.cat === 'c-oil' ? 'droplet' : p.cat === 'c-acc' ? 'battery' : SM.catRoot(p.cat).id === 'c-parts' ? 'wrench' : 'box'; return html`<span class="thumb ${lg ? 'lg' : ''} ${SM.isTire(p) ? 'tire' : ''}">${I(icon)}</span>`; };
  UI.kpi = ({ label, value, count, unit, icon, foot, spark, sparkColor, sparkKey, sparkFit, href, cls = '' }) => html`
    <div class="card kpi ${href ? 'clickable' : ''} ${spark ? 'has-spark' : ''} ${cls}" ${href ? raw(`data-href="${href}"`) : ''}>
      ${/\bk-accent\b/.test(cls) ? raw('<span class="k-fx" aria-hidden="true"><i class="k-glow"></i><i class="k-tire"></i></span>') : ''}
      <div class="k-label">${icon ? I(icon) : ''}${label}</div>
      <div class="k-value" ${count != null ? raw(`data-count="${count}"`) : ''}>${value}${unit ? html`<small>${unit}</small>` : ''}</div>
      ${foot ? html`<div class="k-foot">${foot}</div>` : ''}
      ${spark ? UI.spark(spark, sparkColor, sparkKey, sparkFit) : ''}
    </div>`;
  UI.delta = (cur, prev, invert) => {
    if (!prev) return html`<span class="delta flat">—</span>`;
    const d = (cur / prev - 1) * 100;
    const good = invert ? d < 0 : d > 0;
    if (Math.abs(d) < 0.5) return html`<span class="delta flat">0%</span>`;
    return html`<span class="delta ${good ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${F.num(Math.abs(d), Math.abs(d) < 10 ? 1 : 0)}%</span>`;
  };
  UI.progress = (f, cls = '', size = '') => html`<div class="progress ${size}"><i class="${cls}" style="width:${Math.max(0, Math.min(100, f * 100)).toFixed(1)}%"></i></div>`;

  /* ---------- Анимации: счётчики и поочерёдное появление ---------- */
  UI.countUp = function (root = document) {
    UI.$$('[data-count]', root).forEach((el) => {
      const target = parseFloat(el.dataset.count);
      if (!isFinite(target)) return;
      const small = el.querySelector('small');
      const unit = small ? small.outerHTML : '';
      const dec = +(el.dataset.dec || 0);
      const prefix = el.dataset.prefix || '';
      const t0 = performance.now(), dur = 900;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.innerHTML = prefix + F.num(target * e, dec) + unit;
        if (k < 1) requestAnimationFrame(step);
      };
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      requestAnimationFrame(step);
    });
  };
  UI.stagger = (root) => { let i = 0; Array.from(root.children).forEach((c) => c.style.setProperty('--i', i++)); UI.$$('.stagger', root).forEach((s) => Array.from(s.children).forEach((c, k) => c.style.setProperty('--i', k + 1))); };

  /* ---------- Выпадающий список в стиле сайта ----------
     Настоящий <select> остаётся в форме, поверх — своя кнопка и меню.
     На телефоне меню открывается «шторкой» снизу, в длинных списках есть поиск. */
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const SEL_PROTO = HTMLSelectElement.prototype;
  let openSel = null;
  function closeSelect(refocus) {
    if (!openSel) return;
    const s = openSel; openSel = null;
    s.menu.remove(); if (s.scrim) s.scrim.remove();
    s.wrap.classList.remove('open');
    s.btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', s.out, true);
    document.removeEventListener('keydown', s.key, true);
    window.removeEventListener('scroll', s.scroll, true);
    window.removeEventListener('resize', s.resize);
    if (refocus) s.btn.focus({ preventScroll: true });
  }
  UI.closeSelect = closeSelect;
  function fieldLabel(wrap) {
    const f = wrap.closest('.field');
    const l = f && f.querySelector(':scope > label');
    if (l) return l.textContent.replace('*', '').trim();
    const s = wrap.querySelector('select');
    return (s && (s.dataset.title || s.getAttribute('aria-label'))) || 'Выберите вариант';
  }
  function optInner(o) {
    const d = o.dataset;
    return (d.dot ? '<i class="csel-dot" style="--bc:' + SM.esc(d.dot) + '"></i>' : '') + '<span>' + SM.esc(o.textContent) + '</span>' + (d.count != null ? '<em class="csel-n">' + SM.esc(d.count) + '</em>' : '');
  }
  function openSelect(sel, wrap, btn) {
    if (openSel && openSel.sel === sel) return closeSelect(true);
    closeSelect();
    if (sel.disabled) return;
    UI.hideTip();
    const sheet = matchMedia('(max-width: 720px)').matches;
    const opts = Array.from(sel.options);
    const menu = document.createElement('div');
    menu.className = 'csel-menu' + (sheet ? ' sheet' : '');
    menu.setAttribute('role', 'listbox');
    const searchable = opts.length > 8 && sel.dataset.search !== 'off';
    menu.innerHTML = (sheet ? '<div class="csel-sheet-h"><i></i><b>' + SM.esc(fieldLabel(wrap)) + '</b></div>' : '') + (searchable ? '<div class="csel-search"><input class="input input-sm" placeholder="Поиск…" autocomplete="off"></div>' : '') + '<div class="csel-list"></div>';
    const list = menu.querySelector('.csel-list');
    let act = sel.selectedIndex;
    let shown = [];
    const draw = (q) => {
      const s = (q || '').toLowerCase();
      shown = opts.map((o, i) => [o, i]).filter(([o]) => !s || o.textContent.toLowerCase().includes(s));
      list.innerHTML = shown.length ? shown.map(([o, i]) => (!s && o.hasAttribute('data-sep') ? '<div class="csel-sep" role="separator"></div>' : '') + '<div class="csel-opt' + (i === sel.selectedIndex ? ' sel' : '') + (i === act ? ' act' : '') + (o.disabled ? ' off' : '') + '" role="option" data-i="' + i + '" aria-selected="' + (i === sel.selectedIndex) + '">' + optInner(o) + CHECK + '</div>').join('') : '<div class="csel-empty">Ничего не найдено</div>';
    };
    draw();
    document.body.appendChild(menu);
    let scrim = null;
    if (sheet) { scrim = document.createElement('div'); scrim.className = 'csel-scrim'; document.body.insertBefore(scrim, menu); scrim.addEventListener('click', () => closeSelect()); }
    const place = () => {
      if (sheet) return;
      const r = wrap.getBoundingClientRect();
      menu.style.minWidth = r.width + 'px';
      const below = innerHeight - r.bottom - 10, above = r.top - 10;
      const h = Math.min(menu.scrollHeight, 420);
      const up = below < Math.min(h, 220) && above > below;
      menu.classList.toggle('up', up);
      menu.style.maxHeight = Math.max(160, Math.min(420, up ? above : below)) + 'px';
      const mh = Math.min(menu.scrollHeight, parseFloat(menu.style.maxHeight));
      menu.style.top = (up ? r.top - mh - 6 : r.bottom + 6) + 'px';
      const w = menu.offsetWidth;
      menu.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
    };
    place();
    const selEl = list.querySelector('.sel');
    if (selEl) selEl.scrollIntoView({ block: 'nearest' });
    const choose = (i) => {
      if (i == null || i < 0 || opts[i].disabled) return;
      const changed = sel.selectedIndex !== i;
      sel.selectedIndex = i;
      closeSelect(!sheet);
      if (changed) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    };
    list.addEventListener('click', (e) => { const o = e.target.closest('.csel-opt'); if (o) choose(+o.dataset.i); });
    list.addEventListener('mousemove', (e) => { const o = e.target.closest('.csel-opt'); if (o && +o.dataset.i !== act) { act = +o.dataset.i; list.querySelectorAll('.act').forEach((x) => x.classList.remove('act')); o.classList.add('act'); } });
    const sInp = menu.querySelector('.csel-search input');
    if (sInp) { sInp.addEventListener('input', () => { draw(sInp.value); act = shown[0] ? shown[0][1] : -1; draw(sInp.value); }); if (!sheet) setTimeout(() => sInp.focus(), 20); }
    let typed = '', typedT;
    const s = {
      sel, wrap, btn, menu, scrim,
      out: (e) => { if (!menu.contains(e.target) && !wrap.contains(e.target)) closeSelect(); },
      scroll: (e) => { if (!menu.contains(e.target)) closeSelect(); },
      resize: () => { if (!sheet) closeSelect(); },
      key: (e) => {
        const idx = shown.map(([, i]) => i);
        const pos = idx.indexOf(act);
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeSelect(true); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = idx[Math.max(0, Math.min(idx.length - 1, pos + (e.key === 'ArrowDown' ? 1 : -1)))]; draw(sInp ? sInp.value : ''); const a = list.querySelector('.act'); if (a) a.scrollIntoView({ block: 'nearest' }); return; }
        if (e.key === 'Enter') { e.preventDefault(); choose(act); return; }
        if (e.key === 'Tab') { closeSelect(); return; }
        if (!sInp && e.key.length === 1) { clearTimeout(typedT); typed += e.key.toLowerCase(); typedT = setTimeout(() => (typed = ''), 700); const m = opts.findIndex((o) => o.textContent.toLowerCase().startsWith(typed)); if (m >= 0) { act = m; draw(); const a = list.querySelector('.act'); if (a) a.scrollIntoView({ block: 'nearest' }); } }
      },
    };
    openSel = s;
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => { document.addEventListener('mousedown', s.out, true); window.addEventListener('scroll', s.scroll, true); window.addEventListener('resize', s.resize); }, 0);
    document.addEventListener('keydown', s.key, true);
  }
  function buildSelect(sel) {
    const wrap = document.createElement('div');
    wrap.className = 'csel' + (sel.classList.contains('input-sm') ? ' sm' : '') + (sel.classList.contains('input-lg') ? ' lg' : '');
    const st = sel.getAttribute('style');
    if (st) { wrap.setAttribute('style', st); sel.removeAttribute('style'); }
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
    wrap.appendChild(btn);
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');
    const sync = () => {
      const o = sel.options[sel.selectedIndex];
      btn.className = 'csel-btn';
      btn.innerHTML = o ? optInner(o) : '<span>—</span>';
      btn.disabled = sel.disabled;
      wrap.classList.toggle('disabled', sel.disabled);
    };
    ['value', 'selectedIndex'].forEach((p) => {
      const d = Object.getOwnPropertyDescriptor(SEL_PROTO, p);
      Object.defineProperty(sel, p, { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); sync(); } });
    });
    new MutationObserver(sync).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    sel.addEventListener('change', sync);
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openSelect(sel, wrap, btn); });
    btn.addEventListener('keydown', (e) => { if (!openSel && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openSelect(sel, wrap, btn); } });
    sel._csel = { sync };
    sync();
  }
  UI.enhanceSelects = (root = document) => UI.$$('select.select', root).forEach((s) => (s._csel ? s._csel.sync() : buildSelect(s)));
  /* таблицы → карточки на телефоне: подписи столбцов берём из шапки */
  UI.labelTables = (root = document) => UI.$$('table.table:not(.no-stack)', root).forEach((t) => {
    const hs = UI.$$('thead th', t).map((th) => th.textContent.trim());
    if (!hs.length) return;
    UI.$$('tbody tr, tfoot tr', t).forEach((tr) => {
      let ci = 0;
      Array.from(tr.children).forEach((td) => { if (td.dataset.label == null) td.dataset.label = td.colSpan > 1 ? '' : hs[ci] || ''; ci += td.colSpan || 1; });
    });
    t.classList.add('stackable');
  });
  UI.enhance = (root = document) => { UI.enhanceSelects(root); UI.labelTables(root); };

  /* ---------- Уведомления справа снизу ----------
     kind: ok (подтверждение), bad (ошибка), warn (внимание), info, load (ожидание — крутится, пока не обновят).
     opts.icon — значок события (cart — заказ, trash — удаление, download — файл, inbox — поступление, coins — расход…).
     Возвращает {set(title, text, kind, icon), close()} — так «ожидание» превращается в «готово». */
  const T_ICON = { ok: 'check', warn: 'alert', bad: 'alert', info: 'info', load: 'refresh' };
  UI.toast = function (title, text, kind = 'ok', opts = {}) {
    let box = UI.$('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    let timer = null;
    const close = () => { clearTimeout(timer); if (!t.isConnected) return; t.classList.add('out'); setTimeout(() => t.remove(), 280); };
    const set = (ti, tx, k = 'ok', icon) => {
      const ms = k === 'load' ? 0 : opts.ms || (k === 'bad' ? 6500 : 4200);
      t.className = 'toast ' + k;
      t.innerHTML = String(html`<span class="t-ic">${I(icon || (k === 'load' ? 'refresh' : opts.icon && k === kind ? opts.icon : T_ICON[k]))}</span><div class="grow"><b>${ti}</b>${tx ? html`<small>${tx}</small>` : ''}</div><button class="t-x" aria-label="Закрыть">${I('x')}</button><i class="t-bar" style="animation-duration:${ms || 1400}ms"></i>`);
      t.querySelector('.t-x').onclick = close;
      clearTimeout(timer);
      if (ms) {
        // на паузе, пока над уведомлением курсор
        let left = ms, started = Date.now();
        const arm = () => { timer = setTimeout(close, left); started = Date.now(); };
        t.onmouseenter = () => { clearTimeout(timer); left -= Date.now() - started; };
        t.onmouseleave = arm;
        arm();
      }
    };
    set(title, text, kind, opts.icon);
    box.appendChild(t);
    // не больше 4 уведомлений одновременно
    while (box.children.length > 4) box.firstElementChild.remove();
    return { set, close, el: t };
  };
  /* выполнить действие с уведомлением «ждём…» → «готово» / «ошибка» */
  UI.task = async function (title, text, fn, { done = 'Готово', icon } = {}) {
    const t = UI.toast(title, text, 'load');
    try { const r = await fn(); t.set(r && r.title || done, r && r.text || '', 'ok', icon); return r; }
    catch (e) { t.set('Не получилось', e.message || String(e), 'bad'); throw e; }
  };

  /* ---------- Поля сумм: разделение разрядов «1 450 000» и предел ----------
     <input data-money data-max="763000" data-dec="2">: лишние символы не вводятся,
     больше data-max ввести нельзя (поле мигает и подсказывает предел). */
  UI.num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[\s ]/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  UI.fmtInput = (n, dec) => { if (n === '' || n == null) return ''; const [i, f] = String(n).split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f != null ? ',' + f.slice(0, dec) : ''); };
  UI.moneyAttrs = (max, dec = 0) => raw('data-money inputmode="decimal" autocomplete="off"' + (max != null ? ' data-max="' + Math.max(0, Math.round(max * 100) / 100) + '"' : '') + (dec ? ' data-dec="' + dec + '"' : ''));
  UI.setMoney = (el, v) => { el.value = v === '' || v == null ? '' : UI.fmtInput(Math.round(v * 100) / 100, +(el.dataset.dec || 0)); };
  UI.setMax = (el, max) => { if (max == null) delete el.dataset.max; else el.dataset.max = Math.max(0, Math.round(max * 100) / 100); };
  const LIMIT = 999999999999; // защита от «бесконечных» чисел
  let flashT = 0;
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.matches || !el.matches('input[data-money]')) return;
    const dec = +(el.dataset.dec || 0);
    const caretDigits = el.value.slice(0, el.selectionStart).replace(/[^\d.,]/g, '').length;
    let raw2 = el.value.replace(/[^\d.,]/g, '').replace(',', '.');
    const dot = raw2.indexOf('.');
    if (dot >= 0) raw2 = raw2.slice(0, dot + 1) + raw2.slice(dot + 1).replace(/\./g, '').slice(0, dec);
    if (!dec) raw2 = raw2.split('.')[0];
    raw2 = raw2.replace(/^0+(?=\d)/, '');
    const max = el.dataset.max != null ? Math.min(+el.dataset.max, LIMIT) : LIMIT;
    if (raw2 !== '' && +raw2 > max) {
      raw2 = String(Math.round(max * 100) / 100);
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
      if (Date.now() - flashT > 2500 && el.dataset.max != null) { flashT = Date.now(); UI.toast('Больше нельзя', 'Максимум для этого поля: ' + UI.fmtInput(raw2, dec), 'warn', { icon: 'alert', ms: 2600 }); }
    }
    const out = UI.fmtInput(raw2, dec);
    if (out !== el.value) {
      el.value = out;
      // курсор остаётся после той же цифры
      let pos = 0, seen = 0;
      while (pos < out.length && seen < caretDigits) { if (/[\d,]/.test(out[pos])) seen++; pos++; }
      try { el.setSelectionRange(pos, pos); } catch (err) { /* поле без выделения */ }
    }
  }, true);
  /* количество и проценты: тоже не больше max */
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.matches || !el.matches('input[type=number]')) return;
    if (el.max !== '' && +el.value > +el.max) { el.value = el.max; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    if (el.min !== '' && el.value !== '' && +el.value < +el.min) el.value = el.min;
  }, true);

  /* ---------- Окна ---------- */
  const stack = [];
  function openLayer(node) {
    document.body.appendChild(node);
    stack.push(node);
    document.body.style.overflow = 'hidden';
    UI.enhance(node);
    if (matchMedia('(pointer: coarse)').matches) return;
    const f = node.querySelector('[autofocus]');
    if (f) setTimeout(() => f.focus(), 60);
  }
  UI.closeTop = function () {
    const n = stack.pop();
    if (n) { if (n._onClose) n._onClose(); n.remove(); }
    if (!stack.length) document.body.style.overflow = '';
  };
  UI.closeAll = () => { while (stack.length) UI.closeTop(); };
  UI.layers = () => stack.length;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length && !openSel) UI.closeTop(); });
  UI.modal = function ({ title, sub, body, foot, size = '', onClose }) {
    const ov = document.createElement('div');
    ov.className = 'overlay center';
    ov.innerHTML = String(html`<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal-h"><div class="grow"><h2>${title}</h2>${sub ? html`<p>${sub}</p>` : ''}</div><button class="btn btn-icon btn-sm" data-close aria-label="Закрыть">${I('x')}</button></div>
      <div class="modal-b">${body}</div>${foot ? html`<div class="modal-f">${foot}</div>` : ''}</div>`);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) UI.closeTop(); });
    ov.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) UI.closeTop(); });
    ov._onClose = onClose;
    openLayer(ov);
    UI.bindFiles(ov);
    return ov;
  };
  /* поле файлов: кнопка в стиле проекта + скрытый input + выбранные файлы чипами с крестиком;
     при multiple повторный выбор добавляет файлы к уже выбранным, крестик убирает файл из input.files */
  UI.fileField = (name, { label = 'Прикрепить файл', multiple = false, accept = '' } = {}) => html`<div class="file-pick"><label class="btn btn-secondary">${I('paperclip')}${label}<input type="file" name="${name}" ${multiple ? 'multiple' : ''} ${accept ? raw('accept="' + accept + '"') : ''} hidden></label><div class="file-chips"></div></div>`;
  UI.bindFiles = (root) => root.querySelectorAll('.file-pick').forEach((box) => {
    const inp = box.querySelector('input[type=file]'), chips = box.querySelector('.file-chips');
    let kept = [];
    const set = (list) => { kept = list; const dt = new DataTransfer(); kept.forEach((f) => dt.items.add(f)); inp.files = dt.files;
      chips.innerHTML = kept.map((f, i) => String(html`<span class="chip">${I('paperclip')}<span class="fc-n">${f.name}</span><button type="button" class="fc-x" data-rm="${i}" aria-label="Убрать файл">${I('x')}</button></span>`)).join(''); };
    inp.addEventListener('change', () => { const add = Array.from(inp.files || []); set(inp.multiple ? kept.concat(add.filter((f) => !kept.some((k) => k.name === f.name && k.size === f.size))) : add); });
    chips.addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) set(kept.filter((_, i) => i !== +b.dataset.rm)); });
  });
  UI.drawer = function ({ title, sub, body, foot, size = '', onClose, head }) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = String(html`<aside class="drawer ${size}" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="drawer-h">${head || ''}<div class="grow"><b>${title}</b>${sub ? html`<small>${sub}</small>` : ''}</div><button class="btn btn-icon" data-close aria-label="Закрыть">${I('x')}</button></div>
      <div class="drawer-b">${body}</div>${foot ? html`<div class="drawer-f">${foot}</div>` : ''}</aside>`);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) UI.closeTop(); });
    ov.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) UI.closeTop(); });
    ov._onClose = onClose;
    openLayer(ov);
    UI.drawCharts(ov);
    return ov;
  };
  UI.confirm = (title, text, { ok = 'Подтвердить', danger = false } = {}) => new Promise((res) => {
    let done = false;
    const m = UI.modal({ title, size: 'narrow', body: html`<p class="text-2">${text}</p>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${ok}</button>`,
      onClose: () => { if (!done) res(false); } });
    m.querySelector('[data-ok]').onclick = () => { done = true; UI.closeTop(); res(true); };
  });
  /* переспрос перед удалением: красная корзина, «Удалить безвозвратно» */
  UI.confirmDelete = (title, text) => new Promise((res) => {
    let done = false;
    const m = UI.modal({ title, size: 'narrow', body: html`<div class="row nowrap" style="align-items:flex-start;gap:14px"><span class="note-ic bad" style="width:46px;height:46px;border-radius:14px">${I('trash')}</span><p class="text-2" style="margin-top:4px">${text}</p></div>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-danger" data-ok>${I('trash')}Удалить</button>`,
      onClose: () => { if (!done) res(false); } });
    m.querySelector('[data-ok]').onclick = () => { done = true; UI.closeTop(); res(true); };
  });
  /* карандаш и корзина в строке таблицы */
  UI.actBtns = (id, { edit = true, del = true, editTip = 'Изменить', delTip = 'Удалить' } = {}) => html`<span class="act-btns">${edit ? html`<button type="button" class="act-btn" data-edit="${id}" data-tip="${editTip}" aria-label="${editTip}">${I('edit')}</button>` : ''}${del ? html`<button type="button" class="act-btn del" data-del="${id}" data-tip="${delTip}" aria-label="${delTip}">${I('trash')}</button>` : ''}</span>`;
  /* окно с обязательной причиной (отмены, отклонения — ТЗ 21) */
  UI.prompt = (title, text, { label = 'Причина', ok = 'Сохранить', danger = false, placeholder = 'Опишите причину — запись попадёт в историю операций' } = {}) => new Promise((res) => {
    let done = false;
    const m = UI.modal({ title, sub: text, size: 'narrow',
      body: html`<form class="stack" style="gap:12px"><div class="field"><label>${label} <span class="req">*</span></label><textarea class="textarea" name="comment" placeholder="${placeholder}" autofocus></textarea><span class="hint"></span></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${ok}</button>`,
      onClose: () => { if (!done) res(null); } });
    const form = m.querySelector('form');
    const go = () => {
      const d = UI.formData(form);
      if (!d.comment || d.comment.length < 3) { const f = form.querySelector('.field'); f.classList.add('is-invalid'); f.querySelector('.hint').textContent = 'Укажите причину'; return; }
      done = true; UI.closeTop(); res(d.comment);
    };
    m.querySelector('[data-ok]').onclick = go;
    form.onsubmit = (e) => { e.preventDefault(); go(); };
  });
  /* подсветка ошибки у поля формы */
  UI.invalid = (form, name, msg) => {
    const el = form.querySelector('[name="' + name + '"]');
    const f = el && el.closest('.field');
    if (!f) { UI.toast('Проверьте форму', msg, 'warn'); return; }
    f.classList.add('is-invalid');
    let h = f.querySelector('.hint');
    if (!h) { h = document.createElement('span'); h.className = 'hint'; f.appendChild(h); }
    h.textContent = msg;
    f.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.addEventListener('input', () => f.classList.remove('is-invalid'), { once: true });
    el.addEventListener('change', () => f.classList.remove('is-invalid'), { once: true });
  };

  /* ---------- Подсказки (data-tip) ---------- */
  let tip, tipFor = null;
  const ensureTip = () => { if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); } return tip; };
  function showTip(text, x, y) {
    const t = ensureTip();
    t.className = 'tip on';
    t.textContent = text;
    const r = t.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > innerHeight - 8) top = y - r.height - 14;
    t.style.left = left + 'px'; t.style.top = top + 'px';
  }
  function showTipFor(el) {
    const t = ensureTip();
    t.textContent = el.getAttribute('data-tip');
    const right = el.getAttribute('data-tip-pos') === 'right';
    t.className = 'tip';
    const r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
    let left, top;
    if (right) { left = r.right + 10; top = r.top + r.height / 2 - h / 2; }
    else { left = r.left + r.width / 2 - w / 2; top = r.top - h - 10; if (top < 6) top = r.bottom + 10; }
    t.style.left = Math.max(8, Math.min(left, innerWidth - w - 8)) + 'px';
    t.style.top = Math.max(6, top) + 'px';
    // показ — кадром позже; если подсказку уже спрятали (нажатие), не возвращаем её
    requestAnimationFrame(() => { if (tipFor === el) t.classList.add('on'); });
  }
  const hideTip = () => { tipFor = null; if (tip) tip.classList.remove('on'); };
  UI.showTip = showTip; UI.hideTip = hideTip;
  // касание пальцем тоже шлёт mouseover: на телефоне подсказки кнопок не показываем, убрать их там нечем
  let touchAt = 0;
  document.addEventListener('touchstart', () => { touchAt = Date.now(); }, { capture: true, passive: true });
  document.addEventListener('mouseover', (e) => {
    let el = e.target.closest && e.target.closest('[data-tip]');
    if (el && !el.dataset.tipRail && Date.now() - touchAt < 1000) el = null;
    // подписи разделов в «рельсе» нужны только на сенсорном планшете: с мышью сайдбар раскрывается сам
    if (el && el.dataset.tipRail && !matchMedia('(min-width: 721px) and (hover: none)').matches) el = null;
    if (el && el !== tipFor) { tipFor = el; showTipFor(el); }
    else if (!el && tipFor) hideTip();
  });
  document.addEventListener('mouseout', (e) => { if (tipFor && !tipFor.contains(e.relatedTarget)) hideTip(); });
  document.addEventListener('scroll', () => tipFor && hideTip(), true);
  document.addEventListener('mousedown', () => tipFor && hideTip(), true);

  /* ---------- Графики (SVG по ширине контейнера, с анимацией появления) ---------- */
  const charts = new Map();
  let chartN = 0;
  UI.chart = function (spec) { const id = 'ch' + ++chartN; charts.set(id, spec); return html`<div class="chart-box" data-chart="${id}" style="min-height:${spec.height || 220}px"></div>`; };
  UI.drawCharts = function (root = document, animate = true) {
    UI.$$('.chart-box[data-chart]', root).forEach((el) => {
      const spec = charts.get(el.dataset.chart);
      if (!spec) return;
      const w = Math.max(240, el.clientWidth);
      el.innerHTML = '';
      el.appendChild(render(spec, w, animate));
    });
    UI.morphSparks(root);
  };
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => UI.drawCharts(document, false), 150); });
  const SVGNS = 'http://www.w3.org/2000/svg';
  let gradN = 0;
  const niceMax = (v) => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
  function render(spec, W, animate) {
    const H = spec.height || 220;
    const fmtV = spec.fmt || ((v) => F.short(v));
    const pad = { l: spec.padL != null ? spec.padL : 52, r: 12, t: 12, b: 26 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const n = spec.labels.length;
    const series = spec.series;
    const stacked = spec.type === 'stack';
    let max = 0;
    for (let i = 0; i < n; i++) {
      if (stacked) max = Math.max(max, series.reduce((s, x) => s + (x.values[i] || 0), 0));
      else for (const s of series) max = Math.max(max, s.values[i] || 0);
    }
    const stepV = niceMax((max || 1) / 4);
    const ticks = Math.max(2, Math.ceil((max * 1.04) / stepV) || 2);
    max = stepV * ticks;
    const y = (v) => pad.t + ih - (v / max) * ih;
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('class', 'chart');
    const gid = ++gradN; // у каждого графика свои id градиентов, иначе цвета серий перепутаются
    let s = '<defs>' + series.map((se, k) => `<linearGradient id="g${gid}-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${se.color}" stop-opacity="1"/><stop offset="1" stop-color="${se.color}" stop-opacity=".55"/></linearGradient>`).join('') + '</defs>';
    for (let i = 0; i <= ticks; i++) {
      const v = stepV * i, yy = y(v);
      s += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}"/>`;
      s += `<text x="${pad.l - 8}" y="${yy + 4}" text-anchor="end">${SM.esc(fmtV(v))}</text>`;
    }
    const step = Math.max(1, Math.ceil(n / Math.floor(iw / 54)));
    const bw = iw / n;
    for (let i = 0; i < n; i += step) s += `<text x="${pad.l + bw * i + bw / 2}" y="${H - 8}" text-anchor="middle">${SM.esc(spec.labels[i])}</text>`;
    if (spec.type === 'line') {
      const x = (i) => pad.l + bw * i + bw / 2;
      series.forEach((se) => {
        const pts = se.values.map((v, i) => [x(i), y(v || 0)]);
        if (spec.area) s += `<path d="M${pts[0][0]},${y(0)} ${pts.map((p) => 'L' + p[0] + ',' + p[1]).join(' ')} L${pts[pts.length - 1][0]},${y(0)}Z" fill="${se.color}" opacity=".12"/>`;
        s += `<path class="${animate ? 'line-path' : ''}" style="--len:${Math.round(iw * 2)}" d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${se.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
        pts.forEach((p) => (s += `<circle class="c-dot" cx="${p[0]}" cy="${p[1]}" r="3" stroke="${se.color}" stroke-width="2"/>`));
      });
    } else {
      const groups = stacked ? 1 : series.length;
      const gap = 3;
      const barW = Math.max(3, Math.min(30, (bw * 0.66 - gap * (groups - 1)) / groups));
      for (let i = 0; i < n; i++) {
        const x0 = pad.l + bw * i + (bw - (barW * groups + gap * (groups - 1))) / 2;
        let acc = 0;
        series.forEach((se, k) => {
          const v = se.values[i] || 0;
          if (v <= 0) return;
          let yTop, yBot, xx;
          if (stacked) { yBot = y(acc); acc += v; yTop = y(acc); xx = x0; if (acc !== v) yBot -= 2; }
          else { yBot = y(0); yTop = y(v); xx = x0 + k * (barW + gap); }
          const h = Math.max(1, yBot - yTop);
          const r = Math.min(5, barW / 2, h);
          s += `<path class="${animate ? 'bar' : ''}" style="--i:${i}" d="M${xx},${yBot} V${yTop + r} Q${xx},${yTop} ${xx + r},${yTop} H${xx + barW - r} Q${xx + barW},${yTop} ${xx + barW},${yTop + r} V${yBot}Z" fill="url(#g${gid}-${k})"/>`;
        });
      }
    }
    s += `<line class="xh" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + ih}" stroke="rgba(255,255,255,.25)" stroke-width="1" opacity="0"/>`;
    for (let i = 0; i < n; i++) s += `<rect class="hover-col" data-i="${i}" x="${pad.l + bw * i}" y="${pad.t}" width="${bw}" height="${ih}"/>`;
    svg.innerHTML = s;
    const xh = svg.querySelector('.xh');
    svg.addEventListener('mousemove', (e) => {
      const r = e.target.closest('.hover-col');
      if (!r) return;
      const i = +r.dataset.i;
      const xx = pad.l + bw * i + bw / 2;
      if (spec.type === 'line') { xh.setAttribute('x1', xx); xh.setAttribute('x2', xx); xh.setAttribute('opacity', '1'); }
      const lines = [spec.tipLabels ? spec.tipLabels[i] : spec.labels[i]];
      let tot = 0;
      series.forEach((se) => { const v = se.values[i] || 0; tot += v; lines.push('● ' + se.name + ': ' + (spec.tipFmt || fmtV)(v)); });
      if (stacked && series.length > 1) lines.push('Итого: ' + (spec.tipFmt || fmtV)(tot));
      showTip(lines.join('\n'), e.clientX, e.clientY);
    });
    svg.addEventListener('mouseleave', () => { xh.setAttribute('opacity', '0'); hideTip(); });
    return svg;
  }
  UI.legend = (items) => html`<div class="legend">${items.map((x) => html`<span><i style="background:${x.color}"></i>${x.name}${x.value != null ? html` · <b>${x.value}</b>` : ''}</span>`)}</div>`;
  /* Спарклайн. key — постоянное имя графика на странице: при перерисовке с другими данными (смена периода) линия
     перетекает из старой формы в новую (UI.morphSparks), без key — просто рисуется. */
  const SPW = 96, SPH = 34;
  // fit — шкала от минимума до максимума ряда (остатки: иначе крупный остаток рисуется плоской линией у верха)
  const sparkPts = (values, fit) => { const max = fit ? Math.max(...values) : Math.max(...values, 1), min = fit ? Math.min(...values) : Math.min(...values, 0); if (max === min) return values.map((v, i) => [(i / (values.length - 1)) * SPW, fit ? SPH / 2 : SPH - 3]); return values.map((v, i) => [(i / (values.length - 1)) * SPW, SPH - 3 - ((v - min) / (max - min || 1)) * (SPH - 6)]); };
  const sparkD = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  UI.spark = function (values, color = 'var(--s1)', key, fit) {
    if (!values || values.length < 2) return '';
    const d = sparkD(sparkPts(values, fit));
    return raw(`<svg class="k-spark" viewBox="0 0 ${SPW} ${SPH}" aria-hidden="true"${key ? ` data-spark="${SM.esc(key)}" data-d="${d}" data-v="${values.map((v) => Math.round(v * 100) / 100).join(',')}"` : ''}><path class="sp-area" d="${d} L${SPW},${SPH} L0,${SPH}Z" fill="${color}" opacity=".12"/><path class="sp-line" d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  };
  // ломаная → N точек с равным шагом по x (линейная интерполяция): у старой и новой формы одно число точек
  const resample = (pts, n) => Array.from({ length: n }, (_, i) => { const x = (i / (n - 1)) * SPW, k = Math.min(pts.length - 2, Math.floor((x / SPW) * (pts.length - 1))), a = pts[k], b = pts[k + 1], t = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]); return [x, a[1] + (b[1] - a[1]) * Math.max(0, Math.min(1, t))]; });
  const parseD = (d) => (d.match(/-?[\d.]+,-?[\d.]+/g) || []).map((s) => s.split(',').map(Number));
  const sparkLast = new Map(); // key → путь, который сейчас на экране
  UI.morphSparks = function (root = document) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    UI.$$('svg.k-spark[data-spark]', root).forEach((svg) => {
      const key = svg.dataset.spark, to = svg.dataset.d, from = sparkLast.get(key);
      sparkLast.set(key, to);
      if (!from || from === to) return;
      svg.classList.add('morph'); // без «прорисовки» штрихом: линия уже была на экране
      if (reduce) return;
      const N = 48, A = resample(parseD(from), N), B = resample(parseD(to), N);
      const line = svg.querySelector('.sp-line'), area = svg.querySelector('.sp-area');
      const set = (d) => { line.setAttribute('d', d); area.setAttribute('d', d + ` L${SPW},${SPH} L0,${SPH}Z`); };
      const t0 = performance.now(), dur = 450, ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      set(sparkD(A));
      const step = (now) => {
        if (!svg.isConnected) return;
        const t = Math.min(1, (now - t0) / dur), e = ease(t);
        if (t < 1) { set(sparkD(A.map((p, i) => [p[0], p[1] + (B[i][1] - p[1]) * e]))); requestAnimationFrame(step); }
        else set(to);
      };
      requestAnimationFrame(step);
    });
  };
  /* кольцевая диаграмма с подписью в центре */
  UI.donut = function (parts, { size = 168, label = '', value = '' } = {}) {
    const sum = parts.reduce((a, p) => a + p.value, 0) || 1;
    const R = 62, C = 2 * Math.PI * R;
    let off = 0;
    const segs = parts.filter((p) => p.value > 0).map((p, i) => {
      const len = (p.value / sum) * C;
      const el = `<circle class="seg" r="${R}" cx="80" cy="80" fill="none" stroke="${p.color}" stroke-width="18" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)" style="animation-delay:${i * 90}ms"><title>${SM.esc(p.name)}</title></circle>`;
      off += len;
      return el;
    }).join('');
    return raw(`<svg class="donut" width="${size}" height="${size}" viewBox="0 0 160 160" aria-hidden="true"><circle class="d-bg" r="${R}" cx="80" cy="80" fill="none" stroke-width="18"/>${segs}<text class="d-v" x="80" y="76" text-anchor="middle">${SM.esc(value)}</text><text class="d-l" x="80" y="96" text-anchor="middle">${SM.esc(label)}</text></svg>`);
  };
  UI.segBar = function (parts, { fmt = (v) => F.cur(v), height = 12 } = {}) {
    const sum = parts.reduce((s, p) => s + p.value, 0) || 1;
    return html`<div class="progress stacked" style="height:${height}px;gap:2px">${parts.filter((p) => p.value > 0).map((p) => html`<i style="width:${((p.value / sum) * 100).toFixed(2)}%;background:${p.color}" data-tip="${p.name + ': ' + fmt(p.value) + ' (' + F.pct((p.value / sum) * 100) + ')'}"></i>`)}</div>
      <div class="donut-legend mt-12">${parts.map((p) => html`<div class="row"><span class="row nowrap" style="gap:8px"><i class="dot" style="background:${p.color};border-radius:3px"></i><span class="text-2 fw-7">${p.name}</span></span><span><b class="num">${fmt(p.value)}</b> <span class="muted fs-12">${F.pct((p.value / sum) * 100, 0)}</span></span></div>`)}</div>`;
  };
  UI.hbars = function (rows, { fmt = (v) => F.cur(v), color = 'var(--s1)', max } = {}) {
    const m = max || Math.max(...rows.map((r) => r.value), 1);
    return html`<div class="stack" style="gap:12px">${rows.map((r) => html`
      <div ${r.attr ? raw(r.attr) : ''} style="${r.attr ? 'cursor:pointer' : ''}">
        <div class="row between nowrap fs-13" style="margin-bottom:6px"><span class="fw-7 ellipsis">${r.label}</span><span class="fw-8 nowrap num">${fmt(r.value)}${r.extra ? html` <span class="muted fw-7">${r.extra}</span>` : ''}</span></div>
        <div class="progress" style="height:8px"><i style="width:${((r.value / m) * 100).toFixed(1)}%;${r.color ? 'background:' + r.color : ''}"></i></div>
      </div>`)}</div>`;
  };

  /* ---------- Выгрузка в Excel (ТЗ 18: все отчёты — в Excel) ----------
     Библиотека SheetJS подгружается только при первой выгрузке/импорте. */
  let xlsxP = null;
  UI.loadXLSX = () => (xlsxP = xlsxP || new Promise((res, rej) => {
    if (window.XLSX) return res(window.XLSX);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => res(window.XLSX);
    s.onerror = () => { xlsxP = null; rej(new Error('Не удалось загрузить модуль Excel')); };
    document.head.appendChild(s);
  }));
  UI.download = function (name, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  /* rows: массив массивов, первая строка — заголовки */
  UI.exportXLSX = async function (name, rows, sheet = 'Отчёт') {
    const t = UI.toast('Готовим файл Excel…', name + '.xlsx · ' + (rows.length - 1) + ' строк', 'load');
    try {
      const X = await UI.loadXLSX();
      const ws = X.utils.aoa_to_sheet(rows);
      ws['!cols'] = rows[0].map((_, c) => ({ wch: Math.min(48, Math.max(10, ...rows.map((r) => String(r[c] == null ? '' : r[c]).length + 2))) }));
      const wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, ws, sheet.slice(0, 30));
      X.writeFile(wb, name + '.xlsx');
      t.set('Файл Excel скачан', name + '.xlsx', 'ok', 'download');
    } catch (e) {
      // без интернета — CSV, который тоже открывается в Excel
      const csv = '﻿' + rows.map((r) => r.map((v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
      UI.download(name + '.csv', csv, 'text/csv;charset=utf-8');
      t.set('Сохранено в CSV', 'Модуль Excel недоступен — файл CSV открывается в Excel', 'warn', 'download');
    }
  };

  /* ---------- Печать документа ---------- */
  UI.docCSS = `body{font:13px/1.45 Arial,sans-serif;color:#111;margin:24px 30px}h1{font-size:18px;text-align:center;margin:6px 0 14px}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #333;padding:5px 7px;font-size:12px;vertical-align:top}th{background:#f0f0f0}.doc-r{text-align:right}.doc-head{display:flex;justify-content:space-between;gap:20px;font-size:12px}.doc-sign{display:flex;justify-content:space-between;gap:30px;margin-top:34px}.doc-sign div{flex:1;border-top:1px solid #333;padding-top:4px;font-size:11px}.muted{color:#666}@page{size:A4;margin:12mm}`;
  UI.printDoc = function (title, bodyHTML) {
    const t = UI.toast('Готовим документ к печати…', title, 'load');
    setTimeout(() => t.set('Документ отправлен на печать', title + ' · можно сохранить в PDF в окне печати', 'ok', 'print'), 700);
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open(); d.write('<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>' + SM.esc(title) + '</title><style>' + UI.docCSS + '</style></head><body>' + bodyHTML + '</body></html>'); d.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 1500); }, 250);
  };
  /* «сохранить в файл»: .doc открывается в Word и LibreOffice */
  UI.saveDoc = function (name, title, bodyHTML) {
    const doc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>' + SM.esc(title) + '</title><style>' + UI.docCSS + '</style></head><body>' + bodyHTML + '</body></html>';
    UI.download(name + '.doc', '﻿' + doc, 'application/msword');
    UI.toast('Документ скачан', name + '.doc · открывается в Word', 'ok', { icon: 'download' });
  };
})();
