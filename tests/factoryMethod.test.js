describe('Фабричний метод', 'Творці комплектуючих', () => {
  it('кожен творець створює свій клас продукту', () => {
    expect(getCreator('gpu').create('rtx4060')).toBeInstanceOf(Gpu);
    expect(getCreator('ram').create('ddr5-32')).toBeInstanceOf(Ram);
    expect(getCreator('storage').create('nvme-1tb')).toBeInstanceOf(Storage);
    expect(getCreator('psu').create('psu-650')).toBeInstanceOf(Psu);
    expect(getCreator('case').create('case-atx')).toBeInstanceOf(PcCase);
  });

  it('конкретні творці — підкласи ComponentCreator', () => {
    expect(getCreator('gpu')).toBeInstanceOf(ComponentCreator);
    expect(getCreator('gpu')).toBeInstanceOf(GpuCreator);
  });

  it('продукт отримує дані з каталогу', () => {
    const gpu = getCreator('gpu').create('rtx4060');
    expect(gpu.name).toBe('GeForce RTX 4060 8 ГБ');
    expect(gpu.tdp).toBe(115);
  });

  it('творець не створить деталь чужого типу', () => {
    expect(() => getCreator('gpu').create('ddr5-32')).toThrow();
  });

  it('невідомий id каталогу — помилка', () => {
    expect(() => getCreator('gpu').create('nope')).toThrow();
  });

  it('кожен виклик create() дає новий об’єкт', () => {
    const creator = getCreator('ram');
    expect(creator.create('ddr5-32')).not.toBe(creator.create('ddr5-32'));
  });

  it('базовий ComponentCreator не вміє створювати: підклас має перевизначити метод', () => {
    expect(() => new ComponentCreator().create('rtx4060')).toThrow();
    expect(() => new ComponentCreator().createComponent({})).toThrow();
  });

  it('для процесора немає творця: його створює абстрактна фабрика', () => {
    expect(() => getCreator('cpu')).toThrow();
  });

  it('новий тип деталі додається підкласом без змін у ComponentCreator', () => {
    class CustomGpuCreator extends ComponentCreator {
      get type() { return 'gpu'; }
      createComponent(data) { return Object.assign(new Gpu(data), { custom: true }); }
    }
    const product = new CustomGpuCreator().create('rtx4060');
    expect(product.custom).toBe(true);
  });
});
