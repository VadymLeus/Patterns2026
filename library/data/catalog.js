// Каталог комплектуючих. Ціни умовні, у гривнях.
// Це лише ДАНІ. Самі об'єкти комплектуючих створюють фабрики
// (library/factoryMethod та library/abstractFactory).

const CATALOG = [
  // ---------- Процесори (створює абстрактна фабрика платформи) ----------
  { id: 'i3-12100f', type: 'cpu', platform: 'intel', name: 'Intel Core i3-12100F', cores: 4, tdp: 58, price: 3600 },
  { id: 'i5-12400f', type: 'cpu', platform: 'intel', name: 'Intel Core i5-12400F', cores: 6, tdp: 65, price: 5800 },
  { id: 'i5-13600k', type: 'cpu', platform: 'intel', name: 'Intel Core i5-13600K', cores: 14, tdp: 125, price: 13500 },
  { id: 'i7-13700k', type: 'cpu', platform: 'intel', name: 'Intel Core i7-13700K', cores: 16, tdp: 125, price: 17500 },
  { id: 'r5-7600', type: 'cpu', platform: 'amd', name: 'AMD Ryzen 5 7600', cores: 6, tdp: 65, price: 8900 },
  { id: 'r7-7700x', type: 'cpu', platform: 'amd', name: 'AMD Ryzen 7 7700X', cores: 8, tdp: 105, price: 13500 },
  { id: 'r9-7900x', type: 'cpu', platform: 'amd', name: 'AMD Ryzen 9 7900X', cores: 12, tdp: 170, price: 20500 },

  // ---------- Материнські плати (абстрактна фабрика платформи) ----------
  { id: 'h610m', type: 'motherboard', platform: 'intel', name: 'Intel H610M · mATX · DDR4', formFactor: 'mATX', ramType: 'DDR4', price: 2800 },
  { id: 'b660', type: 'motherboard', platform: 'intel', name: 'Intel B660 · ATX · DDR4', formFactor: 'ATX', ramType: 'DDR4', price: 4600 },
  { id: 'z790', type: 'motherboard', platform: 'intel', name: 'Intel Z790 · ATX · DDR5', formFactor: 'ATX', ramType: 'DDR5', price: 9800 },
  { id: 'a620m', type: 'motherboard', platform: 'amd', name: 'AMD A620M · mATX · DDR5', formFactor: 'mATX', ramType: 'DDR5', price: 3900 },
  { id: 'b650', type: 'motherboard', platform: 'amd', name: 'AMD B650 · ATX · DDR5', formFactor: 'ATX', ramType: 'DDR5', price: 6200 },
  { id: 'x670e', type: 'motherboard', platform: 'amd', name: 'AMD X670E · ATX · DDR5', formFactor: 'ATX', ramType: 'DDR5', price: 12500 },

  // ---------- Оперативна пам'ять (фабричний метод) ----------
  { id: 'ddr4-16', type: 'ram', name: '16 ГБ DDR4-3200', ramType: 'DDR4', sizeGb: 16, price: 1500 },
  { id: 'ddr4-32', type: 'ram', name: '32 ГБ DDR4-3200', ramType: 'DDR4', sizeGb: 32, price: 2900 },
  { id: 'ddr5-16', type: 'ram', name: '16 ГБ DDR5-5200', ramType: 'DDR5', sizeGb: 16, price: 2300 },
  { id: 'ddr5-32', type: 'ram', name: '32 ГБ DDR5-5600', ramType: 'DDR5', sizeGb: 32, price: 4200 },
  { id: 'ddr5-64', type: 'ram', name: '64 ГБ DDR5-6000', ramType: 'DDR5', sizeGb: 64, price: 8300 },

  // ---------- Відеокарти (фабричний метод) ----------
  { id: 'gt1030', type: 'gpu', name: 'GeForce GT 1030 2 ГБ', tdp: 30, price: 2800 },
  { id: 'rtx3060', type: 'gpu', name: 'GeForce RTX 3060 12 ГБ', tdp: 170, price: 14500 },
  { id: 'rtx4060', type: 'gpu', name: 'GeForce RTX 4060 8 ГБ', tdp: 115, price: 15500 },
  { id: 'rtx4070', type: 'gpu', name: 'GeForce RTX 4070 12 ГБ', tdp: 200, price: 27000 },
  { id: 'rx7600', type: 'gpu', name: 'Radeon RX 7600 8 ГБ', tdp: 165, price: 12800 },
  { id: 'rx7800xt', type: 'gpu', name: 'Radeon RX 7800 XT 16 ГБ', tdp: 263, price: 25500 },

  // ---------- Накопичувачі (фабричний метод) ----------
  { id: 'ssd-480', type: 'storage', name: 'SSD SATA 480 ГБ', kind: 'SSD', sizeGb: 480, price: 1100 },
  { id: 'nvme-1tb', type: 'storage', name: 'SSD NVMe 1 ТБ', kind: 'SSD', sizeGb: 1000, price: 2300 },
  { id: 'nvme-2tb', type: 'storage', name: 'SSD NVMe 2 ТБ', kind: 'SSD', sizeGb: 2000, price: 4400 },
  { id: 'hdd-2tb', type: 'storage', name: 'HDD 2 ТБ', kind: 'HDD', sizeGb: 2000, price: 2100 },

  // ---------- Блоки живлення (фабричний метод) ----------
  { id: 'psu-450', type: 'psu', name: 'Блок живлення 450 Вт', watts: 450, price: 1500 },
  { id: 'psu-550', type: 'psu', name: 'Блок живлення 550 Вт', watts: 550, price: 1900 },
  { id: 'psu-650', type: 'psu', name: 'Блок живлення 650 Вт', watts: 650, price: 2600 },
  { id: 'psu-750', type: 'psu', name: 'Блок живлення 750 Вт', watts: 750, price: 3300 },
  { id: 'psu-850', type: 'psu', name: 'Блок живлення 850 Вт', watts: 850, price: 4300 },

  // ---------- Корпуси (фабричний метод) ----------
  { id: 'case-matx', type: 'case', name: 'Compact Tower (лише mATX)', supports: ['mATX'], price: 1500 },
  { id: 'case-atx', type: 'case', name: 'Midi Tower (ATX / mATX)', supports: ['ATX', 'mATX'], price: 2400 },
  { id: 'case-gaming', type: 'case', name: 'Gaming Tower RGB (ATX / mATX)', supports: ['ATX', 'mATX'], price: 4100 },
];

// Допоміжний доступ до каталогу
class Catalog {
  static find(id) {
    const item = CATALOG.find((c) => c.id === id);
    if (!item) throw new Error(`Комплектуюче "${id}" не знайдено в каталозі`);
    return item;
  }

  // platform = null означає "будь-яка"
  static byType(type, platform = null) {
    return CATALOG.filter((c) => c.type === type && (platform === null || c.platform === platform));
  }

  // Підпис для випадаючого списку
  static label(item) {
    switch (item.type) {
      case 'cpu':
        return `${item.name} · ${item.cores} ядер · ${item.tdp} Вт`;
      case 'gpu':
        return `${item.name} · ${item.tdp} Вт`;
      default:
        return item.name;
    }
  }
}
