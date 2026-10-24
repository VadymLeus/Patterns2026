// АБСТРАКТНА ФАБРИКА №2 — комплекти за рівнем (Бюджет / Оптимум / Преміум).
//
// Учасники:
//   AbstractFactory  — TierFactory (цей файл)
//   ConcreteFactory  — BudgetKitFactory, OptimumKitFactory, PremiumKitFactory (tiers.js)
//   Products         — Gpu, Storage, Psu, PcCase, Cooler
//
// Перша абстрактна фабрика (PlatformFactory) гарантує СУМІСНІСТЬ: процесор і плата з одним сокетом.
// Ця гарантує УЗГОДЖЕНІСТЬ КЛАСУ: відеокарта, накопичувач, блок живлення, корпус і кулер
// одного рівня, щоб не вийшло потужної відеокарти з мінімальним блоком живлення.
//
// Клієнт (script.js) працює лише з інтерфейсом TierFactory і не знає, який саме рівень за ним стоїть.

class TierFactory {
  get tier() {
    throw new Error('Підклас має визначити tier');
  }

  get label() {
    throw new Error('Підклас має визначити label');
  }

  createGpu() {
    throw new Error('Підклас має реалізувати createGpu()');
  }

  createStorage() {
    throw new Error('Підклас має реалізувати createStorage()');
  }

  createPsu() {
    throw new Error('Підклас має реалізувати createPsu()');
  }

  createCase() {
    throw new Error('Підклас має реалізувати createCase()');
  }

  createCooler() {
    throw new Error('Підклас має реалізувати createCooler()');
  }

  // Увесь комплект одним викликом: { gpu, storage, psu, case, cooler }
  createKit() {
    const kit = {
      gpu: this.createGpu(),
      storage: this.createStorage(),
      psu: this.createPsu(),
      case: this.createCase(),
      cooler: this.createCooler(),
    };
    Logger.getInstance().log(
      'Абстрактна фабрика',
      `${this.constructor.name} створила комплект «${this.label}»: 5 узгоджених деталей одного рівня`,
      this.constructor.name
    );
    return kit;
  }
}
