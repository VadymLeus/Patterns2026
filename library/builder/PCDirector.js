// Директор (Director) — знає РЕЦЕПТИ готових збірок.
// Будівельник вміє збирати будь-що, директор — які саме деталі й у якому порядку
// потрібні для типової конфігурації. Рецепти бувають готові (buildOffice, buildGaming,
// buildWorkstation) і складені на льоту під бюджет (buildForBudget).
//
// Тут усі патерни працюють разом:
//   - процесор і плату директор бере з абстрактної фабрики платформи,
//   - решту деталей — зі творців фабричного методу,
//   - складає все будівельником,
//   - ціни беруться з єдиного PriceList (через Component.price).

class PCDirector {
  constructor(builder) {
    this.builder = builder;
  }

  buildOffice() {
    const intel = getPlatformFactory('intel');
    return this.builder
      .reset()
      .setName('Офісний ПК')
      .setCpu(intel.createCpu('i3-12100f'))
      .setMotherboard(intel.createMotherboard('h610m'))
      .setCooler(getCreator('cooler').create('cooler-stock'))
      .setRam(getCreator('ram').create('ddr4-16'))
      .setGpu(getCreator('gpu').create('gt1030'))
      .setStorage(getCreator('storage').create('ssd-480'))
      .setPsu(getCreator('psu').create('psu-450'))
      .setCase(getCreator('case').create('case-matx'))
      .build();
  }

  buildGaming() {
    const amd = getPlatformFactory('amd');
    return this.builder
      .reset()
      .setName('Ігровий ПК')
      .setCpu(amd.createCpu('r5-7600'))
      .setMotherboard(amd.createMotherboard('b650'))
      .setCooler(getCreator('cooler').create('cooler-tower'))
      .setRam(getCreator('ram').create('ddr5-32'))
      .setGpu(getCreator('gpu').create('rtx4060'))
      .setStorage(getCreator('storage').create('nvme-1tb'))
      .setPsu(getCreator('psu').create('psu-650'))
      .setCase(getCreator('case').create('case-gaming'))
      .build();
  }

  buildWorkstation() {
    const intel = getPlatformFactory('intel');
    return this.builder
      .reset()
      .setName('Робоча станція')
      .setCpu(intel.createCpu('i7-13700k'))
      .setMotherboard(intel.createMotherboard('z790'))
      .setCooler(getCreator('cooler').create('cooler-dual'))
      .setRam(getCreator('ram').create('ddr5-64'))
      .setGpu(getCreator('gpu').create('rtx4070'))
      .setStorage(getCreator('storage').create('nvme-2tb'))
      .setPsu(getCreator('psu').create('psu-850'))
      .setCase(getCreator('case').create('case-atx'))
      .build();
  }

  // Збірка під бюджет. Директор не знає, які деталі брати, а САМ ПІДБИРАЄ їх:
  //   1. фабрики платформ і творці створюють кандидатів (процесори й плати — лише з обраних сімейств);
  //   2. BudgetPlanner вибирає найкращу сумісну комбінацію в межах бюджету;
  //   3. будівельник збирає її й ще раз перевіряє сумісність.
  // Якщо бюджету замало — BudgetError із найменшою потрібною сумою.
  buildForBudget(budget, { purpose = 'gaming', platform = 'any', name } = {}) {
    const logger = Logger.getInstance();
    const platforms = platform === 'any' ? ['intel', 'amd'] : [platform];
    const factories = platforms.map((key) => getPlatformFactory(key)); // невідома платформа — помилка тут

    // Кандидатів створюємо мовчки, щоб журнал не вкрили сотні рядків, а підсумок запишемо нижче
    const pool = logger.silently(() => ({
      cpu: factories.flatMap((f) => f.cpuOptions().map((o) => f.createCpu(o.id))),
      motherboard: factories.flatMap((f) => f.motherboardOptions().map((o) => f.createMotherboard(o.id))),
      ...Object.fromEntries(
        ['cooler', 'ram', 'gpu', 'storage', 'psu', 'case'].map((type) => [
          type,
          Catalog.byType(type).map((o) => getCreator(type).create(o.id)),
        ])
      ),
    }));
    // По рядку на кожну фабрику, щоб у журналі було видно, хто саме створював
    factories.forEach((f) =>
      logger.log(
        'Абстрактна фабрика',
        `${f.constructor.name}: створено кандидатів — ${f.cpuOptions().length} процесорів і ${f.motherboardOptions().length} плат`,
        f.constructor.name
      )
    );
    logger.log('Фабричний метод', 'Творці створили кандидатів решти деталей: кулери, пам’ять, відеокарти, накопичувачі, БЖ, корпуси', 'ComponentCreator');

    const plan = BudgetPlanner.plan(pool, budget, purpose);
    const label = Performance.PURPOSES[purpose].label;
    logger.log(
      'Будівельник',
      `PCDirector.buildForBudget: перебрано ${plan.combos} сумісних комбінацій, найкраща для «${label}» — ${plan.cost} грн, оцінка ${Math.round(plan.score)}/100`,
      'PCDirector'
    );

    return this.builder
      .reset()
      .setName(name || `Автозбірка: ${label}`)
      .setCpu(plan.parts.cpu)
      .setMotherboard(plan.parts.motherboard)
      .setCooler(plan.parts.cooler)
      .setRam(plan.parts.ram)
      .setGpu(plan.parts.gpu)
      .setStorage(plan.parts.storage)
      .setPsu(plan.parts.psu)
      .setCase(plan.parts.case)
      .build();
  }
}
