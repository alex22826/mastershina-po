/* ===== Простой движок перевода RU/UZ (общий для всех страниц системы) =====
   Разметка:  data-i18n="key"             — textContent
              data-i18n-placeholder="key" — placeholder
              data-i18n-aria="key"        — aria-label
   Страница добавляет свои строки через I18n.extend({ ru: {...}, uz: {...} }). */
(function () {
  var STORAGE_KEY = 'ms_lang';
  var dict = { ru: {}, uz: {} };
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
    document.documentElement.lang = lang;
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
    },
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
