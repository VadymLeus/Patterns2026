// БУДІВЕЛЬНИК (Builder).
//
// Учасники:
//   Builder   — PCBuilder (цей файл)
//   Product   — PC (prototype/PC.js)
//   Director  — PCDirector (PCDirector.js)
//
// Ідея: складний об'єкт збирається ПОКРОКОВО, а метод build() перевіряє,
// що результат коректний, і лише тоді віддає готовий PC.
// Незібраний або несумісний ПК створити неможливо — буде BuildError.
//
//   const pc = new PCBuilder().setName('Мій ПК').setCpu(...).setGpu(...) /* ... */ .build();

class BuildError extends Error {
  constructor(issues) {
    super(issues.join('; '));
    this.name = 'BuildError';
    this.issues = issues;
  }
}

class PCBuilder {
  #name = 'Нова збірка';
  #parts = {};

  setName(name) {
    this.#name = String(name ?? '').trim() || 'Нова збірка';
    return this;
  }

  setCpu(cpu) { return this.setPart('cpu', cpu); }
  setMotherboard(board) { return this.setPart('motherboard', board); }
  setCooler(cooler) { return this.setPart('cooler', cooler); }
  setRam(ram) { return this.setPart('ram', ram); }
  setGpu(gpu) { return this.setPart('gpu', gpu); }
  setStorage(storage) { return this.setPart('storage', storage); }
  setPsu(psu) { return this.setPart('psu', psu); }
  setCase(pcCase) { return this.setPart('case', pcCase); }

  // Загальний спосіб покласти деталь у слот (null очищає слот)
  setPart(slot, part) {
    if (!PC_SLOTS.some((s) => s.key === slot)) {
      throw new Error(`Невідомий слот "${slot}"`);
    }
    if (part && part.type !== slot) {
      throw new Error(`У слот "${slot}" не можна покласти "${part.type}"`);
    }
    this.#parts[slot] = part ?? undefined;
    return this;
  }

  // Поточний стан (копія), щоб інтерфейс міг показати проміжний результат
  snapshot() {
    return { ...this.#parts };
  }

  validate() {
    return Compatibility.check(this.#parts);
  }

  build() {
    const { missing, problems } = this.validate();
    const issues = [...missing.map((label) => `Не вибрано: ${label}`), ...problems];
    if (issues.length > 0) {
      throw new BuildError(issues);
    }
    const pc = new PC(this.#name, { ...this.#parts });
    Logger.getInstance().log('Будівельник', `PCBuilder.build() зібрав "${pc.name}": перевірено сумісність, створено PC`);
    this.reset();
    return pc;
  }

  // Після build() будівельник очищується і готовий збирати наступний ПК
  reset() {
    this.#name = 'Нова збірка';
    this.#parts = {};
    return this;
  }
}
