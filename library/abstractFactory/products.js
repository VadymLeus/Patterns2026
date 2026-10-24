// Продукти сімейств (ConcreteProduct).
// Сокет і виробник задані САМИМ КЛАСОМ, а не даними з каталогу —
// тому IntelCpu завжди LGA1700, а AmdCpu завжди AM5.

class IntelCpu extends Cpu {
  constructor(data) {
    super(data);
    this.vendor = 'Intel';
    this.socket = 'LGA1700';
  }
}

class IntelMotherboard extends Motherboard {
  constructor(data) {
    super(data);
    this.socket = 'LGA1700';
  }
}

class AmdCpu extends Cpu {
  constructor(data) {
    super(data);
    this.vendor = 'AMD';
    this.socket = 'AM5';
  }
}

class AmdMotherboard extends Motherboard {
  constructor(data) {
    super(data);
    this.socket = 'AM5';
  }
}
