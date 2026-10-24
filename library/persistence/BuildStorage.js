// Обгортка над localStorage для списку збірок.
// Усі звернення захищені try/catch: у приватному режимі або при заблокованому сховищі
// застосунок просто працює без збереження, а не падає.

class BuildStorage extends KeyValueStorage {
  constructor(key = 'patterns2026.builds.v1') {
    super(key);
  }

  // Повертає масив записів або [], якщо нічого немає, дані пошкоджені чи це не масив
  load() {
    const data = super.load([]);
    return Array.isArray(data) ? data : [];
  }
}
