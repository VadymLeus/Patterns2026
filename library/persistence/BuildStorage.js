// Обгортка над localStorage для списку збірок.
// Усі звернення захищені try/catch: у приватному режимі або при заблокованому сховищі
// застосунок просто працює без збереження, а не падає.

class BuildStorage {
  constructor(key = 'patterns2026.builds.v1') {
    this.key = key;
  }

  // Повертає масив записів або [], якщо нічого немає чи дані пошкоджені
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  // Повертає true, якщо вдалося зберегти
  save(list) {
    try {
      localStorage.setItem(this.key, JSON.stringify(list));
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
