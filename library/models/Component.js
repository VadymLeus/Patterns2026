// Моделі комплектуючих.
// Це "Product" у шаблонах "Фабричний метод" та "Абстрактна фабрика".
// Базовий клас Component також задає інтерфейс Прототипу — метод clone().

class Component {
  constructor({ id, type, name }) {
    this.id = id;
    this.type = type;
    this.name = name;
  }

  // Ціна не зберігається в об'єкті — її завжди віддає єдиний PriceList (Одинак)
  get price() {
    return PriceList.getInstance().getPrice(this.id);
  }

  // Прототип: незалежна копія об'єкта того самого класу
  clone() {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }
}

// vendor і socket заповнюють класи сімейств (IntelCpu / AmdCpu), див. abstractFactory/products.js
class Cpu extends Component {
  constructor(data) {
    super(data);
    this.cores = data.cores;
    this.tdp = data.tdp;
    this.vendor = null;
    this.socket = null;
  }
}

class Motherboard extends Component {
  constructor(data) {
    super(data);
    this.formFactor = data.formFactor;
    this.ramType = data.ramType;
    this.socket = null;
  }
}

class Ram extends Component {
  constructor(data) {
    super(data);
    this.ramType = data.ramType;
    this.sizeGb = data.sizeGb;
  }
}

class Cooler extends Component {
  constructor(data) {
    super(data);
    this.maxTdp = data.maxTdp; // скільки тепла процесора здатний відвести, Вт
  }
}

class Gpu extends Component {
  constructor(data) {
    super(data);
    this.tdp = data.tdp;
  }
}

class Storage extends Component {
  constructor(data) {
    super(data);
    this.kind = data.kind;
    this.sizeGb = data.sizeGb;
  }
}

class Psu extends Component {
  constructor(data) {
    super(data);
    this.watts = data.watts;
  }
}

class PcCase extends Component {
  constructor(data) {
    super(data);
    this.supports = [...data.supports];
  }

  // масив supports теж копіюємо, щоб копія була справді незалежною
  clone() {
    const copy = super.clone();
    copy.supports = [...this.supports];
    return copy;
  }
}

// Слоти збірки: ключ збігається з полем type у каталозі
const PC_SLOTS = [
  { key: 'cpu', label: 'Процесор' },
  { key: 'motherboard', label: 'Материнська плата' },
  { key: 'cooler', label: 'Охолодження' },
  { key: 'ram', label: "Оперативна пам'ять" },
  { key: 'gpu', label: 'Відеокарта' },
  { key: 'storage', label: 'Накопичувач' },
  { key: 'psu', label: 'Блок живлення' },
  { key: 'case', label: 'Корпус' },
];
