// Розмітка аркуша-специфікації для друку. Дані готує library/analysis/BuildSheet.js.
// На екрані аркуш схований, а під час друку (Ctrl+P або кнопка «Друк / PDF») показується лише він.

class PrintSheet {
  static #esc(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Число й одиниця не розриваються переносом рядка («65 Вт», «1 ТБ»)
  static #glue(text) {
    return PrintSheet.#esc(text).replace(/(\d) (Вт|ГБ|ТБ|мм)/g, '$1\u00A0$2');
  }

  static dateText(date) {
    return date.toLocaleString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // sheet — результат BuildSheet.from(...)
  static render(sheet) {
    const e = PrintSheet.#esc;
    const glue = (text) => PrintSheet.#glue(text);
    const rows = sheet.rows
      .map(
        (r) =>
          `<tr><th scope="row">${e(r.label)}</th><td>${glue(r.name)}</td><td>${glue(r.details)}</td><td class="num">${e(r.priceText)}</td></tr>`
      )
      .join('');
    const issues = sheet.issues.length ? `<ul>${sheet.issues.map((i) => `<li>${e(i)}</li>`).join('')}</ul>` : '';
    const power = sheet.power
      ? `${sheet.power.draw} Вт, блок живлення — від ${sheet.power.need} Вт`
      : 'не визначено (немає процесора або відеокарти)';
    const perf = sheet.perf
      .map(
        (p) =>
          `<div class="ps-perf-row"><span>${e(p.label)}</span><div class="ps-meter"><i style="width:${p.value ?? 0}%"></i></div><b>${p.value ?? '—'}</b></div>`
      )
      .join('');

    return `
      <header class="ps-head">
        <div><p class="ps-kicker">Конструктор ПК · специфікація збірки</p><h1>${e(sheet.name)}</h1></div>
        <p class="ps-date">${e(PrintSheet.dateText(sheet.date))}</p>
      </header>
      <p class="ps-status ps-${sheet.status}">${e(sheet.statusText)}</p>
      ${issues}
      <table class="ps-table">
        <thead><tr><th>Компонент</th><th>Модель</th><th>Характеристики</th><th class="num">Ціна</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><th colspan="3">Разом${sheet.discount ? ` (знижка ${e(sheet.discount)}% уже враховано)` : ''}</th><td class="num">${e(sheet.totalText)}</td></tr></tfoot>
      </table>
      <dl class="ps-facts"><dt>Споживання</dt><dd>${e(power)}</dd></dl>
      <h2>Умовна продуктивність, 0–100</h2>
      <div class="ps-perf">${perf}</div>
      <p class="ps-note">Оцінки умовні й порівнюють збірки між собою, це не результат справжніх тестів. Ціни взято з прайс-листа проєкту.</p>`;
  }
}
