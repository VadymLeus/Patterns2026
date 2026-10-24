describe('Фабричний метод', 'Нова деталь: охолодження', () => {
  const partsFor = (overrides = {}) => {
    const ids = {
      cpu: 'r5-7600',
      motherboard: 'b650',
      cooler: 'cooler-tower',
      ram: 'ddr5-32',
      gpu: 'rtx4060',
      storage: 'nvme-1tb',
      psu: 'psu-650',
      case: 'case-atx',
      ...overrides,
    };
    const parts = {};
    PC_SLOTS.forEach(({ key }) => (parts[key] = PCSerializer.createPart(key, ids[key])));
    return parts;
  };

  it('CoolerCreator створює Cooler з каталогу', () => {
    const cooler = getCreator('cooler').create('cooler-tower');
    expect(cooler).toBeInstanceOf(Cooler);
    expect(cooler.maxTdp).toBe(120);
    expect(getCreator('cooler')).toBeInstanceOf(CoolerCreator);
  });

  it('охолодження — окремий слот збірки', () => {
    expect(PC_SLOTS.map((s) => s.key)).toContain('cooler');
  });

  it('кулер клонується разом із ПК', () => {
    const pc = new PCDirector(new PCBuilder()).buildGaming();
    const copy = pc.clone();
    expect(copy.parts.cooler).toBeInstanceOf(Cooler);
    expect(copy.parts.cooler).not.toBe(pc.parts.cooler);
  });

  it('у кожній готовій збірці кулер справляється з процесором', () => {
    const director = new PCDirector(new PCBuilder());
    [director.buildOffice(), director.buildGaming(), director.buildWorkstation()].forEach((pc) => {
      expect(pc.parts.cooler.maxTdp >= pc.parts.cpu.tdp).toBeTruthy();
    });
  });

  it('слабкий кулер конфліктує з процесором', () => {
    const { conflicts } = Compatibility.check(partsFor({ cpu: 'r9-7900x' })); // 170 Вт проти 120 Вт
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].slots).toEqual(['cooler', 'cpu']);
    expect(conflicts[0].message).toContain('Кулер розрахований на 120 Вт');
  });

  it('кулер із запасом потужності не конфліктує', () => {
    expect(Compatibility.check(partsFor({ cpu: 'r9-7900x', cooler: 'cooler-aio240' })).problems.length).toBe(0);
  });

  it('кулер рівно на межі потужності підходить', () => {
    // штатний на 65 Вт та процесор на 65 Вт
    expect(Compatibility.check(partsFor({ cooler: 'cooler-stock' })).problems.length).toBe(0);
  });

  it('збірка без кулера не створюється', () => {
    const builder = new PCBuilder().setName('x');
    const parts = partsFor();
    PC_SLOTS.filter((s) => s.key !== 'cooler').forEach(({ key }) => builder.setPart(key, parts[key]));
    let error = null;
    try {
      builder.build();
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(BuildError);
    expect(error.issues[0]).toContain('Охолодження');
  });
});
