describe('Абстрактна фабрика', 'Комплекти за рівнем (TierFactory)', () => {
  const KIT_SLOTS = ['gpu', 'storage', 'psu', 'case', 'cooler'];

  it('комплект містить п’ять деталей потрібних класів', () => {
    const kit = getTierFactory('optimum').createKit();
    expect(Object.keys(kit)).toEqual(KIT_SLOTS);
    expect(kit.gpu).toBeInstanceOf(Gpu);
    expect(kit.storage).toBeInstanceOf(Storage);
    expect(kit.psu).toBeInstanceOf(Psu);
    expect(kit.case).toBeInstanceOf(PcCase);
    expect(kit.cooler).toBeInstanceOf(Cooler);
  });

  it('кожна фабрика видає деталі свого рівня', () => {
    expect(getTierFactory('budget').createKit().gpu.id).toBe('gt1030');
    expect(getTierFactory('optimum').createKit().gpu.id).toBe('rtx4060');
    expect(getTierFactory('premium').createKit().gpu.id).toBe('rtx4070');
  });

  it('вищий рівень дає потужнішу відеокарту, БЖ і кулер', () => {
    const budget = getTierFactory('budget').createKit();
    const premium = getTierFactory('premium').createKit();
    expect(premium.gpu.tdp > budget.gpu.tdp).toBeTruthy();
    expect(premium.psu.watts > budget.psu.watts).toBeTruthy();
    expect(premium.cooler.maxTdp > budget.cooler.maxTdp).toBeTruthy();
  });

  it('в комплекті блоку живлення вистачає його ж відеокарті', () => {
    ['budget', 'optimum', 'premium'].forEach((tier) => {
      const kit = getTierFactory(tier).createKit();
      expect(kit.psu.watts >= Compatibility.requiredPsuWatts({ tdp: 65 }, kit.gpu)).toBeTruthy();
    });
  });

  it('кожен виклик створює нові об’єкти', () => {
    const factory = getTierFactory('optimum');
    expect(factory.createKit().gpu).not.toBe(factory.createKit().gpu);
  });

  it('конкретні фабрики — підкласи TierFactory', () => {
    expect(getTierFactory('budget')).toBeInstanceOf(TierFactory);
    expect(getTierFactory('premium')).toBeInstanceOf(PremiumKitFactory);
    expect(getTierFactory('optimum').label).toBe('Оптимум');
  });

  it('створення комплекту записується в журнал', () => {
    const logger = Logger.getInstance();
    const before = logger.entries.length;
    getTierFactory('budget').createKit();
    const last = logger.entries.slice(before).map((e) => e.message).join(' | ');
    expect(last).toContain('BudgetKitFactory створила комплект');
  });

  it('невідомий рівень — помилка', () => {
    expect(() => getTierFactory('ultra')).toThrow();
  });

  it('базова TierFactory абстрактна', () => {
    const base = new TierFactory();
    expect(() => base.createGpu()).toThrow();
    expect(() => base.createStorage()).toThrow();
    expect(() => base.createPsu()).toThrow();
    expect(() => base.createCase()).toThrow();
    expect(() => base.createCooler()).toThrow();
    expect(() => base.createKit()).toThrow();
  });

  it('комплект + сумісна платформа дають сумісну збірку на кожному рівні', () => {
    const cases = [
      ['budget', 'r5-7600', 'a620m', 'ddr5-16'],
      ['optimum', 'r5-7600', 'b650', 'ddr5-32'],
      ['premium', 'r9-7900x', 'x670e', 'ddr5-64'],
    ];
    cases.forEach(([tier, cpu, board, ram]) => {
      const kit = getTierFactory(tier).createKit();
      const parts = {
        ...kit,
        cpu: PCSerializer.createPart('cpu', cpu),
        motherboard: PCSerializer.createPart('motherboard', board),
        ram: PCSerializer.createPart('ram', ram),
      };
      expect(Compatibility.check(parts).problems.length).toBe(0);
    });
  });

  it('бюджетний комплект не вмістить ATX-плату — конфлікт видно в перевірці', () => {
    const kit = getTierFactory('budget').createKit();
    const parts = {
      ...kit,
      cpu: PCSerializer.createPart('cpu', 'r5-7600'),
      motherboard: PCSerializer.createPart('motherboard', 'b650'),
      ram: PCSerializer.createPart('ram', 'ddr5-32'),
    };
    const { conflicts } = Compatibility.check(parts);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].slots).toEqual(['motherboard', 'case']);
  });
});
