// Підбір збірки під бюджет.
// Планувальник нічого не створює сам: він отримує готових кандидатів (їх створюють фабрики,
// див. PCDirector.buildForBudget) і вибирає серед них найкращу сумісну комбінацію,
// що вкладається в бюджет.
//
// Правила сумісності тут не дублюються: кожна пара деталей перевіряється тим самим
// Compatibility.check(), яким користується будівельник.
//
// Для кожної комбінації «процесор + плата + пам'ять + накопичувач + відеокарта» кулер, блок
// живлення й корпус беруться найдешевшими з тих, що підходять: на оцінку вони не впливають,
// тож економія на них залишає більше грошей на процесор і відеокарту.

class BudgetError extends Error {
  // minBudget — найменша сума, за яку цю збірку можна зібрати
  constructor(minBudget, message) {
    super(message);
    this.name = 'BudgetError';
    this.minBudget = minBudget;
  }
}

class BudgetPlanner {
  // Мінімальні вимоги до пам'яті й накопичувача (SSD) для кожного призначення
  static REQUIREMENTS = {
    office: { minRamGb: 16, minStorageGb: 480 },
    gaming: { minRamGb: 16, minStorageGb: 1000 },
    workstation: { minRamGb: 32, minStorageGb: 1000 },
  };

  static #compatible(parts) {
    return Compatibility.check(parts).conflicts.length === 0;
  }

  // pool: { cpu: [...], motherboard: [...], cooler: [...], ram: [...], gpu: [...], storage: [...], psu: [...], case: [...] }
  // Повертає { parts, cost, score, combos }; якщо бюджету замало — кидає BudgetError
  static plan(pool, budget, purpose) {
    const need = BudgetPlanner.REQUIREMENTS[purpose];
    if (!need) throw new Error(`Невідоме призначення "${purpose}"`);
    if (!Number.isFinite(budget) || budget <= 0) throw new Error('Бюджет має бути додатним числом');

    const byPrice = (list) => [...list].sort((a, b) => a.price - b.price);
    const { cpu: cpus, motherboard: boards } = pool;
    const coolers = byPrice(pool.cooler);
    const cases = byPrice(pool.case);
    const psus = byPrice(pool.psu);
    const rams = pool.ram.filter((r) => r.sizeGb >= need.minRamGb);
    const storages = pool.storage.filter((s) => s.kind === 'SSD' && s.sizeGb >= need.minStorageGb);

    let best = null;
    let cheapest = Infinity;
    let combos = 0;

    for (const cpu of cpus) {
      const cooler = coolers.find((cooler) => BudgetPlanner.#compatible({ cpu, cooler }));
      if (!cooler) continue;
      for (const motherboard of boards) {
        if (!BudgetPlanner.#compatible({ cpu, motherboard })) continue;
        const pcCase = cases.find((c) => BudgetPlanner.#compatible({ motherboard, case: c }));
        if (!pcCase) continue;
        for (const ram of rams) {
          if (!BudgetPlanner.#compatible({ motherboard, ram })) continue;
          for (const storage of storages) {
            for (const gpu of pool.gpu) {
              const psu = psus.find((p) => BudgetPlanner.#compatible({ cpu, gpu, psu: p }));
              if (!psu) continue;

              const parts = { cpu, motherboard, cooler, ram, gpu, storage, psu, case: pcCase };
              const cost = Object.values(parts).reduce((sum, part) => sum + part.price, 0);
              combos++;
              cheapest = Math.min(cheapest, cost);
              if (cost > budget) continue;

              const score = Performance.score(parts, purpose);
              if (!best || score > best.score || (score === best.score && cost < best.cost)) {
                best = { parts, cost, score };
              }
            }
          }
        }
      }
    }

    if (!best) {
      throw new BudgetError(
        Number.isFinite(cheapest) ? cheapest : null,
        Number.isFinite(cheapest)
          ? `Для цього призначення потрібно щонайменше ${cheapest} грн`
          : 'У каталозі немає сумісних комплектуючих для цих умов'
      );
    }
    // Для офісу достатньо мінімуму; в інших призначеннях залишок бюджету йде на запас потужності
    // та якість решти деталей (на оцінку вони не впливають)
    if (purpose !== 'office') BudgetPlanner.#spendLeftover(best, pool, budget);

    // Страховка: що б не сталося з правилами, несумісну збірку не віддаємо
    if (!BudgetPlanner.#compatible(best.parts)) throw new Error('Планувальник підібрав несумісну збірку');
    return { ...best, combos };
  }

  // Залишок бюджету: по черзі замінює блок живлення, кулер, корпус і плату на найдорожчі
  // з тих, що лишаються сумісними та вкладаються в бюджет
  static #spendLeftover(best, pool, budget) {
    const total = (parts) => Object.values(parts).reduce((sum, part) => sum + part.price, 0);
    for (const slot of ['psu', 'cooler', 'case', 'motherboard']) {
      const better = [...pool[slot]].sort((a, b) => b.price - a.price);
      for (const candidate of better) {
        if (candidate.price <= best.parts[slot].price) break; // дорожчих уже немає
        const trial = { ...best.parts, [slot]: candidate };
        const cost = total(trial);
        if (cost <= budget && BudgetPlanner.#compatible(trial)) {
          best.parts = trial;
          best.cost = cost;
          break;
        }
      }
    }
  }
}
