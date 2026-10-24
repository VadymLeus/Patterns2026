// Універсальна обгортка над localStorage: одне значення (у форматі JSON) за ключем.
// Усі звернення захищені try/catch: у приватному режимі або при заблокованому сховищі
// застосунок просто працює без збереження, а не падає.

class KeyValueStorage {
  constructor(key) {
    this.key = key;
  }

  // Повертає збережене значення або fallback, якщо нічого немає чи дані пошкоджені
  load(fallback = null) {
    try {
      const raw = localStorage.getItem(this.key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  // Повертає true, якщо вдалося зберегти
  save(value) {
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* сховище недоступне — нічого очищати */
    }
  }
}
