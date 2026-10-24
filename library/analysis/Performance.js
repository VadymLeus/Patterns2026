// Умовна оцінка продуктивності збірки: від 0 до 100 для трьох призначень.
// Бали комплектуючих (perf у каталозі) порівнюються з найкращою деталлю каталогу,
// а далі складаються з вагами, що залежать від призначення.
//
//   Ігри     = відеокарта 60 %, процесор 30 %, пам'ять (до 32 ГБ) 10 %
//   Робота   = процесор 55 %, пам'ять (до 64 ГБ) 25 %, відеокарта 10 %, обсяг накопичувача (до 2 ТБ) 10 %
//   Офіс     = процесор 60 % (насичується вже на Core i3), пам'ять (до 16 ГБ) 20 %, швидкість накопичувача 20 %
//
// Для ігор і роботи складові об'єднуються зваженим геометричним середнім, а не сумою:
// слабка ланка тягне оцінку вниз (Core i3 не розкриє відеокарту RX 7800 XT), тому
// найкращою виявляється збалансована збірка.
//
// Офісу більше не треба: після «достатньо» оцінка не зростає, тому для нього найкраща
// збірка — найдешевша з достатніх, а не найдорожча.

class Performance {
  static PURPOSES = {
    office: { label: 'Офіс', hint: 'документи, інтернет, навчання' },
    gaming: { label: 'Ігри', hint: 'сучасні ігри' },
    workstation: { label: 'Робота', hint: 'монтаж, 3D, віртуальні машини' },
  };

  static OFFICE_CPU_ENOUGH = 25; // індекс процесора, якого вистачає для офісу

  static #maxPerf = {};

  static #best(type) {
    if (!(type in Performance.#maxPerf)) {
      Performance.#maxPerf[type] = Math.max(...CATALOG.filter((c) => c.type === type).map((c) => c.perf));
    }
    return Performance.#maxPerf[type];
  }

  // Індекс 0–100 відносно найпотужнішої деталі каталогу
  static cpuIndex(cpu) {
    return (cpu.perf / Performance.#best('cpu')) * 100;
  }

  static gpuIndex(gpu) {
    return (gpu.perf / Performance.#best('gpu')) * 100;
  }

  static #fraction(value, full) {
    return (Math.min(value, full) / full) * 100;
  }

  // Зважене геометричне середнє індексів 0–100: Π (індекс / 100) ^ вага × 100
  static #blend(pairs) {
    return 100 * pairs.reduce((product, [index, weight]) => product * Math.pow(index / 100, weight), 1);
  }

  // Оцінка для призначення; null, якщо бракує процесора, відеокарти, пам'яті або накопичувача
  static score(parts, purpose) {
    const { cpu, gpu, ram, storage } = parts;
    if (!cpu || !gpu || !ram || !storage) return null;
    const cpuIndex = Performance.cpuIndex(cpu);
    const gpuIndex = Performance.gpuIndex(gpu);

    switch (purpose) {
      case 'gaming':
        return Performance.#blend([
          [gpuIndex, 0.6],
          [cpuIndex, 0.3],
          [Performance.#fraction(ram.sizeGb, 32), 0.1],
        ]);
      case 'workstation':
        return Performance.#blend([
          [cpuIndex, 0.55],
          [Performance.#fraction(ram.sizeGb, 64), 0.25],
          [gpuIndex, 0.1],
          [Performance.#fraction(storage.sizeGb, 2000), 0.1],
        ]);
      case 'office':
        return (
          0.6 * Performance.#fraction(cpuIndex, Performance.OFFICE_CPU_ENOUGH) +
          0.2 * Performance.#fraction(ram.sizeGb, 16) +
          0.2 * (storage.kind === 'SSD' ? 100 : 40)
        );
      default:
        throw new Error(`Невідоме призначення "${purpose}"`);
    }
  }

  // Усі три оцінки одразу, округлені до цілих (або null, якщо збірка неповна)
  static all(parts) {
    const result = {};
    Object.keys(Performance.PURPOSES).forEach((purpose) => {
      const value = Performance.score(parts, purpose);
      result[purpose] = value === null ? null : Math.round(value);
    });
    return result;
  }
}
