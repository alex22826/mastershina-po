/* =========================================================
   Пользователи и роли (ТЗ 3), справочники (6, 10, 11, 14, 15, 19),
   история операций (21), уведомления (20)
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM, UI = SM.ui;
  const { html, raw, fmt: F, d: D } = SM;
  const I = UI.icon;

  /* ---------- Пользователи ---------- */
  // Логин из Ф.И.О.: «Каримов Азиз Рустамович» → karimov.a (кириллица как в узбекской латинице: ж→j, х→h; занятый — с цифрой)
  const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h' };
  const latin = (w) => [...w.toLowerCase()].map((c) => (c in TR ? TR[c] : c)).join('').replace(/[^a-z0-9]/g, '');
  function loginFromName(name) {
    const w = String(name || '').split(/\s+/).map(latin).filter(Boolean);
    if (!w.length) return '';
    let base = w[0] + (w[1] ? '.' + w[1][0] : '');
    if (base.length < 3) base = (base + 'user').slice(0, 3);
    const busy = (l) => SM.db.users.some((x) => x.login.toLowerCase() === l);
    let l = base, n = 2;
    while (busy(l)) l = base + n++;
    return l;
  }
  // Пароль: 10 знаков без похожих (0/O, 1/l/I), обязательно буквы и цифры
  function genPass() {
    const A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (;;) {
      const p = [...crypto.getRandomValues(new Uint32Array(10))].map((x) => A[x % A.length]).join('');
      if (/[a-z]/i.test(p) && /\d/.test(p)) return p;
    }
  }
  function credsCard(x, pass) {
    const m = UI.modal({ title: 'Данные для входа', sub: 'Передайте сотруднику. Пароль потом не посмотреть — только задать новый', size: 'narrow',
      body: html`<div class="creds" data-creds><div><span>Логин</span><b class="mono">${x.login}</b></div><div><span>Пароль</span><b class="mono">${pass}</b></div></div>`,
      foot: html`<button class="btn btn-ghost" data-copy>${I('copy')}Скопировать</button><button class="btn btn-primary" data-close>${I('check')}Готово</button>` });
    m.querySelector('[data-copy]').onclick = async () => {
      try { await navigator.clipboard.writeText('Логин: ' + x.login + '\nПароль: ' + pass); UI.toast('Скопировано', 'Логин и пароль'); }
      catch (e) { UI.toast('Не удалось скопировать', 'Выделите и скопируйте вручную', 'warn'); }
    };
  }
  function userForm(u) {
    const isNew = !u;
    u = u || { role: 'seller', points: [], active: true };
    const lockPass = !isNew && u.role === 'admin'; // пароль администратора здесь не меняется (Алексей 26.10)
    const m = UI.modal({ title: isNew ? 'Новый пользователь' : u.name, sub: isNew ? 'Логин и пароль заполняются сами — после сохранения покажем их, чтобы передать сотруднику' : 'Логин: ' + u.login, size: 'wide',
      body: html`<form class="form-grid" autocomplete="off">
        <div class="field"><label>Ф.И.О. <span class="req">*</span></label><input class="input" name="name" value="${u.name || ''}" autofocus></div>
        <div class="field"><label>Телефон</label><input class="input" name="phone" value="${u.phone || ''}"></div>
        <div class="field"><label>Логин <span class="req">*</span></label><input class="input" name="login" value="${u.login || ''}" ${isNew ? '' : 'readonly'} autocomplete="off" spellcheck="false"></div>
        ${lockPass ? html`<div class="field"><label>Пароль</label><input class="input" type="password" name="pass" value="" placeholder="••••••••" disabled><span class="hint">Пароль администратора не меняется</span></div>`
          : html`<div class="field"><label>${isNew ? 'Пароль' : 'Новый пароль'} ${isNew ? html`<span class="req">*</span>` : ''}</label><div class="input-act"><input class="input" type="${isNew ? 'text' : 'password'}" name="pass" autocomplete="new-password" spellcheck="false" value="${isNew ? genPass() : ''}" placeholder="${isNew ? 'не короче 6 символов' : 'оставьте пустым, чтобы не менять'}"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-gen title="Сгенерировать пароль" aria-label="Сгенерировать пароль">${I('refresh')}</button></div></div>`}
        <div class="field full"><label>Роль</label><select class="select" name="role">${UI.options(Object.entries(SM.ROLES).map(([k, v]) => [k, v.title + ' — ' + v.desc]), u.role)}</select></div>
        <div class="field full"><label>Доступные магазины и склады</label><div class="choice">${SM.db.points.map((p) => html`<label><input type="checkbox" name="pt_${p.id}" ${u.points.includes(p.id) ? 'checked' : ''}><span>${I(p.type === 'warehouse' ? 'warehouse' : 'store')}${p.name}</span></label>`)}</div><span class="hint">Для склада и продавцов: видят и работают только с выбранными точками. Пусто — все точки.</span></div>
        <label class="switch full"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}><i></i>Учётная запись активна</label></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Сохранить</button>` });
    const f = m.querySelector('form');
    const passIn = f.elements.pass, loginIn = f.elements.login;
    if (!lockPass) m.querySelector('[data-gen]').onclick = () => { passIn.type = 'text'; passIn.value = genPass(); passIn.closest('.field').classList.remove('is-invalid'); };
    if (isNew) {
      let auto = true; // логин собирается из Ф.И.О., пока его не поменяли руками
      loginIn.addEventListener('input', () => { auto = !loginIn.value.trim(); });
      f.elements.name.addEventListener('input', () => { if (auto) loginIn.value = loginFromName(f.elements.name.value); });
    }
    m.querySelector('[data-ok]').onclick = async () => {
      const d = UI.formData(f);
      if (lockPass) d.pass = '';
      if (!d.name) return UI.invalid(f, 'name', 'Укажите Ф.И.О.');
      if (isNew && !/^[a-z0-9._-]{3,}$/i.test(d.login)) return UI.invalid(f, 'login', 'Латиница и цифры, не короче 3 символов');
      if (isNew && SM.db.users.some((x) => x.login.toLowerCase() === d.login.toLowerCase())) return UI.invalid(f, 'login', 'Такой логин уже есть');
      if ((isNew || d.pass) && String(d.pass).length < 6) return UI.invalid(f, 'pass', 'Пароль не короче 6 символов');
      if (u.id === SM.user.id && !d.active) return UI.toast('Нельзя заблокировать себя', '', 'warn');
      const points = SM.db.points.filter((p) => d['pt_' + p.id]).map((p) => p.id);
      const x = isNew ? { id: SM.uid('u'), login: d.login.toLowerCase(), createdAt: new Date().toISOString(), lastLogin: null } : u;
      Object.assign(x, { name: d.name, phone: d.phone, role: d.role, points, active: !!d.active });
      if (d.pass) x.passHash = await SM.passHash(x.login, d.pass);
      if (isNew) SM.db.users.push(x);
      SM.log(isNew ? 'Создан пользователь' : 'Изменён пользователь', 'user', x.id, x.name + ' · ' + SM.ROLES[x.role].title + (d.pass && !isNew ? ' · пароль изменён' : ''));
      SM.save(); UI.closeTop(); SM.refresh();
      if (d.pass) credsCard(x, d.pass); else UI.toast('Сохранено', x.name);
    };
  }
  /* ---------- Роли и права: выбрать роль → для каждого раздела один переключатель уровня (без тяжёлых списков) ---------- */
  const LV = ['Нет', 'Просмотр', 'Изменение', 'Полный'];
  const roleKey = (r) => (Object.keys(SM.ROLES).includes(r.q.role) ? r.q.role : 'head');
  async function deleteUserAsk(u) {
    if (u.id === SM.user.id) return UI.toast('Нельзя удалить себя', 'Войдите под другим администратором', 'warn', { icon: 'lock' });
    if (!(await UI.confirmDelete('Удалить пользователя?', u.name + ' (логин ' + u.login + ') больше не сможет войти. Его операции и история сохранятся.'))) return;
    SM.ops.deleteUser(u); UI.toast('Пользователь удалён', u.name, 'ok', { icon: 'trash' }); SM.refresh();
  }
  function usersPage(r) {
    const tab = r.q.tab || 'users';
    const edit = SM.can('users', 2);
    if (tab === 'roles') {
      const keys = Object.keys(SM.ROLES), rk = roleKey(r), role = SM.db.roles[rk];
      const locked = !edit || rk === 'admin';
      const groups = [];
      SM.SECTIONS.filter((s) => !s.permOf).forEach((s) => { let g = groups.find((x) => x.name === s.group); if (!g) groups.push((g = { name: s.group, items: [] })); g.items.push(s); });
      return html`
        ${UI.pageHead('Пользователи и роли', 'Выберите роль и отметьте, что ей доступно — изменения сохраняются сразу', edit ? html`<button class="btn btn-ghost" data-x="reset-roles">${I('undo')}Вернуть как в ТЗ</button>` : '')}
        ${UI.tabs([['users', 'Пользователи', SM.db.users.length], ['roles', 'Роли и права']], tab)}
        <div class="perm-roles">${keys.map((k) => html`<button type="button" class="${k === rk ? 'on' : ''}" data-role="${k}">${I('shield')}${SM.ROLES[k].title}<span class="pill">${SM.db.users.filter((u) => u.role === k).length}</span></button>`)}</div>
        <div class="note-box mb-16">${I('info')}<div><b>${SM.ROLES[rk].title}.</b> ${SM.ROLES[rk].desc}${rk === 'admin' ? ' · у администратора всегда полный доступ, его права не меняются' : ''}</div></div>
        <div class="grid g-21">
          <div class="card"><div class="card-h"><h3>${I('layers')}Доступ к разделам</h3><span class="sub">Нет · Просмотр · Изменение · Полный</span></div><div class="card-b">
            ${groups.map((g) => html`<div class="section-t">${g.name}</div>${g.items.map((s) => { const lv = role.perms[s.key] || 0; return html`<div class="perm-row"><span class="tile-ic">${I(s.icon)}</span><div class="grow"><b class="fs-13">${s.title}</b>${s.tabOf ? html`<span class="cell-sub">Вкладка в «${SM.navTitle(s.tabOf)}»</span>` : ''}</div><div class="lv" role="group" aria-label="${s.title}">${LV.map((t, i) => html`<button type="button" class="${lv === i ? 'on' : ''}" data-lv="${i}" data-sec="${s.key}" ${locked ? raw('disabled') : ''}>${t}</button>`)}</div></div>`; })}`)}
          </div></div>
          <div class="stack">
            <div class="card"><div class="card-h"><h3>${I('key')}Права на действия</h3></div><div class="card-b"><div class="stack" style="gap:16px">
              ${SM.FLAGS.map((fl) => html`<label class="switch" style="align-items:flex-start"><input type="checkbox" data-flag="${fl.key}" ${role.flags[fl.key] ? raw('checked') : ''} ${locked ? raw('disabled') : ''}><i></i><span><b class="fs-13">${fl.title}</b><span class="cell-sub">${fl.hint}</span></span></label>`)}</div></div></div>
            <div class="card"><div class="card-h"><h3>${I('percent')}Максимальная скидка</h3></div><div class="card-b">
              <div class="input-suffix" style="max-width:170px"><input class="input num" type="number" min="0" max="100" step="1" data-disc value="${role.discountMax || 0}" ${locked ? raw('disabled') : ''}><em>%</em></div>
              <p class="fs-12 muted mt-8">ТЗ 9.3: право на скидку настраивается по ролям. Цена ниже карточки тоже считается скидкой.</p></div></div>
          </div>
        </div>`;
    }
    const roleBadge = (k) => html`<span class="badge ${{ admin: 'b-accent', head: 'b-violet', seller: 'b-info', storekeeper: 'b-warn', accountant: 'b-ok', courier: 'b-slate' }[k]} no-dot">${SM.ROLES[k].title}</span>`;
    return html`
      ${UI.pageHead('Пользователи и роли', 'Создание, изменение, блокировка и удаление пользователей, роли и доступные точки', edit ? html`<button class="btn btn-primary" data-x="new">${I('plus')}Пользователь</button>` : '')}
      ${UI.tabs([['users', 'Пользователи', SM.db.users.length], ['roles', 'Роли и права']], tab)}
      <div class="card"><div class="card-b"><div class="table-wrap"><table class="table"><thead><tr><th>Сотрудник</th><th>Логин</th><th>Роль</th><th>Точки</th><th>Последний вход</th><th>Статус</th><th></th></tr></thead><tbody>
        ${SM.db.users.map((u) => html`<tr class="${u.active ? '' : 'row-muted'}"><td><div class="row nowrap">${UI.avatar(u.name, u.id, 'sm')}<div><span class="cell-title">${u.name}</span><span class="cell-sub">${u.phone || ''}</span></div></div></td><td class="mono">${u.login}</td><td>${roleBadge(u.role)}</td>
          <td class="fs-12">${u.points.length ? u.points.map((p) => SM.point(p).name).join(', ') : html`<span class="muted">все</span>`}</td><td class="nowrap">${u.lastLogin ? F.ago(u.lastLogin) : html`<span class="muted">не входил</span>`}</td>
          <td>${u.active ? html`<span class="badge b-ok">активен</span>` : html`<span class="badge b-bad">заблокирован</span>`}</td>
          <td class="td-act">${edit ? html`${u.id !== SM.user.id ? html`<button class="btn btn-ghost btn-sm" data-block="${u.id}">${u.active ? 'Заблокировать' : 'Разблокировать'}</button>` : ''}${UI.actBtns(u.id, { del: u.id !== SM.user.id, editTip: 'Изменить пользователя', delTip: 'Удалить пользователя' })}` : ''}</td></tr>`)}</tbody></table></div></div></div>`;
  }

  /* ---------- Справочники ---------- */
  const REF_TABS = [['points', 'Магазины и склады'], ['methods', 'Способы оплаты'], ['cats', 'Категории товаров'], ['cars', 'Водители и автомобили'], ['company', 'Реквизиты'], ['site', 'Интеграция с сайтом'], ['demo', 'Демо-данные']];
  function simpleForm(title, fields, onSave) {
    const m = UI.modal({ title, size: 'narrow', body: html`<form class="stack" style="gap:12px" autocomplete="off">${fields.map((f) => f.options ? html`<div class="field"><label>${f.label}</label><select class="select" name="${f.name}">${UI.options(f.options, f.value)}</select></div>` : f.check ? html`<label class="switch"><input type="checkbox" name="${f.name}" ${f.value ? 'checked' : ''}><i></i>${f.label}</label>` : html`<div class="field"><label>${f.label}${f.req ? html` <span class="req">*</span>` : ''}</label><input class="input" name="${f.name}" value="${f.value || ''}" ${f.req ? raw('data-req="1"') : ''}></div>`)}</form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Сохранить</button>` });
    const f = m.querySelector('form');
    const first = f.querySelector('input:not([type=checkbox])'); if (first) first.setAttribute('autofocus', '');
    m.querySelector('[data-ok]').onclick = () => { const d = UI.formData(f); const miss = UI.$$('[data-req]', f).find((x) => !x.value.trim()); if (miss) return UI.invalid(f, miss.name, 'Обязательное поле'); onSave(d); SM.save(); UI.closeTop(); UI.toast('Сохранено'); SM.refresh(); };
  }
  function refsPage(r) {
    const tab = r.q.tab || 'points';
    const edit = SM.can('refs', 2);
    let body;
    if (tab === 'points') body = html`<div class="row mb-16"><span class="muted fs-13">Без жёсткого ограничения количества · на запуске ожидается 10–15 точек (ТЗ 6)</span>${edit ? html`<button class="btn btn-primary right" data-x="add-point">${I('plus')}Точка</button>` : ''}</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Название</th><th>Тип</th><th>Адрес</th><th class="r">Товаров, ед.</th><th>Статус</th><th></th></tr></thead><tbody>${SM.db.points.map((p) => html`<tr class="${p.active ? '' : 'row-muted'}"><td><span class="cell-title">${p.name}</span><span class="cell-sub">${p.phone || ''}</span></td><td>${p.type === 'warehouse' ? 'Склад' : 'Магазин'}</td><td>${p.address}</td><td class="r">${SM.db.products.reduce((a, x) => a + Math.max(0, SM.qty(x.id, p.id)), 0)}</td><td>${p.active ? html`<span class="badge b-ok">работает</span>` : html`<span class="badge b-bad">отключена</span>`}</td><td class="r">${edit ? html`<button class="btn btn-ghost btn-sm" data-point="${p.id}">${I('edit')}</button>` : ''}</td></tr>`)}</tbody></table></div>`;
    else if (tab === 'methods') body = html`<div class="row mb-16"><span class="muted fs-13">Курс $ для пересчёта берётся по типу курса способа</span>${edit ? html`<button class="btn btn-primary right" data-x="add-method">${I('plus')}Способ оплаты</button>` : ''}</div>
      <ul class="list">${SM.db.methods.map((m) => html`<li><span class="note-ic accent">${I(m.icon || 'wallet')}</span><div class="grow"><b class="fs-13">${m.name}</b><div class="fs-12 muted">${m.cur === 'USD' ? 'в долларах' : 'в сумах'} · курс: ${SM.RATE_TYPES[m.rate]}</div></div><label class="switch"><input type="checkbox" data-method="${m.id}" ${m.active ? 'checked' : ''} ${edit ? '' : 'disabled'}><i></i></label></li>`)}</ul>`;
    else if (tab === 'cats') body = html`<div class="row mb-16">${edit ? html`<button class="btn btn-primary" data-x="add-cat">${I('plus')}Категория</button>` : ''}</div>
      <div class="grid g-3">${SM.db.categories.filter((c) => !c.parent).map((c) => html`<div class="cash-acc"><span>${I('tag')}${SM.db.products.filter((p) => SM.catRoot(p.cat).id === c.id).length} товаров</span><b class="fs-15">${c.name}</b><div class="attrs mt-8">${SM.db.categories.filter((s) => s.parent === c.id).map((s) => html`<span class="chip">${s.name}</span>`)}</div></div>`)}</div>`;
    else if (tab === 'cars') body = html`<div class="grid g-2"><div><div class="row mb-12"><h3>Водители</h3>${edit ? html`<button class="btn btn-secondary btn-sm right" data-x="add-driver">${I('plus')}Водитель</button>` : ''}</div><ul class="list">${SM.db.drivers.map((d) => html`<li>${UI.avatar(d.name, d.id, 'sm')}<div class="grow"><b class="fs-13">${d.name}</b><div class="fs-12 muted">${d.phone}</div></div><span class="muted fs-12">${SM.db.deliveries.filter((x) => x.driverId === d.id).length} доставок</span></li>`)}</ul></div>
      <div><div class="row mb-12"><h3>Автомобили</h3>${edit ? html`<button class="btn btn-secondary btn-sm right" data-x="add-car">${I('plus')}Автомобиль</button>` : ''}</div><ul class="list">${SM.db.cars.map((c) => html`<li><span class="note-ic info">${I('truck')}</span><div class="grow"><b class="fs-13">${c.model}</b><div class="fs-12 muted mono">${c.plate}</div></div><span class="muted fs-12">${SM.db.expenses.filter((e) => e.car === c.id && !e.cancelled).length} расходов</span></li>`)}</ul></div></div>`;
    else if (tab === 'company') { const co = SM.db.settings.company; body = html`<form class="form-grid" id="coForm" autocomplete="off">${[['name', 'Название'], ['inn', 'ИНН'], ['address', 'Адрес'], ['phone', 'Телефон'], ['bank', 'Банк'], ['mfo', 'МФО'], ['account', 'Расчётный счёт'], ['director', 'Директор'], ['accountant', 'Главный бухгалтер']].map(([k, t]) => html`<div class="field ${k === 'address' || k === 'name' ? 'full' : ''}"><label>${t}</label><input class="input" name="${k}" value="${co[k] || ''}" ${edit ? '' : 'readonly'}></div>`)}${edit ? html`<div class="full"><button class="btn btn-primary" type="submit">${I('check')}Сохранить реквизиты</button><span class="muted fs-12" style="margin-left:10px">Подставляются во все документы автоматически</span></div>` : ''}</form>`; }
    else if (tab === 'site') { const site = SM.db.settings.site; const n = SM.db.sales.filter((s) => s.source === 'site').length; body = html`<div class="grid g-2"><div class="stack">
        <div class="note-box warn">${I('info')}<div>По ТЗ (п. 19) точный перечень передаваемых данных, последовательность обработки заказов и этап реализации согласовываются отдельно при проектировании.</div></div>
        <dl class="dl"><dt>Сайт</dt><dd>${site.url}</dd><dt>Статус</dt><dd>${site.connected ? html`<span class="badge b-ok">подключён</span>` : html`<span class="badge b-warn">не подключён</span>`}</dd><dt>Заказов с сайта</dt><dd>${n}</dd></dl></div>
        <div class="card"><div class="card-b"><div class="section-t">Как будет работать</div><ul class="timeline"><li class="on"><b>Клиент оформляет заказ на сайте</b><small>товары, контакты, способ оплаты и доставки</small></li><li><b>Заказ появляется в «Продажах» с меткой «сайт»</b><small>продавец получает уведомление</small></li><li><b>Оплата уходит бухгалтеру на подтверждение</b><small>как обычная продажа</small></li><li><b>Остатки и цены передаются на сайт</b><small>периодичность — по согласованию</small></li></ul></div></div></div>`; }
    else body = html`<div class="note-box">${I('info')}<div>Все данные демо хранятся в этом браузере (localStorage). В рабочей версии — сервер с базой данных, резервным копированием и одновременной работой сотрудников (ТЗ 22).</div></div>
      <div class="row mt-16"><button class="btn btn-danger" data-x="reset">${I('undo')}Сбросить демо-данные</button><span class="muted fs-13">Вернёт исходные демо-данные и остатки</span></div>
      <div class="row mt-16"><a class="btn btn-secondary" href="styleguide.html" target="_blank" rel="noopener">${I('palette')}УИ-кит: стили, шрифты, кнопки, формы</a></div>`;
    return html`${UI.pageHead('Справочники', 'Точки, способы оплаты, категории, водители и автомобили, реквизиты компании', '')}${UI.tabs(REF_TABS, tab)}<div class="card"><div class="card-b">${body}</div></div>`;
  }

  /* ---------- История операций ---------- */
  const ENT = { contract: 'Договор', sale: 'Продажа', payment: 'Оплата', receipt: 'Поступление', transfer: 'Перемещение', product: 'Товар', client: 'Контрагент', expense: 'Расход', delivery: 'Доставка', rate: 'Курс', user: 'Пользователь', doc: 'Документ', stock: 'Остатки', cash: 'Касса', settings: 'Настройки' };
  function historyPage(r) {
    const q = (r.q.q || '').toLowerCase(), u = r.q.u || '', e = r.q.e || '';
    const R = SM.periodRange(r.q.p || 'all');
    const list = SM.db.history.filter((h) => (!u || h.uid === u) && (!e || h.entity === e) && D.inRange(h.at, R.from, R.to) && (!q || (h.action + ' ' + h.detail + ' ' + h.uname).toLowerCase().includes(q))).slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const link = (h) => ({ sale: '#/sales/', receipt: '#/receipts/', transfer: '#/transfers/', product: '#/products/', client: '#/clients/' }[h.entity] && h.entityId ? { sale: '#/sales/', receipt: '#/receipts/', transfer: '#/transfers/', product: '#/products/', client: '#/clients/' }[h.entity] + h.entityId : null);
    return html`
      ${UI.pageHead('История операций', 'Автор, дата и время, изменения, подтверждения оплат и отгрузок, отмены. Проведённое не удаляется — только отмена или корректировка (ТЗ 21)', html`<button class="btn btn-secondary" data-x="export">${I('download')}Excel</button>`)}
      <div class="card"><div class="card-h">${UI.searchInput(r.q.q, 'Действие, документ, сотрудник')}${UI.filterSelect('u', u, SM.db.users.map((x) => [x.id, x.name]), 'Все сотрудники')}${UI.filterSelect('e', e, Object.entries(ENT), 'Все объекты')}<span class="right">${UI.periodSeg(r.q.p || 'all')}</span></div>
        <div class="card-b" style="padding-top:12px">${list.length ? html`<div class="table-wrap"><table class="table compact"><thead><tr><th>Когда</th><th>Сотрудник</th><th>Действие</th><th>Объект</th><th>Подробности</th></tr></thead><tbody>
          ${list.slice(0, 400).map((h) => { const l = link(h); return html`<tr ${l ? raw(`class="click" data-href="${l}"`) : ''}><td class="nowrap">${F.dt(h.at)}</td><td>${h.uid ? html`<div class="row nowrap">${UI.avatar(h.uname || '?', h.uid, 'sm')}<span class="fw-7">${h.uname}</span></div>` : html`<span class="muted">${h.uname || 'Система'}</span>`}</td><td class="fw-7">${h.action}</td><td>${ENT[h.entity] ? html`<span class="chip">${ENT[h.entity]}</span>` : ''}</td><td class="text-2">${h.detail}</td></tr>`; })}</tbody></table></div>` : UI.empty('Записей нет', '', 'history')}</div></div>`;
  }

  /* ---------- Уведомления: категории, период (в т.ч. свои даты), только непрочитанные ---------- */
  const NOTE_GROUPS = [['sales', 'Продажи', ['sale', 'site', 'cancel']], ['money', 'Оплаты и долги', ['pay', 'payok', 'payno', 'debt']], ['stock', 'Склад', ['low', 'receipt', 'ship', 'transfer']], ['delivery', 'Доставка', ['delivery']]];
  const noteGroup = (n) => (NOTE_GROUPS.find((x) => x[2].includes(n.kind)) || ['other'])[0];
  function notificationsPage(r) {
    const g = r.q.g || '', p = r.q.p || 'all', only = r.q.u === '1';
    const R = p === 'custom' ? { from: r.q.from || D.iso(D.addDays(D.today(), -7)), to: r.q.to || D.todayISO() } : SM.periodRange(p);
    const inDate = SM.notesFor().filter((n) => n.live || D.inRange(n.at, R.from, R.to));
    const cnt = {};
    inDate.forEach((n) => (cnt[noteGroup(n)] = (cnt[noteGroup(n)] || 0) + 1));
    const list = inDate.filter((n) => (!g || noteGroup(n) === g) && (!only || (!n.live && !n.readBy.includes(SM.user.id))));
    const un = SM.unread().length;
    const days = {};
    list.forEach((n) => { const d = n.live ? 'Требует внимания' : D.dayOf(n.at) === D.todayISO() ? 'Сегодня' : D.dayOf(n.at) === D.iso(D.addDays(D.today(), -1)) ? 'Вчера' : F.date(n.at); (days[d] = days[d] || []).push(n); });
    return html`
      ${UI.pageHead('Уведомления', 'События вашей роли: продажи, оплаты, склад, доставка, отмены, долги и низкий остаток', un ? html`<button class="btn btn-secondary" data-x="read">${I('check')}Прочитать все (${un})</button>` : '')}
      ${UI.tabs([['', 'Все', inDate.length]].concat(NOTE_GROUPS.map(([k, t]) => [k, t, cnt[k] || 0])), g, 'g')}
      <div class="row mb-16">${UI.periodSeg(p, SM.PERIODS.concat([['custom', 'Свои даты']]))}
        ${p === 'custom' ? html`<input class="input input-sm" type="date" data-d="from" value="${R.from}" style="width:160px" aria-label="С"><input class="input input-sm" type="date" data-d="to" value="${R.to}" style="width:160px" aria-label="По">` : ''}
        <label class="switch right"><input type="checkbox" data-x="only" ${only ? raw('checked') : ''}><i></i>Только непрочитанные</label></div>
      ${list.length ? Object.entries(days).map(([d, ns]) => html`<div class="card mb-16"><div class="card-h"><h3>${I(d === 'Требует внимания' ? 'alert' : 'calendar')}${d}</h3><span class="pill">${ns.length}</span></div><div class="card-b"><ul class="list">${ns.map(SM.noteRow)}</ul></div></div>`) : html`<div class="card"><div class="card-b">${UI.empty('Уведомлений нет', only ? 'Все прочитаны' : 'За выбранный период событий нет', 'bell')}</div></div>`}`;
  }

  SM.page('users', {
    title: 'Пользователи и роли', render: usersPage,
    mount(el, r) {
      UI.bindTabs(el);
      const n = el.querySelector('[data-x=new]'); if (n) n.onclick = () => userForm(null);
      UI.$$('[data-edit]', el).forEach((b) => (b.onclick = () => userForm(SM.db.users.find((u) => u.id === b.dataset.edit))));
      UI.$$('[data-del]', el).forEach((b) => (b.onclick = () => deleteUserAsk(SM.db.users.find((u) => u.id === b.dataset.del))));
      UI.$$('[data-block]', el).forEach((b) => (b.onclick = async () => { const u = SM.db.users.find((x) => x.id === b.dataset.block); if (!(await UI.confirm(u.active ? 'Заблокировать ' + u.name + '?' : 'Разблокировать ' + u.name + '?', u.active ? 'Сотрудник не сможет войти в систему. История его операций сохранится.' : 'Сотрудник снова сможет войти.', { ok: u.active ? 'Заблокировать' : 'Разблокировать', danger: u.active }))) return; u.active = !u.active; SM.log(u.active ? 'Пользователь разблокирован' : 'Пользователь заблокирован', 'user', u.id, u.name); SM.save(); UI.toast(u.active ? 'Пользователь разблокирован' : 'Пользователь заблокирован', u.name, u.active ? 'ok' : 'warn', { icon: 'user' }); SM.refresh(); }));
      // роли: изменения сохраняются сразу, без общей кнопки
      UI.$$('[data-role]', el).forEach((b) => (b.onclick = () => SM.setQuery({ role: b.dataset.role }, true)));
      const rk = roleKey(r), role = SM.db.roles[rk];
      const saved = (what) => { SM.save(); UI.toast('Права обновлены', SM.ROLES[rk].title + ' · ' + what, 'ok', { icon: 'shield', ms: 2400 }); };
      UI.$$('.lv button', el).forEach((b) => (b.onclick = () => {
        role.perms[b.dataset.sec] = +b.dataset.lv;
        b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        SM.log('Изменены права роли', 'settings', null, SM.ROLES[rk].title + ': ' + SM.section(b.dataset.sec).title + ' — ' + LV[+b.dataset.lv]);
        saved(SM.section(b.dataset.sec).title + ': ' + LV[+b.dataset.lv].toLowerCase());
      }));
      UI.$$('[data-flag]', el).forEach((c) => (c.onchange = () => { role.flags[c.dataset.flag] = c.checked; const fl = SM.FLAGS.find((x) => x.key === c.dataset.flag); SM.log('Изменены права роли', 'settings', null, SM.ROLES[rk].title + ': ' + fl.title + ' — ' + (c.checked ? 'да' : 'нет')); saved(fl.title + (c.checked ? ': включено' : ': выключено')); }));
      const disc = el.querySelector('[data-disc]');
      if (disc) disc.onchange = () => { role.discountMax = Math.max(0, Math.min(100, Math.round(+disc.value || 0))); disc.value = role.discountMax; SM.log('Изменён лимит скидки', 'settings', null, SM.ROLES[rk].title + ': ' + role.discountMax + '%'); saved('скидка до ' + role.discountMax + '%'); };
      const rs = el.querySelector('[data-x=reset-roles]');
      if (rs) rs.onclick = async () => { if (!(await UI.confirm('Вернуть права как в ТЗ?', 'Все изменения прав по ролям будут сброшены.'))) return; SM.db.roles = JSON.parse(JSON.stringify(SM.ROLES)); SM.log('Права ролей сброшены к ТЗ', 'settings', null, ''); SM.save(); UI.toast('Права как в ТЗ', 'Все роли сброшены', 'info', { icon: 'undo' }); SM.refresh(); };
    },
  });
  SM.page('refs', {
    title: 'Справочники', render: refsPage,
    mount(el) {
      UI.bindTabs(el);
      const on = (s, fn) => { const b = el.querySelector(s); if (b) b.onclick = fn; };
      const pointForm = (p) => simpleForm(p ? p.name : 'Новая точка', [{ name: 'name', label: 'Название', value: p && p.name, req: true }, { name: 'type', label: 'Тип', options: [['shop', 'Магазин'], ['warehouse', 'Склад']], value: p ? p.type : 'shop' }, { name: 'address', label: 'Адрес', value: p && p.address, req: true }, { name: 'phone', label: 'Телефон', value: p && p.phone }, { name: 'active', label: 'Работает', check: true, value: p ? p.active : true }],
        (d) => { if (p) Object.assign(p, d); else SM.db.points.push(Object.assign({ id: SM.uid('pt') }, d)); SM.log(p ? 'Изменена точка' : 'Добавлена точка', 'settings', null, d.name); });
      on('[data-x=add-point]', () => pointForm(null));
      UI.$$('[data-point]', el).forEach((b) => (b.onclick = () => pointForm(SM.db.points.find((p) => p.id === b.dataset.point))));
      UI.$$('[data-method]', el).forEach((c) => (c.onchange = () => { const m = SM.db.methods.find((x) => x.id === c.dataset.method); m.active = c.checked; SM.log('Способ оплаты ' + (c.checked ? 'включён' : 'выключен'), 'settings', null, m.name); SM.save(); UI.toast(m.name, c.checked ? 'включён' : 'выключен'); }));
      on('[data-x=add-method]', () => simpleForm('Новый способ оплаты', [{ name: 'name', label: 'Название', req: true }, { name: 'cur', label: 'Валюта', options: [['UZS', 'Сум'], ['USD', '$']], value: 'UZS' }, { name: 'rate', label: 'Курс для пересчёта', options: Object.entries(SM.RATE_TYPES), value: 'card' }], (d) => { SM.db.methods.push({ id: SM.uid('m'), name: d.name, cur: d.cur, rate: d.rate, icon: 'wallet', active: true }); SM.log('Добавлен способ оплаты', 'settings', null, d.name); }));
      on('[data-x=add-cat]', () => simpleForm('Новая категория', [{ name: 'name', label: 'Название', req: true }, { name: 'parent', label: 'Входит в', options: [['', 'Верхний уровень']].concat(SM.db.categories.filter((c) => !c.parent).map((c) => [c.id, c.name])), value: '' }], (d) => { SM.db.categories.push({ id: SM.uid('c'), name: d.name, parent: d.parent || undefined }); SM.log('Добавлена категория', 'settings', null, d.name); }));
      on('[data-x=add-driver]', () => simpleForm('Новый водитель', [{ name: 'name', label: 'Ф.И.О.', req: true }, { name: 'phone', label: 'Телефон', req: true }], (d) => { SM.db.drivers.push({ id: SM.uid('dr'), name: d.name, phone: d.phone, active: true }); SM.log('Добавлен водитель', 'settings', null, d.name); }));
      on('[data-x=add-car]', () => simpleForm('Новый автомобиль', [{ name: 'model', label: 'Марка и модель', req: true }, { name: 'plate', label: 'Госномер', req: true }], (d) => { SM.db.cars.push({ id: SM.uid('car'), model: d.model, plate: d.plate.toUpperCase(), active: true }); SM.log('Добавлен автомобиль', 'settings', null, d.model + ' ' + d.plate); }));
      const co = el.querySelector('#coForm');
      if (co) co.onsubmit = (e) => { e.preventDefault(); Object.assign(SM.db.settings.company, UI.formData(co)); SM.log('Изменены реквизиты компании', 'settings', null, ''); SM.save(); UI.toast('Реквизиты сохранены'); };
      on('[data-x=reset]', async () => { if (!(await UI.confirm('Сбросить демо-данные?', 'Все изменения в этом браузере будут удалены, вернутся исходные демо-данные: 2 продажи, 2 контрагента, 5 товаров.', { ok: 'Сбросить', danger: true }))) return; const uid = SM.user.id; SM.resetDemo(); SM.user = SM.db.users.find((u) => u.id === uid) || SM.db.users[0]; UI.toast('Демо-данные сброшены', 'Исходные данные восстановлены', 'info', { icon: 'refresh' }); SM.refresh(); });
    },
  });
  SM.page('history', {
    title: 'История операций', render: historyPage,
    mount(el) {
      UI.bindSearch(el); UI.bindFilters(el); UI.bindPeriod(el);
      el.querySelector('[data-x=export]').onclick = () => UI.exportXLSX('История_операций_' + D.todayISO(), [['Дата и время', 'Сотрудник', 'Действие', 'Объект', 'Подробности'], ...SM.db.history.slice().reverse().map((h) => [F.dt(h.at), h.uname, h.action, ENT[h.entity] || h.entity, h.detail])], 'История');
    },
  });
  SM.page('notifications', {
    title: 'Уведомления', render: notificationsPage,
    mount(el) {
      UI.bindTabs(el); UI.bindPeriod(el);
      UI.$$('[data-d]', el).forEach((i) => (i.onchange = () => SM.setQuery({ [i.dataset.d]: i.value }, true)));
      const only = el.querySelector('[data-x=only]'); if (only) only.onchange = () => SM.setQuery({ u: only.checked ? '1' : '' }, true);
      const b = el.querySelector('[data-x=read]'); if (b) b.onclick = () => { SM.ops.markRead(); UI.toast('Все уведомления прочитаны', '', 'ok', { icon: 'bell' }); SM.refresh(); };
    },
  });
})();
