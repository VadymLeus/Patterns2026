// ОДИНАК (Singleton) №2 — Logger.
// Один журнал на весь застосунок: усі патерни пишуть у нього,
// а інтерфейс просто підписується на нові записи.
//
// Прийом: конструктор повертає вже існуючий екземпляр, тому
// і new Logger(), і Logger.getInstance() дають один і той самий об'єкт.

class Logger {
  static #instance = null;
  #entries = [];
  #listeners = [];
  #silent = 0;

  constructor() {
    if (Logger.#instance) return Logger.#instance;
    Logger.#instance = this;
  }

  static getInstance() {
    return Logger.#instance ?? new Logger();
  }

  log(pattern, message) {
    if (this.#silent > 0) return;
    const entry = { time: new Date(), pattern, message };
    this.#entries.push(entry);
    this.#listeners.forEach((listener) => listener(entry));
  }

  // Виконує fn без запису в журнал (для службових дій, щоб не засмічувати демонстрацію)
  silently(fn) {
    this.#silent++;
    try {
      return fn();
    } finally {
      this.#silent--;
    }
  }

  subscribe(listener) {
    this.#listeners.push(listener);
  }

  get entries() {
    return [...this.#entries];
  }
}
