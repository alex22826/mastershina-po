/* =========================================================
   SM AVTO BASE — демо-данные (упрощённые, чтобы руководитель
   быстро разобрался «что где»): 2 точки, 5 товаров,
   2 контрагента, 2 заказа, 3 расхода компании.
   Даты считаются от «сегодня», при открытии через день сдвигаются.
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM;
  const D = SM.d;

  SM.seed = function () {
    // утром события «сегодня» могли бы оказаться в будущем — тогда сжимаем их в последние ~40 минут, сохраняя порядок
    const early = Date.now() < D.today().getTime() + 11.5 * 3600e3;
    const at = (d, h = 10, m = 0) => (d === 0 && early ? new Date(Date.now() - ((24 * 60 - (h * 60 + m)) / 24) * 60000).toISOString() : D.at(d, h, m));
    const day = (d) => D.iso(D.addDays(D.today(), d));
    const db = { version: SM.DB_VERSION, demo: true, baseDay: D.todayISO(), rev: 0, counters: { 'СП': 2, 'ДС': 1, 'СЧ': 1 } };

    db.settings = {
      company: { name: 'ООО «SM AVTO BASE»', inn: '310 245 778', address: 'г. Ташкент, Яшнабадский р-н, ул. Махтумкули, 87', bank: 'АКБ «Капиталбанк», Яшнабадский филиал', mfo: '01088',
        account: '2020 8000 1052 7781 4001', phone: '+998 71 200-07-07', director: 'Сайфуллаев Р. А.', accountant: 'Абдуллаева Н. Б.' },
      vat: { enabled: true, rate: 12, mode: 'included' },
      opening: { cash_uzs: 28500000, cash_usd: 4200, card: 0, qr: 0, bank: 186000000, corp: 5000000 },
      site: { connected: false, url: 'mastershina.uz' },
    };
    db.roles = JSON.parse(JSON.stringify(SM.ROLES));
    db.methods = SM.METHODS_DEFAULT.map((m) => Object.assign({ active: true }, m));
    db.expCats = SM.EXP_CATS_DEFAULT.slice();

    db.points = [
      { id: 'w1', name: 'Центральный склад', type: 'warehouse', address: 'г. Ташкент, Яшнабадский р-н, ул. Махтумкули, 87', phone: '+998 71 200-07-10', active: true },
      { id: 'p1', name: 'Магазин «Чиланзар»', type: 'shop', address: 'г. Ташкент, Чиланзарский р-н, ул. Бунёдкор, 12', phone: '+998 71 200-07-01', active: true },
    ];

    db.categories = [
      { id: 'c-tires', name: 'Шины' }, { id: 'c-t-summer', name: 'Летние шины', parent: 'c-tires' }, { id: 'c-t-winter', name: 'Зимние шины', parent: 'c-tires' },
      { id: 'c-t-all', name: 'Всесезонные шины', parent: 'c-tires' }, { id: 'c-t-truck', name: 'Грузовые шины', parent: 'c-tires' },
      { id: 'c-wheels', name: 'Диски' },
      { id: 'c-parts', name: 'Автозапчасти' }, { id: 'c-p-filters', name: 'Фильтры', parent: 'c-parts' }, { id: 'c-p-brakes', name: 'Тормозная система', parent: 'c-parts' },
      { id: 'c-p-susp', name: 'Подвеска', parent: 'c-parts' }, { id: 'c-p-engine', name: 'Двигатель', parent: 'c-parts' },
      { id: 'c-oil', name: 'Масла и жидкости' }, { id: 'c-acc', name: 'Аккумуляторы' }, { id: 'c-misc', name: 'Сопутствующие товары' },
    ];

    // 5 товаров на складе
    const T = (size, season, model, index) => { const m = size.match(/(\d+)\/(\d+)\s*(R[\d.]+)/); return { size, width: m[1], profile: m[2], radius: m[3], season, model, index }; };
    db.products = [
      { id: 'pr1', code: 'SM-00001', oldCode: '1C-004512', name: 'Michelin Primacy 4 205/55 R16 91V', alt: ['мишлен 205 55 16', 'Primacy4'], cat: 'c-t-summer', maker: 'Michelin, Франция', brand: 'Michelin', unit: 'шт', attrs: T('205/55 R16', 'Летняя', 'Primacy 4', '91V'), buy: 1080000, buyCur: 'UZS', extra: 25000, price: 1450000, cur: 'UZS', min: 4 },
      { id: 'pr2', code: 'SM-00002', oldCode: '1C-004577', name: 'Hankook Kinergy Eco 2 195/65 R15 91H', alt: ['ханкук 195 65 15', 'шина нексия 15'], cat: 'c-t-summer', maker: 'Hankook, Корея', brand: 'Hankook', unit: 'шт', attrs: T('195/65 R15', 'Летняя', 'Kinergy Eco 2', '91H'), buy: 560000, buyCur: 'UZS', extra: 15000, price: 780000, cur: 'UZS', min: 8 },
      { id: 'pr3', code: 'SM-00003', oldCode: '1C-005101', name: 'Nokian Hakkapeliitta R5 205/55 R16 94R', alt: ['нокиан хакка 205 55 16', 'липучка'], cat: 'c-t-winter', maker: 'Nokian Tyres, Финляндия', brand: 'Nokian', unit: 'шт', attrs: T('205/55 R16', 'Зимняя', 'Hakkapeliitta R5', '94R'), buy: 98, buyCur: 'USD', extra: 4, price: 135, cur: 'USD', min: 4 },
      { id: 'pr4', code: 'SM-00004', oldCode: '1C-020011', name: 'Масло моторное Shell Helix HX7 10W-40, 4 л', alt: ['шелл 10w40', 'полусинтетика 4л'], cat: 'c-oil', maker: 'Shell, Нидерланды', brand: 'Shell', unit: 'кан', attrs: { volume: '4 л', type: 'Полусинтетика', spec: 'API SN/CF' }, buy: 270000, buyCur: 'UZS', extra: 6000, price: 370000, cur: 'UZS', min: 6 },
      { id: 'pr5', code: 'SM-00005', oldCode: '1C-010211', name: 'Фильтр масляный MANN W 712/75', alt: ['масляный фильтр нексия', 'фильтр масла кобальт', 'W712/75'], cat: 'c-p-filters', maker: 'MANN-FILTER, Германия', brand: 'MANN', unit: 'шт', attrs: { oem: '96879797', fits: 'Nexia, Cobalt, Lacetti' }, buy: 52000, buyCur: 'UZS', extra: 2000, price: 78000, cur: 'UZS', min: 10 },
    ].map((p) => Object.assign(p, { vat: 12, comment: '', active: true, createdAt: at(-40) }));

    /* начальные остатки: [склад, магазин] */
    const INIT = { pr1: [12, 4], pr2: [20, 8], pr3: [8, 2], pr4: [16, 6], pr5: [30, 10] };
    db.moves = [];
    let mvN = 0;
    const mv = (productId, pointId, qty, kind, doc, when, by = 'u-sklad') => db.moves.push({ id: 'mv' + ++mvN, at: when, productId, pointId, qty, kind, doc, by });
    Object.entries(INIT).forEach(([pid, [w, s]]) => { mv(pid, 'w1', w, 'initial', 'Ввод начальных остатков', at(-30, 9), 'u-admin'); mv(pid, 'p1', s, 'initial', 'Ввод начальных остатков', at(-30, 9), 'u-admin'); });

    const pass = { admin: 'f17e56fcb58b600b971107964e5643027e01379d17125cafcd90f29b2c3fe82d', rukovoditel: '42bb98b6d919c2e499ab9eed72cc23c88c8e6d71dec7908da786178517b37e54',
      prodavec: '8be7a0665494ad27f5456f2ffe4ab54f808a3f00031b974289b74e1e2222af32', prodavec2: 'aaac5b9aa65d06c7e114071118aac131951e7e3c1be919e5347ecf5c1762bd33',
      sklad: '715a0b0cad7b27de77bd89c9c2fe666cc5371f0c64737b7838483b735f77c500', buhgalter: 'b908e1fe2765c1faa894f0cc76064044aae28a238f82d2b5af189e7d5e0e4194',
      dostavka: 'd91c365808875c1fc0ebf26a0fd50dae39e97192203d3aaf6c4f68569863e367' };
    db.users = [
      { id: 'u-admin', login: 'admin', name: 'Тимур Асадов', role: 'admin', phone: '+998 90 100-00-01', points: [], active: true },
      { id: 'u-head', login: 'rukovoditel', name: 'Рустам Сайфуллаев', role: 'head', phone: '+998 90 100-00-02', points: [], active: true },
      { id: 'u-sel1', login: 'prodavec', name: 'Камола Иргашева', role: 'seller', phone: '+998 90 100-00-03', points: ['p1', 'w1'], active: true },
      { id: 'u-sel2', login: 'prodavec2', name: 'Дониёр Хакимов', role: 'seller', phone: '+998 90 100-00-04', points: ['p1'], active: true },
      { id: 'u-sklad', login: 'sklad', name: 'Бекзод Турсунов', role: 'storekeeper', phone: '+998 90 100-00-05', points: ['w1', 'p1'], active: true },
      { id: 'u-buh', login: 'buhgalter', name: 'Нилуфар Абдуллаева', role: 'accountant', phone: '+998 90 100-00-06', points: [], active: true },
      { id: 'u-dost', login: 'dostavka', name: 'Улугбек Мирзаев', role: 'courier', phone: '+998 90 100-00-07', points: [], active: true },
    ].map((u) => Object.assign(u, { passHash: pass[u.login], createdAt: at(-60), lastLogin: null }));

    // 2 контрагента: компания и физлицо
    db.clients = [
      { id: 'c1', kind: 'client', type: 'legal', name: 'ООО «Toshkent Taxi Servis»', contact: 'Бахтиёр Назаров', phone: '+998 90 123-45-67', address: 'г. Ташкент, ул. Шота Руставели, 41', inn: '305 112 448', bank: 'АКБ «Капиталбанк»', mfo: '01088', account: '2020 8000 9051 2345 6001', sellerId: 'u-sel1', opening: 0, comment: 'Таксопарк: шины и расходники' },
      { id: 'c2', kind: 'client', type: 'person', name: 'Азиз Рахимов', contact: '', phone: '+998 93 555-12-90', address: 'г. Ташкент, Юнусабад, 14-квартал, д. 22', inn: '', bank: '', mfo: '', account: '', sellerId: 'u-sel1', opening: 0, comment: '' },
    ].map((c) => Object.assign(c, { createdAt: at(-60) }));

    db.drivers = [{ id: 'dr1', name: 'Ахмад Каримов', phone: '+998 90 311-22-33', active: true }, { id: 'dr2', name: 'Сардор Олимов', phone: '+998 93 402-55-61', active: true }];
    db.cars = [{ id: 'car1', model: 'Chevrolet Damas', plate: '01 A 412 BC', active: true }, { id: 'car2', model: 'Chevrolet Labo', plate: '01 B 778 DA', active: true }];

    db.rates = [
      { id: 'rt1', at: at(-7, 9), cash: 12620, card: 12680, bank: 12700, by: 'u-buh' },
      { id: 'rt2', at: at(-3, 9), cash: 12640, card: 12700, bank: 12720, by: 'u-buh' },
      { id: 'rt3', at: at(0, 9), cash: 12660, card: 12715, bank: 12735, by: 'u-buh' },
    ];
    db.receipts = [];
    db.transfers = [];

    /* ---------- 2 заказа ---------- */
    const H = (d, h, m, uid, text) => ({ at: at(d, h, m), uid, text });
    const vatCfg = Object.assign({}, db.settings.vat);
    db.sales = [
      { id: 's-1', no: 'СП-0001', date: day(-1), createdAt: at(-1, 11), clientId: 'c1', sellerId: 'u-sel1', pointId: 'w1', source: 'office',
        items: [{ productId: 'pr2', qty: 4, price: 780000, disc: 0 }, { productId: 'pr5', qty: 4, price: 78000, disc: 0 }], docDisc: 0, cur: 'UZS', rateType: 'bank', rate: 12720, vat: true, vatCfg,
        receive: 'delivery', credit: false, due: null, comment: 'Замена шин на 1 машину парка', state: 'posted', postedAt: at(-1, 11, 10), readyAt: at(-1, 15),
        history: [H(-1, 11, 0, 'u-sel1', 'Создана'), H(-1, 11, 10, 'u-sel1', 'Проведена, товар списан с точки «Центральный склад»'), H(-1, 11, 11, 'u-sel1', 'Оплата 3 432 000 сум · Перечисление на р/с — на проверке'), H(-1, 14, 30, 'u-buh', 'Оплата подтверждена: 3 432 000 сум'), H(-1, 15, 0, 'u-sklad', 'Собрано, готово к отгрузке')] },
      { id: 's-2', no: 'СП-0002', date: day(0), createdAt: at(0, 10, 20), clientId: 'c2', sellerId: 'u-sel1', pointId: 'p1', source: 'office',
        items: [{ productId: 'pr1', qty: 4, price: 1450000, disc: 0 }], docDisc: 0, cur: 'UZS', rateType: 'cash', rate: 12660, vat: true, vatCfg,
        receive: 'pickup', credit: false, due: null, comment: 'Клиент заберёт сам', state: 'posted', postedAt: at(0, 10, 25),
        history: [H(0, 10, 20, 'u-sel1', 'Создана'), H(0, 10, 25, 'u-sel1', 'Проведена, товар списан с точки «Магазин «Чиланзар»»'), H(0, 10, 26, 'u-sel1', 'Оплата 5 800 000 сум · Наличные, сум — на проверке')] },
    ];
    db.sales.forEach((s) => s.items.forEach((l) => mv(l.productId, s.pointId, -l.qty, 'sale', s.no, s.postedAt, s.sellerId)));

    db.payments = [
      { id: 'pay1', at: at(-1, 11, 11), saleId: 's-1', clientId: 'c1', method: 'bank', amount: 3432000, cur: 'UZS', rate: 12720, dir: 'in', status: 'confirmed', by: 'u-sel1', confirmedBy: 'u-buh', confirmedAt: at(-1, 14, 30), note: 'Платёжное поручение № 412' },
      { id: 'pay2', at: at(0, 10, 26), saleId: 's-2', clientId: 'c2', method: 'cash_uzs', amount: 5800000, cur: 'UZS', rate: 12660, dir: 'in', status: 'pending', by: 'u-sel1', note: 'Наличные в кассу магазина' },
    ];

    /* ---------- 3 расхода компании: на что — текстом ---------- */
    db.expenses = [
      { id: 'e1', date: day(-2), cat: 'company', amount: 800, cur: 'USD', rate: 12640, account: 'cash_usd', employee: '', pointId: 'w1', car: '', comment: 'Аренда склада за месяц', file: '', by: 'u-buh', at: at(-2, 10) },
      { id: 'e2', date: day(-1), cat: 'company', amount: 450000, cur: 'UZS', rate: 12640, account: 'cash_uzs', employee: '', pointId: 'w1', car: '', comment: 'Топливо для Damas (доставка)', file: '', by: 'u-buh', at: at(-1, 9) },
      { id: 'e3', date: day(0), cat: 'company', amount: 180000, cur: 'UZS', rate: 12660, account: 'cash_uzs', employee: '', pointId: 'p1', car: '', comment: 'Обед сотрудникам магазина', file: '', by: 'u-buh', at: at(0, 9, 30) },
    ];
    db.cashOps = [];
    db.adjustments = [];

    db.deliveries = [
      { id: 'd1', no: 'ДС-0001', saleId: 's-1', clientId: 'c1', address: 'г. Ташкент, ул. Шота Руставели, 41 (гараж парка)', phone: '+998 90 123-45-67', driverId: 'dr1', carId: 'car1', cost: 0, direction: 'Ташкент, Мирабадский р-н', kind: 'own', paid: false, status: 'assigned', comment: 'Бесплатно для корпоративного клиента', createdAt: at(-1, 11, 10), by: 'u-sel1',
        history: [{ at: at(-1, 11, 10), uid: 'u-sel1', text: 'Заявка создана' }, { at: at(-1, 16), uid: 'u-dost', text: 'Назначен водитель Ахмад Каримов, Chevrolet Damas' }] },
    ];
    db.documents = [{ id: 'doc1', no: 'СЧ-0001', type: 'invoice', date: day(-1), at: at(-1, 11, 12), by: 'u-sel1', saleId: 's-1', clientId: 'c1', note: '', fields: {} }];

    const N = (id, d, h, m, kind, title, text, href, roles, uids, readBy) => ({ id, at: at(d, h, m), kind, title, text, href, roles, uids: uids || [], readBy: readBy || [] });
    db.notes = [
      N('n1', 0, 10, 26, 'pay', 'Оплата на подтверждение', 'СП-0002 · Азиз Рахимов · 5 800 000 сум · наличные', '#/accounting', ['accountant', 'admin']),
      N('n2', 0, 10, 25, 'sale', 'Новая продажа СП-0002', 'Азиз Рахимов · 5 800 000 сум', '#/sales/s-2', ['admin', 'head', 'storekeeper']),
      N('n3', -1, 15, 0, 'ship', 'Готово к отгрузке · СП-0001', 'ООО «Toshkent Taxi Servis» · доставка ДС-0001', '#/sales/s-1', ['admin', 'courier'], ['u-sel1']),
      N('n4', -1, 14, 30, 'payok', 'Оплата подтверждена · СП-0001', 'ООО «Toshkent Taxi Servis» · 3 432 000 сум', '#/sales/s-1', ['admin'], ['u-sel1'], ['u-admin']),
    ];
    const HI = (id, d, h, m, uid, action, entity, entityId, detail) => ({ id, at: at(d, h, m), uid, uname: (db.users.find((u) => u.id === uid) || {}).name, action, entity, entityId, detail });
    db.history = [
      HI('h1', -30, 9, 0, 'u-admin', 'Ввод начальных остатков', 'stock', null, '5 товаров на 2 точках'),
      HI('h2', -2, 10, 0, 'u-buh', 'Расход', 'expense', 'e1', 'Аренда склада за месяц · $800,00'),
      HI('h3', -1, 9, 0, 'u-buh', 'Расход', 'expense', 'e2', 'Топливо для Damas · 450 000 сум'),
      HI('h4', -1, 11, 10, 'u-sel1', 'Создана продажа', 'sale', 's-1', 'СП-0001 · проведена'),
      HI('h5', -1, 14, 30, 'u-buh', 'Оплата подтверждена', 'payment', 'pay1', '3 432 000 сум · СП-0001'),
      HI('h6', -1, 15, 0, 'u-sklad', 'Готово к отгрузке', 'sale', 's-1', 'СП-0001'),
      HI('h7', 0, 9, 0, 'u-buh', 'Установлен курс $', 'rate', null, 'наличный 12660, безналичный 12715, перечисление 12735'),
      HI('h8', 0, 10, 25, 'u-sel1', 'Создана продажа', 'sale', 's-2', 'СП-0002 · проведена'),
    ];
    return db;
  };
})();
