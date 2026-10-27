/* ===== Поле даты со своим календарём =====
   Улучшает любой input[type=date] на странице, в том числе появившийся после перерисовки (MutationObserver).
   Исходное поле остаётся в форме (скрыто) и хранит ISO-дату ГГГГ-ММ-ДД; рядом — видимое поле ДД.ММ.ГГГГ.
   Выбор даты ставит value исходному полю и шлёт ему input и change (bubbles) — обработчики страниц не меняются.
   Учитываются min / max / disabled / readonly / required. Календарь рисуется в body (не режется overflow),
   на телефоне — шторкой снизу. Язык — SM.i18n.lang() (ru / uz / uzc). */
(function () {
  const SM = (window.SM = window.SM || {});
  const L = {
    ru: { m: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
      ms: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'], d: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
      today: 'Сегодня', clear: 'Очистить', prev: 'Назад', next: 'Вперёд', pick: 'Выбрать дату', ph: 'дд.мм.гггг' },
    uz: { m: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
      ms: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'], d: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
      today: 'Bugun', clear: 'Tozalash', prev: 'Orqaga', next: 'Oldinga', pick: 'Sanani tanlash', ph: 'kk.oo.yyyy' },
    uzc: { m: ['Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн', 'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр'],
      ms: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'], d: ['Ду', 'Се', 'Чо', 'Па', 'Жу', 'Ша', 'Як'],
      today: 'Бугун', clear: 'Тозалаш', prev: 'Орқага', next: 'Олдинга', pick: 'Санани танлаш', ph: 'кк.оо.йййй' },
  };
  const t = () => L[(SM.i18n && SM.i18n.lang && SM.i18n.lang()) || 'ru'] || L.ru;
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
  const ARW = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'}"/></svg>`;

  /* ---------- Даты ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; const d = new Date(+m[1], m[2] - 1, +m[3]); return d.getMonth() === m[2] - 1 ? d : null; };
  const show = (s) => { const d = parse(s); return d ? pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() : ''; };
  const fromShown = (s) => { const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s.trim()); if (!m) return null; const d = new Date(+m[3], m[2] - 1, +m[1]); return d.getMonth() === m[2] - 1 && d.getDate() === +m[1] ? iso(d) : null; };
  const addM = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); x.setDate(Math.min(d.getDate(), new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return x; };
  const inRange = (s, src) => !!s && (!src.min || s >= src.min) && (!src.max || s <= src.max);

  /* ---------- Исходное поле: value пишет и видимое поле ---------- */
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const sync = (src) => { const v = src._dp; if (v && document.activeElement !== v) v.value = show(desc.get.call(src)); syncState(src); };
  const syncState = (src) => { const v = src._dp; if (!v) return; v.disabled = src.disabled; v.readOnly = src.readOnly || TOUCH(); v.classList.toggle('dp-ro', src.readOnly); v.required = src.required; };
  const TOUCH = () => matchMedia('(hover: none)').matches;
  const SHEET = () => matchMedia('(max-width: 720px)').matches;

  function enhance(src) {
    if (src._dp || src.closest('[data-native-date]')) return;
    const wrap = document.createElement('span');
    wrap.className = 'dp-wrap' + (src.closest('.field') && src.parentNode.classList.contains('field') ? ' dp-block' : '');
    if (src.getAttribute('style')) { wrap.setAttribute('style', src.getAttribute('style')); src.removeAttribute('style'); }
    const v = document.createElement('input');
    v.type = 'text'; v.className = src.className + ' dp-input'; v.inputMode = 'numeric'; v.autocomplete = 'off'; v.maxLength = 10;
    v.placeholder = t().ph; v.setAttribute('translate', 'no');
    v.setAttribute('aria-haspopup', 'dialog'); v.setAttribute('aria-expanded', 'false');
    const lab = src.getAttribute('aria-label') || (src.id && document.querySelector(`label[for="${src.id}"]`)?.textContent) || src.parentNode.querySelector(':scope > label')?.textContent;
    if (lab) v.setAttribute('aria-label', lab.trim());
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'dp-ic'; btn.tabIndex = -1; btn.innerHTML = ICON; btn.setAttribute('aria-label', t().pick);
    src.parentNode.insertBefore(wrap, src);
    wrap.append(v, btn, src);
    src.classList.add('dp-src'); src.tabIndex = -1; src.setAttribute('aria-hidden', 'true');
    src._dp = v; v._src = src;
    Object.defineProperty(src, 'value', { configurable: true, get() { return desc.get.call(this); }, set(x) { desc.set.call(this, x); sync(this); } });
    new MutationObserver(() => syncState(src)).observe(src, { attributes: true, attributeFilter: ['disabled', 'readonly', 'required', 'min', 'max'] });
    sync(src);

    const toggle = (e) => { e.preventDefault(); if (cur && cur.src === src) close(); else open(src); };
    v.addEventListener('mousedown', (e) => { if (v.disabled || src.readOnly) return; if (cur && cur.src === src) return; open(src); });
    v.addEventListener('click', () => { if (!v.disabled && !src.readOnly && !cur) open(src); });
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => { if (v.disabled || src.readOnly) return; toggle(e); v.focus({ preventScroll: true }); });
    // ввод с клавиатуры: цифры, точки ставятся сами; полная верная дата сразу уходит в исходное поле
    v.addEventListener('input', (e) => {
      e.stopPropagation();
      let s = v.value.replace(/[^\d.]/g, '');
      if (e.inputType && e.inputType.startsWith('insert') && /^\d{2}$|^\d{2}\.\d{2}$/.test(s)) s += '.';
      v.value = s;
      const x = fromShown(s);
      if (x && inRange(x, src)) { set(src, x, false); if (cur) { cur.view = parse(x); cur.focus = parse(x); draw(); } }
    });
    v.addEventListener('change', (e) => { e.stopPropagation(); });
    v.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== v) { const x = fromShown(v.value); if (!v.value.trim() && !src.required && desc.get.call(src)) set(src, '', false); else if (x && !inRange(x, src)) flash(v); v.value = show(desc.get.call(src)); } }, 0); });
    v.addEventListener('keydown', (e) => keys(e, src));
  }
  const flash = (v) => { v.classList.remove('flash'); void v.offsetWidth; v.classList.add('flash'); };
  function set(src, x, closeAfter = true) {
    if (desc.get.call(src) !== x) {
      desc.set.call(src, x);
      src.dispatchEvent(new Event('input', { bubbles: true }));
      src.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sync(src);
    if (closeAfter) { close(); src._dp.value = show(x); }
  }

  /* ---------- Календарь ---------- */
  let cur = null; // { src, el, view: Date (месяц), focus: Date, mode: 'd'|'m'|'y' }
  function open(src) {
    close();
    const val = parse(desc.get.call(src));
    const base = val || clampD(new Date(), src);
    const el = document.createElement('div');
    el.className = 'dp-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('translate', 'no');
    el.addEventListener('mousedown', (e) => e.preventDefault()); // фокус остаётся в поле
    el.addEventListener('click', onClick);
    document.body.appendChild(el);
    cur = { src, el, view: new Date(base.getFullYear(), base.getMonth(), 1), focus: base, mode: 'd', sheet: SHEET() };
    if (cur.sheet) { el.classList.add('dp-sheet'); const ov = document.createElement('div'); ov.className = 'dp-ov'; ov.addEventListener('click', close); document.body.insertBefore(ov, el); cur.ov = ov; }
    src._dp.setAttribute('aria-expanded', 'true'); src._dp.parentNode.classList.add('dp-on');
    draw(); place();
    if (document.activeElement !== src._dp) src._dp.focus({ preventScroll: true });
  }
  function close() {
    if (!cur) return;
    const c = cur; cur = null;
    c.el.remove(); if (c.ov) c.ov.remove();
    c.src._dp.setAttribute('aria-expanded', 'false'); c.src._dp.parentNode.classList.remove('dp-on');
  }
  const clampD = (d, src) => { const s = iso(d); if (src.min && s < src.min) return parse(src.min); if (src.max && s > src.max) return parse(src.max); return d; };

  function draw() {
    const { src, el, view, mode } = cur; const T = t();
    const y = view.getFullYear(), m = view.getMonth();
    const title = mode === 'd' ? `${T.m[m]} ${y}` : mode === 'm' ? String(y) : `${y - (y % 12)} – ${y - (y % 12) + 11}`;
    let body = '';
    if (mode === 'd') {
      const first = new Date(y, m, 1), shift = (first.getDay() + 6) % 7, start = new Date(y, m, 1 - shift);
      const today = iso(new Date()), sel = desc.get.call(src), foc = iso(cur.focus);
      body = '<div class="dp-wd">' + T.d.map((d, i) => `<span class="${i > 4 ? 'we' : ''}">${d}</span>`).join('') + '</div><div class="dp-days" role="grid">';
      for (let i = 0; i < 42; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), s = iso(d);
        const cls = ['dp-d', d.getMonth() !== m ? 'out' : '', s === today ? 'today' : '', s === sel ? 'sel' : '', s === foc ? 'foc' : '', (i % 7) > 4 ? 'we' : ''].filter(Boolean).join(' ');
        body += `<button type="button" class="${cls}" data-d="${s}" tabindex="-1" ${inRange(s, src) ? '' : 'disabled'} aria-selected="${s === sel}">${d.getDate()}</button>`;
      }
      body += '</div>';
    } else if (mode === 'm') {
      const sel = parse(desc.get.call(src)), now = new Date();
      body = '<div class="dp-grid">' + T.ms.map((n, i) => {
        const ok = (!src.min || iso(new Date(y, i + 1, 0)) >= src.min) && (!src.max || iso(new Date(y, i, 1)) <= src.max);
        return `<button type="button" data-m="${i}" class="${sel && sel.getFullYear() === y && sel.getMonth() === i ? 'sel' : ''} ${now.getFullYear() === y && now.getMonth() === i ? 'today' : ''}" ${ok ? '' : 'disabled'}>${n}</button>`;
      }).join('') + '</div>';
    } else {
      const y0 = y - (y % 12), sel = parse(desc.get.call(src)), ny = new Date().getFullYear();
      body = '<div class="dp-grid">' + Array.from({ length: 12 }, (_, i) => {
        const yy = y0 + i, ok = (!src.min || yy + '-12-31' >= src.min) && (!src.max || yy + '-01-01' <= src.max);
        return `<button type="button" data-y="${yy}" class="${sel && sel.getFullYear() === yy ? 'sel' : ''} ${yy === ny ? 'today' : ''}" ${ok ? '' : 'disabled'}>${yy}</button>`;
      }).join('') + '</div>';
    }
    const todayOk = inRange(iso(new Date()), src);
    el.innerHTML = `${cur.sheet ? '<i class="dp-grip"></i>' : ''}<div class="dp-head"><button type="button" class="dp-nav" data-nav="-1" aria-label="${T.prev}">${ARW(0)}</button>
      <button type="button" class="dp-title" data-x="mode" ${mode === 'y' ? 'disabled' : ''}>${title}${mode === 'y' ? '' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'}</button>
      <button type="button" class="dp-nav" data-nav="1" aria-label="${T.next}">${ARW(1)}</button></div>${body}
      <div class="dp-foot">${src.required ? '<span></span>' : `<button type="button" class="dp-btn" data-x="clear">${T.clear}</button>`}<button type="button" class="dp-btn dp-btn-a" data-x="today" ${todayOk ? '' : 'disabled'}>${T.today}</button></div>`;
  }
  function onClick(e) {
    const b = e.target.closest('button'); if (!b || b.disabled || !cur) return;
    const { src } = cur;
    if (b.dataset.d) return set(src, b.dataset.d);
    if (b.dataset.nav) { const n = +b.dataset.nav; cur.view = cur.mode === 'd' ? addM(cur.view, n) : new Date(cur.view.getFullYear() + n * (cur.mode === 'm' ? 1 : 12), cur.view.getMonth(), 1); if (cur.mode === 'd') cur.focus = addM(cur.focus, n); return redraw(); }
    if (b.dataset.m) { cur.view = new Date(cur.view.getFullYear(), +b.dataset.m, 1); cur.focus = clampD(new Date(cur.view.getFullYear(), cur.view.getMonth(), Math.min(cur.focus.getDate(), 28)), src); cur.mode = 'd'; return redraw(); }
    if (b.dataset.y) { cur.view = new Date(+b.dataset.y, cur.view.getMonth(), 1); cur.mode = 'm'; return redraw(); }
    const x = b.dataset.x;
    if (x === 'mode') { cur.mode = cur.mode === 'd' ? 'm' : 'y'; return redraw(); }
    if (x === 'today') return set(src, iso(new Date()));
    if (x === 'clear') return set(src, '');
  }
  const redraw = () => { draw(); place(); };

  function place() {
    if (!cur) return;
    const { el, src } = cur;
    if (cur.sheet) return;
    const r = src._dp.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, vw = innerWidth, vh = innerHeight, gap = 6;
    let top = r.bottom + gap;
    const up = top + h > vh - 8 && r.top - gap - h > 8 && r.top > vh - r.bottom;
    if (up) top = r.top - gap - h; else if (top + h > vh - 8) top = Math.max(8, vh - 8 - h);
    el.classList.toggle('up', up);
    el.style.top = top + 'px';
    el.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + 'px';
  }

  function keys(e, src) {
    const k = e.key;
    if (!cur || cur.src !== src) {
      if ((k === 'ArrowDown' && e.altKey) || (k === 'Enter' && !src.form) || k === ' ' && !src._dp.value) { if (!src.readOnly) { e.preventDefault(); open(src); } }
      return;
    }
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); return close(); }
    if (k === 'Tab') return close();
    if (cur.mode !== 'd') { if (k === 'Enter') e.preventDefault(); return; }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[k];
    let f = cur.focus;
    if (step) f = new Date(f.getFullYear(), f.getMonth(), f.getDate() + step);
    else if (k === 'PageUp' || k === 'PageDown') f = e.shiftKey ? new Date(f.getFullYear() + (k === 'PageUp' ? -1 : 1), f.getMonth(), f.getDate()) : addM(f, k === 'PageUp' ? -1 : 1);
    else if (k === 'Home' && e.ctrlKey) f = new Date();
    else if (k === 'Enter') { e.preventDefault(); const s = iso(f); if (inRange(s, src)) set(src, s); return; }
    else return;
    e.preventDefault();
    cur.focus = clampD(f, src);
    cur.view = new Date(cur.focus.getFullYear(), cur.focus.getMonth(), 1);
    redraw();
  }

  /* ---------- Закрытие и слежение ---------- */
  document.addEventListener('mousedown', (e) => { if (cur && !cur.el.contains(e.target) && !cur.src._dp.parentNode.contains(e.target)) close(); }, true);
  document.addEventListener('touchstart', (e) => { if (cur && !cur.sheet && !cur.el.contains(e.target) && !cur.src._dp.parentNode.contains(e.target)) close(); }, { capture: true, passive: true });
  document.addEventListener('keydown', (e) => { if (cur && e.key === 'Escape' && document.activeElement !== cur.src._dp) { e.stopPropagation(); close(); } }, true);
  addEventListener('resize', () => { if (cur && cur.sheet !== SHEET()) close(); else place(); });
  addEventListener('scroll', (e) => { if (cur && !cur.el.contains(e.target)) { if (!cur.src.isConnected) close(); else place(); } }, true);

  const scan = (root) => { if (root.nodeType !== 1) return; if (root.matches('input[type=date]')) enhance(root); root.querySelectorAll('input[type=date]').forEach(enhance); };
  const obs = new MutationObserver((recs) => {
    for (const r of recs) r.addedNodes.forEach(scan);
    if (cur && !cur.src.isConnected) close();
  });
  const start = () => { scan(document.body); obs.observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  SM.datepicker = { enhance, close, refresh: () => document.querySelectorAll('input.dp-src').forEach(sync) };
})();
