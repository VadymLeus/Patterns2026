// Допоміжні модулі: оцінка продуктивності, порівняння збірок, підписи каталогу

const quietly = (fn) => Logger.getInstance().silently(fn);
const makeParts = (ids) => {
  const parts = {};
  quietly(() => PC_SLOTS.forEach(({ key }) => (parts[key] = PCSerializer.createPart(key, ids[key]))));
  return parts;
};
const BASE_IDS = {
  cpu: 'r5-7600',
  motherboard: 'b650',
  cooler: 'cooler-tower',
  ram: 'ddr5-32',
  gpu: 'rtx4060',
  storage: 'nvme-1tb',
  psu: 'psu-650',
  case: 'case-atx',
};
const withIds = (changes) => makeParts({ ...BASE_IDS, ...changes });
const preset = (method) => quietly(() => new PCDirector(new PCBuilder())[method]());

describe('Аналіз', 'Оцінка продуктивності (Performance)', () => {
  it('найкращі процесор і відеокарта каталогу мають індекс 100', () => {
    expect(Math.round(Performance.cpuIndex(makeParts({ ...BASE_IDS, cpu: 'r9-7900x' }).cpu))).toBe(100);
    expect(Math.round(Performance.gpuIndex(makeParts({ ...BASE_IDS, gpu: 'rx7800xt' }).gpu))).toBe(100);
  });

  it('оцінки лежать у межах від 0 до 100 для кожної комбінації процесора та відеокарти', () => {
    const cpus = Catalog.byType('cpu').map((c) => c.id);
    const gpus = Catalog.byType('gpu').map((g) => g.id);
    cpus.forEach((cpu) =>
      gpus.forEach((gpu) => {
        const parts = withIds({ cpu, gpu, motherboard: Catalog.find(cpu).platform === 'intel' ? 'z790' : 'b650' });
        ['office', 'gaming', 'workstation'].forEach((purpose) => {
          const score = Performance.score(parts, purpose);
          expect(score >= 0 && score <= 100.0001).toBeTruthy();
        });
      })
    );
  });

  it('готові збірки відповідають своєму призначенню', () => {
    const office = Performance.all(preset('buildOffice').parts);
    const gaming = Performance.all(preset('buildGaming').parts);
    const work = Performance.all(preset('buildWorkstation').parts);
    expect(office.office).toBe(100);
    expect(gaming.gaming > office.gaming).toBeTruthy();
    expect(work.workstation > gaming.workstation).toBeTruthy();
    expect(work.gaming > gaming.gaming).toBeTruthy();
  });

  it('для офісу оцінка насичується: потужніший процесор і більше пам’яті нічого не додають', () => {
    const modest = withIds({ cpu: 'i3-12100f', motherboard: 'h610m', ram: 'ddr4-16', storage: 'ssd-480' });
    const strong = withIds({ cpu: 'i7-13700k', motherboard: 'z790', ram: 'ddr5-64' });
    expect(Math.round(Performance.score(modest, 'office'))).toBe(100);
    expect(Math.round(Performance.score(strong, 'office'))).toBe(100);
  });

  it('HDD знижує офісну оцінку', () => {
    const ssd = Performance.score(withIds({ storage: 'ssd-480' }), 'office');
    const hdd = Performance.score(withIds({ storage: 'hdd-2tb' }), 'office');
    expect(hdd < ssd).toBeTruthy();
  });

  it('для ігор слабка ланка тягне оцінку вниз: Core i3 не розкриває RX 7800 XT', () => {
    const lopsided = withIds({ cpu: 'i3-12100f', motherboard: 'z790', gpu: 'rx7800xt' });
    const balanced = withIds({ cpu: 'i5-13600k', motherboard: 'z790', gpu: 'rx7800xt' });
    expect(Performance.score(balanced, 'gaming') > Performance.score(lopsided, 'gaming')).toBeTruthy();
  });

  it('оцінка для ігор зростає разом із відеокартою', () => {
    const weak = Performance.score(withIds({ gpu: 'gt1030' }), 'gaming');
    const strong = Performance.score(withIds({ gpu: 'rtx4070' }), 'gaming');
    expect(strong > weak).toBeTruthy();
  });

  it('для роботи важливі процесор і пам’ять', () => {
    const base = Performance.score(withIds({ ram: 'ddr5-16' }), 'workstation');
    const moreRam = Performance.score(withIds({ ram: 'ddr5-64' }), 'workstation');
    expect(moreRam > base).toBeTruthy();
  });

  it('неповна збірка не оцінюється', () => {
    const parts = withIds({});
    delete parts.gpu;
    expect(Performance.score(parts, 'gaming')).toBe(null);
    expect(Performance.all(parts)).toEqual({ office: null, gaming: null, workstation: null });
  });

  it('all() повертає цілі числа для трьох призначень', () => {
    const scores = Performance.all(withIds({}));
    expect(Object.keys(scores)).toEqual(['office', 'gaming', 'workstation']);
    Object.values(scores).forEach((v) => expect(Number.isInteger(v)).toBeTruthy());
  });

  it('невідоме призначення — помилка', () => {
    expect(() => Performance.score(withIds({}), 'mining')).toThrow();
  });
});

describe('Аналіз', 'Порівняння збірок (Comparison)', () => {
  const office = () => preset('buildOffice');
  const gaming = () => preset('buildGaming');
  const metric = (result, key) => result.metrics.find((m) => m.key === key);

  it('однакові збірки: усі слоти збігаються, показники порівну', () => {
    const pc = gaming();
    const result = Comparison.compare(pc, pc);
    expect(result.identical).toBe(true);
    expect(result.rows.every((r) => r.same)).toBe(true);
    expect(result.metrics.every((m) => m.winner === 'tie')).toBe(true);
  });

  it('клон прототипу збігається з оригіналом', () => {
    const pc = gaming();
    const copy = quietly(() => pc.clone());
    expect(Comparison.compare(pc, copy).identical).toBe(true);
  });

  it('офісний проти ігрового: дешевший і економніший офісний, швидший ігровий', () => {
    const result = Comparison.compare(office(), gaming());
    expect(metric(result, 'price').winner).toBe('a');
    expect(metric(result, 'power').winner).toBe('a');
    expect(metric(result, 'gaming').winner).toBe('b');
    expect(metric(result, 'ram').winner).toBe('b');
    expect(result.identical).toBe(false);
  });

  it('різниця цін збігається з різницею totalPrice', () => {
    const a = office();
    const b = gaming();
    expect(metric(Comparison.compare(a, b), 'price').diff).toBe(b.totalPrice - a.totalPrice);
  });

  it('порядок аргументів міняє переможця місцями', () => {
    const result = Comparison.compare(gaming(), office());
    expect(metric(result, 'price').winner).toBe('b');
    expect(metric(result, 'gaming').winner).toBe('a');
  });

  it('слоти, що відрізняються, позначаються', () => {
    const result = Comparison.compare({ name: 'A', parts: withIds({}) }, { name: 'B', parts: withIds({ gpu: 'rtx4070' }) });
    const differing = result.rows.filter((r) => !r.same).map((r) => r.key);
    expect(differing).toEqual(['gpu']);
  });

  it('неповна збірка: ціна рахується за наявними деталями, а оцінки немає', () => {
    const partial = withIds({});
    delete partial.gpu;
    const result = Comparison.compare({ name: 'Неповна', parts: partial }, gaming());
    expect(metric(result, 'power').winner).toBe(null);
    expect(metric(result, 'gaming').winner).toBe(null);
    expect(metric(result, 'price').a).toBe(Object.values(partial).reduce((s, p) => s + p.price, 0));
    expect(result.rows.find((r) => r.key === 'gpu').a).toBe(null);
  });

  it('порівняння нічого не змінює у збірках', () => {
    const a = office();
    const b = gaming();
    const before = JSON.stringify([PCSerializer.toData(a), PCSerializer.toData(b)]);
    Comparison.compare(a, b);
    expect(JSON.stringify([PCSerializer.toData(a), PCSerializer.toData(b)])).toBe(before);
  });
});

describe('Аналіз', 'Підписи каталогу для списків', () => {
  it('відмінність у відмінках слова «ядро»', () => {
    expect([1, 2, 4, 5, 11, 12, 14, 16, 21, 22].map((n) => Catalog.coresWord(n))).toEqual([
      '1 ядро', '2 ядра', '4 ядра', '5 ядер', '11 ядер', '12 ядер', '14 ядер', '16 ядер', '21 ядро', '22 ядра',
    ]);
  });

  it('плата розділяється на назву та характеристики', () => {
    expect(Catalog.parts(Catalog.find('b650'))).toEqual({ title: 'AMD B650', meta: 'ATX · DDR5' });
  });

  it('корпус: формати з дужок потрапляють у характеристики', () => {
    expect(Catalog.parts(Catalog.find('case-atx'))).toEqual({ title: 'Midi Tower', meta: 'ATX / mATX' });
  });

  it('процесор, відеокарта, пам’ять, накопичувач і БЖ', () => {
    expect(Catalog.parts(Catalog.find('r5-7600'))).toEqual({ title: 'AMD Ryzen 5 7600', meta: '6 ядер · 65 Вт' });
    expect(Catalog.parts(Catalog.find('rtx4060'))).toEqual({ title: 'GeForce RTX 4060', meta: '8 ГБ · 115 Вт' });
    expect(Catalog.parts(Catalog.find('ddr5-32'))).toEqual({ title: '32 ГБ', meta: 'DDR5-5600' });
    expect(Catalog.parts(Catalog.find('nvme-1tb'))).toEqual({ title: 'SSD NVMe', meta: '1 ТБ' });
    expect(Catalog.parts(Catalog.find('psu-650'))).toEqual({ title: '650 Вт', meta: 'Блок живлення' });
  });

  it('кожна деталь каталогу має непорожню назву', () => {
    CATALOG.forEach((item) => expect(Catalog.parts(item).title.length > 0).toBeTruthy());
  });

  it('усі процесори й відеокарти мають бал продуктивності', () => {
    CATALOG.filter((c) => c.type === 'cpu' || c.type === 'gpu').forEach((c) => expect(c.perf > 0).toBeTruthy());
  });
});
