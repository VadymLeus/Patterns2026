describe('Будівельник', 'Збірка під бюджет (PCDirector.buildForBudget + BudgetPlanner)', () => {
  const PURPOSES = ['office', 'gaming', 'workstation'];
  const PLATFORMS = ['any', 'intel', 'amd'];
  const BUDGETS = [17000, 20000, 25000, 30000, 40000, 55000, 75000, 100000];
  const quietly = (fn) => Logger.getInstance().silently(fn);
  const director = () => new PCDirector(new PCBuilder());
  const attempt = (budget, options) => {
    try {
      return quietly(() => director().buildForBudget(budget, options));
    } catch (e) {
      if (e instanceof BudgetError) return null;
      throw e;
    }
  };

  afterEach(() => quietly(() => PriceList.getInstance().setDiscount(0)));

  it('повертає готовий PC, що вкладається в бюджет', () => {
    const pc = quietly(() => director().buildForBudget(45000, { purpose: 'gaming' }));
    expect(pc).toBeInstanceOf(PC);
    expect(pc.totalPrice <= 45000).toBeTruthy();
    expect(pc.totalPrice > 30000).toBeTruthy();
  });

  it('усі збірки для різних бюджетів, призначень і платформ сумісні', () => {
    let built = 0;
    PURPOSES.forEach((purpose) =>
      PLATFORMS.forEach((platform) =>
        BUDGETS.forEach((budget) => {
          const pc = attempt(budget, { purpose, platform });
          if (!pc) return;
          built++;
          expect(Compatibility.check(pc.parts).problems.length).toBe(0);
          expect(pc.totalPrice <= budget).toBeTruthy();
        })
      )
    );
    expect(built > 40).toBeTruthy();
  });

  it('оцінка не падає, коли бюджет зростає', () => {
    PURPOSES.forEach((purpose) =>
      PLATFORMS.forEach((platform) => {
        let previous = -1;
        BUDGETS.forEach((budget) => {
          const pc = attempt(budget, { purpose, platform });
          if (!pc) return;
          const score = Performance.score(pc.parts, purpose);
          expect(score >= previous - 1e-9).toBeTruthy();
          previous = score;
        });
      })
    );
  });

  it('вибір платформи обмежує процесор і плату цим сімейством', () => {
    ['intel', 'amd'].forEach((platform) => {
      const pc = quietly(() => director().buildForBudget(60000, { purpose: 'gaming', platform }));
      expect(pc.parts.cpu.vendor.toLowerCase()).toBe(platform);
      expect(pc.parts.cpu.socket).toBe(pc.parts.motherboard.socket);
    });
  });

  it('для офісу вистачає мінімальної збірки, великий бюджет нічого не змінює', () => {
    const small = quietly(() => director().buildForBudget(20000, { purpose: 'office' }));
    const large = quietly(() => director().buildForBudget(150000, { purpose: 'office' }));
    expect(Math.round(Performance.score(small.parts, 'office'))).toBe(100);
    expect(large.totalPrice).toBe(small.totalPrice);
  });

  it('великий бюджет для ігор іде на запас: потужний БЖ, охолодження, корпус і плату', () => {
    const pc = quietly(() => director().buildForBudget(100000, { purpose: 'gaming' }));
    expect(pc.parts.psu.watts >= pc.recommendedPsuWatts).toBeTruthy();
    expect(pc.parts.cooler.maxTdp >= pc.parts.cpu.tdp).toBeTruthy();
    expect(pc.parts.psu.watts).toBe(850);
    expect(pc.parts.case.id).toBe('case-gaming');
  });

  it('для ігор за середній бюджет відеокарта сильніша, ніж за малий', () => {
    const small = quietly(() => director().buildForBudget(30000, { purpose: 'gaming' }));
    const medium = quietly(() => director().buildForBudget(55000, { purpose: 'gaming' }));
    expect(medium.parts.gpu.perf > small.parts.gpu.perf).toBeTruthy();
  });

  it('для роботи пам’яті не менше 32 ГБ, накопичувач — SSD від 1 ТБ', () => {
    const pc = quietly(() => director().buildForBudget(40000, { purpose: 'workstation' }));
    expect(pc.parts.ram.sizeGb >= 32).toBeTruthy();
    expect(pc.parts.storage.kind).toBe('SSD');
    expect(pc.parts.storage.sizeGb >= 1000).toBeTruthy();
  });

  it('замало грошей: BudgetError із найменшою потрібною сумою', () => {
    let error = null;
    try {
      quietly(() => director().buildForBudget(5000, { purpose: 'gaming' }));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(BudgetError);
    expect(error.minBudget > 5000).toBeTruthy();
  });

  it('збірка за найменшу суму можлива, а на гривню менше — вже ні', () => {
    PURPOSES.forEach((purpose) => {
      let minBudget = 0;
      try {
        quietly(() => director().buildForBudget(1, { purpose }));
      } catch (e) {
        minBudget = e.minBudget;
      }
      expect(minBudget > 0).toBeTruthy();
      expect(quietly(() => director().buildForBudget(minBudget, { purpose })).totalPrice).toBe(minBudget);
      expect(attempt(minBudget - 1, { purpose })).toBe(null);
    });
  });

  it('знижка в PriceList дозволяє зібрати дешевше й краще', () => {
    const before = quietly(() => director().buildForBudget(30000, { purpose: 'gaming' }));
    quietly(() => PriceList.getInstance().setDiscount(30));
    const after = quietly(() => director().buildForBudget(30000, { purpose: 'gaming' }));
    expect(Performance.score(after.parts, 'gaming') > Performance.score(before.parts, 'gaming')).toBeTruthy();
    expect(after.totalPrice <= 30000).toBeTruthy();
  });

  it('некоректний бюджет, призначення чи платформа — помилка', () => {
    [0, -100, NaN, Infinity, 'abc'].forEach((budget) =>
      expect(() => quietly(() => director().buildForBudget(budget, { purpose: 'gaming' }))).toThrow()
    );
    expect(() => quietly(() => director().buildForBudget(40000, { purpose: 'mining' }))).toThrow();
    expect(() => quietly(() => director().buildForBudget(40000, { platform: 'arm' }))).toThrow();
  });

  it('ім’я за замовчуванням і задане вручну', () => {
    expect(quietly(() => director().buildForBudget(40000, { purpose: 'gaming' })).name).toBe('Автозбірка: Ігри');
    expect(quietly(() => director().buildForBudget(40000, { purpose: 'gaming', name: 'Мій ПК' })).name).toBe('Мій ПК');
  });

  it('будівельник після підбору порожній, а кожен виклик дає нові деталі', () => {
    const builder = new PCBuilder();
    const a = quietly(() => new PCDirector(builder).buildForBudget(40000, { purpose: 'gaming' }));
    const b = quietly(() => new PCDirector(builder).buildForBudget(40000, { purpose: 'gaming' }));
    expect(Object.values(builder.snapshot()).filter(Boolean).length).toBe(0);
    expect(a.parts.cpu).not.toBe(b.parts.cpu);
    expect(a.parts.cpu.id).toBe(b.parts.cpu.id);
  });

  it('в журналі видно співпрацю патернів', () => {
    const logger = Logger.getInstance();
    const before = logger.entries.length;
    director().buildForBudget(40000, { purpose: 'gaming' });
    const patterns = logger.entries.slice(before).map((e) => e.pattern);
    expect(patterns).toContain('Абстрактна фабрика');
    expect(patterns).toContain('Фабричний метод');
    expect(patterns).toContain('Будівельник');
    expect(patterns.length < 8).toBeTruthy(); // кандидатів створено мовчки, журнал не засмічено
  });

  it('BudgetPlanner.plan без кандидатів кидає BudgetError без суми', () => {
    const pool = { cpu: [], motherboard: [], cooler: [], ram: [], gpu: [], storage: [], psu: [], case: [] };
    let error = null;
    try {
      BudgetPlanner.plan(pool, 50000, 'gaming');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(BudgetError);
    expect(error.minBudget).toBe(null);
  });
});
