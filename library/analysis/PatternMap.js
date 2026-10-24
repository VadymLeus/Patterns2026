// КАРТА ПАТЕРНІВ — модель живої діаграми «хто кого створює».
//
// Це не патерн із лабораторної, а допоміжна частина: вона дивиться на записи журналу
// (Logger) і рахує, який клас скільки разів «подав голос». Малює діаграму окремий
// клас ui/PatternMapView.js, а тут лише дані, тому все це перевіряється тестами без DOM.
//
// Вузол — це клас або група схожих класів (наприклад, шість творців Creator).
// Запис журналу має поле actor — назву класу, що його написав; nodeFor() зводить назву до вузла.

class PatternMap {
  // pattern збігається з назвою патерну в журналі, тому колір вузла такий самий, як у бейджа
  static NODES = [
    {
      id: 'ui', label: 'Інтерфейс', sub: 'script.js', pattern: 'Інтерфейс', interactive: false,
      hint: 'Збирає вибір користувача й звертається до фабрик, Director і Builder. Деталі сам через new не створює.',
    },
    {
      id: 'director', label: 'PCDirector', sub: 'знає рецепти збірок', pattern: 'Будівельник',
      hint: 'Знає «рецепти» (офіс, ігри, робоча станція), підбирає збірку під бюджет і керує PCBuilder.',
    },
    {
      id: 'builder', label: 'PCBuilder', sub: 'крок за кроком', pattern: 'Будівельник',
      hint: 'Приймає деталі по одній, перевіряє сумісність і лише тоді створює PC. Якщо є конфлікти — кидає BuildError.',
    },
    {
      id: 'intel', label: 'IntelFactory', sub: 'процесор + плата', pattern: 'Абстрактна фабрика',
      hint: 'Перша абстрактна фабрика, сімейство Intel: процесор і плата завжди з одним сокетом, тому не сумісні вони бути не можуть.',
    },
    {
      id: 'amd', label: 'AmdFactory', sub: 'процесор + плата', pattern: 'Абстрактна фабрика',
      hint: 'Те саме для сімейства AMD: AmdCpu і AmdMotherboard створюються лише разом, як пара.',
    },
    {
      id: 'tier', label: 'KitFactory', sub: 'комплекти трьох рівнів', pattern: 'Абстрактна фабрика',
      hint: 'Друга абстрактна фабрика: один виклик createKit() дає п’ять деталей одного рівня (відеокарта, накопичувач, БЖ, корпус, кулер).',
    },
    {
      id: 'creators', label: 'Creator', sub: '6 творців деталей', pattern: 'Фабричний метод',
      hint: 'Шаблонний метод create() однаковий для всіх, а фабричний метод createComponent() у кожному підкласі сам вирішує, що створити.',
    },
    {
      id: 'pc', label: 'PC', sub: 'готова збірка', pattern: 'Прототип',
      hint: 'Готова збірка. Метод clone() копіює її разом з усіма деталями, тож копії не залежать одна від одної.',
    },
    {
      id: 'presets', label: 'PresetRegistry', sub: 'реєстр зразків', pattern: 'Прототип',
      hint: 'Зберігає готові збірки як зразки і віддає не оригінал, а його клон.',
    },
    {
      id: 'storage', label: 'BuildStorage', sub: 'localStorage', pattern: 'Збереження',
      hint: 'Зберігає збірки як JSON. Під час відновлення PCSerializer створює їх заново через фабрики та PCBuilder, а не складає з «сирих» об’єктів.',
    },
    {
      id: 'settings', label: 'Settings', sub: 'валюта й тема', pattern: 'Одинак',
      hint: 'Єдиний на весь застосунок об’єкт налаштувань. new Settings() завжди повертає той самий екземпляр.',
    },
    {
      id: 'price', label: 'PriceList', sub: 'ціни й знижка', pattern: 'Одинак',
      hint: 'Єдиний прайс-лист. Зміна знижки одразу видна всюди, бо ціну беруть лише звідси.',
    },
    {
      id: 'logger', label: 'Logger', sub: 'усі пишуть сюди', pattern: 'Одинак',
      hint: 'Єдиний журнал. Лічильник показує всі записи разом, тому клік по цьому вузлу скидає фільтр.',
    },
  ];

  // Рамки, що об’єднують вузли
  static GROUPS = [
    { id: 'producers', label: 'Створюють деталі', members: ['intel', 'amd', 'tier', 'creators'] },
    { id: 'singletons', label: 'Одинаки — спільні для всіх', members: ['settings', 'price', 'logger'] },
  ];

  // [звідки, куди, підпис]; кінець ребра — вузол або група
  static EDGES = [
    ['ui', 'director', 'рецепти'],
    ['ui', 'producers', 'вибір'],
    ['director', 'producers', 'бере деталі'],
    ['director', 'builder', 'керує'],
    ['producers', 'builder', 'деталі'],
    ['builder', 'pc', 'build()'],
    ['presets', 'pc', 'clone()'],
    ['storage', 'builder', 'відновлює'],
    ['producers', 'price', 'ціна'],
    ['ui', 'settings', 'валюта, тема'],
  ];

  #counts = new Map();
  #last = new Map();
  #total = 0;
  #listeners = [];

  // Назва класу, що пише в журнал → id вузла (або null, якщо клас невідомий)
  static nodeFor(actor) {
    if (typeof actor !== 'string') return null;
    if (actor === 'PriceList') return 'price';
    if (actor === 'Settings') return 'settings';
    if (actor === 'Logger') return 'logger';
    if (actor === 'IntelFactory') return 'intel';
    if (actor === 'AmdFactory') return 'amd';
    if (/KitFactory$/.test(actor)) return 'tier';
    if (/Creator$/.test(actor)) return 'creators';
    if (actor === 'PCDirector') return 'director';
    if (actor === 'PCBuilder') return 'builder';
    if (actor === 'PC') return 'pc';
    if (actor === 'PresetRegistry') return 'presets';
    if (['PCSerializer', 'BuildStorage', 'KeyValueStorage'].includes(actor)) return 'storage';
    return null;
  }

  static node(id) {
    return PatternMap.NODES.find((n) => n.id === id) ?? null;
  }

  // Усі вузли, на які поширюється кінець ребра: вузол — він сам, група — її учасники
  static membersOf(id) {
    const group = PatternMap.GROUPS.find((g) => g.id === id);
    return group ? group.members : [id];
  }

  // Чи показувати цей запис, якщо вибрано вузол nodeId. Logger — це «усі записи».
  static matches(entry, nodeId) {
    if (nodeId === null || nodeId === 'logger') return true;
    return PatternMap.nodeFor(entry.actor) === nodeId;
  }

  // Бере до уваги один запис журналу. Повертає id вузла або null.
  record(entry) {
    this.#total++;
    const id = PatternMap.nodeFor(entry.actor);
    if (id) {
      this.#counts.set(id, (this.#counts.get(id) ?? 0) + 1);
      this.#last.set(id, entry.actor);
    }
    this.#listeners.forEach((listener) => listener(id, entry));
    return id;
  }

  // Скільки записів зробив вузол. Для Logger — скільки їх узагалі.
  count(id) {
    return id === 'logger' ? this.#total : (this.#counts.get(id) ?? 0);
  }

  // Який саме клас вузла писав останнім (наприклад, GpuCreator для вузла Creator)
  last(id) {
    return this.#last.get(id) ?? null;
  }

  get total() {
    return this.#total;
  }

  reset() {
    this.#counts.clear();
    this.#last.clear();
    this.#total = 0;
    this.#listeners.forEach((listener) => listener(null, null));
  }

  // listener(nodeId, entry): nodeId === null і entry === null означає скидання лічильників
  subscribe(listener) {
    this.#listeners.push(listener);
  }
}
