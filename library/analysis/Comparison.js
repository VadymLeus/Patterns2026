// Порівняння двох збірок: деталі по слотах і підсумкові показники.
// Приймає будь-які об'єкти з полями name та parts (PC або знімок конфігуратора),
// тож порівнювати можна й неповну збірку. Нічого не змінює й не створює.

class Comparison {
  // better: що вважається кращим значенням
  static METRICS = [
    { key: 'price', label: 'Ціна', unit: 'money', better: 'lower' },
    { key: 'power', label: 'Споживання', unit: 'watts', better: 'lower' },
    { key: 'gaming', label: 'Ігри', unit: 'score', better: 'higher' },
    { key: 'workstation', label: 'Робота', unit: 'score', better: 'higher' },
    { key: 'office', label: 'Офіс', unit: 'score', better: 'higher' },
    { key: 'ram', label: "Оперативна пам'ять", unit: 'gb', better: 'higher' },
    { key: 'storage', label: 'Накопичувач', unit: 'gb', better: 'higher' },
  ];

  // Значення показника для набору деталей; null, якщо його не можна порахувати
  static value(key, parts) {
    switch (key) {
      case 'price':
        return Object.values(parts).reduce((sum, part) => sum + (part ? part.price : 0), 0);
      case 'power':
        return parts.cpu && parts.gpu ? parts.cpu.tdp + parts.gpu.tdp + Compatibility.REST_OF_SYSTEM_WATTS : null;
      case 'ram':
        return parts.ram ? parts.ram.sizeGb : null;
      case 'storage':
        return parts.storage ? parts.storage.sizeGb : null;
      default:
        return Performance.all(parts)[key] ?? null;
    }
  }

  static compare(a, b) {
    const rows = PC_SLOTS.map(({ key, label }) => {
      const pa = a.parts[key] ?? null;
      const pb = b.parts[key] ?? null;
      return {
        key,
        label,
        a: pa,
        b: pb,
        same: pa === pb || (pa !== null && pb !== null && pa.id === pb.id),
      };
    });

    const metrics = Comparison.METRICS.map((metric) => {
      const va = Comparison.value(metric.key, a.parts);
      const vb = Comparison.value(metric.key, b.parts);
      let winner = null; // 'a' | 'b' | 'tie' | null (не можна порівняти)
      if (va !== null && vb !== null) {
        if (va === vb) winner = 'tie';
        else winner = (metric.better === 'higher') === va > vb ? 'a' : 'b';
      }
      return { ...metric, a: va, b: vb, winner, diff: va !== null && vb !== null ? Math.abs(va - vb) : null };
    });

    return { rows, metrics, identical: rows.every((r) => r.same) };
  }
}
