describe('Будівельник', 'PCBuilder, PCDirector та правила сумісності', () => {
  // AMD-збірка, яка гарантовано сумісна; тести змінюють по одній деталі
  const GOOD = {
    cpu: 'r5-7600',
    motherboard: 'b650',
    cooler: 'cooler-tower',
    ram: 'ddr5-32',
    gpu: 'rtx4060',
    storage: 'nvme-1tb',
    psu: 'psu-650',
    case: 'case-atx',
  };

  const partsFor = (overrides = {}) => {
    const ids = { ...GOOD, ...overrides };
    const parts = {};
    PC_SLOTS.forEach(({ key }) => (parts[key] = PCSerializer.createPart(key, ids[key])));
    return parts;
  };

  const tryBuild = (overrides = {}) => {
    const builder = new PCBuilder().setName('Тест');
    const parts = partsFor(overrides);
    PC_SLOTS.forEach(({ key }) => builder.setPart(key, parts[key]));
    try {
      return { pc: builder.build() };
    } catch (error) {
      return { error };
    }
  };

  it('збирає коректний ПК і зберігає назву', () => {
    const { pc } = tryBuild();
    expect(pc).toBeInstanceOf(PC);
    expect(pc.name).toBe('Тест');
    expect(pc.parts.cpu.id).toBe('r5-7600');
  });

  it('методи set* повертають сам будівельник (fluent interface)', () => {
    const builder = new PCBuilder();
    expect(builder.setName('x')).toBe(builder);
    expect(builder.setCpu(partsFor().cpu)).toBe(builder);
    expect(builder.setGpu(partsFor().gpu)).toBe(builder);
  });

  it('неповну збірку не створює: BuildError з переліком відсутніх деталей', () => {
    let error = null;
    try {
      new PCBuilder().setName('x').build();
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(BuildError);
    expect(error.issues.length).toBe(PC_SLOTS.length);
  });

  it('процесор іншого сокета не підходить до плати', () => {
    const { error } = tryBuild({ cpu: 'i3-12100f' });
    expect(error).toBeInstanceOf(BuildError);
    expect(error.message).toContain('Сокет процесора (LGA1700) не підходить до материнської плати (AM5)');
  });

  it('пам’ять іншого типу не підходить до плати', () => {
    const { error } = tryBuild({ ram: 'ddr4-16' });
    expect(error).toBeInstanceOf(BuildError);
    expect(error.issues[0]).toContain('DDR5');
  });

  it('ATX-плата не влізе в корпус лише для mATX', () => {
    const { error } = tryBuild({ case: 'case-matx' });
    expect(error).toBeInstanceOf(BuildError);
    expect(error.issues[0]).toContain('Корпус не підтримує');
  });

  it('mATX-плата влізе і в mATX-, і в ATX-корпус', () => {
    expect(tryBuild({ motherboard: 'a620m', case: 'case-matx' }).pc).toBeInstanceOf(PC);
    expect(tryBuild({ motherboard: 'a620m', case: 'case-atx' }).pc).toBeInstanceOf(PC);
  });

  it('надто слабкий блок живлення відхиляється', () => {
    const { error } = tryBuild({ gpu: 'rx7800xt', psu: 'psu-450' });
    expect(error).toBeInstanceOf(BuildError);
    expect(error.issues[0]).toContain('Блок живлення');
  });

  it('потужності блока живлення вистачає, коли він не менший за потрібний', () => {
    // (65 + 115 + 100) * 1.2 = 336 Вт
    expect(Compatibility.requiredPsuWatts(partsFor().cpu, partsFor().gpu)).toBe(336);
    expect(tryBuild({ psu: 'psu-450' }).pc).toBeInstanceOf(PC);
  });

  it('Compatibility.check() вказує, які саме слоти конфліктують', () => {
    const { conflicts } = Compatibility.check(partsFor({ cpu: 'i3-12100f' }));
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].slots).toEqual(['cpu', 'motherboard']);
  });

  it('кілька проблем одразу — усі в одному BuildError', () => {
    const { error } = tryBuild({ cpu: 'i3-12100f', ram: 'ddr4-16' });
    expect(error.issues.length).toBe(2);
  });

  it('у слот не можна покласти деталь іншого типу', () => {
    expect(() => new PCBuilder().setGpu(partsFor().cpu)).toThrow();
    expect(() => new PCBuilder().setPart('nope', partsFor().cpu)).toThrow();
  });

  it('після build() будівельник порожній і готовий до нової збірки', () => {
    const builder = new PCBuilder().setName('Один');
    const parts = partsFor();
    PC_SLOTS.forEach(({ key }) => builder.setPart(key, parts[key]));
    builder.build();
    expect(builder.validate().missing.length).toBe(PC_SLOTS.length);
  });

  it('порожня назва замінюється назвою за замовчуванням', () => {
    const builder = new PCBuilder().setName('   ');
    const parts = partsFor();
    PC_SLOTS.forEach(({ key }) => builder.setPart(key, parts[key]));
    expect(builder.build().name).toBe('Нова збірка');
  });

  it('PCDirector збирає три сумісні готові збірки', () => {
    const director = new PCDirector(new PCBuilder());
    [director.buildOffice(), director.buildGaming(), director.buildWorkstation()].forEach((pc) => {
      expect(pc).toBeInstanceOf(PC);
      expect(Compatibility.check(pc.parts).problems.length).toBe(0);
    });
  });

  it('готові збірки використовують обидві платформи', () => {
    const director = new PCDirector(new PCBuilder());
    expect(director.buildOffice().parts.cpu.vendor).toBe('Intel');
    expect(director.buildGaming().parts.cpu.vendor).toBe('AMD');
  });
});
