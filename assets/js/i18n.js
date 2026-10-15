/* ===== Простой движок перевода RU/UZ (общий для всех страниц системы) =====
   Разметка:  data-i18n="key"             — textContent
              data-i18n-placeholder="key" — placeholder
              data-i18n-aria="key"        — aria-label
   Страница добавляет свои строки через I18n.extend({ ru: {...}, uz: {...} }). */
(function () {
  var STORAGE_KEY = 'ms_lang';
  var dict = { ru: {}, uz: {}, uzc: {} };

  /* узбекская кириллица (uzc) получается из латиницы (uz) транслитерацией */
  var MAP = { a: 'а', b: 'б', c: 'ц', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з' };
  var KEEP = { CRM: 1, SM: 1, AVTO: 1, BASE: 1 };
  function cyrWord(w) {
    if (KEEP[w]) return w;
    var all = w.length > 1 && w === w.toUpperCase();
    var cap = w.charAt(0) !== w.charAt(0).toLowerCase();
    var s = w.toLowerCase().replace(/['‘’ʻʼ`]/g, "'"), r = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i], n = s[i + 1];
      if ((c === 'o' || c === 'g') && n === "'") { r += c === 'o' ? 'ў' : 'ғ'; i++; continue; }
      if ((c === 's' || c === 'c') && n === 'h') { r += c === 's' ? 'ш' : 'ч'; i++; continue; }
      if (c === 'y' && n && 'aoue'.indexOf(n) >= 0 && s[i + 2] !== "'") { r += { a: 'я', o: 'ё', u: 'ю', e: 'е' }[n]; i++; continue; }
      if (c === "'") { r += 'ъ'; continue; }
      if (c === 'e') { r += i === 0 || "aeiou'".indexOf(s[i - 1]) >= 0 ? 'э' : 'е'; continue; }
      r += MAP[c] || c;
    }
    if (all) return r.toUpperCase();
    return cap ? r.charAt(0).toUpperCase() + r.slice(1) : r;
  }
  function cyr(text) {
    return String(text).replace(/[A-Za-z](?:[A-Za-z]|['‘’ʻʼ`](?=[A-Za-z]))*/g, cyrWord);
  }
  var listeners = [];
  var current = readSaved() || 'ru';

  function readSaved() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function save(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* приватный режим — не страшно */ }
  }

  function targets() {
    return Array.prototype.slice.call(
      document.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-aria], .i18n-extra')
    );
  }

  function write(lang) {
    var d = dict[lang] || dict.ru;
    current = lang;
    save(lang);
    document.documentElement.lang = lang === 'uzc' ? 'uz-Cyrl' : lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n')]; if (v) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n-placeholder')]; if (v) el.placeholder = v;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var v = d[el.getAttribute('data-i18n-aria')]; if (v) el.setAttribute('aria-label', v);
    });
    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    listeners.forEach(function (fn) { fn(lang); });
  }

  // animate=true — элементы гаснут 220 мс, меняется текст, элементы проявляются
  function apply(lang, animate) {
    if (!animate) { write(lang); return; }
    var els = targets();
    els.forEach(function (el) { el.classList.add('i18n-out'); });
    setTimeout(function () {
      write(lang);
      els.forEach(function (el) { el.classList.remove('i18n-out'); });
    }, 220);
  }

  window.I18n = {
    extend: function (more) {
      Object.keys(more).forEach(function (lang) {
        dict[lang] = dict[lang] || {};
        Object.keys(more[lang]).forEach(function (k) { dict[lang][k] = more[lang][k]; });
      });
      // кириллица — из латиницы, если страница не дала свой вариант
      if (more.uz) Object.keys(more.uz).forEach(function (k) {
        if (!(more.uzc && more.uzc[k])) dict.uzc[k] = cyr(more.uz[k]);
      });
    },
    cyr: cyr,
    t: function (key) { return (dict[current] && dict[current][key]) || dict.ru[key] || key; },
    lang: function () { return current; },
    onChange: function (fn) { listeners.push(fn); },
    set: function (lang) { if (lang !== current) apply(lang, true); },
    // Подключить переключатель языка и применить сохранённый язык без анимации
    init: function (switchEl) {
      targets().forEach(function (el) { el.classList.add('i18n-fade'); });
      if (switchEl) {
        switchEl.addEventListener('click', function (e) {
          var btn = e.target.closest('button[data-lang]');
          if (btn) window.I18n.set(btn.getAttribute('data-lang'));
        });
      }
      apply(current, false);
    }
  };
})();
