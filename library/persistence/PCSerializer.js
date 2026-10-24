// Збереження та відновлення збірок.
//
// Збірка записується як набір id деталей, а НЕ як готові об'єкти. Під час відновлення
// кожна деталь створюється ЗНОВУ через фабрики, а ПК збирається PCBuilder.
// Тому дані з файлу або localStorage проходять ту саму перевірку сумісності, що й
// будь-яка збірка: зіпсований чи вручну змінений запис просто не збереться.
//
//   Абстрактна фабрика — процесор і плата (платформу визначаємо за каталогом)
//   Фабричний метод    — решта деталей
//   Будівельник        — збирає та перевіряє результат

class PCSerializer {
  static FORMAT_VERSION = 1;
  static MAX_BUILDS = 200; // захист від надто великого файлу
  static MAX_NAME_LENGTH = 60;

  // PC -> прості дані { name, parts: { cpu: 'r5-7600', ... } }
  static toData(pc) {
    const parts = {};
    PC_SLOTS.forEach(({ key }) => (parts[key] = pc.parts[key].id));
    return { name: pc.name, parts };
  }

  // Створює деталь за id, вибираючи потрібну фабрику
  static createPart(slot, id) {
    const item = Catalog.find(id);
    if (item.type !== slot) {
      throw new Error(`"${id}" не підходить для слота "${slot}"`);
    }
    if (slot === 'cpu') return getPlatformFactory(item.platform).createCpu(id);
    if (slot === 'motherboard') return getPlatformFactory(item.platform).createMotherboard(id);
    return getCreator(slot).create(id);
  }

  // Прості дані -> PC. Кидає помилку, якщо запис пошкоджений або збірка несумісна (BuildError)
  static fromData(data, builder = new PCBuilder()) {
    if (!data || typeof data !== 'object' || !data.parts || typeof data.parts !== 'object') {
      throw new Error('Некоректний запис збірки');
    }
    builder.reset().setName(String(data.name ?? '').slice(0, PCSerializer.MAX_NAME_LENGTH));
    PC_SLOTS.forEach(({ key, label }) => {
      const id = data.parts[key];
      if (typeof id !== 'string') throw new Error(`Немає деталі: ${label}`);
      builder.setPart(key, PCSerializer.createPart(key, id));
    });
    return builder.build();
  }

  // Відновлює список записів. Пошкоджені пропускає й повідомляє про них окремо.
  // Журнал на цей час вимикаємо, щоб сотня деталей не засмічувала демонстрацію.
  static restoreAll(list) {
    const pcs = [];
    const errors = [];
    Logger.getInstance().silently(() => {
      list.forEach((data, i) => {
        try {
          pcs.push(PCSerializer.fromData(data));
        } catch (err) {
          errors.push(`запис №${i + 1}: ${err.message}`);
        }
      });
    });
    return { pcs, errors };
  }

  // Формат файлу експорту
  static toExport(pcs) {
    return {
      app: 'Patterns2026',
      version: PCSerializer.FORMAT_VERSION,
      builds: pcs.map((pc) => PCSerializer.toData(pc)),
    };
  }

  // Дістає список записів із прочитаного файлу (приймає і { builds: [...] }, і просто масив)
  static parseExport(data) {
    const list = Array.isArray(data) ? data : data && data.builds;
    if (!Array.isArray(list)) {
      throw new Error('Невірний формат файлу: очікується { "builds": [...] }');
    }
    if (list.length > PCSerializer.MAX_BUILDS) {
      throw new Error(`Забагато збірок у файлі (максимум ${PCSerializer.MAX_BUILDS})`);
    }
    return list;
  }
}
