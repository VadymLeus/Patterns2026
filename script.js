// Точка входу. Тут інтерфейс "склеює" усі п'ять патернів:
//
//   Одинак            — Logger, PriceList, Settings
//   Фабричний метод   — getCreator(...).create(...)        (відеокарта, пам'ять, накопичувач, БЖ, корпус, кулер)
//   Абстрактна фабрика— getPlatformFactory(...)             (процесор + плата одного сімейства)
//                       getTierFactory(...)                 (комплект деталей одного рівня)
//   Будівельник       — PCBuilder (+ PCDirector: готові збірки та підбір під бюджет)
//   Прототип          — PC.clone(), PresetRegistry

// ---------- Стан застосунку ----------
const logger = Logger.getInstance(); // PATTERN_CLASS береться з ui/patternBadges.js

const $ = (id) => document.getElementById(id);
const fmt = (n) => settings.format(n); // ціни зберігаються в гривнях, а показуються у вибраній валюті
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Журнал: підписуємося ДО створення решти об'єктів, щоб побачити їхні перші записи
function appendLog(entry) {
  const row = document.createElement('div');
  row.className = 'log-row';
  row.innerHTML =
    `<span class="time">${entry.time.toLocaleTimeString('uk-UA')}</span>` +
    `<span class="badge ${PATTERN_CLASS[entry.pattern] || ''}">${esc(entry.pattern)}</span>` +
    `<span class="text">${esc(entry.message)}</span>`;
  const box = $('log');
  box.prepend(row); // нові записи зверху
  while (box.children.length > 150) box.lastChild.remove();
}
logger.entries.forEach(appendLog);
logger.subscribe(appendLog);

const prices = PriceList.getInstance(); // Одинак: ціни
const settings = Settings.getInstance(); // Одинак: валюта й тема
const settingsStorage = new KeyValueStorage('patterns2026.settings.v1');
const builder = new PCBuilder(); // Будівельник, з яким працює конфігуратор
const presets = new PresetRegistry(); // Прототипи готових збірок
const pcView = new PcView($('pcView')); // схема збірки (лише відображення)
const saved = []; // зібрані користувачем ПК
const storage = new BuildStorage(); // localStorage
const persist = () => storage.save(saved.map((pc) => PCSerializer.toData(pc)));
const selects = {}; // slot -> <select>
const dropdowns = {}; // slot (або службовий ключ) -> Dropdown
let factory = null; // поточна фабрика платформи

// ---------- Створення деталей ----------
function createPart(slot, id) {
  if (slot === 'cpu') return factory.createCpu(id); // Абстрактна фабрика
  if (slot === 'motherboard') return factory.createMotherboard(id); // Абстрактна фабрика
  return getCreator(slot).create(id); // Фабричний метод
}

function optionsFor(slot) {
  if (slot === 'cpu') return factory.cpuOptions();
  if (slot === 'motherboard') return factory.motherboardOptions();
  return Catalog.byType(slot);
}

// ---------- Випадаючі списки ----------
function labelOption(opt) {
  const price = fmt(prices.getPrice(opt.value));
  opt.textContent = `${opt.dataset.label} — ${price}`; // запасний текст рідного <select>
  opt.dataset.price = price; // його показує Dropdown
}

function refreshLabels() {
  Object.values(selects).forEach((sel) => [...sel.options].forEach(labelOption));
}

function fillSelect(slot, items, selectedId) {
  const sel = selects[slot];
  sel.innerHTML = '';
  items.forEach((item) => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.dataset.label = Catalog.label(item);
    Object.assign(opt.dataset, Catalog.parts(item)); // title і meta для Dropdown
    labelOption(opt);
    sel.append(opt);
  });
  sel.value = selectedId ?? items[0].id;
}

function buildSlotControls() {
  PC_SLOTS.forEach(({ key, label }) => {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    wrap.innerHTML = `<span id="lbl-${key}">${esc(label)}</span><select id="sel-${key}" aria-labelledby="lbl-${key}"></select>`;
    $('slots').append(wrap);
    selects[key] = wrap.querySelector('select');
    selects[key].addEventListener('change', () => onPartChosen(key));
    dropdowns[key] = new Dropdown(selects[key], { labelledBy: `lbl-${key}` });
  });
  // Списки процесорів і плат заповнює applyPlatform(); решта не залежить від платформи
  ['cooler', 'ram', 'gpu', 'storage', 'psu', 'case'].forEach((slot) => fillSelect(slot, Catalog.byType(slot)));
}

// Позначає варіанти списку, що дали б конфлікт у поточній збірці (їх показує Dropdown):
// деталь підставляється замість обраної, а Compatibility.check() каже, що зламається.
// Викликається після кожної зміни, тому позначки завжди свіжі
function markIncompatible(slot) {
  const current = builder.snapshot();
  const before = new Set(Compatibility.check(current).problems);
  logger.silently(() => {
    [...selects[slot].options].forEach((opt) => {
      const { conflicts } = Compatibility.check({ ...current, [slot]: createPart(slot, opt.value) });
      // конфлікт самої деталі або новий, який вона спричинила (скажімо, слабкий блок живлення після заміни відеокарти)
      const found = conflicts.find((c) => c.slots.includes(slot) || !before.has(c.message));
      opt.dataset.warn = found ? found.message : '';
    });
  });
}

// Підставляє фабрику платформи та заповнює списки процесорів і плат лише з її сімейства
function applyPlatform(platformKey, cpuId, boardId) {
  factory = getPlatformFactory(platformKey);
  document.querySelector(`input[name="platform"][value="${platformKey}"]`).checked = true;
  fillSelect('cpu', optionsFor('cpu'), cpuId);
  fillSelect('motherboard', optionsFor('motherboard'), boardId);
}

// ---------- Дії користувача ----------
function setMsg(text = '', kind = '') {
  const el = $('buildMsg');
  el.textContent = text;
  el.className = 'msg ' + kind;
}

function onPlatformChosen(platformKey) {
  applyPlatform(platformKey);
  logger.log('Абстрактна фабрика', `Обрано сімейство: ${factory.label}. Процесор і плата створюються лише з нього`);
  builder.setCpu(createPart('cpu', selects.cpu.value));
  builder.setMotherboard(createPart('motherboard', selects.motherboard.value));
  setMsg();
  render();
}

function onPartChosen(slot) {
  builder.setPart(slot, createPart(slot, selects[slot].value));
  if (TIER_SLOTS.includes(slot)) resetTier(); // деталь змінили вручну — це вже не готовий комплект
  setMsg();
  render();
}

// Друга абстрактна фабрика: комплект одного рівня замінює п'ять деталей одразу
const TIER_SLOTS = ['gpu', 'storage', 'psu', 'case', 'cooler'];

function resetTier() {
  document.querySelector('input[name="tier"][value=""]').checked = true;
}

function onTierChosen(tierKey) {
  if (!tierKey) return; // «Свій вибір» нічого не змінює
  const kit = getTierFactory(tierKey).createKit();
  Object.entries(kit).forEach(([slot, part]) => {
    selects[slot].value = part.id;
    builder.setPart(slot, part);
  });
  setMsg();
  render();
}

// Завантажує ПК (як правило — клон) у конфігуратор: деталі клона йдуть прямо в будівельник
function loadPc(pc) {
  const vendor = pc.parts.cpu.vendor.toLowerCase();
  applyPlatform(vendor, pc.parts.cpu.id, pc.parts.motherboard.id);
  PC_SLOTS.forEach(({ key }) => {
    if (key !== 'cpu' && key !== 'motherboard') selects[key].value = pc.parts[key].id;
  });
  $('buildName').value = pc.name;
  builder.reset().setName(pc.name);
  PC_SLOTS.forEach(({ key }) => builder.setPart(key, pc.parts[key]));
  resetTier();
  setMsg();
  render();
}

// Після build() будівельник порожній — заповнюємо його свіжими деталями з поточної форми
function syncBuilderFromForm() {
  logger.silently(() => {
    builder.reset().setName($('buildName').value);
    PC_SLOTS.forEach(({ key }) => builder.setPart(key, createPart(key, selects[key].value)));
  });
}

function onBuild() {
  builder.setName($('buildName').value);
  try {
    const pc = builder.build();
    saved.unshift(pc);
    persist();
    $('buildName').value = `Збірка №${saved.length + 1}`;
    syncBuilderFromForm();
    setMsg(`Додано до списку: «${pc.name}»`, 'ok');
  } catch (err) {
    if (!(err instanceof BuildError)) throw err;
    logger.log('Будівельник', `build() відмовив: ${err.issues.join('; ')}`);
    setMsg('Збірку не створено: виправте проблеми сумісності', 'bad');
  }
  render();
}

// ---------- Відображення ----------
function renderSummary() {
  const parts = builder.snapshot();
  const { missing, problems } = builder.validate();

  const status = $('status');
  if (problems.length) {
    status.className = 'status bad';
    status.textContent = 'Є проблеми сумісності';
  } else if (missing.length) {
    status.className = 'status warn';
    status.textContent = 'Збірка неповна';
  } else {
    status.className = 'status ok';
    status.textContent = 'Збірка сумісна';
  }
  $('issues').innerHTML = [...problems, ...missing.map((m) => `Не вибрано: ${m}`)]
    .map((t) => `<li>${esc(t)}</li>`)
    .join('');

  $('partsTable').innerHTML = PC_SLOTS.map(({ key, label }) => {
    const p = parts[key];
    return `<tr><th>${esc(label)}</th><td>${p ? esc(p.name) : '—'}</td><td class="num">${p ? fmt(p.price) : ''}</td></tr>`;
  }).join('');

  const total = PC_SLOTS.reduce((sum, { key }) => sum + (parts[key] ? parts[key].price : 0), 0);
  $('total').textContent = fmt(total);
  $('totalNote').textContent = prices.discount ? `з урахуванням знижки ${prices.discount}%` : '';

  if (parts.cpu && parts.gpu) {
    const draw = parts.cpu.tdp + parts.gpu.tdp + Compatibility.REST_OF_SYSTEM_WATTS;
    $('power').textContent = `${draw} Вт (БЖ від ${Compatibility.requiredPsuWatts(parts.cpu, parts.gpu)} Вт)`;
  } else {
    $('power').textContent = '—';
  }
  renderPerf();
}

function renderPresets() {
  $('presets').innerHTML = presets
    .list()
    .map(
      (p) => `<button class="preset" type="button" data-key="${esc(p.key)}">
        <strong>${esc(p.name)}</strong><small>${esc(p.description)}</small><b>${fmt(p.price)}</b>
      </button>`
    )
    .join('');
}

function renderSaved() {
  $('savedEmpty').hidden = saved.length > 0;
  $('saved').innerHTML = saved
    .map((pc) => {
      const p = pc.parts;
      return `<article class="build" data-id="${pc.id}">
        <h3>${esc(pc.name)}</h3>
        <p class="muted">${esc([p.cpu.name, p.gpu.name, p.ram.name, p.storage.name].join(' · '))}</p>
        <div class="build-foot">
          <strong>${fmt(pc.totalPrice)}</strong>
          <div class="actions">
            <button class="btn" type="button" data-act="load">В конструктор</button>
            <button class="btn" type="button" data-act="clone">Дублювати</button>
            <button class="btn ghost" type="button" data-act="del">Видалити</button>
          </div>
        </div>
      </article>`;
    })
    .join('');
}

function renderView() {
  pcView.update(builder.snapshot(), builder.validate().conflicts);
}

// Умовна оцінка продуктивності (analysis/Performance.js): три смужки від 0 до 100
function renderPerf() {
  const scores = Performance.all(builder.snapshot());
  if (!$('perf').children.length) {
    $('perf').innerHTML = Object.entries(Performance.PURPOSES)
      .map(
        ([key, { label, hint }]) =>
          `<div class="perf-row" data-key="${key}" title="${esc(hint)}"><span>${esc(label)}</span><div class="meter"><i></i></div><b></b></div>`
      )
      .join('');
  }
  $('perf').querySelectorAll('.perf-row').forEach((row) => {
    const value = scores[row.dataset.key];
    row.querySelector('i').style.width = `${value ?? 0}%`;
    row.querySelector('b').textContent = value ?? '—';
  });
}

// ---------- Порівняння збірок ----------
function compareSources() {
  const list = [{ group: 'Конфігуратор', value: 'current', pc: { name: 'Поточна конфігурація', parts: builder.snapshot() } }];
  presets.list().forEach((p) => {
    // Клон потрібен лише для читання; назву беремо зі зразка (без «(копія)»)
    const clone = logger.silently(() => presets.get(p.key));
    list.push({ group: 'Готові збірки', value: `preset:${p.key}`, pc: { name: p.name, parts: clone.parts } });
  });
  saved.forEach((pc) => list.push({ group: 'Зібрані ПК', value: `saved:${pc.id}`, pc }));
  return list;
}

const shortName = (part) => part.name.replace(/^(Intel Core |AMD |GeForce |Radeon )/, '');

function fillCompareSelect(select, sources, fallback) {
  const wanted = select.value;
  select.innerHTML = '';
  let group = null;
  let groupName = null;
  sources.forEach(({ group: name, value, pc }) => {
    if (name !== groupName) {
      group = document.createElement('optgroup');
      group.label = groupName = name;
      select.append(group);
    }
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = opt.dataset.title = pc.name;
    opt.dataset.meta = [pc.parts.cpu, pc.parts.gpu].filter(Boolean).map(shortName).join(' · ');
    opt.dataset.price = fmt(Comparison.value('price', pc.parts));
    group.append(opt);
  });
  select.value = sources.some((s) => s.value === wanted) ? wanted : fallback;
}

const COMPARE_UNITS = {
  money: (v) => fmt(v),
  watts: (v) => `${v} Вт`,
  score: (v) => `${v}/100`,
  gb: (v) => (v >= 1000 ? `${v / 1000} ТБ` : `${v} ГБ`),
};

function compareVerdict(result, a, b) {
  if (result.identical) return ['Збірки однакові: усі деталі збігаються.'];
  const metric = (key) => result.metrics.find((m) => m.key === key);
  const name = (winner) => `<strong>${esc(winner === 'a' ? a.name : b.name)}</strong>`;
  const lines = [];
  const add = (key, text) => {
    const m = metric(key);
    if (m.winner === 'a' || m.winner === 'b') lines.push(text(m));
  };
  add('price', (m) => `${name(m.winner)} дешевша на ${esc(fmt(m.diff))}`);
  add('gaming', (m) => `${name(m.winner)} краща для ігор: ${Math.max(m.a, m.b)} проти ${Math.min(m.a, m.b)}`);
  add('workstation', (m) => `${name(m.winner)} краща для роботи: ${Math.max(m.a, m.b)} проти ${Math.min(m.a, m.b)}`);
  add('power', (m) => `${name(m.winner)} економніша: на ${m.diff} Вт менше споживання`);
  return lines.length ? lines : ['За ціною та продуктивністю збірки рівні.'];
}

function renderCompare() {
  const sources = compareSources();
  fillCompareSelect($('cmpA'), sources, 'current');
  fillCompareSelect($('cmpB'), sources, 'preset:office');
  dropdowns.cmpA.sync();
  dropdowns.cmpB.sync();

  const pick = (select) => sources.find((s) => s.value === select.value).pc;
  const a = pick($('cmpA'));
  const b = pick($('cmpB'));
  const result = Comparison.compare(a, b);

  const cell = (part, same) =>
    `<td class="${same ? '' : 'diff'}">${part ? `${esc(part.name)}<small>${fmt(part.price)}</small>` : '—'}</td>`;
  const slotRows = result.rows
    .map((r) => `<tr><th scope="row">${esc(r.label)}</th>${cell(r.a, r.same)}${cell(r.b, r.same)}</tr>`)
    .join('');
  const metricCell = (m, side) =>
    `<td class="${m.winner === side ? 'best' : ''}">${m[side] === null ? '—' : COMPARE_UNITS[m.unit](m[side])}</td>`;
  const metricRows = result.metrics
    .map((m) => `<tr><th scope="row">${esc(m.label)}</th>${metricCell(m, 'a')}${metricCell(m, 'b')}</tr>`)
    .join('');

  $('compareOut').innerHTML = `
    <ul class="verdict">${compareVerdict(result, a, b).map((t) => `<li>${t}</li>`).join('')}</ul>
    <div class="table-wrap"><table class="cmp">
      <thead><tr><th></th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead>
      <tbody>${slotRows}<tr class="sep"><th colspan="3">Показники</th></tr>${metricRows}</tbody>
    </table></div>`;
}

['cmpA', 'cmpB'].forEach((id) => $(id).addEventListener('change', renderCompare));

function syncDropdowns() {
  PC_SLOTS.forEach(({ key }) => markIncompatible(key));
  Object.values(dropdowns).forEach((dropdown) => dropdown.sync());
}

function render() {
  renderView();
  renderSummary();
  renderPresets();
  renderSaved();
  renderCompare();
  syncDropdowns();
}

// ---------- Події ----------
document.querySelectorAll('input[name="platform"]').forEach((radio) =>
  radio.addEventListener('change', () => onPlatformChosen(radio.value))
);

document.querySelectorAll('input[name="tier"]').forEach((radio) =>
  radio.addEventListener('change', () => onTierChosen(radio.value))
);

// Налаштування (Одинак Settings): тема застосовується тут, валюта — через fmt()
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const isDark = () => settings.theme === 'dark' || (settings.theme === 'auto' && systemDark.matches);

function updateThemeToggle() {
  const dark = isDark();
  $('themeToggle').setAttribute('aria-checked', String(dark));
  $('themeToggle').title = `${dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'} (Shift + клік — як у системі)`;
}

function applyTheme() {
  const root = document.documentElement;
  // Під час перемикання вимикаємо CSS-переходи, щоб схема не «блимала» старими кольорами
  root.classList.add('theme-switching');
  if (settings.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = settings.theme;
  void root.offsetWidth; // застосувати нові кольори до зняття класу
  requestAnimationFrame(() => root.classList.remove('theme-switching'));
  updateThemeToggle();
}

systemDark.addEventListener('change', updateThemeToggle);
$('themeToggle').addEventListener('click', (e) => settings.setTheme(e.shiftKey ? 'auto' : isDark() ? 'light' : 'dark'));
$('currencySelect').addEventListener('change', (e) => settings.setCurrency(e.target.value));

$('discount').addEventListener('change', (e) => {
  e.target.value = prices.setDiscount(e.target.value);
  refreshLabels();
  render();
});

$('buildBtn').addEventListener('click', onBuild);
$('clearLog').addEventListener('click', () => ($('log').innerHTML = ''));

$('presets').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-key]');
  if (btn) loadPc(presets.get(btn.dataset.key)); // Прототип: отримуємо клон зразка
});

$('saved').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const pc = saved.find((x) => x.id === Number(btn.closest('.build').dataset.id));
  if (!pc) return;

  if (btn.dataset.act === 'load') {
    loadPc(pc.clone()); // Прототип
  } else {
    if (btn.dataset.act === 'clone') saved.unshift(pc.clone()); // Прототип
    else saved.splice(saved.indexOf(pc), 1);
    persist();
  }
  render();
});

// ---------- Збірка під бюджет (Будівельник: PCDirector) ----------
let budgetUah = 45000; // бюджет зберігаємо в гривнях, а в полі показуємо у вибраній валюті

function renderBudgetInput() {
  $('budget').value = Math.round(settings.convert(budgetUah));
  $('budget').step = Math.max(1, Math.round(settings.convert(500)));
  $('budgetHint').textContent = { UAH: 'у гривнях', USD: 'у доларах', EUR: 'у євро' }[settings.currency];
}

function setAutoMsg(text = '', kind = '') {
  $('autoMsg').textContent = text;
  $('autoMsg').className = 'msg ' + kind;
}

function onAutoBuild() {
  const value = Number($('budget').value);
  if (!(value > 0)) return setAutoMsg('Вкажіть бюджет: додатне число', 'bad');
  const budget = Math.round(settings.toUah(value));
  const purpose = document.querySelector('input[name="purpose"]:checked').value;
  const platform = document.querySelector('input[name="autoPlatform"]:checked').value;
  const label = Performance.PURPOSES[purpose].label;

  try {
    const pc = new PCDirector(new PCBuilder()).buildForBudget(budget, { purpose, platform, name: `${label} · ${fmt(budget)}` });
    loadPc(pc);
    const left = budget - pc.totalPrice;
    const score = Math.round(Performance.score(pc.parts, purpose));
    setAutoMsg(
      `Підібрано за ${fmt(pc.totalPrice)} із ${fmt(budget)}${left > 0 ? ` (залишок ${fmt(left)})` : ''}. ` +
        `Оцінка для «${label}»: ${score} із 100. Збірку завантажено в конфігуратор.`,
      'ok'
    );
  } catch (err) {
    if (!(err instanceof BudgetError)) throw err;
    setAutoMsg(
      err.minBudget === null
        ? 'У каталозі немає сумісних комплектуючих для цих умов'
        : `За ${fmt(budget)} збірку для «${label}» не зібрати: потрібно щонайменше ${fmt(err.minBudget)}`,
      'bad'
    );
  }
}

$('budget').addEventListener('input', (e) => {
  const value = Number(e.target.value);
  if (value > 0) budgetUah = settings.toUah(value);
});
$('budget').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') onAutoBuild();
});
$('autoBtn').addEventListener('click', onAutoBuild);

// ---------- Експорт / імпорт JSON ----------
function setSavedMsg(text = '', kind = '') {
  const el = $('savedMsg');
  el.textContent = text;
  el.className = 'msg ' + kind;
}

$('exportBtn').addEventListener('click', () => {
  if (saved.length === 0) return setSavedMsg('Немає що експортувати: спершу зберіть хоча б один ПК', 'bad');
  const json = JSON.stringify(PCSerializer.toExport(saved), null, 2);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  link.download = 'patterns2026-builds.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  setSavedMsg(`Експортовано збірок: ${saved.length}`, 'ok');
});

$('importBtn').addEventListener('click', () => $('importFile').click());

$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = ''; // щоб той самий файл можна було вибрати ще раз
  if (!file) return;
  try {
    const list = PCSerializer.parseExport(JSON.parse(await file.text()));
    const { pcs, errors } = PCSerializer.restoreAll(list);
    saved.unshift(...pcs);
    persist();
    render();
    logger.log('Будівельник', `Імпорт: ${pcs.length} збірок створено заново через фабрики та PCBuilder, пропущено ${errors.length}`);
    const skipped = errors.length ? `, пропущено ${errors.length} (${errors[0]})` : '';
    setSavedMsg(`Імпортовано збірок: ${pcs.length}${skipped}`, errors.length && !pcs.length ? 'bad' : 'ok');
  } catch (err) {
    setSavedMsg(err instanceof SyntaxError ? 'Файл не є коректним JSON' : err.message, 'bad');
  }
});

// ---------- Старт ----------
settings.restore(settingsStorage.load()); // збережені валюта й тема
applyTheme();
$('currencySelect').value = settings.currency;
dropdowns.currency = new Dropdown($('currencySelect'), { compact: true, labelledBy: 'lbl-currency' });
buildSlotControls();
dropdowns.cmpA = new Dropdown($('cmpA'), { labelledBy: 'lbl-cmpA', searchFrom: 8 });
dropdowns.cmpB = new Dropdown($('cmpB'), { labelledBy: 'lbl-cmpB', searchFrom: 8 });
renderBudgetInput();

// Одинак: другий new повертає той самий об'єкт
logger.log('Одинак', `new PriceList() === PriceList.getInstance() → ${new PriceList() === prices}`);

// Директор збирає готові збірки будівельником; реєструємо їх як прототипи
logger.silently(() => {
  const director = new PCDirector(new PCBuilder());
  presets
    .register('office', director.buildOffice(), 'Навчання, документи, інтернет')
    .register('gaming', director.buildGaming(), 'Сучасні ігри у Full HD')
    .register('workstation', director.buildWorkstation(), 'Монтаж, 3D, віртуальні машини');
});
logger.log('Будівельник', 'PCDirector зібрав 3 готові збірки через PCBuilder (рецепти офісного, ігрового ПК та робочої станції)');
logger.log('Прототип', 'PresetRegistry зберігає ці збірки як прототипи: користувач завжди отримує їхні клони');

// Збережені раніше збірки: створюються заново через фабрики й будівельник
const restored = PCSerializer.restoreAll(storage.load());
saved.push(...restored.pcs);
if (restored.pcs.length || restored.errors.length) {
  logger.log('Будівельник', `З localStorage відновлено збірок: ${restored.pcs.length}, пропущено пошкоджених: ${restored.errors.length}`);
}

loadPc(presets.get('gaming'));

// Будь-яка зміна налаштувань: застосувати тему, зберегти, перемалювати ціни
settings.subscribe(() => {
  applyTheme();
  settingsStorage.save(settings.toData());
  refreshLabels();
  renderBudgetInput();
  render();
});
