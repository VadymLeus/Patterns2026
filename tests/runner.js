// Мінімальний тест-раннер без залежностей.
//   describe(патерн, заголовок, () => { it(...); afterEach(...); })
//   it(назва, () => { expect(...).toBe(...) })
//   skip(причина) — пропустити тест зсередини
// Результати малює tests/render.js.

const TestRunner = { suites: [], current: null };

class TestSkipped extends Error {}

function describe(pattern, title, fn) {
  const suite = { pattern, title, tests: [], cleanups: [] };
  TestRunner.suites.push(suite);
  TestRunner.current = suite;
  fn();
  TestRunner.current = null;
}

function it(name, fn) {
  TestRunner.current.tests.push({ name, fn });
}

function afterEach(fn) {
  TestRunner.current.cleanups.push(fn);
}

function skip(reason) {
  throw new TestSkipped(reason);
}

// Запускає всі тести; кожен у try/catch, після кожного виконуються afterEach
TestRunner.run = function () {
  return this.suites.map((suite) => ({
    pattern: suite.pattern,
    title: suite.title,
    results: suite.tests.map(({ name, fn }) => {
      let error = null;
      try {
        fn();
      } catch (e) {
        error = e;
      }
      suite.cleanups.forEach((cleanup) => {
        try {
          cleanup();
        } catch (e) {
          error = error || e;
        }
      });
      return { name, error, skipped: error instanceof TestSkipped };
    }),
  }));
};

function show(value) {
  if (typeof value === 'function') return value.name || 'function';
  if (typeof value === 'string') return JSON.stringify(value);
  try {
    const text = JSON.stringify(value);
    return text === undefined ? String(value) : text.length > 80 ? text.slice(0, 77) + '...' : text;
  } catch {
    return String(value);
  }
}

function expect(actual) {
  const matchers = (negate) => {
    const assert = (pass, message) => {
      if (negate ? pass : !pass) throw new Error(negate ? `не мало бути: ${message}` : message);
    };
    return {
      toBe: (expected) => assert(Object.is(actual, expected), `очікувалось ${show(expected)}, отримано ${show(actual)}`),
      toEqual: (expected) => assert(JSON.stringify(actual) === JSON.stringify(expected), `очікувалось ${show(expected)}, отримано ${show(actual)}`),
      toBeTruthy: () => assert(Boolean(actual), `значення ${show(actual)} має бути істинним`),
      toBeFalsy: () => assert(!actual, `значення ${show(actual)} має бути хибним`),
      toBeInstanceOf: (Cls) => assert(actual instanceof Cls, `очікувався екземпляр ${Cls.name}, отримано ${show(actual)}`),
      toContain: (item) => assert(actual.includes(item), `${show(actual)} має містити ${show(item)}`),
      toThrow: (Cls) => {
        let thrown = null;
        try {
          actual();
        } catch (e) {
          thrown = e;
        }
        assert(thrown !== null && (!Cls || thrown instanceof Cls), Cls ? `очікувалась помилка ${Cls.name}` : 'очікувалась помилка');
      },
    };
  };
  return { ...matchers(false), not: matchers(true) };
}
