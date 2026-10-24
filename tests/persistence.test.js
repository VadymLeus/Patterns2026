describe('Збереження', 'PCSerializer і BuildStorage', () => {
  const GOOD_PARTS = {
    cpu: 'r5-7600',
    motherboard: 'b650',
    cooler: 'cooler-tower',
    ram: 'ddr5-32',
    gpu: 'rtx4060',
    storage: 'nvme-1tb',
    psu: 'psu-650',
    case: 'case-atx',
  };
  const goodData = (parts = {}) => ({ name: 'Тест', parts: { ...GOOD_PARTS, ...parts } });
  const TEST_KEY = 'patterns2026.test';

  afterEach(() => new BuildStorage(TEST_KEY).clear());

  const storageAvailable = () => {
    try {
      localStorage.setItem('patterns2026.probe', '1');
      localStorage.removeItem('patterns2026.probe');
      return true;
    } catch {
      return false;
    }
  };

  it('toData() записує лише id деталей', () => {
    const data = PCSerializer.toData(PCSerializer.fromData(goodData()));
    expect(data).toEqual(goodData());
  });

  it('збірка відновлюється з даних: це повноцінний PC зі справжніми класами', () => {
    const pc = PCSerializer.fromData(goodData());
    expect(pc).toBeInstanceOf(PC);
    expect(pc.parts.cpu).toBeInstanceOf(AmdCpu);
    expect(pc.parts.gpu).toBeInstanceOf(Gpu);
  });

  it('туди й назад дає ті самі дані, але інший об’єкт', () => {
    const first = PCSerializer.fromData(goodData());
    const second = PCSerializer.fromData(PCSerializer.toData(first));
    expect(PCSerializer.toData(second)).toEqual(PCSerializer.toData(first));
    expect(second).not.toBe(first);
  });

  it('процесор Intel відновлюється через фабрику Intel', () => {
    const pc = PCSerializer.fromData(goodData({ cpu: 'i3-12100f', motherboard: 'z790' }));
    expect(pc.parts.cpu).toBeInstanceOf(IntelCpu);
    expect(pc.parts.motherboard).toBeInstanceOf(IntelMotherboard);
  });

  it('невідомий id у даних — помилка', () => {
    expect(() => PCSerializer.fromData(goodData({ cpu: 'nope' }))).toThrow();
  });

  it('id від іншого слота — помилка', () => {
    expect(() => PCSerializer.fromData(goodData({ cpu: 'b650' }))).toThrow();
  });

  it('відсутня деталь у даних — помилка', () => {
    const data = goodData();
    delete data.parts.gpu;
    expect(() => PCSerializer.fromData(data)).toThrow();
  });

  it('несумісна збірка з файлу не збирається: перевірку робить Будівельник', () => {
    expect(() => PCSerializer.fromData(goodData({ ram: 'ddr4-16' }))).toThrow(BuildError);
  });

  it('сміття замість запису — помилка', () => {
    expect(() => PCSerializer.fromData(null)).toThrow();
    expect(() => PCSerializer.fromData('рядок')).toThrow();
    expect(() => PCSerializer.fromData({ name: 'x' })).toThrow();
  });

  it('надто довга назва обрізається', () => {
    const pc = PCSerializer.fromData({ name: 'я'.repeat(500), parts: GOOD_PARTS });
    expect(pc.name.length).toBe(PCSerializer.MAX_NAME_LENGTH);
  });

  it('restoreAll() повертає справні збірки й окремо перелік помилок', () => {
    const { pcs, errors } = PCSerializer.restoreAll([goodData(), { parts: {} }, goodData({ ram: 'ddr4-16' })]);
    expect(pcs.length).toBe(1);
    expect(errors.length).toBe(2);
  });

  it('restoreAll() не засмічує журнал', () => {
    const logger = Logger.getInstance();
    const before = logger.entries.length;
    PCSerializer.restoreAll([goodData(), goodData()]);
    expect(logger.entries.length).toBe(before);
  });

  it('формат експорту має версію та перелік збірок', () => {
    const exported = PCSerializer.toExport([PCSerializer.fromData(goodData())]);
    expect(exported.app).toBe('Patterns2026');
    expect(exported.version).toBe(2);
    expect(exported.builds.length).toBe(1);
  });

  it('parseExport() приймає і { builds }, і просто масив', () => {
    expect(PCSerializer.parseExport({ builds: [1, 2] }).length).toBe(2);
    expect(PCSerializer.parseExport([1]).length).toBe(1);
  });

  it('parseExport() відхиляє чужий формат і надто великі файли', () => {
    expect(() => PCSerializer.parseExport({ foo: 1 })).toThrow();
    expect(() => PCSerializer.parseExport(null)).toThrow();
    expect(() => PCSerializer.parseExport(new Array(PCSerializer.MAX_BUILDS + 1).fill({}))).toThrow();
  });

  it('BuildStorage зберігає й завантажує список', () => {
    if (!storageAvailable()) skip('localStorage недоступний у цьому браузері');
    const storage = new BuildStorage(TEST_KEY);
    expect(storage.save([goodData()])).toBe(true);
    expect(storage.load()).toEqual([goodData()]);
  });

  it('BuildStorage повертає [] для порожнього або пошкодженого сховища', () => {
    if (!storageAvailable()) skip('localStorage недоступний у цьому браузері');
    const storage = new BuildStorage(TEST_KEY);
    expect(storage.load()).toEqual([]);
    localStorage.setItem(TEST_KEY, '{це не json');
    expect(storage.load()).toEqual([]);
    localStorage.setItem(TEST_KEY, '{"не":"масив"}');
    expect(storage.load()).toEqual([]);
  });

  it('BuildStorage.clear() видаляє дані', () => {
    if (!storageAvailable()) skip('localStorage недоступний у цьому браузері');
    const storage = new BuildStorage(TEST_KEY);
    storage.save([goodData()]);
    storage.clear();
    expect(storage.load()).toEqual([]);
  });
});

describe('Збереження', 'Міграція старих записів і KeyValueStorage', () => {
  // Запис у форматі версії 1: слота «cooler» ще не було
  const legacy = (cpu, motherboard, extra = {}) => ({
    name: 'Старий',
    parts: { cpu, motherboard, ram: 'ddr5-32', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-atx', ...extra },
  });
  const TEST_KEY = 'patterns2026.test.kv';

  afterEach(() => new KeyValueStorage(TEST_KEY).clear());

  it('запис без кулера відновлюється з підібраним кулером', () => {
    const pc = PCSerializer.fromData(legacy('r5-7600', 'b650'));
    expect(pc.parts.cooler).toBeInstanceOf(Cooler);
    expect(pc.parts.cooler.maxTdp >= pc.parts.cpu.tdp).toBeTruthy();
  });

  it('для гарячого процесора підбирається кулер потужніший за штатний', () => {
    const pc = PCSerializer.fromData(legacy('i7-13700k', 'z790'));
    expect(pc.parts.cooler.id).toBe('cooler-dual');
  });

  it('defaultCoolerId() вибирає найдешевший придатний кулер', () => {
    expect(PCSerializer.defaultCoolerId('i3-12100f')).toBe('cooler-stock');
    expect(PCSerializer.defaultCoolerId('r7-7700x')).toBe('cooler-tower');
    expect(PCSerializer.defaultCoolerId('r9-7900x')).toBe('cooler-dual');
  });

  it('явно вказаний кулер не підміняється', () => {
    const pc = PCSerializer.fromData(legacy('r5-7600', 'b650', { cooler: 'cooler-aio360' }));
    expect(pc.parts.cooler.id).toBe('cooler-aio360');
  });

  it('після відновлення збірка записується вже з кулером', () => {
    const data = PCSerializer.toData(PCSerializer.fromData(legacy('r5-7600', 'b650')));
    expect(typeof data.parts.cooler).toBe('string');
  });

  it('запис без процесора не мігрується й дає зрозумілу помилку', () => {
    const data = legacy('r5-7600', 'b650');
    delete data.parts.cpu;
    expect(() => PCSerializer.fromData(data)).toThrow();
  });

  it('KeyValueStorage зберігає будь-яке JSON-значення', () => {
    const storage = new KeyValueStorage(TEST_KEY);
    expect(storage.save({ currency: 'USD' })).toBe(true);
    expect(storage.load()).toEqual({ currency: 'USD' });
  });

  it('KeyValueStorage повертає fallback, коли даних немає або вони пошкоджені', () => {
    const storage = new KeyValueStorage(TEST_KEY);
    expect(storage.load('нема')).toBe('нема');
    localStorage.setItem(TEST_KEY, '{зіпсовано');
    expect(storage.load('нема')).toBe('нема');
  });

  it('BuildStorage є KeyValueStorage, але завжди віддає масив', () => {
    const storage = new BuildStorage(TEST_KEY);
    expect(storage).toBeInstanceOf(KeyValueStorage);
    localStorage.setItem(TEST_KEY, '{"не":"масив"}');
    expect(storage.load()).toEqual([]);
  });
});
