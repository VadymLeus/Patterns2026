// ОДИНАК (Singleton) — PriceList.
// Єдиний прайс-лист на весь застосунок. Усі комплектуючі беруть ціну саме звідси,
// тому зміна знижки одразу відображається і в конфігураторі, і в збережених збірках,
// і в готових шаблонах.
//
// Як це працює: екземпляр зберігається в приватному статичному полі.
// Якщо він уже є — конструктор повертає його замість нового об'єкта.
//
//   new PriceList() === PriceList.getInstance()   // true

class PriceList {
  static #instance = null;
  #prices = new Map();
  #discount = 0; // у відсотках

  constructor() {
    if (PriceList.#instance) return PriceList.#instance;

    CATALOG.forEach((item) => this.#prices.set(item.id, item.price));
    PriceList.#instance = this;
    Logger.getInstance().log('Одинак', 'Створено єдиний екземпляр PriceList (прайс-лист на весь застосунок)', 'PriceList');
  }

  static getInstance() {
    return PriceList.#instance ?? new PriceList();
  }

  get discount() {
    return this.#discount;
  }

  // Знижка 0–50 %, діє на весь каталог
  setDiscount(percent) {
    this.#discount = Math.min(50, Math.max(0, Math.round(Number(percent)) || 0));
    Logger.getInstance().log('Одинак', `Знижка ${this.#discount}% застосована до всього каталогу через єдиний PriceList`, 'PriceList');
    return this.#discount;
  }

  getBasePrice(id) {
    const price = this.#prices.get(id);
    if (price === undefined) throw new Error(`Немає ціни для "${id}"`);
    return price;
  }

  getPrice(id) {
    return Math.round(this.getBasePrice(id) * (1 - this.#discount / 100));
  }
}
