// Конкретні фабрики комплектів (ConcreteFactory).
// Кожна явно створює п'ять деталей свого рівня, використовуючи творців фабричного методу.

class BudgetKitFactory extends TierFactory {
  get tier() { return 'budget'; }
  get label() { return 'Бюджет'; }

  createGpu() { return getCreator('gpu').create('gt1030'); }
  createStorage() { return getCreator('storage').create('ssd-480'); }
  createPsu() { return getCreator('psu').create('psu-450'); }
  createCase() { return getCreator('case').create('case-matx'); }
  createCooler() { return getCreator('cooler').create('cooler-stock'); }
}

class OptimumKitFactory extends TierFactory {
  get tier() { return 'optimum'; }
  get label() { return 'Оптимум'; }

  createGpu() { return getCreator('gpu').create('rtx4060'); }
  createStorage() { return getCreator('storage').create('nvme-1tb'); }
  createPsu() { return getCreator('psu').create('psu-650'); }
  createCase() { return getCreator('case').create('case-atx'); }
  createCooler() { return getCreator('cooler').create('cooler-tower'); }
}

class PremiumKitFactory extends TierFactory {
  get tier() { return 'premium'; }
  get label() { return 'Преміум'; }

  createGpu() { return getCreator('gpu').create('rtx4070'); }
  createStorage() { return getCreator('storage').create('nvme-2tb'); }
  createPsu() { return getCreator('psu').create('psu-850'); }
  createCase() { return getCreator('case').create('case-gaming'); }
  createCooler() { return getCreator('cooler').create('cooler-aio240'); }
}

// Реєстр: за ключем рівня повертає потрібну фабрику
const TIERS = {
  budget: new BudgetKitFactory(),
  optimum: new OptimumKitFactory(),
  premium: new PremiumKitFactory(),
};

function getTierFactory(key) {
  const tierFactory = TIERS[key];
  if (!tierFactory) throw new Error(`Невідомий рівень "${key}"`);
  return tierFactory;
}
