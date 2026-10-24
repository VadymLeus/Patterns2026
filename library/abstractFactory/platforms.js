// Реєстр фабрик: за ключем платформи повертає потрібну фабрику.
// Клієнтський код (інтерфейс, директор) працює лише з типом PlatformFactory
// і не знає, яка саме платформа за ним стоїть.

const PLATFORMS = {
  intel: new IntelFactory(),
  amd: new AmdFactory(),
};

function getPlatformFactory(key) {
  const factory = PLATFORMS[key];
  if (!factory) throw new Error(`Невідома платформа "${key}"`);
  return factory;
}
