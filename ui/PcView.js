// Візуалізація збірки: схематичний вигляд системного блока на SVG.
//
// Це лише ВІДОБРАЖЕННЯ поточного стану будівельника, патернів тут немає.
// Розмітка схеми лежить в index.html (<svg id="pcView">), стилі — у style.css.
// PcView не створює елементи, а перемикає в них класи та тексти:
//   .filled — деталь на місці,  .bad — деталь у конфлікті,  .empty — слот порожній

// Вентилятор: кільце, п'ять лопатей і втулка (малюється в усіх елементах [data-fan])
const FAN_MARKUP =
  '<circle class="ring" r="28"/>' +
  '<g class="rotor">' +
  [0, 72, 144, 216, 288]
    .map((a) => `<path class="blade" transform="rotate(${a})" d="M0,-6 C8,-26 24,-26 26,-12 C16,-14 8,-12 0,-6Z"/>`)
    .join('') +
  '</g><circle class="hub" r="5"/>';

class PcView {
  static BOARD_TOP = 18; // верхній край плати на схемі
  static BOARD_HEIGHT = { ATX: 296, mATX: 236 }; // mATX нижча за ATX
  static PSU_BAR_WIDTH = 212;

  constructor(svg) {
    this.svg = svg;
    this.lastIds = {};
    svg.querySelectorAll('[data-fan]').forEach((g) => (g.innerHTML = FAN_MARKUP));
  }

  $(id) {
    return this.svg.querySelector('#' + id);
  }

  text(id, value) {
    this.$(id).textContent = value;
  }

  // parts — поточні деталі { slot: Component }, conflicts — з Compatibility.check()
  update(parts, conflicts) {
    const bad = new Set(conflicts.flatMap((c) => c.slots));
    const { cpu, motherboard, cooler, ram, gpu, storage, psu } = parts;
    const pcCase = parts.case;

    // Форма плати визначає її розмір, а відеокарта сидить у нижній частині плати
    const boardH = PcView.BOARD_HEIGHT[motherboard ? motherboard.formFactor : 'ATX'] ?? PcView.BOARD_HEIGHT.ATX;
    this.$('v-board-rect').setAttribute('height', boardH);
    this.$('v-gpu').setAttribute('transform', `translate(30 ${PcView.BOARD_TOP + boardH - 78})`);

    PC_SLOTS.forEach(({ key }) => this.mark(key, parts[key], bad));

    // Підписи
    this.text('v-cpu-1', cpu ? cpu.socket : 'CPU');
    const cpuName = cpu ? cpu.name.replace(/^(Intel Core |AMD )/, '') : '';
    this.text('v-cpu-2', cpuName);
    this.$('v-cpu-2').style.fontSize = cpuName.length > 12 ? '7.6px' : ''; // довга назва має вміститися в чип
    this.text('v-board-text', motherboard ? motherboard.name : 'Материнська плата');
    this.text('v-board-socket', motherboard ? `сокет ${motherboard.socket}` : '');
    this.text('v-cooler-1', cooler ? cooler.name.split(' · ')[0] : '—');
    this.text('v-cooler-2', cooler ? `до ${cooler.maxTdp} Вт` : '');
    this.text('v-ram-1', ram ? `${ram.ramType} · ${ram.sizeGb} ГБ` : 'RAM');
    this.text('v-gpu-1', gpu ? gpu.name.replace(/^(GeForce |Radeon )/, '') : 'GPU');
    this.text('v-gpu-2', gpu ? `${gpu.tdp} Вт` : '');
    this.text('v-storage-1', storage ? storage.name : '—');
    this.text('v-psu-1', psu ? `${psu.watts} Вт` : '—');

    // Корпус: назва у два рядки, "Gaming Tower RGB" + "(ATX / mATX)"
    const [line1, line2] = pcCase ? pcCase.name.split(' (') : ['—'];
    this.text('v-case-1', line1);
    this.text('v-case-2', line2 ? `(${line2}` : '');
    this.svg.classList.toggle('rgb', Boolean(pcCase && pcCase.id === 'case-gaming'));

    // Блок живлення: смужка показує навантаження відносно потужності БЖ
    const draw = cpu && gpu ? cpu.tdp + gpu.tdp + Compatibility.REST_OF_SYSTEM_WATTS : 0;
    const need = cpu && gpu ? Compatibility.requiredPsuWatts(cpu, gpu) : 0;
    this.text('v-psu-2', cpu && gpu ? `~${draw} Вт · потрібно від ${need}` : '');
    const width = psu && draw ? Math.min(1, draw / psu.watts) * PcView.PSU_BAR_WIDTH : 0;
    const bar = this.$('v-psu-bar');
    bar.setAttribute('width', width);
    bar.style.width = `${width}px`;
    bar.classList.toggle('bad', bad.has('psu'));
  }

  // Виставляє стан слота та підказку; коротко "підсвічує" деталь, якщо її щойно замінили
  mark(slot, part, bad) {
    const g = this.$('v-' + slot);
    g.classList.toggle('empty', !part);
    g.classList.toggle('filled', Boolean(part) && !bad.has(slot));
    g.classList.toggle('bad', Boolean(part) && bad.has(slot));
    g.querySelector('title').textContent = part ? part.name : '';

    const id = part ? part.id : null;
    if (part && this.lastIds[slot] !== id) {
      g.classList.remove('pop');
      g.getBoundingClientRect(); // примусовий перерахунок, щоб анімація запустилася знову
      g.classList.add('pop');
    }
    this.lastIds[slot] = id;
  }
}
