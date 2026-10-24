describe('Інтерфейс', 'Випадаючий список: сортування за ціною', () => {
  const boxes = [];

  // items: [value, назва, ціна-число або null]; groups — необов'язкові optgroup
  const make = (items, options = {}) => {
    const box = document.createElement('div');
    box.className = 'card';
    box.innerHTML = '<select></select>';
    document.body.append(box);
    boxes.push(box);
    const select = box.querySelector('select');
    const add = (parent, [value, text, sort]) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      opt.dataset.title = text;
      if (sort !== null && sort !== undefined) opt.dataset.sort = String(sort);
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
    const dd = new Dropdown(select, { searchFrom: 4, ...options });
    return { select, dd, root: dd.root, button: dd.button };
  };

  const key = (target, name, extra = {}) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...extra }));
  const sortBtn = (ctx) => ctx.root.querySelector('.dd-sort');
  const titles = (ctx) => [...ctx.root.querySelectorAll('.dd-opt:not([hidden]) .dd-title')].map((el) => el.textContent);

  afterEach(() => boxes.splice(0).forEach((box) => box.remove()));

  const FIVE = [['a', 'Альфа', 300], ['b', 'Бета', 100], ['c', 'Гамма', 500], ['d', 'Дельта', 200], ['e', 'Епсилон', 400]];

  it('у довгому списку з цінами є кнопка порядку, спочатку — «Каталог»', () => {
    const ctx = make(FIVE);
    ctx.dd.open();
    expect(sortBtn(ctx).hidden).toBe(false);
    expect(sortBtn(ctx).textContent).toContain('Каталог');
    expect(titles(ctx)).toEqual(['Альфа', 'Бета', 'Гамма', 'Дельта', 'Епсилон']);
  });

  it('у короткому списку кнопки немає, навіть якщо ціни задано', () => {
    const ctx = make(FIVE.slice(0, 3));
    ctx.dd.open();
    expect(sortBtn(ctx).hidden).toBe(true);
  });

  it('без цін (або не в усіх варіантів) сортувати нічого, тож кнопки немає', () => {
    const none = make(FIVE.map(([v, t]) => [v, t]));
    none.dd.open();
    expect(sortBtn(none).hidden).toBe(true);
    const partial = make(FIVE.map(([v, t, p], i) => [v, t, i === 2 ? null : p]));
    partial.dd.open();
    expect(sortBtn(partial).hidden).toBe(true);
  });

  it('клік змінює порядок по колу: каталог → дешевші → дорожчі → каталог', () => {
    const ctx = make(FIVE);
    ctx.dd.open();
    sortBtn(ctx).click();
    expect(sortBtn(ctx).textContent).toContain('Дешевші');
    expect(titles(ctx)).toEqual(['Бета', 'Дельта', 'Альфа', 'Епсилон', 'Гамма']);
    sortBtn(ctx).click();
    expect(sortBtn(ctx).textContent).toContain('Дорожчі');
    expect(titles(ctx)).toEqual(['Гамма', 'Епсилон', 'Альфа', 'Дельта', 'Бета']);
    sortBtn(ctx).click();
    expect(sortBtn(ctx).textContent).toContain('Каталог');
    expect(titles(ctx)).toEqual(['Альфа', 'Бета', 'Гамма', 'Дельта', 'Епсилон']);
  });

  it('однакові ціни лишаються в порядку каталогу', () => {
    const ctx = make([['a', 'Перша', 100], ['b', 'Друга', 100], ['c', 'Третя', 50], ['d', 'Четверта', 100]]);
    ctx.dd.open();
    sortBtn(ctx).click();
    expect(titles(ctx)).toEqual(['Третя', 'Перша', 'Друга', 'Четверта']);
  });

  it('сортування не змінює вибране значення', () => {
    const ctx = make(FIVE);
    ctx.select.value = 'c';
    ctx.dd.sync();
    ctx.dd.open();
    sortBtn(ctx).click();
    expect(ctx.select.value).toBe('c');
    expect(ctx.root.querySelector('.dd-opt[aria-selected="true"] .dd-title').textContent).toBe('Гамма');
  });

  it('вибір у відсортованому списку записує правильне значення', () => {
    const ctx = make(FIVE);
    let changes = 0;
    ctx.select.addEventListener('change', () => changes++);
    ctx.dd.open();
    sortBtn(ctx).click(); // від дешевших: перша — «Бета»
    ctx.root.querySelector('.dd-opt').click();
    expect(ctx.select.value).toBe('b');
    expect(changes).toBe(1);
  });

  it('порядок зберігається між відкриттями', () => {
    const ctx = make(FIVE);
    ctx.dd.open();
    sortBtn(ctx).click();
    ctx.dd.close();
    ctx.dd.open();
    expect(sortBtn(ctx).textContent).toContain('Дешевші');
    expect(titles(ctx)[0]).toBe('Бета');
  });

  it('пошук і сортування працюють разом', () => {
    const ctx = make(FIVE);
    ctx.dd.open();
    const search = ctx.root.querySelector('.dd-search');
    search.value = 'ль'; // Альфа, Дельта
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(titles(ctx)).toEqual(['Альфа', 'Дельта']);
    sortBtn(ctx).click();
    expect(search.value).toBe('ль');
    expect(titles(ctx)).toEqual(['Дельта', 'Альфа']);
  });

  it('у групах сортування діє всередині кожної, заголовки лишаються', () => {
    const ctx = make([
      { group: 'Intel', items: [['a', 'А', 300], ['b', 'Б', 100], ['c', 'В', 200]] },
      { group: 'AMD', items: [['d', 'Г', 90], ['e', 'Ґ', 10], ['f', 'Д', 50]] },
    ]);
    ctx.dd.open();
    sortBtn(ctx).click();
    const rows = [...ctx.root.querySelectorAll('.dd-list > li')].map((li) =>
      li.classList.contains('dd-group') ? `#${li.textContent}` : li.querySelector('.dd-title').textContent
    );
    expect(rows).toEqual(['#Intel', 'Б', 'В', 'А', '#AMD', 'Ґ', 'Д', 'Г']);
  });

  it('Enter на кнопці порядку змінює порядок і не вибирає варіант', () => {
    const ctx = make(FIVE);
    ctx.dd.open();
    sortBtn(ctx).focus();
    key(sortBtn(ctx), 'Enter');
    expect(sortBtn(ctx).textContent).toContain('Дешевші');
    expect(ctx.select.value).toBe('a');
    expect(ctx.dd.isOpen).toBe(true);
  });

  it('Tab із поля пошуку веде на кнопку порядку, а Shift+Tab повертає назад', () => {
    const ctx = make(FIVE);
    ctx.dd.open();
    const search = ctx.root.querySelector('.dd-search');
    key(search, 'Tab');
    expect(document.activeElement).toBe(sortBtn(ctx));
    expect(ctx.dd.isOpen).toBe(true);
    key(sortBtn(ctx), 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(search);
  });

  it('Tab із кнопки порядку закриває список, а Escape закриває й повертає фокус', () => {
    const ctx = make(FIVE);
    ctx.dd.open();
    sortBtn(ctx).focus();
    key(sortBtn(ctx), 'Tab');
    expect(ctx.dd.isOpen).toBe(false);
    ctx.dd.open();
    sortBtn(ctx).focus();
    key(sortBtn(ctx), 'Escape');
    expect(ctx.dd.isOpen).toBe(false);
    expect(document.activeElement).toBe(ctx.button);
  });

  it('стрілка вниз із кнопки порядку повертає фокус у пошук і рухає підсвітку', () => {
    const ctx = make(FIVE);
    ctx.dd.open();
    sortBtn(ctx).focus();
    key(sortBtn(ctx), 'ArrowDown');
    expect(document.activeElement).toBe(ctx.root.querySelector('.dd-search'));
    expect(ctx.root.querySelector('.is-active .dd-title').textContent).toBe('Бета');
  });
});
