describe('Абстрактна фабрика', 'Сімейства Intel та AMD', () => {
  const intel = () => getPlatformFactory('intel');
  const amd = () => getPlatformFactory('amd');

  it('IntelFactory створює процесор і плату з сокетом LGA1700', () => {
    expect(intel().createCpu('i5-12400f').socket).toBe('LGA1700');
    expect(intel().createMotherboard('b660').socket).toBe('LGA1700');
  });

  it('AmdFactory створює процесор і плату з сокетом AM5', () => {
    expect(amd().createCpu('r5-7600').socket).toBe('AM5');
    expect(amd().createMotherboard('b650').socket).toBe('AM5');
  });

  it('продукти — екземпляри класів свого сімейства', () => {
    expect(intel().createCpu('i3-12100f')).toBeInstanceOf(IntelCpu);
    expect(intel().createMotherboard('h610m')).toBeInstanceOf(IntelMotherboard);
    expect(amd().createCpu('r5-7600')).toBeInstanceOf(AmdCpu);
    expect(amd().createMotherboard('a620m')).toBeInstanceOf(AmdMotherboard);
  });

  it('продукти сімейств є й загальними Cpu та Motherboard', () => {
    expect(amd().createCpu('r5-7600')).toBeInstanceOf(Cpu);
    expect(intel().createMotherboard('b660')).toBeInstanceOf(Motherboard);
  });

  it('виробник записаний у процесорі', () => {
    expect(intel().createCpu('i3-12100f').vendor).toBe('Intel');
    expect(amd().createCpu('r5-7600').vendor).toBe('AMD');
  });

  it('фабрика не створює деталі чужого сімейства', () => {
    expect(() => intel().createMotherboard('b650')).toThrow();
    expect(() => amd().createCpu('i3-12100f')).toThrow();
  });

  it('фабрика не створює деталь іншого типу', () => {
    expect(() => intel().createCpu('b660')).toThrow();
    expect(() => amd().createMotherboard('r5-7600')).toThrow();
  });

  it('списки варіантів містять лише деталі свого сімейства', () => {
    expect(intel().cpuOptions().length).toBe(4);
    expect(amd().cpuOptions().length).toBe(3);
    expect(intel().cpuOptions().every((i) => i.platform === 'intel')).toBeTruthy();
    expect(amd().motherboardOptions().every((i) => i.platform === 'amd')).toBeTruthy();
  });

  it('невідома платформа — помилка', () => {
    expect(() => getPlatformFactory('via')).toThrow();
  });

  it('базова PlatformFactory абстрактна', () => {
    expect(() => new PlatformFactory().createCpu('r5-7600')).toThrow();
    expect(() => new PlatformFactory().createMotherboard('b650')).toThrow();
  });
});
