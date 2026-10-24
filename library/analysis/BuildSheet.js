// СПЕЦИФІКАЦІЯ ЗБІРКИ — дані для друку (або збереження у PDF).
//
// Не патерн: клас лише збирає в один об'єкт усе, що треба показати на аркуші —
// деталі з характеристиками й цінами, підсумок, споживання, статус сумісності й оцінки.
// Розмітку з цього об'єкта робить ui/PrintSheet.js, тож логіку можна перевірити тестами без DOM.

class BuildSheet {
  // Короткі характеристики деталі для колонки «Характеристики»
  static details(part) {
    if (!part) return '';
    const size = (gb) => (gb >= 1000 ? `${gb / 1000} ТБ` : `${gb} ГБ`);
    switch (part.type) {
      case 'cpu':
        return `сокет ${part.socket} · ${Catalog.coresWord(part.cores)} · ${part.tdp} Вт`;
      case 'motherboard':
        return `сокет ${part.socket} · ${part.formFactor} · ${part.ramType}`;
      case 'cooler':
        return `відводить до ${part.maxTdp} Вт`;
      case 'ram':
        return `${part.ramType} · ${size(part.sizeGb)}`;
      case 'gpu':
        return `${part.tdp} Вт`;
      case 'storage':
        return `${part.kind} · ${size(part.sizeGb)}`;
      case 'psu':
        return `${part.watts} Вт`;
      case 'case':
        return `плати: ${part.supports.join(', ')}`;
      default:
        return '';
    }
  }

  // parts — { slot: Component }; options.format переводить гривні в рядок у вибраній валюті
  static from(parts, { name = 'Поточна конфігурація', date = new Date(), format = (n) => `${n} грн`, discount = 0 } = {}) {
    const { missing, problems } = Compatibility.check(parts);

    let status = 'ok';
    let statusText = 'Збірка сумісна, усі деталі на місці';
    if (problems.length) {
      status = 'bad';
      statusText = 'Є проблеми сумісності';
    } else if (missing.length) {
      status = 'warn';
      statusText = 'Збірка неповна';
    }

    const rows = PC_SLOTS.map(({ key, label }) => {
      const part = parts[key];
      return {
        slot: key,
        label,
        name: part ? part.name : '—',
        details: BuildSheet.details(part),
        price: part ? part.price : null,
        priceText: part ? format(part.price) : '',
      };
    });
    const total = rows.reduce((sum, row) => sum + (row.price ?? 0), 0);

    let power = null;
    if (parts.cpu && parts.gpu) {
      power = {
        draw: parts.cpu.tdp + parts.gpu.tdp + Compatibility.REST_OF_SYSTEM_WATTS,
        need: Compatibility.requiredPsuWatts(parts.cpu, parts.gpu),
      };
    }

    const scores = Performance.all(parts);
    const perf = Object.entries(Performance.PURPOSES).map(([key, { label }]) => ({
      key,
      label,
      value: scores[key] ?? null,
    }));

    return {
      name: String(name).trim() || 'Поточна конфігурація',
      date,
      status,
      statusText,
      issues: [...problems, ...missing.map((m) => `Не вибрано: ${m}`)],
      rows,
      total,
      totalText: format(total),
      discount,
      power,
      perf,
    };
  }
}
