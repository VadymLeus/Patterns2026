// Конкретна фабрика сімейства Intel: створює IntelCpu + IntelMotherboard.

class IntelFactory extends PlatformFactory {
  get platform() { return 'intel'; }
  get label() { return 'Intel (сокет LGA1700)'; }

  createCpu(id) {
    return this._create(id, 'cpu', IntelCpu);
  }

  createMotherboard(id) {
    return this._create(id, 'motherboard', IntelMotherboard);
  }
}
