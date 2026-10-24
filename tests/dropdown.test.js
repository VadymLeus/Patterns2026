describe('Інтерфейс', 'Випадаючий список (ui/Dropdown.js)', () => {
  const boxes = [];

  // Створює <select> із варіантами [value, text, {title, meta, price, warn, disabled}] і загортає його в Dropdown
  const make = (items, options = {}) => {
    const box = document.createElement('div');
    box.className = 'card';
    box.innerHTML = '<select></select>';
    document.body.append(box);
    boxes.push(box);
    const select = box.querySelector('select');
    const add = (parent, [value, text, data = {}]) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      const { disabled, ...rest } = data;
      Object.assign(opt.dataset, rest);
      opt.disabled = Boolean(disabled);
      parent.append(opt);
    };
    items.forEach((item) => {
      if (item.group) {
        const group = document.createElement('optgroup');
        group.label = item.group;
        item.items.forEach((child) => add(group, child));
        select.append(group);
      } else {
        add(select, item);
      }
    });
    const dd = new Dropdown(select, options);
    return { select, dd, root: dd.root, button: dd.button, panel: dd.panel };
  };

  const key = (target, name) => target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  const optionsOf = (ctx) => [...ctx.root.querySelectorAll('.dd-opt')];

  afterEach(() => {
    boxes.splice(0).forEach((box) => box.remove());
  });

  const THREE = [['a', 'Альфа'], ['b', 'Бета'], ['c', 'Гамма']];

  it('загортає select: рідний список схований, кнопка показує вибраний варіант', () => {
    const ctx = make(THREE);
    expect(ctx.select.classList.contains('dd-native')).toBe(true);
    expect(ctx.select.getAttribute('aria-hidden')).toBe('true');
    expect(ctx.button.querySelector('.dd-title').textContent).toBe('Альфа');
    expect(ctx.root.contains(ctx.select)).toBe(true);
  });

  it('data-title, data-meta і data-price потрапляють на кнопку', () => {
    const ctx = make([['x', 'запасний текст', { title: 'Заголовок', meta: 'деталі', price: '1 000 грн' }]]);
    expect(ctx.button.querySelector('.dd-title').textContent).toBe('Заголовок');
    expect(ctx.button.querySelector('.dd-meta').textContent).toBe('деталі');
    expect(ctx.button.querySelector('.dd-price').textContent).toBe('1 000 грн');
  });

  it('список закритий, поки його не відкрили', () => {
    const ctx = make(THREE);
    expect(ctx.panel.hidden).toBe(true);
    expect(ctx.button.getAttribute('aria-expanded')).toBe('false');
  });

  it('клік по кнопці відкриває список, обраний варіант позначений', () => {
    const ctx = make(THREE);
    ctx.select.value = 'b';
    ctx.button.click();
    expect(ctx.panel.hidden).toBe(false);
    expect(ctx.button.getAttribute('aria-expanded')).toBe('true');
    expect(optionsOf(ctx).length).toBe(3);
    expect(optionsOf(ctx).map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
  });

  it('вибір варіанта змінює select, викликає change один раз і закриває список', () => {
    const ctx = make(THREE);
    let changes = 0;
    ctx.select.addEventListener('change', () => changes++);
    ctx.button.click();
    optionsOf(ctx)[2].click();
    expect(ctx.select.value).toBe('c');
    expect(changes).toBe(1);
    expect(ctx.panel.hidden).toBe(true);
    expect(ctx.button.querySelector('.dd-title').textContent).toBe('Гамма');
  });

  it('вибір того самого значення не викликає change', () => {
    const ctx = make(THREE);
    let changes = 0;
    ctx.select.addEventListener('change', () => changes++);
    ctx.button.click();
    optionsOf(ctx)[0].click();
    expect(changes).toBe(0);
    expect(ctx.panel.hidden).toBe(true);
  });

  it('sync() підхоплює значення, змінене програмно', () => {
    const ctx = make(THREE);
    ctx.select.value = 'c';
    ctx.dd.sync();
    expect(ctx.button.querySelector('.dd-title').textContent).toBe('Гамма');
  });

  it('клавіатура: стрілка вниз відкриває, ще стрілка й Enter вибирають', () => {
    const ctx = make(THREE);
    key(ctx.button, 'ArrowDown');
    expect(ctx.panel.hidden).toBe(false);
    key(ctx.root, 'ArrowDown');
    key(ctx.root, 'Enter');
    expect(ctx.select.value).toBe('b');
    expect(ctx.panel.hidden).toBe(true);
  });

  it('клавіатура: стрілка вгору з першого варіанта переходить до останнього', () => {
    const ctx = make(THREE);
    key(ctx.button, 'Enter');
    key(ctx.root, 'ArrowUp');
    key(ctx.root, 'Enter');
    expect(ctx.select.value).toBe('c');
  });

  it('Escape закриває список і не змінює значення', () => {
    const ctx = make(THREE);
    ctx.button.click();
    key(ctx.root, 'ArrowDown');
    key(ctx.root, 'Escape');
    expect(ctx.panel.hidden).toBe(true);
    expect(ctx.select.value).toBe('a');
  });

  it('одночасно відкритий лише один список', () => {
    const first = make(THREE);
    const second = make(THREE);
    first.button.click();
    second.button.click();
    expect(first.panel.hidden).toBe(true);
    expect(second.panel.hidden).toBe(false);
  });

  it('пошук з’являється лише в довгих списках', () => {
    const short = make(THREE);
    const long = make(['a', 'b', 'c', 'd', 'e', 'f'].map((v) => [v, 'Варіант ' + v]));
    short.button.click();
    long.button.click();
    expect(short.root.querySelector('.dd-searchbox').hidden).toBe(true);
    expect(long.root.querySelector('.dd-searchbox').hidden).toBe(false);
  });

  it('пошук відфільтровує варіанти та показує повідомлення, коли нічого не знайдено', () => {
    const ctx = make(['a', 'b', 'c', 'd', 'e', 'f'].map((v) => [v, 'Варіант ' + v.toUpperCase()]), { searchFrom: 3 });
    const search = ctx.root.querySelector('.dd-search');
    ctx.button.click();
    search.value = 'в';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(optionsOf(ctx).filter((o) => !o.hidden).length).toBe(6);
    search.value = 'варіант c';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(optionsOf(ctx).filter((o) => !o.hidden).length).toBe(1);
    search.value = 'немає такого';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(ctx.root.querySelector('.dd-empty').hidden).toBe(false);
  });

  it('optgroup стає заголовком групи', () => {
    const ctx = make([
      { group: 'Перша', items: [['a', 'Альфа']] },
      { group: 'Друга', items: [['b', 'Бета']] },
    ]);
    ctx.button.click();
    expect([...ctx.root.querySelectorAll('.dd-group')].map((g) => g.textContent)).toEqual(['Перша', 'Друга']);
    expect(optionsOf(ctx).length).toBe(2);
  });

  it('попередження (data-warn) показується у списку й на кнопці вибраного варіанта', () => {
    const ctx = make([['a', 'Альфа', { warn: 'Не підходить до плати' }], ['b', 'Бета']]);
    ctx.dd.sync();
    expect(ctx.button.classList.contains('has-warn')).toBe(true);
    ctx.button.click();
    expect(optionsOf(ctx)[0].querySelector('.dd-warn').textContent).toBe('Не підходить до плати');
    expect(optionsOf(ctx)[1].querySelector('.dd-warn')).toBe(null);
  });

  it('HTML у назвах екранується', () => {
    const ctx = make([['a', 'x', { title: '<b>жирний</b>' }]]);
    ctx.button.click();
    expect(ctx.root.querySelector('.dd-opt b')).toBe(null);
    expect(ctx.root.querySelector('.dd-opt .dd-title').textContent).toBe('<b>жирний</b>');
  });

  it('вимкнений варіант вибрати не можна', () => {
    const ctx = make([['a', 'Альфа'], ['b', 'Бета', { disabled: true }]]);
    ctx.button.click();
    optionsOf(ctx)[1].click();
    expect(ctx.select.value).toBe('a');
    expect(ctx.panel.hidden).toBe(false);
  });

  it('порожній select не ламає компонент', () => {
    const ctx = make([]);
    expect(ctx.button.querySelector('.dd-title').textContent).toBe('Оберіть…');
    ctx.button.click();
    expect(optionsOf(ctx).length).toBe(0);
  });
});
