// ФАБРИЧНИЙ МЕТОД (Factory Method).
//
// Учасники:
//   Creator          — ComponentCreator (цей файл)
//   ConcreteCreator  — GpuCreator, RamCreator, StorageCreator, PsuCreator, CaseCreator (creators.js)
//   Product          — Component (models/Component.js)
//   ConcreteProduct  — Gpu, Ram, Storage, Psu, PcCase
//
// Ідея: базовий клас описує ЗАГАЛЬНИЙ алгоритм створення (create),
// а який саме об'єкт створити, вирішує підклас у методі createComponent().
// Додати новий тип комплектуючого = додати новий підклас, не змінюючи решту коду.

class ComponentCreator {
  // Шаблонний метод: однаковий для всіх творців
  create(id) {
    const data = Catalog.find(id);
    if (data.type !== this.type) {
      throw new Error(`${this.constructor.name} створює лише "${this.type}", а не "${data.type}"`);
    }
    const component = this.createComponent(data); // <- фабричний метод
    Logger.getInstance().log('Фабричний метод', `${this.constructor.name} створив: ${component.name}`, this.constructor.name);
    return component;
  }

  // Підклас повертає тип каталогу, з яким працює
  get type() {
    throw new Error('Підклас має визначити type');
  }

  // Власне фабричний метод — його перевизначають підкласи
  createComponent(data) {
    throw new Error('Підклас має реалізувати createComponent()');
  }
}
