// Правила сумісності комплектуючих.
// Використовує Будівельник (перед build()) та інтерфейс (для живої перевірки).

class Compatibility {
  static REST_OF_SYSTEM_WATTS = 100; // умовне споживання решти системи
  static PSU_RESERVE = 1.2; // запас потужності блока живлення 20 %

  static requiredPsuWatts(cpu, gpu) {
    return Math.ceil((cpu.tdp + gpu.tdp + Compatibility.REST_OF_SYSTEM_WATTS) * Compatibility.PSU_RESERVE);
  }

  // Повертає { missing: [назви слотів, які не заповнені], problems: [тексти конфліктів] }
  static check(parts) {
    const missing = PC_SLOTS.filter(({ key }) => !parts[key]).map(({ label }) => label);
    const problems = [];
    const { cpu, motherboard, ram, gpu, psu } = parts;
    const pcCase = parts.case;

    if (cpu && motherboard && cpu.socket !== motherboard.socket) {
      problems.push(`Сокет процесора (${cpu.socket}) не підходить до материнської плати (${motherboard.socket})`);
    }
    if (motherboard && ram && ram.ramType !== motherboard.ramType) {
      problems.push(`Плата підтримує ${motherboard.ramType}, а обрана пам'ять ${ram.ramType}`);
    }
    if (motherboard && pcCase && !pcCase.supports.includes(motherboard.formFactor)) {
      problems.push(`Корпус не підтримує плати формату ${motherboard.formFactor}`);
    }
    if (cpu && gpu && psu) {
      const need = Compatibility.requiredPsuWatts(cpu, gpu);
      if (psu.watts < need) {
        problems.push(`Блок живлення ${psu.watts} Вт замалий: потрібно щонайменше ${need} Вт`);
      }
    }
    return { missing, problems };
  }
}
