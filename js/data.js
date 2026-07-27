const marketplaces = ['Wildberries', 'Ozon'];

const categories = ['Электроника', 'Одежда', 'Дом', 'Спорт', 'Детям'];

const productNames = {
  'Электроника': [
    'Наушники TWS Pro', 'Bluetooth-колонка X200', 'Умные часы Watch S3',
    'Портативный аккумулятор 20000mAh', 'Клавиатура механическая MK87',
    'Мышь беспроводная MX Anywhere', 'Веб-камера 4K Ultra',
    'Роутер Wi-Fi 6 AX3000', 'Фитнес-браслет Band 8', 'Карта памяти 128GB'
  ],
  'Одежда': [
    'Куртка ветровка мужская', 'Платье летнее женское', 'Джинсы классические',
    'Футболка хлопковая оверсайз', 'Кроссовки спортивные', 'Рубашка повседневная',
    'Толстовка с капюшоном', 'Юбка-карандаш', 'Шорты джинсовые', 'Пальто демисезонное'
  ],
  'Дом': [
    'Набор посуды 12 предметов', 'Светодиодная лампа E27', 'Органайзер для хранения',
    'Сковорода антипригарная 26см', 'Плед флисовый 200x220', 'Набор полотенец махровых',
    'Зеркало настенное 60x80', 'Подставка для цветов', 'Набор контейнеров для еды',
    'Ваза декоративная 30см'
  ],
  'Спорт': [
    'Коврик для йоги 6мм', 'Гантели разборные 2x10кг', 'Бутылка для воды 750мл',
    'Скакалка профессиональная', 'Перчатки фитнес-лайт', 'Эспандер кистевой',
    'Пояс для похудения неопрен', 'Массажный валик 45см', 'Термобутылка нержавейка',
    'Сумка для обуви спортивная'
  ],
  'Детям': [
    'Конструктор строительный 200 дет', 'Кукла интерактивная Алиса', 'Развивающий коврик',
    'Детский велосипед 16\"', 'Набор для рисования 48 цветов', 'Мягкая игрушка Заяц 40см',
    'Настольная игра Эрудит', 'Пазл 3D Замок', 'Детская энциклопедия животных',
    'Светильник-ночник Звездное небо'
  ]
};

const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function formatDate(d) {
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, dec) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dec || 0));
}

function generatePriceHistory(baseWb, baseOzon, endDate) {
  const days = 30;
  const history = [];
  const now = endDate || new Date();
  let wb = baseWb;
  let ozon = baseOzon;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    wb = Math.max(100, wb + randomInt(-150, 150));
    ozon = Math.max(100, ozon + randomInt(-150, 150));
    history.push({
      date: formatDate(date),
      dateISO: formatDateISO(date),
      wb,
      ozon
    });
  }
  return history;
}

const products = [];

for (let catIdx = 0; catIdx < categories.length; catIdx++) {
  const cat = categories[catIdx];
  const names = productNames[cat];
  for (let i = 0; i < names.length; i++) {
    const baseWb = cat === 'Электроника' ? randomInt(1000, 15000)
      : cat === 'Одежда' ? randomInt(800, 8000)
      : cat === 'Дом' ? randomInt(300, 5000)
      : cat === 'Спорт' ? randomInt(400, 4000)
      : randomInt(300, 3000);

    const baseOzon = baseWb + randomInt(-500, 800);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - randomInt(0, 7));
    const priceHistory = generatePriceHistory(baseWb, baseOzon, endDate);
    const latest = priceHistory[priceHistory.length - 1];

    const sales = randomInt(10, 2000);
    const rating = randomFloat(3.5, 5.0, 1);

    products.push({
      id: `ART-${String(catIdx + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
      name: names[i],
      category: cat,
      wbPrice: latest.wb,
      ozonPrice: latest.ozon,
      sales,
      rating,
      priceHistory,
      lastUpdated: latest.dateISO,
      lastUpdatedLabel: latest.date
    });
  }
}


