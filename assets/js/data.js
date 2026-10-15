/* =========================================================
   SM AVTO BASE — демо-данные.
   Ровно 5 тестовых продаж (по одной на ключевые статусы),
   2 поступления, 2 перемещения, 6 расходов, 3 доставки.
   Даты считаются от «сегодня», при открытии через день сдвигаются.
   ========================================================= */
(function () {
  'use strict';
  const SM = window.SM;
  const D = SM.d;

  SM.seed = function () {
    // утром события «сегодня» (до 11:15) оказались бы в будущем — тогда сжимаем их в последние ~40 минут, сохраняя порядок
    const early = Date.now() < D.today().getTime() + 11.5 * 3600e3;
    const at = (d, h = 10, m = 0) => (d === 0 && early ? new Date(Date.now() - ((24 * 60 - (h * 60 + m)) / 24) * 60000).toISOString() : D.at(d, h, m));
    const day = (d) => D.iso(D.addDays(D.today(), d));
    const db = { version: SM.DB_VERSION, demo: true, baseDay: D.todayISO(), rev: 0, counters: { 'СП': 5, 'ПТ': 2, 'ПМ': 2, 'ДС': 3, 'СЧ': 1, 'СФ': 1, 'ТЧ': 1, 'АС': 1 } };

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
      { id: 'p1', name: 'Магазин «Чиланзар»', type: 'shop', address: 'г. Ташкент, Чиланзарский р-н, ул. Бунёдкор, 12', phone: '+998 71 200-07-01', active: true },
      { id: 'p2', name: 'Магазин «Юнусабад»', type: 'shop', address: 'г. Ташкент, Юнусабадский р-н, ул. Амира Темура, 108', phone: '+998 71 200-07-02', active: true },
      { id: 'p3', name: 'Магазин «Сергели»', type: 'shop', address: 'г. Ташкент, Сергелийский р-н, ул. Янги Сергели, 5', phone: '+998 71 200-07-03', active: true },
      { id: 'p4', name: 'Магазин «Самарканд»', type: 'shop', address: 'г. Самарканд, ул. Рудаки, 41', phone: '+998 66 233-07-04', active: true },
      { id: 'w1', name: 'Центральный склад', type: 'warehouse', address: 'г. Ташкент, Яшнабадский р-н, ул. Махтумкули, 87', phone: '+998 71 200-07-10', active: true },
      { id: 'w2', name: 'Склад «Куйлюк»', type: 'warehouse', address: 'г. Ташкент, рынок «Куйлюк», павильон 14', phone: '+998 71 200-07-11', active: true },
    ];

    db.categories = [
      { id: 'c-tires', name: 'Шины' }, { id: 'c-t-summer', name: 'Летние шины', parent: 'c-tires' }, { id: 'c-t-winter', name: 'Зимние шины', parent: 'c-tires' },
      { id: 'c-t-all', name: 'Всесезонные шины', parent: 'c-tires' }, { id: 'c-t-truck', name: 'Грузовые шины', parent: 'c-tires' },
      { id: 'c-wheels', name: 'Диски' },
      { id: 'c-parts', name: 'Автозапчасти' }, { id: 'c-p-filters', name: 'Фильтры', parent: 'c-parts' }, { id: 'c-p-brakes', name: 'Тормозная система', parent: 'c-parts' },
      { id: 'c-p-susp', name: 'Подвеска', parent: 'c-parts' }, { id: 'c-p-engine', name: 'Двигатель', parent: 'c-parts' },
      { id: 'c-oil', name: 'Масла и жидкости' }, { id: 'c-acc', name: 'Аккумуляторы' }, { id: 'c-misc', name: 'Сопутствующие товары' },
    ];

    // [id, старый код, название, альтернативные названия, категория, производитель, бренд, ед., характеристики, закупка, валюта, доп.расходы, цена, мин.остаток]
    const T = (size, season, model, index) => { const m = size.match(/(\d+)\/(\d+)\s*(R[\d.]+)/); return { size, width: m[1], profile: m[2], radius: m[3], season, model, index }; };
    const P = [
      ['pr1', '1C-004512', 'Michelin Primacy 4 205/55 R16 91V', ['мишлен 205 55 16', 'Primacy4'], 'c-t-summer', 'Michelin, Франция', 'Michelin', 'шт', T('205/55 R16', 'Летняя', 'Primacy 4', '91V'), 1080000, 'UZS', 25000, 1450000, 'UZS', 8],
      ['pr2', '1C-004530', 'Bridgestone Turanza T005 215/60 R16 95V', ['бриджстоун 215 60 16'], 'c-t-summer', 'Bridgestone, Япония', 'Bridgestone', 'шт', T('215/60 R16', 'Летняя', 'Turanza T005', '95V'), 1020000, 'UZS', 25000, 1390000, 'UZS', 8],
      ['pr3', '1C-004577', 'Hankook Kinergy Eco 2 195/65 R15 91H', ['ханкук 195 65 15', 'шина нексия 15'], 'c-t-summer', 'Hankook, Корея', 'Hankook', 'шт', T('195/65 R15', 'Летняя', 'Kinergy Eco 2', '91H'), 560000, 'UZS', 15000, 780000, 'UZS', 12],
      ['pr4', '1C-005101', 'Nokian Hakkapeliitta R5 205/55 R16 94R', ['нокиан хакка 205 55 16', 'липучка'], 'c-t-winter', 'Nokian Tyres, Финляндия', 'Nokian', 'шт', T('205/55 R16', 'Зимняя', 'Hakkapeliitta R5', '94R'), 98, 'USD', 4, 135, 'USD', 8],
      ['pr5', '1C-005122', 'Continental IceContact 3 215/65 R16 102T', ['конти шипы 215 65 16'], 'c-t-winter', 'Continental, Германия', 'Continental', 'шт', T('215/65 R16', 'Зимняя (шипы)', 'IceContact 3', '102T'), 104, 'USD', 4, 142, 'USD', 8],
      ['pr6', '1C-004610', 'Kumho Solus TA31 185/65 R15 88H', ['кумхо 185 65 15', 'шина кобальт'], 'c-t-all', 'Kumho, Корея', 'Kumho', 'шт', T('185/65 R15', 'Всесезонная', 'Solus TA31', '88H'), 430000, 'UZS', 15000, 610000, 'UZS', 12],
      ['pr7', '1C-004702', 'Yokohama Geolandar A/T G015 245/70 R16 111H', ['йокохама 245 70 16', 'шина внедорожник'], 'c-t-all', 'Yokohama, Япония', 'Yokohama', 'шт', T('245/70 R16', 'Всесезонная', 'Geolandar A/T G015', '111H'), 1250000, 'UZS', 30000, 1690000, 'UZS', 4],
      ['pr8', '1C-004715', 'Triangle TR259 225/60 R17 103V', ['триангл 225 60 17'], 'c-t-all', 'Triangle, Китай', 'Triangle', 'шт', T('225/60 R17', 'Всесезонная', 'TR259', '103V'), 610000, 'UZS', 15000, 840000, 'UZS', 8],
      ['pr9', '1C-003320', 'Кама Евро-236 185/60 R14 82H', ['кама 14', 'шина дамас'], 'c-t-summer', 'Нижнекамскшина, Россия', 'Кама', 'шт', T('185/60 R14', 'Летняя', 'Евро-236', '82H'), 330000, 'UZS', 10000, 455000, 'UZS', 8],
      ['pr10', '1C-006010', 'Triangle TR685 315/80 R22.5 156/150L', ['грузовая 315 80 22.5', 'шина исузу'], 'c-t-truck', 'Triangle, Китай', 'Triangle', 'шт', T('315/80 R22.5', 'Всесезонная', 'TR685', '156/150L'), 205, 'USD', 10, 265, 'USD', 6],
      ['pr11', '1C-007104', 'Диск литой K&K Сканди R15 6×15 4×100 ET45', ['литьё 15 нексия', 'диск кобальт'], 'c-wheels', 'K&K, Россия', 'K&K', 'шт', { size: 'R15 6J', pcd: '4×100', et: 'ET45', dia: '60.1' }, 520000, 'UZS', 10000, 720000, 'UZS', 8],
      ['pr12', '1C-007150', 'Диск штампованный Accuride R14 5.5J 4×98', ['штамповка 14'], 'c-wheels', 'Accuride, Россия', 'Accuride', 'шт', { size: 'R14 5.5J', pcd: '4×98', et: 'ET35', dia: '58.6' }, 210000, 'UZS', 5000, 300000, 'UZS', 8],
      ['pr13', '1C-010211', 'Фильтр масляный MANN W 712/75', ['масляный фильтр нексия', 'фильтр масла кобальт', 'W712/75'], 'c-p-filters', 'MANN-FILTER, Германия', 'MANN', 'шт', { oem: '96879797', fits: 'Nexia, Cobalt, Lacetti' }, 52000, 'UZS', 2000, 78000, 'UZS', 15],
      ['pr14', '1C-010245', 'Фильтр воздушный MANN C 2295', ['воздушник', 'фильтр воздуха ласетти'], 'c-p-filters', 'MANN-FILTER, Германия', 'MANN', 'шт', { oem: '96553450', fits: 'Lacetti, Gentra' }, 64000, 'UZS', 2000, 95000, 'UZS', 10],
      ['pr15', '1C-011030', 'Колодки тормозные передние Brembo P 59 069', ['колодки передние нексия', 'тормозные колодки ласетти', 'P59069'], 'c-p-brakes', 'Brembo, Италия', 'Brembo', 'компл', { oem: '96534653', fits: 'Nexia, Lacetti, Gentra' }, 210000, 'UZS', 5000, 315000, 'UZS', 8],
      ['pr16', '1C-011102', 'Диск тормозной TRW DF4180', ['тормозной диск кобальт'], 'c-p-brakes', 'TRW, Германия', 'TRW', 'шт', { oem: '13502051', fits: 'Cobalt, Spark' }, 290000, 'UZS', 5000, 420000, 'UZS', 6],
      ['pr17', '1C-012044', 'Амортизатор передний KYB Excel-G 333419', ['стойка передняя нексия', 'амортизатор джентра'], 'c-p-susp', 'KYB, Япония', 'KYB', 'шт', { oem: '96407818', fits: 'Lacetti, Gentra' }, 380000, 'UZS', 8000, 560000, 'UZS', 6],
      ['pr18', '1C-013005', 'Свеча зажигания NGK BKR6E', ['свечи спарк', 'свеча дамас', 'BKR6E'], 'c-p-engine', 'NGK, Япония', 'NGK', 'шт', { oem: '96130723', fits: 'Damas, Spark, Nexia' }, 28000, 'UZS', 1000, 45000, 'UZS', 30],
      ['pr19', '1C-013090', 'Ремень ГРМ Gates 5491XS', ['ремень грм нексия 16 кл'], 'c-p-engine', 'Gates, Бельгия', 'Gates', 'шт', { oem: '96352763', fits: 'Nexia 16V, Lacetti 1.6' }, 160000, 'UZS', 4000, 245000, 'UZS', 6],
      ['pr20', '1C-020011', 'Масло моторное Shell Helix HX7 10W-40, 4 л', ['шелл 10w40', 'полусинтетика 4л'], 'c-oil', 'Shell, Нидерланды', 'Shell', 'кан', { volume: '4 л', type: 'Полусинтетика', spec: 'API SN/CF' }, 270000, 'UZS', 6000, 370000, 'UZS', 12],
      ['pr21', '1C-020040', 'Масло моторное Mobil Super 3000 5W-40, 4 л', ['мобил 5w40', 'синтетика 4л'], 'c-oil', 'ExxonMobil, США', 'Mobil', 'кан', { volume: '4 л', type: 'Синтетика', spec: 'API SN' }, 390000, 'UZS', 6000, 520000, 'UZS', 10],
      ['pr22', '1C-020101', 'Антифриз Felix Carbox G12+, 5 кг', ['тосол красный', 'антифриз g12'], 'c-oil', 'Тосол-Синтез, Россия', 'Felix', 'кан', { volume: '5 кг', type: 'G12+' }, 115000, 'UZS', 3000, 165000, 'UZS', 10],
      ['pr23', '1C-030020', 'Аккумулятор Varta Blue Dynamic 60 А·ч E43', ['варта 60', 'акб 60'], 'c-acc', 'Varta, Германия', 'Varta', 'шт', { capacity: '60 А·ч', current: '540 А', polarity: 'обратная' }, 72, 'USD', 3, 95, 'USD', 4],
      ['pr24', '1C-040015', 'Щётка стеклоочистителя Bosch Aerotwin 600 мм', ['дворник 60 см', 'щетка бош'], 'c-misc', 'Bosch, Германия', 'Bosch', 'шт', { length: '600 мм', type: 'бескаркасная' }, 95000, 'UZS', 2000, 140000, 'UZS', 10],
      ['pr25', '1C-040120', 'Грузики балансировочные самоклеящиеся 5 г (уп. 100 шт)', ['грузики 5г', 'балансировка'], 'c-misc', 'Hofmann, Германия', 'Hofmann', 'уп', { weight: '5 г', qty: '100 шт' }, 45000, 'UZS', 1000, 70000, 'UZS', 5],
    ];
    db.products = P.map((p, i) => ({
      id: p[0], code: 'SM-' + String(i + 1).padStart(5, '0'), oldCode: p[1], name: p[2], alt: p[3], cat: p[4], maker: p[5], brand: p[6], unit: p[7], attrs: p[8],
      buy: p[9], buyCur: p[10], extra: p[11], price: p[12], cur: p[13], vat: 12, min: p[14], comment: '', active: true, createdAt: at(-40),
    }));

    /* начальные остатки по точкам: [w1, w2, p1, p2, p3, p4] */
    const INIT = {
      pr1: [18, 6, 4, 6, 2, 2], pr2: [12, 4, 2, 2, 2, 0], pr3: [36, 12, 0, 6, 4, 4], pr4: [6, 2, 2, 2, 0, 0], pr5: [10, 4, 2, 0, 2, 2], pr6: [24, 8, 6, 8, 4, 4],
      pr7: [6, 2, 0, 2, 0, 0], pr8: [14, 4, 2, 2, 2, 2], pr9: [2, 0, 2, 0, 2, 0], pr10: [4, 2, 0, 0, 0, 0], pr11: [16, 8, 4, 4, 0, 4], pr12: [20, 8, 4, 4, 4, 0],
      pr13: [30, 20, 6, 10, 6, 6], pr14: [24, 10, 6, 6, 4, 4], pr15: [10, 6, 4, 2, 2, 2], pr16: [2, 0, 2, 0, 0, 0], pr17: [8, 4, 2, 2, 0, 2], pr18: [40, 20, 20, 16, 10, 10],
      pr19: [10, 4, 2, 2, 2, 0], pr20: [30, 12, 8, 4, 4, 4], pr21: [16, 8, 4, 4, 2, 2], pr22: [20, 10, 6, 6, 4, 4], pr23: [2, 0, 0, 1, 0, 0], pr24: [20, 10, 6, 6, 4, 4], pr25: [8, 4, 2, 2, 2, 2],
    };
    const PTS = ['w1', 'w2', 'p1', 'p2', 'p3', 'p4'];
    db.moves = [];
    let mvN = 0;
    const mv = (productId, pointId, qty, kind, doc, when, by = 'u-sklad') => db.moves.push({ id: 'mv' + ++mvN, at: when, productId, pointId, qty, kind, doc, by });
    Object.entries(INIT).forEach(([pid, arr]) => arr.forEach((q, i) => { if (q) mv(pid, PTS[i], q, 'initial', 'Ввод начальных остатков', at(-30, 9), 'u-admin'); }));

    const pass = { admin: 'f17e56fcb58b600b971107964e5643027e01379d17125cafcd90f29b2c3fe82d', rukovoditel: '42bb98b6d919c2e499ab9eed72cc23c88c8e6d71dec7908da786178517b37e54',
      prodavec: '8be7a0665494ad27f5456f2ffe4ab54f808a3f00031b974289b74e1e2222af32', prodavec2: 'aaac5b9aa65d06c7e114071118aac131951e7e3c1be919e5347ecf5c1762bd33',
      sklad: '715a0b0cad7b27de77bd89c9c2fe666cc5371f0c64737b7838483b735f77c500', buhgalter: 'b908e1fe2765c1faa894f0cc76064044aae28a238f82d2b5af189e7d5e0e4194',
      dostavka: 'd91c365808875c1fc0ebf26a0fd50dae39e97192203d3aaf6c4f68569863e367' };
    db.users = [
      { id: 'u-admin', login: 'admin', name: 'Тимур Асадов', role: 'admin', phone: '+998 90 100-00-01', points: [], active: true },
      { id: 'u-head', login: 'rukovoditel', name: 'Рустам Сайфуллаев', role: 'head', phone: '+998 90 100-00-02', points: [], active: true },
      { id: 'u-sel1', login: 'prodavec', name: 'Камола Иргашева', role: 'seller', phone: '+998 90 100-00-03', points: ['p1', 'w1'], active: true },
      { id: 'u-sel2', login: 'prodavec2', name: 'Дониёр Хакимов', role: 'seller', phone: '+998 90 100-00-04', points: ['p2'], active: true },
      { id: 'u-sklad', login: 'sklad', name: 'Бекзод Турсунов', role: 'storekeeper', phone: '+998 90 100-00-05', points: ['w1', 'p1', 'p2'], active: true },
      { id: 'u-buh', login: 'buhgalter', name: 'Нилуфар Абдуллаева', role: 'accountant', phone: '+998 90 100-00-06', points: [], active: true },
      { id: 'u-dost', login: 'dostavka', name: 'Улугбек Мирзаев', role: 'courier', phone: '+998 90 100-00-07', points: [], active: true },
    ].map((u) => Object.assign(u, { passHash: pass[u.login], createdAt: at(-60), lastLogin: null }));

    db.clients = [
      { id: 'c1', kind: 'client', type: 'legal', name: 'ООО «Toshkent Taxi Servis»', contact: 'Бахтиёр Назаров', phone: '+998 90 123-45-67', address: 'г. Ташкент, ул. Шота Руставели, 41', inn: '305 112 448', bank: 'АКБ «Капиталбанк»', mfo: '01088', account: '2020 8000 9051 2345 6001', sellerId: 'u-sel1', opening: 0, comment: 'Таксопарк, 120 машин: шины и расходники' },
      { id: 'c2', kind: 'client', type: 'person', name: 'Азиз Рахимов', contact: '', phone: '+998 93 555-12-90', address: 'г. Ташкент, Юнусабад, 14-квартал, д. 22', inn: '', bank: '', mfo: '', account: '', sellerId: 'u-sel2', opening: 0, comment: '' },
      { id: 'c3', kind: 'client', type: 'legal', name: 'ООО «UzAvtoTrans Logistic»', contact: 'Отабек Юлдашев', phone: '+998 71 207-33-10', address: 'г. Ташкент, Сергели, ул. Янги Йул, 7', inn: '306 448 901', bank: 'АКБ «Ипотека-банк»', mfo: '00873', account: '2020 8000 3004 4890 1002', sellerId: 'u-sel1', opening: 4200000, comment: 'Грузовой парк. Перечисление, отсрочка 14 дней' },
      { id: 'c4', kind: 'client', type: 'person', name: 'Дилноза Юсупова', contact: '', phone: '+998 97 701-44-02', address: 'г. Ташкент, Мирзо-Улугбекский р-н, ул. Буюк Ипак Йули, 156, кв. 31', inn: '', bank: '', mfo: '', account: '', sellerId: 'u-sel1', opening: 0, comment: 'Заказывает через сайт' },
      { id: 'c5', kind: 'client', type: 'person', name: 'Шерзод Алиев', contact: '', phone: '+998 99 830-21-77', address: 'г. Ташкент, Юнусабад, 9-квартал', inn: '', bank: '', mfo: '', account: '', sellerId: 'u-sel2', opening: 0, comment: '' },
      { id: 'c6', kind: 'client', type: 'legal', name: 'ИП «Каримов Ж.»', contact: 'Жасур Каримов', phone: '+998 90 940-11-25', address: 'г. Самарканд, ул. Рудаки, 30', inn: '512 004 337', bank: 'АКБ «Хамкорбанк»', mfo: '00083', account: '2020 8000 7001 2233 4001', sellerId: 'u-sel1', opening: 1850000, comment: 'Шиномонтаж. Долг перенесён из старой программы' },
      { id: 'c7', kind: 'client', type: 'legal', name: 'СП «Samarqand Motors»', contact: 'Ильхом Рашидов', phone: '+998 66 233-50-50', address: 'г. Самарканд, ул. Дагбитская, 18', inn: '204 557 120', bank: 'НБУ', mfo: '00450', account: '2020 8000 4005 5712 0001', sellerId: 'u-sel2', opening: 0, comment: '' },
      { id: 'c8', kind: 'client', type: 'legal', name: 'ООО «Express Delivery Uz»', contact: 'Мадина Хасанова', phone: '+998 71 230-88-99', address: 'г. Ташкент, ул. Нукус, 74', inn: '307 900 412', bank: 'АКБ «Асакабанк»', mfo: '00873', account: '2020 8000 2009 0041 2001', sellerId: 'u-sel1', opening: 0, comment: 'Курьерская служба (сторонняя доставка)' },
      { id: 's1', kind: 'supplier', type: 'legal', name: 'ООО «Tyre Import Group»', contact: 'Сергей Ким', phone: '+998 71 150-40-40', address: 'г. Ташкент, ул. Мукими, 166', inn: '302 881 004', bank: 'АКБ «Капиталбанк»', mfo: '01088', account: '2020 8000 1088 1004 0001', sellerId: null, opening: -38000000, comment: 'Шины: Nokian, Continental, Triangle (в $)' },
      { id: 's2', kind: 'supplier', type: 'legal', name: 'ООО «AutoParts Distribution»', contact: 'Фаррух Исмоилов', phone: '+998 71 140-12-12', address: 'г. Ташкент, ул. Фаробий, 2', inn: '303 117 556', bank: 'АКБ «Хамкорбанк»', mfo: '00083', account: '2020 8000 3117 5560 0001', sellerId: null, opening: -6500000, comment: 'Фильтры, тормоза, подвеска' },
      { id: 's3', kind: 'supplier', type: 'legal', name: 'ООО «Lubricant Trade»', contact: 'Анвар Тошев', phone: '+998 71 120-77-55', address: 'г. Ташкент, ул. Бабура, 45', inn: '303 445 900', bank: 'НБУ', mfo: '00450', account: '2020 8000 4459 0000 0001', sellerId: null, opening: 0, comment: 'Масла и жидкости' },
    ].map((c) => Object.assign(c, { createdAt: at(-60) }));

    db.drivers = [{ id: 'dr1', name: 'Ахмад Каримов', phone: '+998 90 311-22-33', active: true }, { id: 'dr2', name: 'Сардор Олимов', phone: '+998 93 402-55-61', active: true }, { id: 'dr3', name: 'Нодир Рахматов', phone: '+998 94 650-17-08', active: true }];
    db.cars = [{ id: 'car1', model: 'Chevrolet Damas', plate: '01 A 412 BC', active: true }, { id: 'car2', model: 'Chevrolet Labo', plate: '01 B 778 DA', active: true }, { id: 'car3', model: 'Isuzu NQR 71', plate: '01 C 905 EA', active: true }];

    db.rates = [
      { id: 'rt1', at: at(-7, 9), cash: 12620, card: 12680, bank: 12700, by: 'u-buh' },
      { id: 'rt2', at: at(-3, 9), cash: 12640, card: 12700, bank: 12720, by: 'u-buh' },
      { id: 'rt3', at: at(0, 9), cash: 12660, card: 12715, bank: 12735, by: 'u-buh' },
    ];

    /* ---------- Поступления ---------- */
    db.receipts = [
      { id: 'r1', no: 'ПТ-0001', date: day(-6), supplierId: 's1', pointId: 'w1', cur: 'USD', rate: 12700, vat: true, status: 'posted', by: 'u-sklad', createdAt: at(-6, 11), postedAt: at(-6, 11, 30),
        items: [{ productId: 'pr4', qty: 20, buy: 98, extra: 4, price: 135 }, { productId: 'pr10', qty: 12, buy: 205, extra: 10, price: 265 }], comment: 'Контейнер №TGIU 4471205, ГТД 26100/11.10/0045812', files: ['ГТД_0045812.pdf', 'Инвойс_TIG-2210.pdf'] },
      { id: 'r2', no: 'ПТ-0002', date: day(-3), supplierId: 's2', pointId: 'w1', cur: 'UZS', rate: 12720, vat: true, status: 'posted', by: 'u-sklad', createdAt: at(-3, 10), postedAt: at(-3, 10, 40),
        items: [{ productId: 'pr13', qty: 40, buy: 52000, extra: 2000, price: 78000 }, { productId: 'pr15', qty: 20, buy: 210000, extra: 5000, price: 315000 }, { productId: 'pr18', qty: 60, buy: 28000, extra: 1000, price: 45000 }], comment: 'Накладная поставщика № 1187', files: ['Накладная_1187.jpg'] },
    ];
    db.receipts.forEach((r) => r.items.forEach((l) => mv(l.productId, r.pointId, l.qty, 'receipt', r.no, r.postedAt)));

    /* ---------- Перемещения ---------- */
    db.transfers = [
      { id: 't1', no: 'ПМ-0001', date: day(-4), from: 'w1', to: 'p1', items: [{ productId: 'pr3', qty: 8 }, { productId: 'pr13', qty: 10 }], responsible: 'u-sklad', comment: 'Пополнение витрины', status: 'accepted', by: 'u-sklad',
        history: [{ at: at(-4, 9), uid: 'u-sklad', text: 'Создано' }, { at: at(-4, 9, 30), uid: 'u-sklad', text: 'Отправлено' }, { at: at(-4, 13), uid: 'u-sel1', text: 'Принято' }] },
      { id: 't2', no: 'ПМ-0002', date: day(0), from: 'w1', to: 'p2', items: [{ productId: 'pr1', qty: 6 }, { productId: 'pr20', qty: 6 }], responsible: 'u-sklad', comment: 'Под заказы магазина', status: 'sent', by: 'u-sklad',
        history: [{ at: at(0, 8, 20), uid: 'u-sklad', text: 'Создано' }, { at: at(0, 8, 45), uid: 'u-sklad', text: 'Отправлено' }] },
    ];
    db.transfers[0].items.forEach((l) => { mv(l.productId, 'w1', -l.qty, 'transfer-out', 'ПМ-0001', at(-4, 13)); mv(l.productId, 'p1', l.qty, 'transfer-in', 'ПМ-0001', at(-4, 13)); });

    /* ---------- 5 тестовых продаж ---------- */
    const H = (d, h, m, uid, text) => ({ at: at(d, h, m), uid, text });
    db.sales = [
      { id: 's-1', no: 'СП-0001', date: day(-5), createdAt: at(-5, 10), clientId: 'c1', sellerId: 'u-sel1', pointId: 'w1', source: 'office',
        items: [{ productId: 'pr3', qty: 8, price: 780000, disc: 5 }, { productId: 'pr13', qty: 10, price: 78000, disc: 0 }], docDisc: 0, cur: 'UZS', rateType: 'bank', rate: 12720, vat: true,
        receive: 'delivery', credit: false, due: null, comment: 'Сезонная замена для 2 машин парка', state: 'done', postedAt: at(-5, 10, 20), readyAt: at(-4, 12), shippedAt: at(-4, 15), doneAt: at(-4, 17, 30),
        history: [H(-5, 10, 0, 'u-sel1', 'Создана'), H(-5, 10, 20, 'u-sel1', 'Проведена, товар списан с точки «Центральный склад»'), H(-5, 10, 21, 'u-sel1', 'Оплата 6 708 000 сум · Перечисление на р/с — на проверке'), H(-4, 11, 5, 'u-buh', 'Оплата подтверждена: 6 708 000 сум'), H(-4, 12, 0, 'u-sklad', 'Собрано, готово к отгрузке'), H(-4, 15, 0, 'u-dost', 'Отгружено водителю (ДС-0001)'), H(-4, 17, 30, 'u-dost', 'Доставлено клиенту — продажа завершена')] },
      { id: 's-2', no: 'СП-0002', date: day(-2), createdAt: at(-2, 14, 30), clientId: 'c2', sellerId: 'u-sel2', pointId: 'p2', source: 'office',
        items: [{ productId: 'pr1', qty: 4, price: 1450000, disc: 0 }, { productId: 'pr24', qty: 1, price: 140000, disc: 0 }], docDisc: 3, cur: 'UZS', rateType: 'cash', rate: 12640, vat: true,
        receive: 'pickup', credit: false, due: null, comment: 'Клиент заберёт после шиномонтажа', state: 'posted', postedAt: at(-2, 14, 40), readyAt: at(-2, 15, 10),
        history: [H(-2, 14, 30, 'u-sel2', 'Создана'), H(-2, 14, 40, 'u-sel2', 'Проведена, товар списан с точки «Магазин «Юнусабад»»'), H(-2, 14, 41, 'u-sel2', 'Оплата 3 000 000 сум · Наличные, сум — на проверке'), H(-2, 14, 41, 'u-sel2', 'Оплата 2 761 800 сум · Карта / терминал — на проверке'), H(-2, 15, 0, 'u-buh', 'Оплата подтверждена: 3 000 000 сум'), H(-2, 15, 0, 'u-buh', 'Оплата подтверждена: 2 761 800 сум'), H(-2, 15, 10, 'u-sklad', 'Собрано, готово к отгрузке')] },
      { id: 's-3', no: 'СП-0003', date: day(-1), createdAt: at(-1, 11), clientId: 'c3', sellerId: 'u-sel1', pointId: 'w1', source: 'office',
        items: [{ productId: 'pr10', qty: 6, price: 265, disc: 0 }], docDisc: 0, cur: 'USD', rateType: 'bank', rate: 12720, vat: true,
        receive: 'delivery', credit: true, due: day(13), comment: 'Отсрочка 14 дней по договору ДГ-0007', state: 'posted', postedAt: at(-1, 11, 15),
        history: [H(-1, 11, 0, 'u-sel1', 'Создана'), H(-1, 11, 15, 'u-sel1', 'Проведена, товар списан с точки «Центральный склад»'), H(-1, 11, 16, 'u-sel1', 'Продажа в долг до ' + SM.fmt.date(day(13))), H(-1, 16, 0, 'u-buh', 'Оплата подтверждена: 6 360 000 сум (частично)')] },
      { id: 's-4', no: 'СП-0004', date: day(0), createdAt: at(0, 9, 40), clientId: 'c4', sellerId: 'u-sel1', pointId: 'p1', source: 'site',
        items: [{ productId: 'pr20', qty: 1, price: 370000, disc: 0 }, { productId: 'pr13', qty: 1, price: 78000, disc: 0 }, { productId: 'pr15', qty: 1, price: 315000, disc: 0 }], docDisc: 0, cur: 'UZS', rateType: 'card', rate: 12715, vat: true,
        receive: 'delivery', credit: false, due: null, comment: 'Заказ с сайта mastershina.uz: оплачено QR, доставка до двери', state: 'posted', postedAt: at(0, 9, 45),
        history: [H(0, 9, 40, 'u-sel1', 'Заказ получен с сайта'), H(0, 9, 45, 'u-sel1', 'Проведена, товар списан с точки «Магазин «Чиланзар»»'), H(0, 9, 46, 'u-sel1', 'Оплата 763 000 сум · QR-оплата — на проверке')] },
      { id: 's-5', no: 'СП-0005', date: day(0), createdAt: at(0, 11, 15), clientId: 'c5', sellerId: 'u-sel2', pointId: 'p2', source: 'office',
        items: [{ productId: 'pr6', qty: 4, price: 610000, disc: 0 }, { productId: 'pr18', qty: 4, price: 45000, disc: 0 }], docDisc: 0, cur: 'UZS', rateType: 'cash', rate: 12660, vat: true,
        receive: 'pickup', credit: false, due: null, comment: 'Клиент подумает до вечера, товар отложен', state: 'draft',
        history: [H(0, 11, 15, 'u-sel2', 'Создана (черновик, товар зарезервирован)')] },
    ];
    db.sales.filter((s) => s.state !== 'draft').forEach((s) => s.items.forEach((l) => mv(l.productId, s.pointId, -l.qty, 'sale', s.no, s.postedAt, s.sellerId)));

    /* ---------- Оплаты (приход от клиентов и выплаты поставщикам) ---------- */
    db.payments = [
      { id: 'pay1', at: at(-5, 10, 21), saleId: 's-1', clientId: 'c1', method: 'bank', amount: 6708000, cur: 'UZS', rate: 12720, dir: 'in', status: 'confirmed', by: 'u-sel1', confirmedBy: 'u-buh', confirmedAt: at(-4, 11, 5), note: 'Платёжное поручение № 412' },
      { id: 'pay2', at: at(-2, 14, 41), saleId: 's-2', clientId: 'c2', method: 'cash_uzs', amount: 3000000, cur: 'UZS', rate: 12640, dir: 'in', status: 'confirmed', by: 'u-sel2', confirmedBy: 'u-buh', confirmedAt: at(-2, 15) },
      { id: 'pay3', at: at(-2, 14, 41), saleId: 's-2', clientId: 'c2', method: 'card', amount: 2761800, cur: 'UZS', rate: 12700, dir: 'in', status: 'confirmed', by: 'u-sel2', confirmedBy: 'u-buh', confirmedAt: at(-2, 15) },
      { id: 'pay4', at: at(-1, 15, 50), saleId: 's-3', clientId: 'c3', method: 'bank', amount: 6360000, cur: 'UZS', rate: 12720, dir: 'in', status: 'confirmed', by: 'u-sel1', confirmedBy: 'u-buh', confirmedAt: at(-1, 16), note: 'Предоплата 500 $ по курсу перечисления' },
      { id: 'pay5', at: at(0, 9, 46), saleId: 's-4', clientId: 'c4', method: 'qr', amount: 763000, cur: 'UZS', rate: 12715, dir: 'in', status: 'pending', by: 'u-sel1', note: 'Оплата на сайте через QR (Click)' },
      { id: 'pay6', at: at(-2, 12), saleId: null, clientId: 's1', method: 'bank', amount: 25000000, cur: 'UZS', rate: 12720, dir: 'out', status: 'confirmed', by: 'u-buh', confirmedBy: 'u-buh', confirmedAt: at(-2, 12), note: 'Частичная оплата по инвойсу TIG-2210' },
      { id: 'pay7', at: at(-6, 16), saleId: null, clientId: 'c6', method: 'cash_uzs', amount: 650000, cur: 'UZS', rate: 12620, dir: 'in', status: 'confirmed', by: 'u-head', confirmedBy: 'u-buh', confirmedAt: at(-6, 16, 30), note: 'Погашение старого долга' },
    ];

    /* ---------- Расходы ---------- */
    db.expenses = [
      { id: 'e1', date: day(-5), cat: 'food', amount: 420000, cur: 'UZS', rate: 12640, account: 'cash_uzs', employee: 'Сотрудники магазина «Чиланзар»', pointId: 'p1', car: '', comment: 'Обеды, 6 человек', file: '', by: 'u-buh', at: at(-5, 13) },
      { id: 'e2', date: day(-4), cat: 'fuel', amount: 650000, cur: 'UZS', rate: 12640, account: 'cash_uzs', employee: 'Ахмад Каримов', pointId: 'w1', car: 'car1', comment: 'Заправка Damas, 45 л', file: 'чек_АЗС_0412.jpg', by: 'u-buh', at: at(-4, 9) },
      { id: 'e3', date: day(-3), cat: 'carfix', amount: 1200000, cur: 'UZS', rate: 12640, account: 'cash_uzs', employee: 'Сардор Олимов', pointId: 'w1', car: 'car3', comment: 'Замена тормозных колодок Isuzu', file: '', by: 'u-buh', at: at(-3, 15) },
      { id: 'e4', date: day(-2), cat: 'advance', amount: 2000000, cur: 'UZS', rate: 12640, account: 'cash_uzs', employee: 'Бекзод Турсунов', pointId: 'w1', car: '', comment: 'Аванс за текущий месяц', file: '', by: 'u-buh', at: at(-2, 17) },
      { id: 'e5', date: day(-1), cat: 'house', amount: 310000, cur: 'UZS', rate: 12715, account: 'corp', employee: '', pointId: 'p2', car: '', comment: 'Моющие средства, канцелярия', file: '', by: 'u-buh', at: at(-1, 12) },
      { id: 'e6', date: day(-1), cat: 'rent', amount: 800, cur: 'USD', rate: 12660, account: 'cash_usd', employee: '', pointId: 'p4', car: '', comment: 'Аренда магазина «Самарканд»', file: 'договор_аренды.pdf', by: 'u-buh', at: at(-1, 10) },
    ];
    db.cashOps = [];
    db.adjustments = [];

    /* ---------- Доставка ---------- */
    db.deliveries = [
      { id: 'd1', no: 'ДС-0001', saleId: 's-1', clientId: 'c1', address: 'г. Ташкент, ул. Шота Руставели, 41 (гараж парка)', phone: '+998 90 123-45-67', driverId: 'dr1', carId: 'car1', cost: 150000, direction: 'Ташкент, Мирабадский р-н', kind: 'own', paid: false, status: 'delivered', comment: 'Бесплатно для корпоративного клиента', createdAt: at(-5, 10, 20), by: 'u-sel1',
        history: [{ at: at(-5, 10, 20), uid: 'u-sel1', text: 'Заявка создана' }, { at: at(-4, 12, 30), uid: 'u-dost', text: 'Назначен водитель Ахмад Каримов, Chevrolet Damas' }, { at: at(-4, 15), uid: 'u-dost', text: 'Передана водителю' }, { at: at(-4, 17, 30), uid: 'u-dost', text: 'Доставлена' }] },
      { id: 'd2', no: 'ДС-0002', saleId: 's-3', clientId: 'c3', address: 'г. Ташкент, Сергели, ул. Янги Йул, 7 (автобаза)', phone: '+998 71 207-33-10', driverId: 'dr2', carId: 'car3', cost: 250000, direction: 'Ташкент, Сергелийский р-н', kind: 'own', paid: true, status: 'assigned', comment: 'Грузовые шины, нужен Isuzu', createdAt: at(-1, 11, 15), by: 'u-sel1',
        history: [{ at: at(-1, 11, 15), uid: 'u-sel1', text: 'Заявка создана' }, { at: at(-1, 17), uid: 'u-dost', text: 'Назначен водитель Сардор Олимов, Isuzu NQR 71' }] },
      { id: 'd3', no: 'ДС-0003', saleId: 's-4', clientId: 'c4', address: 'г. Ташкент, Мирзо-Улугбекский р-н, ул. Буюк Ипак Йули, 156, кв. 31', phone: '+998 97 701-44-02', driverId: null, carId: null, cost: 0, direction: 'Ташкент, Мирзо-Улугбекский р-н', kind: 'own', paid: false, status: 'new', comment: 'Заказ с сайта, бесплатная доставка от 500 000 сум', createdAt: at(0, 9, 45), by: 'u-sel1',
        history: [{ at: at(0, 9, 45), uid: 'u-sel1', text: 'Заявка создана (заказ с сайта)' }] },
    ];

    /* ---------- Документы ---------- */
    db.documents = [
      { id: 'doc1', no: 'СЧ-0001', type: 'invoice', date: day(-5), at: at(-5, 10, 25), by: 'u-sel1', saleId: 's-1', clientId: 'c1', note: '', fields: {} },
      { id: 'doc2', no: 'СФ-0001', type: 'facture', date: day(-4), at: at(-4, 11, 10), by: 'u-buh', saleId: 's-1', clientId: 'c1', note: '', fields: {} },
      { id: 'doc3', no: 'ТЧ-0001', type: 'receipt', date: day(-2), at: at(-2, 14, 45), by: 'u-sel2', saleId: 's-2', clientId: 'c2', note: '', fields: {} },
      { id: 'doc4', no: 'АС-0001', type: 'act', date: day(-1), at: at(-1, 17), by: 'u-buh', saleId: null, clientId: 'c3', from: day(-30), to: day(-1), note: '', fields: {} },
    ];

    /* ---------- Уведомления ---------- */
    const N = (id, d, h, m, kind, title, text, href, roles, uids, readBy) => ({ id, at: at(d, h, m), kind, title, text, href, roles, uids: uids || [], readBy: readBy || [] });
    db.notes = [
      N('n1', 0, 9, 46, 'site', 'Заказ с сайта СП-0004', 'Дилноза Юсупова · 763 000 сум · оплата QR', '#/sales/s-4', ['admin', 'head'], ['u-sel1']),
      N('n2', 0, 9, 46, 'pay', 'Оплата на подтверждение', 'СП-0004 · Дилноза Юсупова · 763 000 сум · QR-оплата', '#/accounting', ['accountant', 'admin']),
      N('n3', 0, 9, 46, 'delivery', 'Новая заявка на доставку ДС-0003', 'Дилноза Юсупова · Буюк Ипак Йули, 156', '#/delivery', ['courier', 'admin']),
      N('n4', 0, 8, 45, 'transfer', 'Перемещение ПМ-0002: отправлено', 'Центральный склад → Магазин «Юнусабад»', '#/transfers/t2', ['storekeeper', 'admin'], ['u-sel2']),
      N('n5', -1, 11, 15, 'sale', 'Новая продажа СП-0003', 'ООО «UzAvtoTrans Logistic» · $1 590,00 · в долг', '#/sales/s-3', ['admin', 'head', 'storekeeper'], [], ['u-head']),
      N('n6', -2, 15, 0, 'payok', 'Оплата подтверждена · СП-0002', 'Азиз Рахимов · 5 761 800 сум', '#/sales/s-2', ['admin'], ['u-sel2'], ['u-sel2', 'u-admin']),
      N('n7', -2, 15, 10, 'ship', 'Готово к отгрузке · СП-0002', 'Азиз Рахимов · самовывоз из «Юнусабад»', '#/sales/s-2', ['admin', 'courier'], ['u-sel2'], ['u-admin', 'u-dost']),
      N('n8', -3, 10, 40, 'receipt', 'Поступление ПТ-0002', 'ООО «AutoParts Distribution» → Центральный склад', '#/receipts/r2', ['admin', 'head', 'accountant'], [], ['u-admin', 'u-head', 'u-buh']),
    ];

    /* ---------- История операций ---------- */
    const HI = (id, d, h, m, uid, action, entity, entityId, detail) => ({ id, at: at(d, h, m), uid, uname: (db.users.find((u) => u.id === uid) || {}).name, action, entity, entityId, detail });
    db.history = [
      HI('h1', -30, 9, 0, 'u-admin', 'Ввод начальных остатков', 'stock', null, '25 товаров по 6 точкам'),
      HI('h2', -7, 9, 0, 'u-buh', 'Установлен курс $', 'rate', null, 'наличный 12620, безналичный 12680, перечисление 12700'),
      HI('h3', -6, 11, 30, 'u-sklad', 'Создано поступление', 'receipt', 'r1', 'ПТ-0001 · проведено'),
      HI('h4', -6, 16, 30, 'u-buh', 'Оплата подтверждена', 'payment', 'pay7', '650 000 сум · погашение долга ИП «Каримов Ж.»'),
      HI('h5', -5, 10, 20, 'u-sel1', 'Создана продажа', 'sale', 's-1', 'СП-0001 · проведена'),
      HI('h6', -5, 13, 0, 'u-buh', 'Расход', 'expense', 'e1', 'Питание сотрудников · 420 000 сум'),
      HI('h7', -4, 11, 5, 'u-buh', 'Оплата подтверждена', 'payment', 'pay1', '6 708 000 сум · СП-0001'),
      HI('h8', -4, 13, 0, 'u-sel1', 'Перемещение: принято', 'transfer', 't1', 'ПМ-0001'),
      HI('h9', -4, 17, 30, 'u-dost', 'Доставка ДС-0001', 'delivery', 'd1', 'Доставлена'),
      HI('h10', -3, 9, 0, 'u-buh', 'Установлен курс $', 'rate', null, 'наличный 12640, безналичный 12700, перечисление 12720'),
      HI('h11', -3, 10, 40, 'u-sklad', 'Создано поступление', 'receipt', 'r2', 'ПТ-0002 · проведено'),
      HI('h12', -2, 12, 0, 'u-buh', 'Оплата поставщику', 'payment', 'pay6', '25 000 000 сум · ООО «Tyre Import Group»'),
      HI('h13', -2, 14, 40, 'u-sel2', 'Создана продажа', 'sale', 's-2', 'СП-0002 · проведена, скидка 3%'),
      HI('h14', -2, 15, 0, 'u-buh', 'Оплата подтверждена', 'payment', 'pay2', '3 000 000 сум · СП-0002'),
      HI('h15', -1, 11, 15, 'u-sel1', 'Создана продажа', 'sale', 's-3', 'СП-0003 · проведена, в долг'),
      HI('h16', -1, 16, 0, 'u-buh', 'Оплата подтверждена', 'payment', 'pay4', '6 360 000 сум · СП-0003'),
      HI('h17', 0, 8, 45, 'u-sklad', 'Перемещение: отправлено', 'transfer', 't2', 'ПМ-0002'),
      HI('h18', 0, 9, 0, 'u-buh', 'Установлен курс $', 'rate', null, 'наличный 12660, безналичный 12715, перечисление 12735'),
      HI('h19', 0, 9, 45, 'u-sel1', 'Создана продажа', 'sale', 's-4', 'СП-0004 · заказ с сайта'),
      HI('h20', 0, 11, 15, 'u-sel2', 'Создана продажа', 'sale', 's-5', 'СП-0005 · черновик'),
    ];
    return db;
  };
})();
