// Запускає всі зареєстровані тести та малює результат на сторінці tests.html.

(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const suites = TestRunner.run();
  const all = suites.flatMap((s) => s.results);
  const failed = all.filter((r) => r.error && !r.skipped).length;
  const skipped = all.filter((r) => r.skipped).length;
  const passed = all.length - failed - skipped;

  document.getElementById('results').innerHTML = suites
    .map((suite) => {
      const suiteFailed = suite.results.filter((r) => r.error && !r.skipped).length;
      const rows = suite.results
        .map((r) => {
          const state = r.skipped ? 'skip' : r.error ? 'fail' : 'pass';
          const mark = { pass: '✓', fail: '✕', skip: '–' }[state];
          const note = r.error ? `<span class="err">${esc(r.error.message)}</span>` : '';
          return `<li class="${state}"><span class="mark">${mark}</span><span>${esc(r.name)}${note}</span></li>`;
        })
        .join('');
      return `<section class="card suite">
        <h2><span class="badge ${PATTERN_CLASS[suite.pattern] || ''}">${esc(suite.pattern)}</span>${esc(suite.title)}
          <span class="count">${suite.results.length - suiteFailed}/${suite.results.length}</span></h2>
        <ul>${rows}</ul>
      </section>`;
    })
    .join('');

  const summary = document.getElementById('summary');
  summary.className = 'summary ' + (failed ? 'bad' : 'ok');
  summary.textContent = failed
    ? `✕ Не пройдено: ${failed} з ${all.length}`
    : `✓ Усі тести пройдено: ${passed}${skipped ? `, пропущено: ${skipped}` : ''}`;
  document.title = (failed ? '✕ ' : '✓ ') + document.title;
})();
