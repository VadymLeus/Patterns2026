// Директор (Director) — знає РЕЦЕПТИ готових збірок.
// Будівельник вміє збирати будь-що, директор — які саме деталі й у якому порядку
// потрібні для типової конфігурації.
//
// Тут усі патерни працюють разом:
//   - процесор і плату директор бере з абстрактної фабрики платформи,
//   - решту деталей — зі творців фабричного методу,
//   - складає все будівельником,
//   - ціни беруться з єдиного PriceList (через Component.price).

class PCDirector {
  constructor(builder) {
    this.builder = builder;
  }

  buildOffice() {
    const intel = getPlatformFactory('intel');
    return this.builder
      .reset()
      .setName('Офісний ПК')
      .setCpu(intel.createCpu('i3-12100f'))
      .setMotherboard(intel.createMotherboard('h610m'))
      .setRam(getCreator('ram').create('ddr4-16'))
      .setGpu(getCreator('gpu').create('gt1030'))
      .setStorage(getCreator('storage').create('ssd-480'))
      .setPsu(getCreator('psu').create('psu-450'))
      .setCase(getCreator('case').create('case-matx'))
      .build();
  }

  buildGaming() {
    const amd = getPlatformFactory('amd');
    return this.builder
      .reset()
      .setName('Ігровий ПК')
      .setCpu(amd.createCpu('r5-7600'))
      .setMotherboard(amd.createMotherboard('b650'))
      .setRam(getCreator('ram').create('ddr5-32'))
      .setGpu(getCreator('gpu').create('rtx4060'))
      .setStorage(getCreator('storage').create('nvme-1tb'))
      .setPsu(getCreator('psu').create('psu-650'))
      .setCase(getCreator('case').create('case-gaming'))
      .build();
  }

  buildWorkstation() {
    const intel = getPlatformFactory('intel');
    return this.builder
      .reset()
      .setName('Робоча станція')
      .setCpu(intel.createCpu('i7-13700k'))
      .setMotherboard(intel.createMotherboard('z790'))
      .setRam(getCreator('ram').create('ddr5-64'))
      .setGpu(getCreator('gpu').create('rtx4070'))
      .setStorage(getCreator('storage').create('nvme-2tb'))
      .setPsu(getCreator('psu').create('psu-850'))
      .setCase(getCreator('case').create('case-atx'))
      .build();
  }
}
