// АБСТРАКТНА ФАБРИКА (Abstract Factory).
//
// Учасники:
//   AbstractFactory   — PlatformFactory (цей файл)
//   ConcreteFactory   — IntelFactory, AmdFactory
//   AbstractProduct   — Cpu, Motherboard (models/Component.js)
//   ConcreteProduct   — IntelCpu, IntelMotherboard, AmdCpu, AmdMotherboard (products.js)
//
// Ідея: фабрика створює не один об'єкт, а ЦІЛЕ СІМЕЙСТВО сумісних об'єктів.
// Процесор і материнську плату беруть з однієї фабрики, тому вони завжди мають один сокет.
// Спробувати отримати з IntelFactory плату AMD — помилка.
//
// Відмінність від фабричного методу: там один продукт і наслідування,
// тут — набір пов'язаних продуктів, які мають бути узгоджені між собою.

class PlatformFactory {
  get platform() {
    throw new Error('Підклас має визначити platform');
  }

  get label() {
    throw new Error('Підклас має визначити label');
  }

  createCpu(id) {
    throw new Error('Підклас має реалізувати createCpu()');
  }

  createMotherboard(id) {
    throw new Error('Підклас має реалізувати createMotherboard()');
  }

  // Що з каталогу належить цьому сімейству (для випадаючих списків)
  cpuOptions() {
    return Catalog.byType('cpu', this.platform);
  }

  motherboardOptions() {
    return Catalog.byType('motherboard', this.platform);
  }

  // Спільна логіка: перевірити, що товар із цього сімейства, і створити його
  _create(id, type, ProductClass) {
    const data = Catalog.find(id);
    if (data.type !== type || data.platform !== this.platform) {
      throw new Error(`${this.constructor.name} не може створити "${data.name}": це інше сімейство`);
    }
    const product = new ProductClass(data);
    Logger.getInstance().log('Абстрактна фабрика', `${this.constructor.name} створила: ${product.name}`, this.constructor.name);
    return product;
  }
}
