describe('Одинак', 'Settings: валюта і тема', () => {
  const settings = () => Settings.getInstance();
  const quiet = (fn) => Logger.getInstance().silently(fn);

  // Після кожного тесту повертаємо налаштування за замовчуванням
  afterEach(() =>
    quiet(() => {
      settings().setCurrency('UAH');
      settings().setTheme('auto');
    })
  );

  it('new Settings() повертає той самий об’єкт, що й getInstance()', () => {
    expect(new Settings()).toBe(Settings.getInstance());
  });

  it('за замовчуванням гривня й автоматична тема', () => {
    expect(settings().currency).toBe('UAH');
    expect(settings().theme).toBe('auto');
  });

  it('гривні переводяться в долари та євро за курсом', () => {
    quiet(() => settings().setCurrency('USD'));
    expect(Math.round(settings().convert(41500))).toBe(1000);
    quiet(() => settings().setCurrency('EUR'));
    expect(Math.round(settings().convert(45000))).toBe(1000);
  });

  it('формат гривні: число та «грн»', () => {
    const text = settings().format(43800);
    expect(text.replace(/\D/g, '')).toBe('43800');
    expect(text.endsWith('грн')).toBeTruthy();
  });

  it('формат долара та євро', () => {
    quiet(() => settings().setCurrency('USD'));
    expect(settings().format(41500)).toBe('$1,000.00');
    quiet(() => settings().setCurrency('EUR'));
    expect(settings().format(45000)).toBe('€1,000.00');
  });

  it('ціна деталі від валюти не залежить: змінюється лише показ', () => {
    const gpu = getCreator('gpu').create('rtx4060');
    const before = gpu.price;
    quiet(() => settings().setCurrency('USD'));
    expect(gpu.price).toBe(before);
  });

  it('невідома валюта й тема — помилка', () => {
    expect(() => settings().setCurrency('XYZ')).toThrow();
    expect(() => settings().setCurrency('toString')).toThrow();
    expect(() => settings().setTheme('neon')).toThrow();
  });

  it('toData() віддає поточні налаштування', () => {
    quiet(() => {
      settings().setCurrency('EUR');
      settings().setTheme('dark');
    });
    expect(settings().toData()).toEqual({ currency: 'EUR', theme: 'dark' });
  });

  it('restore() застосовує коректні значення', () => {
    settings().restore({ currency: 'USD', theme: 'light' });
    expect(settings().currency).toBe('USD');
    expect(settings().theme).toBe('light');
  });

  it('restore() ігнорує сміття й не ламається', () => {
    settings().restore({ currency: 'XXX', theme: 'neon' });
    settings().restore(null);
    settings().restore('рядок');
    settings().restore({ currency: { toString: 1 } });
    expect(settings().toData()).toEqual({ currency: 'UAH', theme: 'auto' });
  });

  it('слухачі отримують сповіщення про зміну, а restore() їх не турбує', () => {
    let calls = 0;
    settings().subscribe(() => calls++);
    settings().restore({ currency: 'EUR' });
    expect(calls).toBe(0);
    quiet(() => settings().setTheme('dark'));
    expect(calls).toBe(1);
  });

  it('зміна налаштувань записується в журнал', () => {
    const logger = Logger.getInstance();
    const before = logger.entries.length;
    settings().setCurrency('USD');
    expect(logger.entries.length).toBe(before + 1);
  });
});
