describe('Аналіз', 'Специфікація для друку (BuildSheet + PrintSheet)', () => {
  const quiet = (fn) => Logger.getInstance().silently(fn);
  const IDS = {
    cpu: 'r5-7600',
    motherboard: 'b650',
    cooler: 'cooler-tower',
    ram: 'ddr5-32',
    gpu: 'rtx4060',
    storage: 'nvme-1tb',
    psu: 'psu-650',
    case: 'case-atx',
  };
  const partsWith = (changes = {}) => {
    const ids = { ...IDS, ...changes };
    const parts = {};
    quiet(() => PC_SLOTS.forEach(({ key }) => (parts[key] = ids[key] ? PCSerializer.createPart(key, ids[key]) : undefined)));
    return parts;
  };
  const sheetOf = (changes, options) => BuildSheet.from(partsWith(changes), options);

  it('повна сумісна збірка: вісім рядків, статус «ok», без зауважень', () => {
    const sheet = sheetOf();
    expect(sheet.rows.length).toBe(8);
    expect(sheet.status).toBe('ok');
    expect(sheet.issues).toEqual([]);
    sheet.rows.forEach((row) => expect(row.name === '—').toBe(false));
  });

  it('сума — це сума цін усіх деталей, а текст ціни робить передана функція форматування', () => {
    const parts = partsWith();
    const expected = PC_SLOTS.reduce((sum, { key }) => sum + parts[key].price, 0);
    const sheet = BuildSheet.from(parts, { format: (n) => `${n} UAH` });
    expect(sheet.total).toBe(expected);
    expect(sheet.totalText).toBe(`${expected} UAH`);
    expect(sheet.rows[0].priceText).toBe(`${parts.cpu.price} UAH`);
  });

  it('споживання й потрібний БЖ збігаються з правилами сумісності', () => {
    const parts = partsWith();
    const sheet = BuildSheet.from(parts);
    expect(sheet.power.draw).toBe(parts.cpu.tdp + parts.gpu.tdp + Compatibility.REST_OF_SYSTEM_WATTS);
    expect(sheet.power.need).toBe(Compatibility.requiredPsuWatts(parts.cpu, parts.gpu));
  });

  it('оцінки продуктивності беруться з Performance', () => {
    const parts = partsWith();
    const scores = Performance.all(parts);
    const sheet = BuildSheet.from(parts);
    expect(sheet.perf.map((p) => p.key)).toEqual(['office', 'gaming', 'workstation']);
    sheet.perf.forEach((p) => expect(p.value).toBe(scores[p.key]));
  });

  it('неповна збірка: статус «warn», перелік відсутніх деталей, сума лише наявних', () => {
    const parts = partsWith({ gpu: null, psu: null });
    const sheet = BuildSheet.from(parts);
    expect(sheet.status).toBe('warn');
    expect(sheet.issues).toContain('Не вибрано: Відеокарта');
    expect(sheet.issues).toContain('Не вибрано: Блок живлення');
    const gpuRow = sheet.rows.find((r) => r.slot === 'gpu');
    expect(gpuRow.name).toBe('—');
    expect(gpuRow.priceText).toBe('');
    expect(gpuRow.price).toBe(null);
    expect(sheet.total).toBe(PC_SLOTS.filter(({ key }) => parts[key]).reduce((s, { key }) => s + parts[key].price, 0));
    expect(sheet.power).toBe(null);
  });

  it('порожня конфігурація: нуль у сумі, усі оцінки порожні', () => {
    const sheet = BuildSheet.from({});
    expect(sheet.total).toBe(0);
    expect(sheet.status).toBe('warn');
    expect(sheet.issues.length).toBe(8);
    sheet.perf.forEach((p) => expect(p.value).toBe(null));
  });

  it('конфлікт сумісності: статус «bad» і текст проблеми', () => {
    const sheet = sheetOf({ psu: 'psu-450', gpu: 'rtx4070', cpu: 'r9-7900x' });
    expect(sheet.status).toBe('bad');
    expect(sheet.issues.some((i) => i.includes('замалий'))).toBe(true);
  });

  it('характеристики деталей: сокет, формат, обсяг і потужність', () => {
    const rows = Object.fromEntries(sheetOf().rows.map((r) => [r.slot, r.details]));
    expect(rows.cpu).toContain('AM5');
    expect(rows.cpu).toContain('65 Вт');
    expect(rows.motherboard).toContain('ATX');
    expect(rows.motherboard).toContain('DDR5');
    expect(rows.cooler).toContain('120 Вт');
    expect(rows.ram).toBe('DDR5 · 32 ГБ');
    expect(rows.gpu).toBe('115 Вт');
    expect(rows.storage).toBe('SSD · 1 ТБ');
    expect(rows.psu).toBe('650 Вт');
    expect(rows.case).toContain('ATX');
  });

  it('details(null) і невідомий тип дають порожній рядок', () => {
    expect(BuildSheet.details(null)).toBe('');
    expect(BuildSheet.details({ type: 'fan' })).toBe('');
  });

  it('назву обрізано, а порожня замінюється на «Поточна конфігурація»', () => {
    expect(sheetOf({}, { name: '  Мій ПК  ' }).name).toBe('Мій ПК');
    expect(sheetOf({}, { name: '   ' }).name).toBe('Поточна конфігурація');
    expect(sheetOf().name).toBe('Поточна конфігурація');
  });

  it('знижка прайс-листа вже врахована в цінах аркуша', () => {
    const prices = PriceList.getInstance();
    const before = sheetOf().total;
    quiet(() => prices.setDiscount(10));
    const after = sheetOf({}, { discount: 10 });
    quiet(() => prices.setDiscount(0));
    expect(after.total < before).toBe(true);
    expect(after.discount).toBe(10);
  });

  it('BuildSheet не змінює передані деталі й нічого не пише в журнал', () => {
    const parts = partsWith();
    const snapshot = JSON.stringify(parts);
    const before = Logger.getInstance().entries.length;
    BuildSheet.from(parts);
    expect(JSON.stringify(parts)).toBe(snapshot);
    expect(Logger.getInstance().entries.length).toBe(before);
  });

  // ---------- Розмітка ----------
  it('PrintSheet.render показує назву, усі деталі, підсумок і оцінки', () => {
    const html = PrintSheet.render(sheetOf({}, { name: 'Тестовий ПК' }));
    expect(html).toContain('Тестовий ПК');
    expect(html).toContain('Ryzen 5 7600');
    expect(html).toContain('Разом');
    expect(html).toContain('ps-ok');
    expect((html.match(/ps-perf-row/g) || []).length).toBe(3);
    expect(html).toContain('Споживання');
  });

  it('PrintSheet.render екранує назву й не пропускає розмітку', () => {
    const html = PrintSheet.render(sheetOf({}, { name: '<img src=x onerror=alert(1)>' }));
    expect(html.includes('<img')).toBe(false);
    expect(html).toContain('&lt;img');
  });

  it('PrintSheet.render показує знижку, лише коли вона є', () => {
    expect(PrintSheet.render(sheetOf({}, { discount: 15 }))).toContain('знижка 15%');
    expect(PrintSheet.render(sheetOf({}, { discount: 0 })).includes('знижка')).toBe(false);
  });

  it('неповна збірка: аркуш показує проблеми й прочерк замість оцінок', () => {
    const html = PrintSheet.render(sheetOf({ cpu: null, gpu: null }));
    expect(html).toContain('ps-warn');
    expect(html).toContain('Не вибрано: Процесор');
    expect(html).toContain('<b>—</b>');
    expect(html).toContain('не визначено');
  });

  it('число й одиниця не розриваються переносом рядка', () => {
    const html = PrintSheet.render(sheetOf());
    expect(html).toContain('65 Вт');
    expect(html.includes('65 Вт')).toBe(false);
  });
});
