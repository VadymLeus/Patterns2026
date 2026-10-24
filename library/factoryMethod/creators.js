// Конкретні творці (ConcreteCreator) для фабричного методу.
// Кожен перевизначає лише createComponent() і вказує свій тип.

class GpuCreator extends ComponentCreator {
  get type() { return 'gpu'; }
  createComponent(data) { return new Gpu(data); }
}

class RamCreator extends ComponentCreator {
  get type() { return 'ram'; }
  createComponent(data) { return new Ram(data); }
}

class StorageCreator extends ComponentCreator {
  get type() { return 'storage'; }
  createComponent(data) { return new Storage(data); }
}

class CoolerCreator extends ComponentCreator {
  get type() { return 'cooler'; }
  createComponent(data) { return new Cooler(data); }
}

class PsuCreator extends ComponentCreator {
  get type() { return 'psu'; }
  createComponent(data) { return new Psu(data); }
}

class CaseCreator extends ComponentCreator {
  get type() { return 'case'; }
  createComponent(data) { return new PcCase(data); }
}

// Реєстр: за типом комплектуючого повертає потрібного творця
const CREATORS = {
  gpu: new GpuCreator(),
  ram: new RamCreator(),
  storage: new StorageCreator(),
  psu: new PsuCreator(),
  cooler: new CoolerCreator(),
  case: new CaseCreator(),
};

function getCreator(type) {
  const creator = CREATORS[type];
  if (!creator) throw new Error(`Немає творця для типу "${type}"`);
  return creator;
}
