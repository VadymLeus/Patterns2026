// Малює «карту патернів» (див. library/analysis/PatternMap.js) у готовому <svg>.
// Вузли — кнопки: клік, Enter або пропуск вибирають вузол, і журнал показує лише його записи.
// Під час нового запису потрібний вузол спалахує, а ребра, що ведуть до нього, коротко підсвічуються.

class PatternMapView {
  static #NS = 'http://www.w3.org/2000/svg';

  // Розташування (в одиницях viewBox 0 0 840 396). Дані про самі вузли — у PatternMap.
  static LAYOUT = {
    nodes: {
      ui: [8, 8, 104, 266],
      director: [190, 8, 150, 56],
      intel: [186, 114, 140, 62],
      amd: [336, 114, 140, 62],
      tier: [186, 192, 140, 62],
      creators: [336, 192, 140, 62],
      builder: [550, 100, 120, 62],
      pc: [720, 100, 112, 62],
      presets: [720, 214, 112, 62],
      storage: [550, 214, 120, 62],
      settings: [186, 322, 140, 56],
      price: [346, 322, 140, 56],
      logger: [506, 322, 140, 56],
    },
    groups: {
      producers: [170, 84, 320, 190],
      singletons: [170, 292, 662, 96],
    },
    // шлях ребра й місце підпису (x, y, якір тексту)
    edges: {
      'ui>director': { d: 'M112,36 H190', label: [151, 28, 'middle'] },
      'ui>producers': { d: 'M112,179 H170', label: [141, 171, 'middle'] },
      'director>producers': { d: 'M265,64 V84', label: [273, 78, 'start'] },
      'director>builder': { d: 'M340,36 H610 V100', label: [475, 28, 'middle'] },
      'producers>builder': { d: 'M490,179 H520 V131 H550', label: [494, 171, 'start'] },
      'builder>pc': { d: 'M670,131 H720', label: [695, 123, 'middle'] },
      'presets>pc': { d: 'M776,214 V162', label: [784, 192, 'start'] },
      'storage>builder': { d: 'M610,214 V162', label: [618, 192, 'start'] },
      'producers>price': { d: 'M416,274 V322', label: [424, 289, 'start'] },
      'ui>settings': { d: 'M60,274 V350 H186', label: [66, 342, 'start'] },
    },
  };

  #svg;
  #map;
  #onSelect;
  #selected = null;
  #nodes = new Map(); // id → { g, count, countText, sub, node }
  #edges = []; // { from, to, g }

  constructor(svg, map, { onSelect = () => {} } = {}) {
    this.#svg = svg;
    this.#map = map;
    this.#onSelect = onSelect;
    this.#build();
    this.update();
  }

  get selected() {
    return this.#selected;
  }

  // ---------- Побудова ----------
  #el(name, attrs = {}, parent = this.#svg) {
    const el = document.createElementNS(PatternMapView.#NS, name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    parent.appendChild(el);
    return el;
  }

  #text(parent, x, y, text, cls, anchor = 'middle') {
    const t = this.#el('text', { x, y, class: cls, 'text-anchor': anchor }, parent);
    t.textContent = text;
    return t;
  }

  #build() {
    const { nodes, groups, edges } = PatternMapView.LAYOUT;
    const svg = this.#svg;
    svg.setAttribute('viewBox', '0 0 840 396');

    // Стрілки: звичайна й підсвічена
    const defs = this.#el('defs');
    ['pm-arrow', 'pm-arrow-on'].forEach((id) => {
      const marker = this.#el(
        'marker',
        { id, markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto', markerUnits: 'userSpaceOnUse' },
        defs
      );
      this.#el('path', { d: 'M0,0 L8,4 L0,8 z', class: id }, marker);
    });

    // Рамки груп — під усім іншим
    PatternMap.GROUPS.forEach((group) => {
      const [x, y, w, h] = groups[group.id];
      const g = this.#el('g', { class: 'pm-group' });
      this.#el('rect', { x, y, width: w, height: h, rx: 14 }, g);
      this.#text(g, x + 12, y + 19, group.label, 'pm-group-label', 'start');
    });

    // Ребра
    PatternMap.EDGES.forEach(([from, to, label]) => {
      const spec = edges[`${from}>${to}`];
      const g = this.#el('g', { class: 'pm-edge' });
      this.#el('path', { d: spec.d }, g);
      const [lx, ly, anchor] = spec.label;
      this.#text(g, lx, ly, label, 'pm-edge-label', anchor);
      this.#edges.push({ from, to, g });
    });

    // Вузли
    PatternMap.NODES.forEach((node) => {
      const [x, y, w, h] = nodes[node.id];
      const interactive = node.interactive !== false;
      const g = this.#el('g', {
        class: `pm-node ${PATTERN_CLASS[node.pattern] || ''}${interactive ? '' : ' static'}`,
        'data-node': node.id,
      });
      if (interactive) {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-pressed', 'false');
        g.addEventListener('click', () => this.#choose(node.id));
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.#choose(node.id);
          }
        });
      }
      this.#el('rect', { x, y, width: w, height: h, rx: 10, class: 'pm-box' }, g);
      const cy = y + h / 2; // підпис по центру (для високої смуги «Інтерфейс» теж)
      this.#text(g, x + w / 2, cy - 2, node.label, 'pm-title');
      const sub = this.#text(g, x + w / 2, cy + 14, node.sub, 'pm-sub');

      let count = null;
      let countText = null;
      if (interactive) {
        count = this.#el('g', { class: 'pm-count' }, g);
        this.#el('rect', { x: x + w - 30, y: y - 9, width: 36, height: 18, rx: 9 }, count);
        countText = this.#text(count, x + w - 12, y + 4, '0', 'pm-count-text');
      }
      this.#nodes.set(node.id, { g, count, countText, sub, node });
    });
  }

  // ---------- Стан ----------
  #choose(id) {
    // Повторний клік по вибраному вузлу й клік по Logger знімають вибір
    this.select(this.#selected === id || id === 'logger' ? null : id);
    this.#onSelect(this.#selected);
  }

  select(id) {
    this.#selected = id;
    this.#nodes.forEach(({ g, node }, key) => {
      const on = key === id;
      g.classList.toggle('sel', on);
      if (node.interactive !== false) g.setAttribute('aria-pressed', String(on));
    });
    this.#edges.forEach(({ from, to, g }) => {
      const touches = (end) => PatternMap.membersOf(end).includes(id);
      g.classList.toggle('on', Boolean(id) && (touches(from) || touches(to)));
    });
  }

  // Перемальовує лічильники й підписи
  update() {
    this.#nodes.forEach(({ countText, count, sub, node, g }, id) => {
      const n = this.#map.count(id);
      const last = this.#map.last(id);
      sub.textContent = last && last !== node.label ? last : node.sub;
      if (!count) return;
      countText.textContent = n > 999 ? '999+' : String(n);
      count.classList.toggle('zero', n === 0);
      g.setAttribute('aria-label', `${node.label}: записів у журналі — ${n}. Натисніть, щоб показати їх.`);
    });
  }

  // Спалах вузла й ребер, що ведуть до нього
  pulse(id) {
    const entry = this.#nodes.get(id);
    if (!entry) return;
    const flash = (el, cls) => {
      el.classList.remove(cls);
      void el.getBoundingClientRect(); // перезапуск анімації
      el.classList.add(cls);
      el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
    };
    flash(entry.g, 'pulse');
    this.#edges
      .filter(({ to }) => PatternMap.membersOf(to).includes(id))
      .forEach(({ g }) => flash(g, 'flash'));
  }
}
