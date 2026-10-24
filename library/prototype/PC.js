// ПРОТОТИП (Prototype) — клас PC.
//
// Учасники:
//   Prototype          — метод clone() (у PC та у Component)
//   ConcretePrototype  — PC (цей файл) і всі комплектуючі
//   Client/Registry    — PresetRegistry (PresetRegistry.js)
//
// Ідея: новий об'єкт створюється не з нуля, а копіюванням готового зразка.
// Копія ГЛИБОКА: кожна комплектуюча теж клонується, тому зміна в копії
// не зачіпає оригінал. PC водночас є продуктом Будівельника.

class PC {
  static #counter = 0;

  constructor(name, parts) {
    this.id = ++PC.#counter;
    this.name = name;
    this.parts = parts; // { cpu, motherboard, ram, gpu, storage, psu, case }
  }

  get totalPrice() {
    return Object.values(this.parts).reduce((sum, part) => sum + part.price, 0);
  }

  get powerDraw() {
    return this.parts.cpu.tdp + this.parts.gpu.tdp + Compatibility.REST_OF_SYSTEM_WATTS;
  }

  get recommendedPsuWatts() {
    return Compatibility.requiredPsuWatts(this.parts.cpu, this.parts.gpu);
  }

  clone() {
    const parts = {};
    for (const [slot, part] of Object.entries(this.parts)) {
      parts[slot] = part.clone();
    }
    const copy = new PC(`${this.name} (копія)`, parts);
    Logger.getInstance().log('Прототип', `Клоновано "${this.name}" → "${copy.name}": комплектуючі скопійовано окремими об'єктами`);
    return copy;
  }
}
