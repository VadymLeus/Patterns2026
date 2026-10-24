describe('Прототип', 'PC.clone() та PresetRegistry', () => {
  const gaming = () => new PCDirector(new PCBuilder()).buildGaming();

  it('клон — новий об’єкт з приставкою (копія) у назві', () => {
    const original = gaming();
    const copy = original.clone();
    expect(copy).not.toBe(original);
    expect(copy.name).toBe('Ігровий ПК (копія)');
  });

  it('клон отримує власний id', () => {
    const original = gaming();
    expect(original.clone().id).not.toBe(original.id);
  });

  it('копія глибока: кожна деталь — окремий об’єкт', () => {
    const original = gaming();
    const copy = original.clone();
    PC_SLOTS.forEach(({ key }) => expect(copy.parts[key]).not.toBe(original.parts[key]));
  });

  it('клон зберігає класи деталей', () => {
    const copy = gaming().clone();
    expect(copy.parts.cpu).toBeInstanceOf(AmdCpu);
    expect(copy.parts.motherboard).toBeInstanceOf(AmdMotherboard);
    expect(copy.parts.gpu).toBeInstanceOf(Gpu);
    expect(copy.parts.case).toBeInstanceOf(PcCase);
  });

  it('зміна копії не зачіпає оригінал', () => {
    const original = gaming();
    const copy = original.clone();
    copy.parts.gpu.name = 'ЗМІНЕНО';
    copy.parts.case.supports.push('EATX');
    expect(original.parts.gpu.name).toBe('GeForce RTX 4060 8 ГБ');
    expect(original.parts.case.supports).not.toContain('EATX');
  });

  it('у клона та оригіналу однакова ціна', () => {
    const original = gaming();
    expect(original.clone().totalPrice).toBe(original.totalPrice);
  });

  it('клон клона теж працює', () => {
    expect(gaming().clone().clone().name).toBe('Ігровий ПК (копія) (копія)');
  });

  it('окрема деталь теж клонується', () => {
    const gpu = getCreator('gpu').create('rtx4060');
    const copy = gpu.clone();
    expect(copy).not.toBe(gpu);
    expect(copy).toBeInstanceOf(Gpu);
    expect(copy.name).toBe(gpu.name);
    expect(copy.price).toBe(gpu.price);
  });

  it('реєстр щоразу віддає новий клон, а не сам зразок', () => {
    const registry = new PresetRegistry().register('g', gaming(), 'опис');
    expect(registry.get('g')).not.toBe(registry.get('g'));
  });

  it('зміна клона з реєстру не псує зразок', () => {
    const registry = new PresetRegistry().register('g', gaming(), 'опис');
    registry.get('g').parts.gpu.name = 'ЗМІНЕНО';
    expect(registry.get('g').parts.gpu.name).toBe('GeForce RTX 4060 8 ГБ');
  });

  it('list() показує зразки без їх клонування', () => {
    const registry = new PresetRegistry().register('g', gaming(), 'Ігри');
    const [item] = registry.list();
    expect(item.key).toBe('g');
    expect(item.name).toBe('Ігровий ПК');
    expect(item.description).toBe('Ігри');
  });

  it('невідомий ключ — помилка', () => {
    expect(() => new PresetRegistry().get('nope')).toThrow();
  });
});
