describe('Аналіз', 'Карта патернів (analysis/PatternMap.js)', () => {
  const quiet = (fn) => Logger.getInstance().silently(fn);
  const entry = (actor, pattern = 'Тест') => ({ time: new Date(), pattern, message: 'тест', actor });
  const lastEntries = (since) => Logger.getInstance().entries.slice(since);

  it('Logger.log зберігає автора запису, а без нього пише null', () => {
    const logger = Logger.getInstance();
    logger.log('Тест', 'з автором', 'PCDirector');
    logger.log('Тест', 'без автора');
    const [withActor, without] = logger.entries.slice(-2);
    expect(withActor.actor).toBe('PCDirector');
    expect(without.actor).toBe(null);
  });

  it('nodeFor зводить класи проєкту до вузлів карти', () => {
    const expected = {
      PriceList: 'price', Settings: 'settings', Logger: 'logger',
      IntelFactory: 'intel', AmdFactory: 'amd',
      BudgetKitFactory: 'tier', OptimumKitFactory: 'tier', PremiumKitFactory: 'tier',
      GpuCreator: 'creators', RamCreator: 'creators', StorageCreator: 'creators',
      CoolerCreator: 'creators', PsuCreator: 'creators', CaseCreator: 'creators', ComponentCreator: 'creators',
      PCDirector: 'director', PCBuilder: 'builder', PC: 'pc', PresetRegistry: 'presets',
      PCSerializer: 'storage', BuildStorage: 'storage', KeyValueStorage: 'storage',
    };
    Object.entries(expected).forEach(([actor, id]) => expect(PatternMap.nodeFor(actor)).toBe(id));
  });

  it('невідомий автор і не-рядок не потрапляють у жоден вузол', () => {
    expect(PatternMap.nodeFor('Невідомий')).toBe(null);
    expect(PatternMap.nodeFor('')).toBe(null);
    expect(PatternMap.nodeFor(null)).toBe(null);
    expect(PatternMap.nodeFor(undefined)).toBe(null);
    expect(PatternMap.nodeFor(42)).toBe(null);
    expect(PatternMap.nodeFor({})).toBe(null);
  });

  it('вузли мають унікальні id, відомий патерн і підказку', () => {
    const ids = PatternMap.NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    PatternMap.NODES.forEach((node) => {
      expect(Boolean(PATTERN_CLASS[node.pattern])).toBe(true);
      expect(node.label.length > 0).toBe(true);
      expect(node.hint.length > 20).toBe(true);
    });
  });

  it('усі п’ять патернів лабораторної є на карті', () => {
    const patterns = new Set(PatternMap.NODES.map((n) => n.pattern));
    ['Одинак', 'Фабричний метод', 'Абстрактна фабрика', 'Будівельник', 'Прототип'].forEach((p) =>
      expect(patterns.has(p)).toBe(true)
    );
  });

  it('учасники груп існують, а кожне ребро з’єднує існуючі вузли або групи', () => {
    const ids = new Set(PatternMap.NODES.map((n) => n.id));
    const groups = new Set(PatternMap.GROUPS.map((g) => g.id));
    PatternMap.GROUPS.forEach((g) => g.members.forEach((m) => expect(ids.has(m)).toBe(true)));
    PatternMap.EDGES.forEach(([from, to, label]) => {
      expect(ids.has(from) || groups.has(from)).toBe(true);
      expect(ids.has(to) || groups.has(to)).toBe(true);
      expect(label.length > 0).toBe(true);
    });
  });

  it('кожен вузол, крім Logger, з’єднаний хоча б з одним ребром', () => {
    PatternMap.NODES.filter((n) => n.id !== 'logger').forEach((node) => {
      const linked = PatternMap.EDGES.some(([from, to]) =>
        [from, to].some((end) => PatternMap.membersOf(end).includes(node.id))
      );
      expect(linked).toBe(true);
    });
  });

  it('membersOf: для групи — її учасники, для вузла — він сам', () => {
    expect(PatternMap.membersOf('producers')).toEqual(['intel', 'amd', 'tier', 'creators']);
    expect(PatternMap.membersOf('pc')).toEqual(['pc']);
  });

  it('record() рахує записи за вузлами й пам’ятає, який клас писав останнім', () => {
    const map = new PatternMap();
    expect(map.record(entry('GpuCreator'))).toBe('creators');
    expect(map.record(entry('RamCreator'))).toBe('creators');
    expect(map.record(entry('PCBuilder'))).toBe('builder');
    expect(map.count('creators')).toBe(2);
    expect(map.count('builder')).toBe(1);
    expect(map.count('intel')).toBe(0);
    expect(map.last('creators')).toBe('RamCreator');
    expect(map.last('intel')).toBe(null);
  });

  it('лічильник Logger — це всі записи, навіть без автора', () => {
    const map = new PatternMap();
    map.record(entry('PCDirector'));
    expect(map.record(entry(null))).toBe(null);
    map.record(entry('Невідомий'));
    expect(map.total).toBe(3);
    expect(map.count('logger')).toBe(3);
    expect(map.count('director')).toBe(1);
  });

  it('reset() обнуляє лічильники й сповіщає слухачів', () => {
    const map = new PatternMap();
    const calls = [];
    map.subscribe((id, e) => calls.push([id, e]));
    map.record(entry('PC'));
    map.reset();
    expect(map.count('pc')).toBe(0);
    expect(map.total).toBe(0);
    expect(map.last('pc')).toBe(null);
    expect(calls.length).toBe(2);
    expect(calls[0][0]).toBe('pc');
    expect(calls[1]).toEqual([null, null]);
  });

  it('слухач отримує id вузла й сам запис', () => {
    const map = new PatternMap();
    let got = null;
    map.subscribe((id, e) => (got = { id, e }));
    const e = entry('Settings');
    map.record(e);
    expect(got.id).toBe('settings');
    expect(got.e).toBe(e);
  });

  it('matches(): без фільтра й для Logger видно все, для вузла — лише його записи', () => {
    expect(PatternMap.matches(entry('PC'), null)).toBe(true);
    expect(PatternMap.matches(entry(null), null)).toBe(true);
    expect(PatternMap.matches(entry('PC'), 'logger')).toBe(true);
    expect(PatternMap.matches(entry('PC'), 'pc')).toBe(true);
    expect(PatternMap.matches(entry('PC'), 'builder')).toBe(false);
    expect(PatternMap.matches(entry(null), 'pc')).toBe(false);
    expect(PatternMap.matches(entry('PremiumKitFactory'), 'tier')).toBe(true);
  });

  it('node(id) повертає опис вузла, а для чужого id — null', () => {
    expect(PatternMap.node('director').label).toBe('PCDirector');
    expect(PatternMap.node('nope')).toBe(null);
  });
});

describe('Аналіз', 'Автори записів у журналі: хто насправді пише', () => {
  const quiet = (fn) => Logger.getInstance().silently(fn);

  // Виконує дію й повертає id вузлів, що написали в журнал
  const nodesFrom = (action) => {
    const logger = Logger.getInstance();
    const before = logger.entries.length;
    action();
    return logger.entries.slice(before).map((e) => PatternMap.nodeFor(e.actor));
  };

  it('творець деталі підписується власним класом', () => {
    expect(nodesFrom(() => getCreator('gpu').create('rtx4060'))).toEqual(['creators']);
    const logger = Logger.getInstance();
    expect(logger.entries.at(-1).actor).toBe('GpuCreator');
  });

  it('фабрики платформ підписуються як IntelFactory й AmdFactory', () => {
    expect(nodesFrom(() => getPlatformFactory('intel').createCpu('i5-12400f'))).toEqual(['intel']);
    expect(nodesFrom(() => getPlatformFactory('amd').createCpu('r5-7600'))).toEqual(['amd']);
  });

  it('фабрика рівня підписується своїм класом, а її деталі — творцями', () => {
    const nodes = nodesFrom(() => getTierFactory('premium').createKit());
    expect(nodes.at(-1)).toBe('tier');
    expect(Logger.getInstance().entries.at(-1).actor).toBe('PremiumKitFactory');
  });

  it('PCBuilder.build() і PC.clone() підписуються класами PCBuilder і PC', () => {
    const pc = quiet(() => new PCDirector(new PCBuilder()).buildOffice());
    expect(nodesFrom(() => new PCDirector(new PCBuilder()).buildOffice()).includes('builder')).toBe(true);
    expect(nodesFrom(() => pc.clone())).toEqual(['pc']);
  });

  it('PresetRegistry.get() віддає клон, тож пише клас PC', () => {
    const registry = new PresetRegistry();
    quiet(() => registry.register('office', new PCDirector(new PCBuilder()).buildOffice(), 'тест'));
    expect(nodesFrom(() => registry.get('office'))).toEqual(['pc']);
  });

  it('Settings і PriceList підписуються власними іменами', () => {
    const settings = Settings.getInstance();
    expect(nodesFrom(() => settings.setTheme('dark'))).toEqual(['settings']);
    quiet(() => settings.setTheme('auto'));
    const prices = PriceList.getInstance();
    const old = prices.discount;
    expect(nodesFrom(() => prices.setDiscount(5))).toEqual(['price']);
    quiet(() => prices.setDiscount(old));
  });

  it('підбір під бюджет задіює обидві фабрики платформ, творців і PCDirector', () => {
    const nodes = nodesFrom(() => new PCDirector(new PCBuilder()).buildForBudget(60000, { purpose: 'gaming' }));
    ['intel', 'amd', 'creators', 'director', 'builder'].forEach((id) => expect(nodes.includes(id)).toBe(true));
  });

  it('жоден запис бібліотеки не лишається без вузла на карті', () => {
    const nodes = nodesFrom(() => {
      const director = new PCDirector(new PCBuilder());
      const pc = director.buildGaming();
      pc.clone();
      director.buildForBudget(50000, { purpose: 'office' });
      getTierFactory('budget').createKit();
      PCSerializer.restoreAll([PCSerializer.toData(pc)]);
    });
    expect(nodes.length > 10).toBe(true);
    nodes.forEach((id) => expect(id === null).toBe(false));
  });
});
