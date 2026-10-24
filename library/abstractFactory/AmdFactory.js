// Конкретна фабрика сімейства AMD: створює AmdCpu + AmdMotherboard.

class AmdFactory extends PlatformFactory {
  get platform() { return 'amd'; }
  get label() { return 'AMD (сокет AM5)'; }

  createCpu(id) {
    return this._create(id, 'cpu', AmdCpu);
  }

  createMotherboard(id) {
    return this._create(id, 'motherboard', AmdMotherboard);
  }
}
