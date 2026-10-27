/* =========================================================
   SM AVTO BASE — демо-данные (упрощённые, чтобы руководитель
   быстро разобрался «что где»): 2 точки, 15 товаров,
   2 контрагента и поставщик, 2 заказа, поступление, 3 расхода компании.
   Даты считаются от «сегодня», при открытии через день сдвигаются.
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM;
  const D = SM.d;
  const T = (size, season, model, index) => { const m = size.match(/(\d+)\/(\d+)\s*(R[\d.]+)/); return { size, width: m[1], profile: m[2], radius: m[3], season, model, index }; };
  const img = (n) => 'assets/img/products/' + n + '.webp';

  /* 10 товаров от 22.10 (п.13 Алексея; так же записаны в общей базе) и их оприходование (п.15): qty — сколько пришло
     поступлением от «ООО «AvtoTrade Supply»» на «Центральный склад», по себестоимости, без НДС */
  const NEW10 = [
    { code: 'SM-00006', qty: 8, name: 'Continental PremiumContact 6 225/45 R17 94Y XL', sku: '0357035', alt: ['конти 225 45 17', 'премиум контакт 6'], cat: 'c-t-summer', maker: 'Continental, Германия', brand: 'Continental', unit: 'шт', attrs: T('225/45 R17', 'Летняя', 'PremiumContact 6', '94Y'), buy: 1320000, extra: 30000, buyCur: 'UZS', price: 1790000, cur: 'UZS', min: 4, photo: img('tire-summer') },
    { code: 'SM-00007', qty: 16, name: 'Bridgestone Turanza T005 185/65 R15 88H', sku: '13452', alt: ['бриджстоун 185 65 15', 'шина кобальт 15'], cat: 'c-t-summer', maker: 'Bridgestone, Япония', brand: 'Bridgestone', unit: 'шт', attrs: T('185/65 R15', 'Летняя', 'Turanza T005', '88H'), buy: 690000, extra: 15000, buyCur: 'UZS', price: 920000, cur: 'UZS', min: 8, photo: img('tire-summer') },
    { code: 'SM-00008', qty: 12, name: 'Pirelli Ice Zero 2 215/60 R16 99T XL, шипы', sku: '3986000', alt: ['пирелли шипы 16', 'айс зеро'], cat: 'c-t-winter', maker: 'Pirelli, Италия', brand: 'Pirelli', unit: 'шт', attrs: T('215/60 R16', 'Зимняя (шипы)', 'Ice Zero 2', '99T'), buy: 96, extra: 4, buyCur: 'USD', price: 128, cur: 'USD', min: 4, photo: img('tire-winter') },
    { code: 'SM-00009', qty: 8, name: 'Yokohama BluEarth-4S AW21 205/55 R16 94V', sku: 'R4446', alt: ['йокогама всесезон 16', 'aw21'], cat: 'c-t-all', maker: 'Yokohama, Япония', brand: 'Yokohama', unit: 'шт', attrs: T('205/55 R16', 'Всесезонная', 'BluEarth-4S AW21', '94V'), buy: 880000, extra: 20000, buyCur: 'UZS', price: 1190000, cur: 'UZS', min: 4, photo: img('tire-all') },
    { code: 'SM-00010', qty: 8, name: 'Диск литой K&K Сканди 6,5×16 5×105 ET39 DIA 56,6', sku: '74916', alt: ['диск кобальт 16', 'литьё 5x105'], cat: 'c-wheels', maker: 'K&K, Россия', brand: 'K&K', unit: 'шт', attrs: { size: '6,5×16', pcd: '5×105', et: '39', dia: '56,6', fits: 'Cobalt, Lacetti, Gentra' }, buy: 650000, extra: 15000, buyCur: 'UZS', price: 890000, cur: 'UZS', min: 4, photo: img('wheel') },
    { code: 'SM-00011', qty: 6, name: 'Аккумулятор Varta Blue Dynamic E11 74 Ач 680 А, обратная полярность', sku: '574012068', alt: ['акб 74', 'варта 74'], cat: 'c-acc', maker: 'Varta, Германия', brand: 'Varta', unit: 'шт', attrs: { capacity: '74 Ач', current: '680 А', polarity: 'Обратная (− +)' }, buy: 1150000, extra: 20000, buyCur: 'UZS', price: 1480000, cur: 'UZS', min: 2, photo: img('battery') },
    { code: 'SM-00012', qty: 12, name: 'Колодки тормозные передние Hi-Q SP1157 (Nexia, Lanos)', sku: 'SP1157', alt: ['колодки нексия', 'тормозные нексия передние', 'колодки ланос'], cat: 'c-p-brakes', maker: 'Sangsin Brake, Корея', brand: 'Hi-Q', unit: 'компл', attrs: { fits: 'Nexia, Lanos', qty: '4 шт' }, buy: 120000, extra: 3000, buyCur: 'UZS', price: 175000, cur: 'UZS', min: 6, photo: img('brake-pads') },
    { code: 'SM-00013', qty: 15, name: 'Антифриз Felix Carbox G12+ красный, 5 кг', sku: '430206033', alt: ['антифриз красный', 'тосол g12'], cat: 'c-oil', maker: 'Тосол-Синтез, Россия', brand: 'Felix', unit: 'кан', attrs: { volume: '5 кг', type: 'G12+', spec: 'до −40 °C' }, buy: 115000, extra: 3000, buyCur: 'UZS', price: 165000, cur: 'UZS', min: 6, photo: img('antifreeze') },
    { code: 'SM-00014', qty: 20, name: 'Щётки стеклоочистителя Bosch Aerotwin A929S 600/450 мм, комплект', sku: '3397118929', alt: ['дворники 600 450', 'щётки бош'], cat: 'c-misc', maker: 'Bosch, Германия', brand: 'Bosch', unit: 'компл', attrs: { length: '600/450 мм', type: 'Бескаркасные' }, buy: 210000, extra: 5000, buyCur: 'UZS', price: 295000, cur: 'UZS', min: 4, photo: img('wiper') },
    { code: 'SM-00015', qty: 30, name: 'Лампа галогенная Philips H4 Vision +30% 12 В 60/55 Вт', sku: '12342PRC1', alt: ['лампа h4', 'лампочка фара'], cat: 'c-misc', maker: 'Philips, Нидерланды', brand: 'Philips', unit: 'шт', attrs: { type: 'H4', spec: '12 В, 60/55 Вт' }, buy: 38000, extra: 1000, buyCur: 'UZS', price: 55000, cur: 'UZS', min: 10, photo: img('bulb') },
  ];
  // артикулы и фото пяти первых товаров (у людей в браузере они остались без них)
  const OLD5 = { 'SM-00001': ['Michelin Primacy 4', '263385', 'tire-summer'], 'SM-00002': ['Hankook Kinergy Eco 2', '1013434', 'tire-summer'], 'SM-00003': ['Nokian Hakkapeliitta R5', 'T430512', 'tire-winter'],
    'SM-00004': ['Масло моторное Shell Helix HX7', '550053737', 'oil'], 'SM-00005': ['Фильтр масляный MANN W 712/75', 'W 712/75', 'oil-filter'] };
  const SUPPLIER = { kind: 'supplier', type: 'legal', name: 'ООО «AvtoTrade Supply»', contact: 'Шерзод Каримов', phone: '+998 71 205-44-80', address: 'г. Ташкент, Сергелийский р-н, ул. Янги Сергели, 15', inn: '307 554 219', bank: 'АКБ «Hamkorbank»', mfo: '00083', account: '2020 8000 4051 7730 2001', sellerId: '', comment: 'Шины, диски, АКБ, расходники' };
  const MIG = '2026-10-22-products';

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

    // 5 товаров на складе, 10 приходят поступлением (SM.migrate)
    db.products = [
      { id: 'pr1', code: 'SM-00001', sku: '263385', photo: 'assets/img/products/tire-summer.webp', oldCode: '1C-004512', name: 'Michelin Primacy 4 205/55 R16 91V', alt: ['мишлен 205 55 16', 'Primacy4'], cat: 'c-t-summer', maker: 'Michelin, Франция', brand: 'Michelin', unit: 'шт', attrs: T('205/55 R16', 'Летняя', 'Primacy 4', '91V'), buy: 1080000, buyCur: 'UZS', extra: 25000, price: 1450000, cur: 'UZS', min: 4 },
      { id: 'pr2', code: 'SM-00002', sku: '1013434', photo: 'assets/img/products/tire-summer.webp', oldCode: '1C-004577', name: 'Hankook Kinergy Eco 2 195/65 R15 91H', alt: ['ханкук 195 65 15', 'шина нексия 15'], cat: 'c-t-summer', maker: 'Hankook, Корея', brand: 'Hankook', unit: 'шт', attrs: T('195/65 R15', 'Летняя', 'Kinergy Eco 2', '91H'), buy: 560000, buyCur: 'UZS', extra: 15000, price: 780000, cur: 'UZS', min: 8 },
      { id: 'pr3', code: 'SM-00003', sku: 'T430512', photo: 'assets/img/products/tire-winter.webp', oldCode: '1C-005101', name: 'Nokian Hakkapeliitta R5 205/55 R16 94R', alt: ['нокиан хакка 205 55 16', 'липучка'], cat: 'c-t-winter', maker: 'Nokian Tyres, Финляндия', brand: 'Nokian', unit: 'шт', attrs: T('205/55 R16', 'Зимняя', 'Hakkapeliitta R5', '94R'), buy: 98, buyCur: 'USD', extra: 4, price: 135, cur: 'USD', min: 4 },
      { id: 'pr4', code: 'SM-00004', sku: '550053737', photo: 'assets/img/products/oil.webp', oldCode: '1C-020011', name: 'Масло моторное Shell Helix HX7 10W-40, 4 л', alt: ['шелл 10w40', 'полусинтетика 4л'], cat: 'c-oil', maker: 'Shell, Нидерланды', brand: 'Shell', unit: 'кан', attrs: { volume: '4 л', type: 'Полусинтетика', spec: 'API SN/CF' }, buy: 270000, buyCur: 'UZS', extra: 6000, price: 370000, cur: 'UZS', min: 6 },
      { id: 'pr5', code: 'SM-00005', sku: 'W 712/75', photo: 'assets/img/products/oil-filter.webp', oldCode: '1C-010211', name: 'Фильтр масляный MANN W 712/75', alt: ['масляный фильтр нексия', 'фильтр масла кобальт', 'W712/75'], cat: 'c-p-filters', maker: 'MANN-FILTER, Германия', brand: 'MANN', unit: 'шт', attrs: { oem: '96879797', fits: 'Nexia, Cobalt, Lacetti' }, buy: 52000, buyCur: 'UZS', extra: 2000, price: 78000, cur: 'UZS', min: 10 },
    ].concat(JSON.parse(JSON.stringify(NEW10)).map(({ qty, ...p }, i) => Object.assign(p, { id: 'pr' + (i + 6), oldCode: '' }))).map((p) => Object.assign(p, { vat: 12, comment: '', active: true, createdAt: at(-40) }));

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
      Object.assign({ id: 'sup1', opening: 0 }, SUPPLIER),
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
      N('n1', 0, 10, 26, 'pay', 'Оплата на подтверждение', '№ 2 · Азиз Рахимов · 5 800 000 сум · наличные', '#/accounting', ['accountant', 'admin']),
      N('n2', 0, 10, 25, 'sale', 'Новая продажа № 2', 'Азиз Рахимов · 5 800 000 сум', '#/sales/s-2', ['admin', 'head', 'storekeeper']),
      N('n3', -1, 15, 0, 'ship', 'Готово к отгрузке · № 1', 'ООО «Toshkent Taxi Servis» · доставка ДС-0001', '#/sales/s-1', ['admin', 'courier'], ['u-sel1']),
      N('n4', -1, 14, 30, 'payok', 'Оплата подтверждена · № 1', 'ООО «Toshkent Taxi Servis» · 3 432 000 сум', '#/sales/s-1', ['admin'], ['u-sel1'], ['u-admin']),
    ];
    const HI = (id, d, h, m, uid, action, entity, entityId, detail) => ({ id, at: at(d, h, m), uid, uname: (db.users.find((u) => u.id === uid) || {}).name, action, entity, entityId, detail });
    db.history = [
      HI('h1', -30, 9, 0, 'u-admin', 'Ввод начальных остатков', 'stock', null, '5 товаров на 2 точках'),
      HI('h2', -2, 10, 0, 'u-buh', 'Расход', 'expense', 'e1', 'Аренда склада за месяц · $800,00'),
      HI('h3', -1, 9, 0, 'u-buh', 'Расход', 'expense', 'e2', 'Топливо для Damas · 450 000 сум'),
      HI('h4', -1, 11, 10, 'u-sel1', 'Создана продажа', 'sale', 's-1', '№ 1 · проведена'),
      HI('h5', -1, 14, 30, 'u-buh', 'Оплата подтверждена', 'payment', 'pay1', '3 432 000 сум · № 1'),
      HI('h6', -1, 15, 0, 'u-sklad', 'Готово к отгрузке', 'sale', 's-1', '№ 1'),
      HI('h7', 0, 9, 0, 'u-buh', 'Установлен курс $', 'rate', null, 'наличный 12660, безналичный 12715, перечисление 12735'),
      HI('h8', 0, 10, 25, 'u-sel1', 'Создана продажа', 'sale', 's-2', '№ 2 · проведена'),
    ];
    return db;
  };

  /* Аддитивная миграция «10 товаров + поступление» (v2026-10-22.12) — один раз на базу, отметка db.migrations[MIG].
     Данные людей не трогает: недостающие товары добавляет по коду/названию (код занят чужим товаром — следующий свободный),
     артикул ставит только пустому и не занятому (занят — запись в консоль), поставщика — если нет по имени,
     поступление создаёт и проводит через SM.ops.saveReceipt, как кнопка «Провести» (остатки и «Движение товара» согласованы).
     Поступление с r.mig === MIG уже есть — второе не создаётся. Возвращает отчёт или null, если уже сделано. */
  SM.migrate = function () {
    const db = SM.db;
    if (!db || (db.migrations && db.migrations[MIG])) return null;
    const user0 = SM.user;
    // операции пишут автора — без входа (загрузка, страница входа) это администратор базы
    if (!SM.user) SM.user = db.users.find((u) => u.role === 'admin' && u.active !== false) || db.users[0];
    const rep = { added: [], sku: [], skipped: [], receipt: null };
    // операции сохраняют после каждого шага — здесь одно сохранение в конце (первая загрузка не тормозит)
    const save0 = SM.save; SM.save = () => {};
    try {
      const byName = (n) => db.products.find((p) => String(p.name).toLowerCase() === n.toLowerCase());
      Object.entries(OLD5).forEach(([code, [name, sku, ph]]) => {
        const p = db.products.find((x) => x.code === code && String(x.name).startsWith(name));
        if (!p) return;
        const patch = {};
        if (!p.photo) patch.photo = img(ph);
        if (!p.sku) { const o = SM.skuOwner(sku, p.id); if (o) { rep.skipped.push(code + ' артикул ' + sku); console.warn('Миграция ' + MIG + ': артикул ' + sku + ' занят товаром ' + o.code + ' — у ' + code + ' не ставлю'); } else { patch.sku = sku; rep.sku.push(code); } }
        if (Object.keys(patch).length) SM.ops.saveProduct(Object.assign({ id: p.id, name: p.name }, patch));
      });
      // сначала товары со свободным кодом, потом те, чей код занят чужим товаром (им — следующий свободный)
      const ids = {}, later = [];
      const add = (d, code) => {
        const { qty, sku, ...p } = JSON.parse(JSON.stringify(d));
        const o = SM.skuOwner(sku);
        if (o) { rep.skipped.push(d.name + ' артикул ' + sku); console.warn('Миграция ' + MIG + ': артикул ' + sku + ' занят товаром ' + o.code + ' — у «' + d.name + '» не ставлю'); }
        const x = SM.ops.saveProduct(Object.assign({}, p, { code, sku: o ? '' : sku, oldCode: '', vat: 12, comment: '', active: true }));
        rep.added.push(x.code); return x;
      };
      NEW10.forEach((d) => {
        const own = byName(d.name);
        if (own) { ids[d.code] = own.id; if (!own.sku && !SM.skuOwner(d.sku, own.id)) { SM.ops.saveProduct({ id: own.id, name: own.name, sku: d.sku }); rep.sku.push(own.code); } return; }
        if (db.products.some((p) => p.code === d.code)) later.push(d); else ids[d.code] = add(d, d.code).id;
      });
      later.forEach((d) => (ids[d.code] = add(d, SM.nextProductCode()).id));
      let sup = db.clients.find((c) => String(c.name).toLowerCase() === SUPPLIER.name.toLowerCase());
      if (!sup) sup = SM.ops.saveClient(Object.assign({}, SUPPLIER));
      if (!db.receipts.some((r) => r.mig === MIG)) {
        const w = db.points.find((p) => p.id === 'w1') || db.points.find((p) => p.type === 'warehouse') || db.points[0];
        const rate = SM.rate('bank');
        // строки — как при подборе в окне «Новое поступление»: цены переводятся в валюту поступления (сум)
        const k = (v, c) => Math.round(SM.conv(v, c || 'UZS', 'UZS', rate) * 100) / 100;
        const items = NEW10.map((d) => { const p = SM.product(ids[d.code]); return { productId: p.id, qty: d.qty, buy: k(p.buy, p.buyCur), extra: k(p.extra || 0, p.buyCur), price: k(p.price, p.cur) }; });
        const r = SM.ops.saveReceipt({ date: D.todayISO(), supplierId: sup.id, pointId: w.id, cur: 'UZS', rate, vat: false, items, comment: 'Оприходование новых товаров' }, true);
        r.mig = MIG; rep.receipt = r.no;
      }
      db.migrations = Object.assign({}, db.migrations, { [MIG]: new Date().toISOString() });
    } finally { SM.save = save0; SM.user = user0; }
    SM.lowWatch(true); // оприходование при первой загрузке — без пачки уведомлений
    SM.save();
    return rep;
  };
})();
