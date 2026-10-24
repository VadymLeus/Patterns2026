// Реєстр прототипів (Prototype Manager).
// Зберігає готові збірки-зразки. Той, хто просить збірку, ніколи не отримує сам зразок —
// лише його клон, тож зразки залишаються незмінними.

class PresetRegistry {
  #items = new Map();

  register(key, prototype, description = '') {
    this.#items.set(key, { prototype, description });
    return this;
  }

  // Повертає КЛОН зразка
  get(key) {
    const item = this.#items.get(key);
    if (!item) throw new Error(`Немає зразка "${key}"`);
    return item.prototype.clone();
  }

  // Для відображення в інтерфейсі (без клонування)
  list() {
    return [...this.#items].map(([key, { prototype, description }]) => ({
      key,
      name: prototype.name,
      description,
      price: prototype.totalPrice,
    }));
  }
}
