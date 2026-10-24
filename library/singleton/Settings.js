// ОДИНАК (Singleton) №3 — Settings.
// Єдині налаштування застосунку: валюта та тема оформлення.
// Усі ціни в проекті зберігаються в гривнях (PriceList), а Settings лише переводить їх
// у вибрану валюту під час показу. Тому зміна валюти одразу діє скрізь.
//
// Settings нічого не знає про localStorage й DOM: зберігання та застосування теми
// робить script.js. Завдяки цьому клас легко тестувати.

class Settings {
  static #instance = null;

  // perUah — скільки одиниць валюти в одній гривні (курси умовні)
  static CURRENCIES = {
    UAH: {
      perUah: 1,
      format: (v) => `${Math.round(v).toLocaleString('uk-UA')} грн`,
    },
    USD: {
      perUah: 1 / 41.5,
      format: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    EUR: {
      perUah: 1 / 45,
      format: (v) => `€${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
  };

  static THEMES = ['auto', 'light', 'dark'];

  #currency = 'UAH';
  #theme = 'auto';
  #listeners = [];

  constructor() {
    if (Settings.#instance) return Settings.#instance;
    Settings.#instance = this;
    Logger.getInstance().log('Одинак', 'Створено єдиний екземпляр Settings (валюта й тема)');
  }

  static getInstance() {
    return Settings.#instance ?? new Settings();
  }

  get currency() {
    return this.#currency;
  }

  get theme() {
    return this.#theme;
  }

  // Гривні -> вибрана валюта (число)
  convert(amountUah) {
    return amountUah * Settings.CURRENCIES[this.#currency].perUah;
  }

  // Гривні -> готовий текст у вибраній валюті
  format(amountUah) {
    return Settings.CURRENCIES[this.#currency].format(this.convert(amountUah));
  }

  static isCurrency(code) {
    return typeof code === 'string' && Object.hasOwn(Settings.CURRENCIES, code);
  }

  setCurrency(code) {
    if (!Settings.isCurrency(code)) throw new Error(`Невідома валюта "${code}"`);
    this.#currency = code;
    Logger.getInstance().log('Одинак', `Валюта ${code}: усі ціни перераховує єдиний Settings`);
    this.#notify();
    return code;
  }

  setTheme(theme) {
    if (!Settings.THEMES.includes(theme)) throw new Error(`Невідома тема "${theme}"`);
    this.#theme = theme;
    Logger.getInstance().log('Одинак', `Тема оформлення: ${theme}`);
    this.#notify();
    return theme;
  }

  // Дані для збереження
  toData() {
    return { currency: this.#currency, theme: this.#theme };
  }

  // Відновлення збережених налаштувань: некоректні значення ігноруються, слухачів не сповіщаємо
  restore(data) {
    if (!data || typeof data !== 'object') return;
    if (Settings.isCurrency(data.currency)) this.#currency = data.currency;
    if (Settings.THEMES.includes(data.theme)) this.#theme = data.theme;
  }

  subscribe(listener) {
    this.#listeners.push(listener);
  }

  #notify() {
    this.#listeners.forEach((listener) => listener(this));
  }
}
