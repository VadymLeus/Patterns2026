// Красивий випадаючий список поверх звичайного <select>.
//
// Справжнім джерелом даних лишається сам <select> (він схований, але є в розмітці):
// вибір у списку записує значення в нього й викликає подію "change", тож решта коду
// працює так, ніби користувач вибирав у звичайному полі.
//
// Як описати варіант (атрибути <option>, усі необов'язкові):
//   data-title  головний рядок (за замовчуванням — текст option)
//   data-meta   додаткові характеристики сірим кольором
//   data-price  ціна праворуч
//   data-warn   текст конфлікту: варіант підсвічується червоною позначкою
// <optgroup label="..."> перетворюється на заголовок групи.
//
// Керування: стрілки, Home/End, Enter, Esc, набір літер; пошук для довгих списків.

class Dropdown {
  // Порядок у довгих списках: як у каталозі, від дешевших, від дорожчих (за data-sort — ціною в гривнях)
  static SORT_MODES = [
    { key: '', label: 'Каталог', icon: '↕' },
    { key: 'asc', label: 'Дешевші', icon: '↑' },
    { key: 'desc', label: 'Дорожчі', icon: '↓' },
  ];

  static #opened = null; // відкритий список: одночасно відкритий лише один
  static #counter = 0;

  static ICON_CHEVRON =
    '<svg class="dd-chevron" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  static ICON_CHECK =
    '<svg class="dd-check" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M4.5 10.5l3.7 3.7 7.3-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  static ICON_SEARCH =
    '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12.5 12.5L17 17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  static #esc(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // options: { compact, searchFrom, labelledBy, onOpen, placeholder }
  constructor(select, options = {}) {
    this.select = select;
    this.options = { compact: false, searchFrom: 6, labelledBy: '', onOpen: null, placeholder: 'Оберіть…', ...options };
    this.uid = `dd${++Dropdown.#counter}`;
    this.isOpen = false;
    this.active = null; // <li> з підсвіткою
    this.typed = '';
    this.typedTimer = null;
    this.sortMode = ''; // '' | 'asc' | 'desc'
    this.#build();
    this.#bind();
    this.sync();
  }

  // ---------- Розмітка ----------
  #build() {
    const { select } = this;
    this.root = document.createElement('div');
    this.root.className = 'dd' + (this.options.compact ? ' dd-compact' : '');
    select.parentNode.insertBefore(this.root, select);

    const labelled = this.options.labelledBy ? ` aria-labelledby="${this.options.labelledBy} ${this.uid}-btn"` : '';
    this.root.innerHTML = `
      <button type="button" class="dd-btn" id="${this.uid}-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="${this.uid}-list"${labelled}>
        <span class="dd-main"><span class="dd-title"></span><span class="dd-meta"></span></span>
        <span class="dd-price"></span>${Dropdown.ICON_CHEVRON}
      </button>
      <div class="dd-panel" hidden>
        <div class="dd-searchbox" hidden>${Dropdown.ICON_SEARCH}
          <input class="dd-search" type="text" placeholder="Пошук…" aria-label="Пошук у списку" autocomplete="off" spellcheck="false">
          <button type="button" class="dd-sort" tabindex="-1" hidden></button>
        </div>
        <ul class="dd-list" id="${this.uid}-list" role="listbox" tabindex="-1"></ul>
        <p class="dd-empty" hidden>Нічого не знайдено</p>
      </div>`;

    // Рідний <select> лишається в розмітці, але недоступний для миші, клавіатури й читачів екрана
    this.root.append(select);
    select.classList.add('dd-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    this.button = this.root.querySelector('.dd-btn');
    this.panel = this.root.querySelector('.dd-panel');
    this.list = this.root.querySelector('.dd-list');
    this.searchBox = this.root.querySelector('.dd-searchbox');
    this.search = this.root.querySelector('.dd-search');
    this.sortBtn = this.root.querySelector('.dd-sort');
    this.empty = this.root.querySelector('.dd-empty');
  }

  // ---------- Дані з <select> ----------
  #item(option) {
    const d = option.dataset;
    return {
      value: option.value,
      title: d.title ?? option.textContent,
      meta: d.meta ?? '',
      price: d.price ?? '',
      sort: d.sort !== undefined && d.sort !== '' && Number.isFinite(Number(d.sort)) ? Number(d.sort) : null,
      warn: d.warn ?? '',
      disabled: option.disabled,
    };
  }

  #entries() {
    const entries = [];
    for (const node of this.select.children) {
      if (node.tagName === 'OPTGROUP') {
        entries.push({ heading: node.label });
        [...node.children].forEach((o) => entries.push(this.#item(o)));
      } else {
        entries.push(this.#item(node));
      }
    }
    return this.#sorted(entries);
  }

  // Сортування за ціною діє окремо в кожній групі (заголовки лишаються на місці)
  #sorted(entries) {
    if (!this.sortMode || !this.#canSort(entries)) return entries;
    const sign = this.sortMode === 'asc' ? 1 : -1;
    const result = [];
    let run = [];
    const flush = () => {
      run.sort((a, b) => sign * (a.sort - b.sort)); // сортування стабільне: рівні ціни лишаються в порядку каталогу
      result.push(...run);
      run = [];
    };
    for (const entry of entries) {
      if (entry.heading !== undefined) {
        flush();
        result.push(entry);
      } else {
        run.push(entry);
      }
    }
    flush();
    return result;
  }

  // Сортувати можна, лише якщо в кожного варіанта є ціна для порівняння
  #canSort(entries) {
    const items = entries.filter((e) => e.heading === undefined);
    return items.length > 1 && items.every((e) => e.sort !== null);
  }

  #updateSortButton(entries) {
    const mode = Dropdown.SORT_MODES.find((m) => m.key === this.sortMode);
    this.sortBtn.hidden = this.searchBox.hidden || !this.#canSort(entries);
    this.sortBtn.textContent = `${mode.icon} ${mode.label}`;
    this.sortBtn.setAttribute('aria-label', `Порядок: ${mode.label.toLowerCase()}. Натисніть, щоб змінити`);
    this.sortBtn.title = 'Порядок у списку: каталог → дешевші → дорожчі';
  }

  #cycleSort() {
    const index = Dropdown.SORT_MODES.findIndex((m) => m.key === this.sortMode);
    this.sortMode = Dropdown.SORT_MODES[(index + 1) % Dropdown.SORT_MODES.length].key;
    const query = this.search.value;
    this.#render();
    this.search.value = query;
    this.#filter();
    const selected = this.list.querySelector('.dd-opt[aria-selected="true"]:not([hidden])');
    if (selected) this.#setActive(selected);
  }

  // Оновлює кнопку за поточним значенням <select> (викликати після зміни значення чи цін)
  sync() {
    const option = this.select.selectedOptions[0];
    const item = option ? this.#item(option) : null;
    this.button.querySelector('.dd-title').textContent = item ? item.title : this.options.placeholder;
    this.button.querySelector('.dd-meta').textContent = item ? item.meta : '';
    this.button.querySelector('.dd-price').textContent = item ? item.price : '';
    this.button.classList.toggle('has-warn', Boolean(item && item.warn));
    this.button.disabled = this.select.disabled;
  }

  // ---------- Список ----------
  #render() {
    const entries = this.#entries();
    const count = entries.filter((e) => !e.heading).length;
    this.searchBox.hidden = count < this.options.searchFrom;
    this.#updateSortButton(entries);
    this.search.value = '';
    this.empty.hidden = true;

    this.list.innerHTML = entries
      .map((e, i) => {
        if (e.heading !== undefined) return `<li class="dd-group" role="presentation">${Dropdown.#esc(e.heading)}</li>`;
        const selected = e.value === this.select.value;
        return `<li class="dd-opt${e.warn ? ' has-warn' : ''}${e.disabled ? ' is-disabled' : ''}" role="option" id="${this.uid}-o${i}"
            data-value="${Dropdown.#esc(e.value)}" aria-selected="${selected}"${e.disabled ? ' aria-disabled="true"' : ''}>
          ${Dropdown.ICON_CHECK}
          <span class="dd-text"><span class="dd-title">${Dropdown.#esc(e.title)}</span>${e.meta ? `<span class="dd-meta">${Dropdown.#esc(e.meta)}</span>` : ''}${
          e.warn ? `<span class="dd-warn">${Dropdown.#esc(e.warn)}</span>` : ''
        }</span>
          ${e.price ? `<span class="dd-price">${Dropdown.#esc(e.price)}</span>` : ''}
        </li>`;
      })
      .join('');
  }

  #visibleOptions() {
    return [...this.list.querySelectorAll('.dd-opt:not([hidden]):not(.is-disabled)')];
  }

  #setActive(option, scroll = true) {
    this.active?.classList.remove('is-active');
    this.active = option;
    const focusTarget = this.searchBox.hidden ? this.list : this.search;
    if (option) {
      option.classList.add('is-active');
      focusTarget.setAttribute('aria-activedescendant', option.id);
      if (scroll) this.#reveal(option);
    } else {
      focusTarget.removeAttribute('aria-activedescendant');
    }
  }

  // Прокручує лише сам список (а не сторінку), щоб варіант було видно
  #reveal(option) {
    const { list } = this;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < list.scrollTop + 6) list.scrollTop = Math.max(0, top - 6);
    else if (bottom > list.scrollTop + list.clientHeight - 6) list.scrollTop = bottom - list.clientHeight + 6;
  }

  #filter() {
    const query = this.search.value.trim().toLowerCase();
    let shown = 0;
    let groupHeader = null;
    let groupHasVisible = false;
    const closeGroup = () => {
      if (groupHeader) groupHeader.hidden = !groupHasVisible;
    };
    for (const li of this.list.children) {
      if (li.classList.contains('dd-group')) {
        closeGroup();
        groupHeader = li;
        groupHasVisible = false;
        continue;
      }
      const text = li.querySelector('.dd-text').textContent.toLowerCase();
      li.hidden = query !== '' && !text.includes(query);
      if (!li.hidden) {
        shown++;
        groupHasVisible = true;
      }
    }
    closeGroup();
    this.empty.hidden = shown > 0;
    this.#setActive(this.#visibleOptions()[0] ?? null, false);
  }

  // ---------- Відкриття й закриття ----------
  open() {
    if (this.isOpen || this.select.disabled) return;
    Dropdown.#opened?.close();
    this.options.onOpen?.(this);
    this.#render();

    this.panel.hidden = false;
    this.#position();
    this.isOpen = true;
    this.root.classList.add('open');
    this.button.setAttribute('aria-expanded', 'true');
    Dropdown.#opened = this;

    const selected = this.list.querySelector('[aria-selected="true"]') ?? this.#visibleOptions()[0] ?? null;
    this.#setActive(selected);
    (this.searchBox.hidden ? this.list : this.search).focus({ preventScroll: true });
  }

  // Куди відкривати: якщо знизу мало місця, а зверху більше — вгору
  #position() {
    const rect = this.button.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 14;
    const above = rect.top - 14;
    const up = below < 280 && above > below;
    this.root.classList.toggle('dd-up', up);
    this.panel.style.setProperty('--dd-max', `${Math.max(160, Math.min(380, up ? above : below))}px`);
  }

  close(returnFocus = false) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.panel.hidden = true;
    this.root.classList.remove('open', 'dd-up');
    this.button.setAttribute('aria-expanded', 'false');
    this.#setActive(null, false);
    if (Dropdown.#opened === this) Dropdown.#opened = null;
    if (returnFocus) this.button.focus({ preventScroll: true });
  }

  #choose(option) {
    if (!option || option.classList.contains('is-disabled')) return;
    const value = option.dataset.value;
    if (this.select.value !== value) {
      this.select.value = value;
      this.select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    this.sync();
    this.close(true);
  }

  #move(step) {
    const options = this.#visibleOptions();
    if (!options.length) return;
    const index = options.indexOf(this.active);
    const next = index === -1 ? (step > 0 ? 0 : options.length - 1) : (index + step + options.length) % options.length;
    this.#setActive(options[next]);
  }

  // Набір літер без поля пошуку: перехід до першого варіанта, що починається з них
  #typeAhead(char) {
    this.typed += char.toLowerCase();
    clearTimeout(this.typedTimer);
    this.typedTimer = setTimeout(() => (this.typed = ''), 600);
    const match = this.#visibleOptions().find((o) => o.querySelector('.dd-title').textContent.toLowerCase().startsWith(this.typed));
    if (match) this.#setActive(match);
  }

  // ---------- Події ----------
  #bind() {
    this.button.addEventListener('click', () => (this.isOpen ? this.close(true) : this.open()));

    this.root.addEventListener('keydown', (e) => {
      if (this.isOpen && e.target === this.sortBtn) {
        // Фокус на кнопці порядку: Enter і пропуск змінюють порядок, а не вибирають варіант
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.#cycleSort();
          this.sortBtn.focus({ preventScroll: true });
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          this.search.focus({ preventScroll: true });
          this.#move(e.key === 'ArrowDown' ? 1 : -1);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.close(true);
        } else if (e.key === 'Tab') {
          if (e.shiftKey) {
            e.preventDefault();
            this.search.focus({ preventScroll: true });
          } else {
            this.close();
          }
        }
        return;
      }
      if (!this.isOpen) {
        if (e.target === this.button && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
          e.preventDefault();
          this.open();
        }
        return;
      }
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); this.#move(1); break;
        case 'ArrowUp': e.preventDefault(); this.#move(-1); break;
        case 'Home': if (this.searchBox.hidden) { e.preventDefault(); this.#setActive(this.#visibleOptions()[0] ?? null); } break;
        case 'End': if (this.searchBox.hidden) { e.preventDefault(); this.#setActive(this.#visibleOptions().at(-1) ?? null); } break;
        case 'Enter': e.preventDefault(); this.#choose(this.active); break;
        case ' ': if (this.searchBox.hidden) { e.preventDefault(); this.#choose(this.active); } break;
        case 'Escape': e.preventDefault(); e.stopPropagation(); this.close(true); break;
        case 'Tab':
          // З поля пошуку Tab веде до кнопки порядку (якщо вона є), далі закриває список
          if (!e.shiftKey && e.target === this.search && !this.sortBtn.hidden) {
            e.preventDefault();
            this.sortBtn.focus({ preventScroll: true });
          } else {
            this.close();
          }
          break;
        default:
          if (this.searchBox.hidden && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) this.#typeAhead(e.key);
      }
    });

    this.search.addEventListener('input', () => this.#filter());

    // Кнопку порядку не відбираємо в поля пошуку фокус мишкою; з клавіатури до неї можна дійти по Tab
    this.sortBtn.addEventListener('mousedown', (e) => e.preventDefault());
    this.sortBtn.addEventListener('click', () => this.#cycleSort());

    // Мишка: наведення підсвічує, клік вибирає. mousedown не віддаємо, щоб поле пошуку не втрачало фокус
    this.list.addEventListener('mousedown', (e) => e.preventDefault());
    this.list.addEventListener('mousemove', (e) => {
      const li = e.target.closest('.dd-opt');
      if (li && li !== this.active && !li.classList.contains('is-disabled')) this.#setActive(li, false);
    });
    this.list.addEventListener('click', (e) => this.#choose(e.target.closest('.dd-opt')));

    // Клік або фокус за межами списку закриває його
    document.addEventListener('pointerdown', (e) => {
      if (this.isOpen && !this.root.contains(e.target)) this.close();
    });
    document.addEventListener('focusin', (e) => {
      if (this.isOpen && !this.root.contains(e.target)) this.close();
    });
    // Панель позиціонується всередині блока, тому скрол сторінки їй не заважає;
    // змінився розмір вікна (чи з'явилась екранна клавіатура) — лише перерахуємо, куди відкриватись
    window.addEventListener('resize', () => this.isOpen && this.#position());
  }
}
