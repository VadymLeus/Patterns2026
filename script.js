// Точка входу. Тут інтерфейс "склеює" усі п'ять патернів:
//
//   Одинак            — Logger, PriceList
//   Фабричний метод   — getCreator(...).create(...)        (відеокарта, пам'ять, накопичувач, БЖ, корпус)
//   Абстрактна фабрика— getPlatformFactory(...)             (процесор + плата одного сімейства)
//   Будівельник       — PCBuilder (+ PCDirector для готових збірок)
//   Прототип          — PC.clone(), PresetRegistry

// ---------- Стан застосунку ----------
const logger = Logger.getInstance();
const PATTERN_CLASS = {
  'Одинак': 'p-singleton',
  'Фабричний метод': 'p-factory',
  'Абстрактна фабрика': 'p-abstract',
  'Будівельник': 'p-builder',
  'Прототип': 'p-prototype',
};

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('uk-UA') + ' грн';
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

const prices = PriceList.getInstance(); // Одинак
const builder = new PCBuilder(); // Будівельник, з яким працює конфігуратор
const presets = new PresetRegistry(); // Прототипи готових збірок
const pcView = new PcView($('pcView')); // схема збірки (лише відображення)
const saved = []; // зібрані користувачем ПК
const selects = {}; // slot -> <select>
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
  opt.textContent = `${opt.dataset.label} — ${fmt(prices.getPrice(opt.value))}`;
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
    labelOption(opt);
    sel.append(opt);
  });
  sel.value = selectedId ?? items[0].id;
}

function buildSlotControls() {
  PC_SLOTS.forEach(({ key, label }) => {
    const wrap = document.createElement('label');
    wrap.className = 'field';
    wrap.innerHTML = `<span>${esc(label)}</span><select></select>`;
    $('slots').append(wrap);
    selects[key] = wrap.querySelector('select');
    selects[key].addEventListener('change', () => onPartChosen(key));
  });
  // Списки процесорів і плат заповнює applyPlatform(); решта не залежить від платформи
  ['ram', 'gpu', 'storage', 'psu', 'case'].forEach((slot) => fillSelect(slot, Catalog.byType(slot)));
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

function render() {
  renderView();
  renderSummary();
  renderPresets();
  renderSaved();
}

// ---------- Події ----------
document.querySelectorAll('input[name="platform"]').forEach((radio) =>
  radio.addEventListener('change', () => onPlatformChosen(radio.value))
);

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

  if (btn.dataset.act === 'load') loadPc(pc.clone()); // Прототип
  else if (btn.dataset.act === 'clone') saved.unshift(pc.clone()); // Прототип
  else saved.splice(saved.indexOf(pc), 1);
  render();
});

// ---------- Старт ----------
buildSlotControls();

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

loadPc(presets.get('gaming'));
