describe('Одинак', 'PriceList і Logger', () => {
  const prices = () => PriceList.getInstance();
  afterEach(() => Logger.getInstance().silently(() => prices().setDiscount(0)));

  it('new PriceList() повертає той самий об’єкт, що й getInstance()', () => {
    expect(new PriceList()).toBe(PriceList.getInstance());
  });

  it('getInstance() щоразу повертає один і той самий екземпляр', () => {
    expect(PriceList.getInstance()).toBe(PriceList.getInstance());
  });

  it('Logger теж одинак', () => {
    expect(new Logger()).toBe(Logger.getInstance());
  });

  it('знижка діє на всі комплектуючі одразу', () => {
    const gpu = getCreator('gpu').create('rtx4060');
    const cpu = getPlatformFactory('amd').createCpu('r5-7600');
    const gpuBefore = gpu.price;
    const cpuBefore = cpu.price;
    Logger.getInstance().silently(() => prices().setDiscount(10));
    expect(gpu.price).toBe(Math.round(gpuBefore * 0.9));
    expect(cpu.price).toBe(Math.round(cpuBefore * 0.9));
  });

  it('ціну деталі віддає PriceList, а не сама деталь', () => {
    const gpu = getCreator('gpu').create('rtx4060');
    expect(gpu.price).toBe(prices().getPrice('rtx4060'));
  });

  it('знижка обмежена діапазоном 0–50 %', () => {
    const silently = (fn) => Logger.getInstance().silently(fn);
    expect(silently(() => prices().setDiscount(999))).toBe(50);
    expect(silently(() => prices().setDiscount(-5))).toBe(0);
    expect(silently(() => prices().setDiscount('abc'))).toBe(0);
  });

  it('невідомий id не має ціни', () => {
    expect(() => prices().getPrice('nope')).toThrow();
  });

  it('Logger.silently() не пише в журнал, а звичайний log() пише', () => {
    const logger = Logger.getInstance();
    const before = logger.entries.length;
    logger.silently(() => logger.log('Тест', 'тиха подія'));
    expect(logger.entries.length).toBe(before);
    logger.log('Тест', 'звичайна подія');
    expect(logger.entries.length).toBe(before + 1);
  });

  it('Logger повідомляє підписників про нові записи', () => {
    const logger = Logger.getInstance();
    const received = [];
    logger.subscribe((entry) => received.push(entry.message));
    logger.log('Тест', 'ping');
    expect(received).toContain('ping');
  });
});
