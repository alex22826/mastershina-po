/* ===== Перевод админки: RU → UZ (латиница) и ЎЗ (узбекская кириллица) =====
   Страницы пишутся по-русски; переводчик следит за DOM (MutationObserver) и подменяет текст
   и атрибуты placeholder / title / aria-label / data-tip / data-label / data-why по словарю SM_UZ (lang-uz.js).
   Кириллица получается транслитерацией узбекской латиницы. Не трогаем поля ввода,
   превью документов и всё, что помечено translate="no". Из данных переводятся только имена сотрудников. */
(function () {
  const SM = (window.SM = window.SM || {});
  const UZ = window.SM_UZ || {};
  const CYR = /[А-Яа-яЁё]/;
  const NUM = /\d+(?:[\s  ]\d{3})*(?:[.,]\d+)?/g;
  // края строки: LIGHT — только знаки препинания, EDGE — ещё и числа, валюта, тире
  const LIGHT = /^([\s.,:;!?…*•·()«»"]*)([\s\S]*?)([\s.,:;!?…*•·()«»"]*)$/;
  const EDGE = /^([\s\d.,:;%$№#()«»"'+\-−–—/!?…*•·≈]*)([\s\S]*?)([\s\d.,:;%$()«»"'+\-−–—/!?…*•·≈]*)$/;
  const SEPS = ['\n', ' · ', ' — ', ' – ', ' → ', '. ', ': ', ', ', ' / ', ' ('];
  const SKIP = 'script,style,textarea,code,pre,.doc-preview,[translate="no"],[contenteditable="true"]';
  // data-label и data-why выводит CSS (подписи в карточках на телефоне, причина запрета на доске)
  const ATTRS = ['placeholder', 'title', 'aria-label', 'data-tip', 'data-label', 'data-why'];
  // латинские слова, которые остаются латиницей и в кириллице
  const KEEP = ['Excel', 'Word', 'PDF', 'QR', 'CSV', 'GPS', 'OEM', 'PCD', 'ET', 'UZS', 'USD', 'SM', 'AVTO', 'BASE', 'Click', 'Payme', 'Uzum', 'Telegram', 'UI'];
  let lang = 'ru';
  const cache = new Map();

  /* ---------- Поиск по словарю ---------- */
  const up1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const low1 = (s) => (s.length > 1 && s[1] === s[1].toUpperCase() && /[A-Za-z]/.test(s[1]) ? s : s.charAt(0).toLowerCase() + s.slice(1));
  function exact(s) {
    if (Object.prototype.hasOwnProperty.call(UZ, s)) return UZ[s];
    const f = s.charAt(0);
    if (f !== f.toLowerCase()) { const k = f.toLowerCase() + s.slice(1); if (Object.prototype.hasOwnProperty.call(UZ, k)) return up1(UZ[k]); }
    else if (f !== f.toUpperCase()) { const k = up1(s); if (Object.prototype.hasOwnProperty.call(UZ, k)) return low1(UZ[k]); }
    return null;
  }
  // ключи вида «Заблокировать @?» — @ без кавычек: имя или название подставляется как есть
  const FREE = Object.keys(UZ).filter((k) => /(^|[^«])@(?!»)/.test(k)).map((k) => ({
    re: new RegExp('^' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('@', '(.+?)') + '$'), v: UZ[k],
  }));
  // шаблоны: числа → #, текст в «кавычках» → «@» (переводится отдельно)
  function pattern(s) {
    for (const f of FREE) { const m = s.match(f.re); if (m) return f.v.replace('@', () => m[1]); }
    const qs = [], ns = [];
    let p = s.replace(/«([^«»]*)»/g, (m, x) => { qs.push(x); return '«@»'; });
    p = p.replace(NUM, (x) => { ns.push(x); return '#'; });
    if (p === s) return null;
    const v = exact(p);
    if (v == null) return null;
    let i = 0, j = 0;
    return v.replace(/#|@/g, (m) => (m === '#' ? (ns[i++] || '') : core(qs[j++] || '')));
  }
  function core(s) {
    if (!s || !CYR.test(s)) return s;
    let v = exact(s);
    if (v != null) return v;
    const l = s.match(LIGHT);
    if (l && (l[1] || l[3]) && l[2]) { v = exact(l[2]); if (v == null) v = pattern(l[2]); if (v != null) return l[1] + v + l[3]; }
    const e = s.match(EDGE);
    const trimmed = e && (e[1] || e[3]) && e[2];
    if (trimmed) { v = exact(e[2]); if (v != null) return e[1] + v + e[3]; }
    v = pattern(s);
    if (v != null) return v;
    if (trimmed) { v = pattern(e[2]); if (v != null) return e[1] + v + e[3]; }
    for (const sep of SEPS) {
      if (s.indexOf(sep) < 0) continue;
      const parts = s.split(sep);
      const out = parts.map(core);
      if (out.some((x, k) => x !== parts[k])) return out.join(sep);
    }
    if (trimmed && e[2] !== s) { const c = core(e[2]); if (c !== e[2]) return e[1] + c + e[3]; }
    return s;
  }

  /* ---------- Латиница → узбекская кириллица ---------- */
  const MAP = { a: 'а', b: 'б', c: 'ц', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з' };
  const AP = /['‘’ʻʼ`]/;
  function cyrWord(w) {
    const all = w.length > 1 && w === w.toUpperCase();
    const cap = w.charAt(0) !== w.charAt(0).toLowerCase();
    const s = w.toLowerCase().replace(/['‘’ʻʼ`]/g, "'");
    let r = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i], n = s[i + 1];
      if ((c === 'o' || c === 'g') && n === "'") { r += c === 'o' ? 'ў' : 'ғ'; i++; continue; }
      if (c === 's' && n === 'h') { r += 'ш'; i++; continue; }
      if (c === 'c' && n === 'h') { r += 'ч'; i++; continue; }
      if (c === 't' && s.substr(i, 5) === 'tsiya') { r += 'ция'; i += 4; continue; }
      if (c === 'y' && n && 'aoue'.indexOf(n) >= 0 && s[i + 2] !== "'") { r += { a: 'я', o: 'ё', u: 'ю', e: 'е' }[n]; i++; continue; }
      if (c === "'") { r += 'ъ'; continue; }
      if (c === 'e') { r += i === 0 || "aeiou'".indexOf(s[i - 1]) >= 0 ? 'э' : 'е'; continue; }
      r += MAP[c] || c;
    }
    if (all) return r.toUpperCase();
    return cap ? up1(r) : r;
  }
  function toCyr(out, src) {
    const keep = new Set(KEEP.concat(src.match(/[A-Za-z][A-Za-z0-9]*/g) || []));
    return out.replace(/[A-Za-z](?:[A-Za-z]|['‘’ʻʼ`](?=[A-Za-z]))*/g, (w) => {
      if (keep.has(w)) return w;
      const m = w.match(/^([A-Za-z]+)(['‘’ʻʼ`])(.+)$/);
      if (m && keep.has(m[1])) return m[1] + m[2] + cyrWord(m[3]);
      return cyrWord(w);
    });
  }

  /* ---------- Имена сотрудников (пользователи и водители): русская кириллица → узбекская латиница ---------- */
  // Остальные данные (клиенты, товары, адреса) не переводятся. Для ЎЗ латиница дальше идёт через toCyr.
  const LET = 'А-Яа-яЁёЎўҚқҒғҲҳ';
  const RU_LAT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: "'", ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: "o'", қ: 'q', ғ: "g'", ҳ: 'h' };
  // русская «Х» в узбекских именах бывает и X, и H (Ҳ): в начале — X, кроме этих основ; внутри — H, кроме «хт» (Baxtiyor)
  const H_START = /^х(аким|асан|усан|усей|усн|амид|амза|абиб|алил|айдар|афиз|амро|олид|илол)/;
  function latWord(w) {
    const low = w.toLowerCase();
    let r = '';
    for (let i = 0; i < low.length; i++) {
      const c = low[i], prev = low[i - 1];
      if (c === 'е') r += i === 0 || 'аеёиоуыэюяўъь'.indexOf(prev) >= 0 ? 'ye' : 'e';
      else if (c === 'х') r += i === 0 ? (H_START.test(low) ? 'h' : 'x') : low[i + 1] === 'т' ? 'x' : 'h';
      else r += RU_LAT[c] != null ? RU_LAT[c] : c;
    }
    return w.charAt(0) !== low.charAt(0) ? up1(r) : r;
  }
  let staffKey = null, staffMap = null, staffRe = null;
  // слова из имён сотрудников (с заглавной буквы) → латиница; пересобираем, когда имена поменялись
  function staffSync() {
    const db = SM.db;
    const list = db ? [].concat(db.users || [], db.drivers || []).map((u) => u && u.name).filter(Boolean) : [];
    const key = list.join('|');
    if (key === staffKey) return;
    staffKey = key; staffMap = new Map(); cache.clear();
    const word = new RegExp('^[А-ЯЁЎҚҒҲ][' + LET + '-]+$');
    list.forEach((n) => n.split(/\s+/).forEach((w) => { w = w.replace(/[«»".,()]/g, ''); if (word.test(w)) staffMap.set(w, latWord(w)); }));
    const keys = [...staffMap.keys()].sort((a, b) => b.length - a.length);
    staffRe = keys.length ? new RegExp('(^|[^' + LET + '])(' + keys.join('|') + ')(?![' + LET + '])', 'g') : null;
  }
  const staffLat = (s) => (staffRe ? s.replace(staffRe, (m, a, w) => a + staffMap.get(w)) : s);
  // имя для текущего языка (нужно там, где из имени делают инициалы)
  function staff(s) {
    if (lang === 'ru' || !s || !CYR.test(s)) return s;
    staffSync();
    const out = staffLat(s);
    return out !== s && lang === 'uzc' ? toCyr(out, s) : out;
  }

  function tr(s) {
    if (lang === 'ru' || !s || !CYR.test(s)) return s;
    staffSync();
    if (cache.has(s)) return cache.get(s);
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    let out = staffLat(core(m[2]));
    if (out !== m[2] && lang === 'uzc') out = toCyr(out, m[2]);
    out = m[1] + out + m[3];
    cache.set(s, out);
    return out;
  }

  /* ---------- Обход DOM ---------- */
  function textNode(n) {
    const v = n.nodeValue;
    if (!v || !CYR.test(v)) return;
    const p = n.parentElement;
    if (p && p.closest(SKIP)) return;
    const t = tr(v);
    if (t !== v) n.nodeValue = t;
  }
  function attrs(el) {
    for (let i = 0; i < ATTRS.length; i++) {
      const v = el.getAttribute(ATTRS[i]);
      if (v && CYR.test(v)) { const t = tr(v); if (t !== v) el.setAttribute(ATTRS[i], t); }
    }
  }
  const FILTER = { acceptNode: (n) => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) };
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return textNode(root);
    if (root.nodeType !== 1 || root.closest(SKIP)) return;
    attrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, FILTER);
    let n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) textNode(n); else attrs(n); }
  }
  const obs = new MutationObserver((recs) => {
    if (lang === 'ru') return;
    for (const r of recs) {
      if (r.type === 'childList') r.addedNodes.forEach(walk);
      else if (r.type === 'attributes') { if (!r.target.closest(SKIP)) attrs(r.target); }
      else if (r.type === 'characterData') textNode(r.target);
    }
    obs.takeRecords(); // наши собственные правки повторно не обрабатываем
  });

  SM.i18n = {
    // переключить язык: дальше всё новое в DOM переводится само; текущую страницу перерисовывает SM.refresh
    set(l) {
      lang = l === 'uz' || l === 'uzc' ? l : 'ru';
      cache.clear();
      document.documentElement.lang = lang === 'ru' ? 'ru' : lang === 'uzc' ? 'uz-Cyrl' : 'uz';
      if (lang !== 'ru' && document.body) walk(document.body);
    },
    tr,
    staff,
    lang: () => lang,
  };
  obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
})();
