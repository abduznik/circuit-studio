(() => {
  'use strict';

  const SVG = 'http://www.w3.org/2000/svg';
  const SHEET = { width: 1200, height: 700, grid: 20 };
  const ESP32_PINS = [
    ['GND', 'power'], ['3V3', 'power'], ['EN', 'input'], ['GPIO36/VP', 'input'], ['GPIO39/VN', 'input'], ['GPIO34', 'input'], ['GPIO35', 'input'], ['GPIO32', 'bidirectional'], ['GPIO33', 'bidirectional'], ['GPIO25', 'bidirectional'], ['GPIO26', 'bidirectional'], ['GPIO27', 'bidirectional'], ['GPIO14', 'bidirectional'], ['GPIO12', 'strapping'], ['GND', 'power'], ['GPIO13', 'bidirectional'], ['GPIO9/SD2', 'reserved'], ['GPIO10/SD3', 'reserved'], ['GPIO11/CMD', 'reserved'], ['GPIO6/CLK', 'reserved'], ['GPIO7/SD0', 'reserved'], ['GPIO8/SD1', 'reserved'], ['GPIO15', 'strapping'], ['GPIO2', 'strapping'], ['GPIO0', 'strapping'], ['GPIO4', 'bidirectional'], ['GPIO16', 'bidirectional'], ['GPIO17', 'bidirectional'], ['GPIO5', 'strapping'], ['GPIO18', 'bidirectional'], ['GPIO19', 'bidirectional'], ['NC', 'no-connect'], ['GPIO21', 'bidirectional'], ['GPIO3/RXD0', 'uart'], ['GPIO1/TXD0', 'uart'], ['GPIO22', 'bidirectional'], ['GPIO23', 'bidirectional'], ['GND', 'power'], ['EPAD/GND', 'power'],
  ].map(([name, electricalType], index) => ({ name, electricalType, pad: String(index + 1), x: index < 19 ? -130 : index < 38 ? 130 : 0, y: index < 19 ? (index - 9) * 18 : index < 38 ? ((index - 19) - 9) * 18 : 190 }));
  const DISPLAY_PINS = ['GND', '3V3', 'SCL', 'SDA', 'RES', 'DC', 'CS', 'BLK'].map((name, index) => ({ name, pad: String(index + 1), x: -84, y: -70 + index * 20, electricalType: index < 2 ? 'power' : 'input' }));
  const definitions = {
    resistor: { name: 'Resistor', group: 'passive', prefix: 'R', defaultValue: '10kΩ', pins: [{ x: -60, y: 0, name: '1', pad: '1' }, { x: 60, y: 0, name: '2', pad: '2' }], icon: 'resistor', footprint: 'Resistor_SMD:R_0603_1608Metric' },
    capacitor: { name: 'Capacitor', group: 'passive', prefix: 'C', defaultValue: '100nF', pins: [{ x: 0, y: -50, name: '1', pad: '1' }, { x: 0, y: 50, name: '2', pad: '2' }], icon: 'capacitor', footprint: 'Capacitor_SMD:C_0603_1608Metric' },
    inductor: { name: 'Inductor', group: 'passive', prefix: 'L', defaultValue: '10µH', pins: [{ x: -60, y: 0, name: '1' }, { x: 60, y: 0, name: '2' }], icon: 'inductor' },
    led: { name: 'LED', group: 'semiconductor', prefix: 'D', defaultValue: 'Red', pins: [{ x: -55, y: 0, name: 'A' }, { x: 55, y: 0, name: 'K' }], icon: 'led' },
    diode: { name: 'Diode', group: 'semiconductor', prefix: 'D', defaultValue: '1N4148', pins: [{ x: -55, y: 0, name: 'A' }, { x: 55, y: 0, name: 'K' }], icon: 'diode' },
    npn: { name: 'NPN transistor', group: 'semiconductor', prefix: 'Q', defaultValue: '2N3904', pins: [{ x: -50, y: -35, name: 'B' }, { x: 50, y: -45, name: 'C' }, { x: 50, y: 45, name: 'E' }], icon: 'npn' },
    opamp: { name: 'Op-amp', group: 'semiconductor', prefix: 'U', defaultValue: 'LM358', pins: [{ x: -60, y: -25, name: '+' }, { x: -60, y: 25, name: '−' }, { x: 60, y: 0, name: 'OUT' }], icon: 'opamp' },
    voltage: { name: 'Voltage source', group: 'power', prefix: 'V', defaultValue: '5V', pins: [{ x: 0, y: -45, name: '+' }, { x: 0, y: 45, name: '−' }], icon: 'voltage' },
    ground: { name: 'Ground', group: 'power', prefix: 'GND', defaultValue: 'GND', pins: [{ x: 0, y: -25, name: 'GND' }], icon: 'ground' },
    connector: { name: 'Connector 1×2', group: 'power', prefix: 'J', defaultValue: 'Conn_01x02', pins: [{ x: -50, y: -20, name: '1', pad: '1' }, { x: -50, y: 20, name: '2', pad: '2' }], icon: 'connector', footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical' },
    esp32: { name: 'ESP32-WROOM-32E', group: 'semiconductor', prefix: 'U', defaultValue: 'ESP32-WROOM-32E-N4', pins: ESP32_PINS, icon: 'esp32', footprint: 'Espressif:ESP32-WROOM-32E' },
    display: { name: 'ST7789 IPS header', group: 'power', prefix: 'J', defaultValue: 'MSP1691 · 1.69 in', pins: DISPLAY_PINS, icon: 'display', footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical' },
  };

  const FOOTPRINTS = {
    'Espressif:ESP32-WROOM-32E': {
      name: 'ESP32-WROOM-32E', body: { x: -9, y: -14.5, w: 18, h: 25.5 }, kind: 'module', pads: makeEsp32Pads(),
      source: 'Espressif official KiCad footprint; dimensions and land pattern follow the ESP32-WROOM-32E datasheet.',
    },
    'Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical': {
      name: 'PinHeader_1x08_P2.54mm_Vertical', kind: 'header', body: { x: -1.27, y: -10.16, w: 2.54, h: 20.32 },
      pads: DISPLAY_PINS.map((pin, index) => ({ number: String(index + 1), name: pin.name, x: 0, y: -8.89 + index * 2.54, shape: 'circle', w: 1.7, h: 1.7, drill: 0.9, type: 'thru_hole' })),
      source: 'Generic 2.54 mm through-hole header; mate to the selected IPS breakout pin row.',
    },
    'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical': {
      name: 'PinHeader_1x02_P2.54mm_Vertical', kind: 'header', body: { x: -1.27, y: -2.54, w: 2.54, h: 5.08 },
      pads: [{ number: '1', name: '3V3', x: 0, y: -1.27, shape: 'circle', w: 1.8, h: 1.8, drill: 0.9, type: 'thru_hole' }, { number: '2', name: 'GND', x: 0, y: 1.27, shape: 'circle', w: 1.8, h: 1.8, drill: 0.9, type: 'thru_hole' }],
      source: 'Generic 2.54 mm through-hole power input header; regulated 3.3 V only.',
    },
    'Resistor_SMD:R_0603_1608Metric': { name: 'R_0603_1608Metric', kind: 'smd', body: { x: -1.6, y: -0.8, w: 3.2, h: 1.6 }, pads: [{ number: '1', name: '1', x: -0.85, y: 0, shape: 'rect', w: 0.9, h: 1, type: 'smd' }, { number: '2', name: '2', x: 0.85, y: 0, shape: 'rect', w: 0.9, h: 1, type: 'smd' }], source: 'KiCad standard 0603 metric chip resistor footprint.' },
    'Capacitor_SMD:C_0603_1608Metric': { name: 'C_0603_1608Metric', kind: 'smd', body: { x: -1.6, y: -0.8, w: 3.2, h: 1.6 }, pads: [{ number: '1', name: '1', x: -0.85, y: 0, shape: 'rect', w: 0.9, h: 1, type: 'smd' }, { number: '2', name: '2', x: 0.85, y: 0, shape: 'rect', w: 0.9, h: 1, type: 'smd' }], source: 'KiCad standard 0603 metric chip capacitor footprint.' },
  };

  function makeEsp32Pads() {
    const pads = [];
    for (let n = 1; n <= 14; n++) pads.push({ number: String(n), name: ESP32_PINS[n - 1].name, x: -8.75, y: 7.01 - (n - 1) * 1.27, shape: 'rect', w: 1.5, h: 0.9, type: 'smd' });
    for (let n = 15; n <= 24; n++) pads.push({ number: String(n), name: ESP32_PINS[n - 1].name, x: -5.72 + (n - 15) * 1.27, y: -10.75, shape: 'rect', w: 0.9, h: 1.5, type: 'smd' });
    for (let n = 25; n <= 38; n++) pads.push({ number: String(n), name: ESP32_PINS[n - 1].name, x: 8.75, y: -9.5 + (n - 25) * 1.27, shape: 'rect', w: 1.5, h: 0.9, type: 'smd' });
    [-2.9, -1.5, -0.1].forEach((x) => [0.69, -0.71, -2.11].forEach((y) => pads.push({ number: '39', name: 'EPAD/GND', x, y, shape: 'rect', w: 0.9, h: 0.9, type: 'smd' })));
    return pads;
  }

  let project = starterProject();
  let selected = null;
  let activeTool = 'select';
  let activeView = new URLSearchParams(window.location.search).get('view') === 'board' ? 'board' : 'schematic';
  let activeCopperLayer = new URLSearchParams(window.location.search).get('layer') === 'B.Cu' ? 'B.Cu' : 'F.Cu';
  let pendingWire = null;
  let dragging = null;
  let boardDragging = null;
  let zoom = 100;
  let inspectorTab = 'properties';
  let checks = [];
  let undoStack = [];
  let redoStack = [];
  let toastTimer;
  let aiGenerating = false;
  let openCodeVerifiedToken = '';
  let verifiedOpenCodeModels = [];
  let preferredOpenCodeModel = '';
  let preferredOpenCodeFamily = 'auto';
  const AI_SETTINGS_KEY = 'circuit-studio.ai-settings.v1';
  const AI_KEY_STORAGE_KEY = 'circuit-studio.ai-key.v1';
  const AI_OPENCODE_TOKEN_KEY = 'circuit-studio.opencode-token.v1';

  const $ = (selector) => document.querySelector(selector);
  const svg = $('#schematic');
  const boardSvg = $('#pcbBoard');
  const componentLayer = $('#componentLayer');
  const wireLayer = $('#wireLayer');
  const annotationLayer = $('#annotationLayer');
  const netLabelLayer = $('#netLabelLayer');
  const boardLayer = $('#boardLayer');
  const BOARD_SCALE = 9;
  const BOARD_OFFSET = { x: 38, y: 30 };
  const NET_COLORS = { GND: '#374750', '+3V3': '#e76072', EN: '#9572c8', LCD_SCK: '#5f75df', LCD_MOSI: '#48a997', LCD_RST_N: '#d28a47', LCD_DC: '#c25aa0', LCD_CS_N: '#4d9bd0' };

  function starterProject() {
    const components = [
      { id: 'U1', type: 'esp32', ref: 'U1', value: 'ESP32-WROOM-32E-N4', footprint: 'RF_Module:ESP32-WROOM-32E', manufacturer: 'Espressif Systems', mpn: 'ESP32-WROOM-32E-N4', schematic: { x: 270, y: 355, rotation: 0 }, pcb: { x: 18, y: 27, rotation: 0 } },
      { id: 'J1', type: 'display', ref: 'J1', value: 'MSP1691 / ST7789 · 1.69 in', footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical', manufacturer: 'LCDWIKI', mpn: 'MSP1691', schematic: { x: 870, y: 310, rotation: 0 }, pcb: { x: 49, y: 19, rotation: 0 } },
      { id: 'J2', type: 'connector', ref: 'J2', value: '3V3 input', footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical', manufacturer: 'Generic', mpn: 'P2.54-1x02', schematic: { x: 1040, y: 535, rotation: 0 }, pcb: { x: 65, y: 42, rotation: 0 } },
      { id: 'R1', type: 'resistor', ref: 'R1', value: '10kΩ', footprint: 'Resistor_SMD:R_0603_1608Metric', manufacturer: 'Generic', mpn: '0603 10kΩ 1%', schematic: { x: 500, y: 150, rotation: 0 }, pcb: { x: 5.2, y: 30.5, rotation: 90 } },
      { id: 'C1', type: 'capacitor', ref: 'C1', value: '10µF 6.3V', footprint: 'Capacitor_SMD:C_0603_1608Metric', manufacturer: 'Generic', mpn: '0603 10µF X5R', schematic: { x: 520, y: 575, rotation: 90 }, pcb: { x: 4.5, y: 34, rotation: 90 } },
      { id: 'C2', type: 'capacitor', ref: 'C2', value: '100nF 6.3V', footprint: 'Capacitor_SMD:C_0603_1608Metric', manufacturer: 'Generic', mpn: '0603 100nF X7R', schematic: { x: 740, y: 575, rotation: 90 }, pcb: { x: 7, y: 34, rotation: 90 } },
    ];
    const end = (componentId, pad) => ({ componentId, pad: String(pad) });
    const nets = [
      { name: 'GND', class: 'power', endpoints: [end('U1', 1), end('U1', 15), end('U1', 38), end('U1', 39), end('J1', 1), end('J2', 2), end('C1', 2), end('C2', 2)] },
      { name: '+3V3', class: 'power', endpoints: [end('U1', 2), end('J1', 2), end('J1', 8), end('J2', 1), end('C1', 1), end('C2', 1), end('R1', 2)] },
      { name: 'EN', class: 'control', endpoints: [end('U1', 3), end('R1', 1)] },
      { name: 'LCD_SCK', class: 'spi', endpoints: [end('U1', 30), end('J1', 3)] },
      { name: 'LCD_MOSI', class: 'spi', endpoints: [end('U1', 37), end('J1', 4)] },
      { name: 'LCD_RST_N', class: 'control', endpoints: [end('U1', 28), end('J1', 5)] },
      { name: 'LCD_DC', class: 'control', endpoints: [end('U1', 27), end('J1', 6)] },
      { name: 'LCD_CS_N', class: 'control', endpoints: [end('U1', 29), end('J1', 7)] },
    ];
    components.forEach((component) => { component.padNets = {}; });
    nets.forEach((net) => net.endpoints.forEach((endpoint) => { const component = components.find((item) => item.id === endpoint.componentId); component.padNets[endpoint.pad] = net.name; }));
    const wires = [];
    nets.forEach((net) => {
      const first = net.endpoints[0];
      net.endpoints.slice(1).forEach((target, index) => {
        const a = definitions[components.find((c) => c.id === first.componentId).type].pins.findIndex((pin) => pin.pad === first.pad);
        const b = definitions[components.find((c) => c.id === target.componentId).type].pins.findIndex((pin) => pin.pad === target.pad);
        wires.push({ id: `w-${net.name}-${index}`, from: { componentId: first.componentId, pin: a }, to: { componentId: target.componentId, pin: b }, name: net.name });
      });
    });
    const tracks = [
      track('LCD_SCK', 'F.Cu', 'U1', 30, 'J1', 3, [{ x: 34, y: 23.85 }, { x: 34, y: 15.2 }]),
      track('LCD_MOSI', 'F.Cu', 'U1', 37, 'J1', 4, [{ x: 36, y: 32.74 }, { x: 36, y: 17.7 }]),
      track('LCD_RST_N', 'F.Cu', 'U1', 28, 'J1', 5, [{ x: 38, y: 21.31 }, { x: 38, y: 20.3 }]),
      track('LCD_DC', 'F.Cu', 'U1', 27, 'J1', 6, [{ x: 40, y: 20.04 }, { x: 40, y: 22.8 }]),
      track('LCD_CS_N', 'F.Cu', 'U1', 29, 'J1', 7, [{ x: 42, y: 22.58 }, { x: 42, y: 25.4 }]),
      track('EN', 'F.Cu', 'U1', 3, 'R1', 1, [{ x: 7.5, y: 31.47 }, { x: 7.5, y: 29.65 }]),
      track('GND', 'B.Cu', 'U1', 39, 'J2', 2, [{ x: 32.5, y: 28 }, { x: 34, y: 28 }, { x: 34, y: 47 }, { x: 63, y: 47 }, { x: 63, y: 43.3 }], 0.55),
      track('GND', 'B.Cu', 'U1', 15, 'U1', 39, [{ x: 12.3, y: 16.5 }, { x: 17, y: 16.5 }], 0.35),
      track('GND', 'B.Cu', 'U1', 38, 'U1', 39, [{ x: 28.5, y: 35.3 }, { x: 32.5, y: 35.3 }, { x: 34, y: 34 }, { x: 34, y: 28 }, { x: 32.5, y: 28 }], 0.35),
      track('+3V3', 'B.Cu', 'U1', 2, 'J2', 1, [{ x: 8, y: 32.74 }, { x: 8, y: 36 }, { x: 2.5, y: 36 }, { x: 2.5, y: 49 }, { x: 70, y: 49 }, { x: 70, y: 40.73 }], 0.45),
      track('+3V3', 'F.Cu', 'J1', 8, 'J2', 1, [{ x: 52, y: 27.9 }, { x: 52, y: 35 }, { x: 65, y: 35 }, { x: 65, y: 40.7 }], 0.35),
      track('GND', 'B.Cu', 'J1', 1, 'J2', 2, [{ x: 52, y: 10.1 }, { x: 63, y: 10.1 }, { x: 63, y: 43.3 }], 0.35),
      track('+3V3', 'B.Cu', 'J1', 2, 'J2', 1, [{ x: 52, y: 12.65 }, { x: 60, y: 12.65 }, { x: 60, y: 40.73 }], 0.35),
      track('+3V3', 'F.Cu', 'U1', 2, 'R1', 2, [{ x: 7.5, y: 32.74 }, { x: 7.5, y: 31.35 }], 0.25),
      track('+3V3', 'F.Cu', 'U1', 2, 'C2', 1, [{ x: 8, y: 32.74 }, { x: 8, y: 33.15 }], 0.25),
      track('GND', 'F.Cu', 'U1', 1, 'C2', 2, [{ x: 8, y: 34.01 }, { x: 8, y: 34.85 }], 0.25),
      track('+3V3', 'F.Cu', 'C1', 1, 'C2', 1, [{ x: 5.85, y: 33.15 }], 0.2),
      track('GND', 'F.Cu', 'C1', 2, 'C2', 2, [{ x: 5.85, y: 34.85 }], 0.2),
    ];
    const vias = [{ x: 15.1, y: 27.69, net: 'GND' }, { x: 12.28, y: 16.25, net: 'GND' }, { x: 26.75, y: 34.01, net: 'GND' }, { x: 2.5, y: 36, net: '+3V3' }, { x: 52, y: 27.9, net: '+3V3' }, { x: 52, y: 10.1, net: 'GND' }, { x: 52, y: 12.65, net: '+3V3' }];
    return {
      format: 'circuit-studio', version: 2, name: 'ESP32 · ST7789 IPS SPI board', units: 'mm',
      design: { description: 'ESP32-WROOM-32E controller board for an external 1.69-inch ST7789 SPI IPS display breakout.', revision: 'A', layers: ['F.Cu', 'B.Cu'], source: 'Espressif ESP32-WROOM-32E datasheet; LCDWIKI MSP1691 user manual.' },
      schematic: { width: 1200, height: 700, title: 'ESP32 to ST7789 · 4-wire SPI' },
      components, nets, wires,
      board: { width: 76, height: 52, layers: ['F.Cu', 'B.Cu'], tracks, vias, keepouts: [{ componentId: 'U1', kind: 'antenna', x: 9, y: 35.56, width: 18, height: 5.94, layer: 'all' }], mountingHoles: [{ x: 3, y: 3, diameter: 2.2 }, { x: 73, y: 3, diameter: 2.2 }, { x: 2.5, y: 49, diameter: 2.2 }, { x: 73, y: 49, diameter: 2.2 }] },
      annotations: [],
      assumptions: ['J1 is a generic 1x8, 2.54 mm header using the MSP1691 pin order: GND, VCC, SCL, SDA, RES, DC, CS, BLK.', 'The display breakout accepts 3.3 V only; BLK is driven from 3V3 (always on).', 'J2 supplies a regulated 3.3 V rail rated for at least 500 mA. This board file does not include a USB interface or 3.3 V regulator.', 'Do not place copper or components in the ESP32 module antenna keepout.'],
    };
  }

  function track(net, layer, fromId, fromPad, toId, toPad, waypoints = [], width = 0.25) { return { id: `trk-${net}-${fromId}-${fromPad}-${toId}-${toPad}`, net, layer, width, from: { componentId: fromId, pad: String(fromPad) }, to: { componentId: toId, pad: String(toPad) }, waypoints }; }

  function makeId(prefix) { return `${prefix}-${Math.random().toString(36).slice(2, 9)}`; }
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function node(tag, attrs = {}, text = '') {
    const el = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
    if (text) el.textContent = text;
    return el;
  }
  function pointFor(component, pinIndex) {
    const pin = definitions[component.type].pins[pinIndex];
    const placement = component.schematic || component;
    const angle = (placement.rotation || 0) * Math.PI / 180;
    return { x: placement.x + pin.x * Math.cos(angle) - pin.y * Math.sin(angle), y: placement.y + pin.x * Math.sin(angle) + pin.y * Math.cos(angle) };
  }
  function coords(event) {
    return coordsIn(svg, event);
  }
  function coordsIn(element, event) {
    const pt = element.createSVGPoint(); pt.x = event.clientX; pt.y = event.clientY;
    const result = pt.matrixTransform(element.getScreenCTM().inverse());
    return { x: result.x, y: result.y };
  }
  function snap(value) { return Math.round(value / SHEET.grid) * SHEET.grid; }
  function componentById(id) { return project.components.find((component) => component.id === id); }
  function endpointPoint(endpoint) { const component = componentById(endpoint.componentId); return component ? pointFor(component, endpoint.pin) : null; }
  function setSaved() { $('#savedLabel').textContent = 'Unsaved changes'; $('#savedLabel').classList.add('unsaved'); }
  function saveHistory() {
    undoStack.push(JSON.stringify(project));
    if (undoStack.length > 80) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
  }
  function restoreHistory(from, to) {
    if (!from.length) return;
    to.push(JSON.stringify(project));
    project = JSON.parse(from.pop()); selected = null; render(); updateHistoryButtons();
  }
  function updateHistoryButtons() { $('#undoButton').disabled = !undoStack.length; $('#redoButton').disabled = !redoStack.length; }

  function render() {
    renderWires(); renderComponents(); renderAnnotations(); renderBoard(); renderInspector(); updateCounts(); updateHistoryButtons(); updateView();
    $('#projectTitle').textContent = project.name || 'Untitled schematic';
  }
  function wirePath(a, b) {
    const midX = Math.round((a.x + b.x) / 2 / 20) * 20;
    return `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
  }
  function renderWires() {
    wireLayer.replaceChildren();
    netLabelLayer.replaceChildren();
    const labelledNets = new Set();
    if (project.nets?.length) {
      project.nets.forEach((net) => {
        (net.endpoints || []).forEach((endpoint) => {
          const component = componentById(endpoint.componentId);
          if (!component) return;
          const pinIndex = definitions[component.type].pins.findIndex((pin) => pin.pad === String(endpoint.pad));
          if (pinIndex < 0) return;
          renderNetTag(component, definitions[component.type].pins[pinIndex], pinIndex, net.name);
        });
      });
      project.wires.filter((wire) => !wire.id.startsWith('w-')).forEach((wire) => renderLooseWire(wire));
      return;
    }
    project.wires.forEach((wire) => {
      const a = endpointPoint(wire.from), b = endpointPoint(wire.to);
      if (!a || !b) return;
      const path = node('path', { d: wirePath(a, b), class: 'wire-path', 'data-id': wire.id });
      path.addEventListener('click', (event) => { event.stopPropagation(); if (activeTool === 'select') { selected = { kind: 'wire', id: wire.id }; render(); } });
      wireLayer.append(path);
      if (wire.name && !labelledNets.has(wire.name)) {
        const label = node('text', { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 6, class: 'wire-label', 'text-anchor': 'middle' }, wire.name);
        wireLayer.append(label);
        labelledNets.add(wire.name);
      }
    });
    if (pendingWire) {
      const start = endpointPoint(pendingWire);
      if (start && pendingWire.cursor) wireLayer.append(node('path', { d: wirePath(start, pendingWire.cursor), class: 'wire-preview' }));
    }
  }

  function renderNetTag(component, pin, pinIndex, netName) {
    const anchor = pointFor(component, pinIndex);
    const placement = component.schematic || component;
    const radians = (placement.rotation || 0) * Math.PI / 180;
    const rawX = pin.x * Math.cos(radians) - pin.y * Math.sin(radians);
    const rawY = pin.x * Math.sin(radians) + pin.y * Math.cos(radians);
    let dx = Math.abs(rawX) >= Math.abs(rawY) ? Math.sign(rawX) : 0;
    let dy = Math.abs(rawY) > Math.abs(rawX) ? Math.sign(rawY) : 0;
    if (pin.name === 'EPAD/GND') { dx = 1; dy = 0; }
    const stub = { x: anchor.x + dx * 21, y: anchor.y + dy * 21 };
    const width = Math.max(30, netName.length * 6.1 + 10);
    let x, y, textX, textY, textAnchor;
    if (Math.abs(dx) >= Math.abs(dy)) {
      x = dx > 0 ? stub.x + 2 : stub.x - width - 2;
      y = stub.y - 7;
      textX = dx > 0 ? x + 5 : x + width - 5; textY = stub.y + 3.5; textAnchor = dx > 0 ? 'start' : 'end';
    } else {
      x = stub.x - width / 2;
      y = dy > 0 ? stub.y + 2 : stub.y - 16;
      textX = stub.x; textY = y + 10; textAnchor = 'middle';
    }
    const group = node('g', { class: 'net-link', 'data-net': netName, 'data-endpoint': `${component.id}:${pin.pad}` });
    group.append(node('line', { x1: anchor.x, y1: anchor.y, x2: stub.x, y2: stub.y, class: 'net-link-stub' }));
    group.append(node('rect', { x, y, width, height: 14, rx: 3, class: 'net-tag-bg' }));
    group.append(node('text', { x: textX, y: textY, class: 'net-tag-label', 'text-anchor': textAnchor }, netName));
    netLabelLayer.append(group);
  }

  function renderLooseWire(wire) {
    const a = endpointPoint(wire.from), b = endpointPoint(wire.to);
    if (!a || !b) return;
    wireLayer.append(node('path', { d: wirePath(a, b), class: 'wire-path', 'data-id': wire.id }));
    if (wire.name) wireLayer.append(node('text', { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 6, class: 'wire-label', 'text-anchor': 'middle' }, wire.name));
  }

  function renderComponents() {
    componentLayer.replaceChildren();
    project.components.forEach((component) => {
      const def = definitions[component.type];
      const placement = component.schematic || component;
      const group = node('g', { class: `component${selected?.kind === 'component' && selected.id === component.id ? ' selected' : ''}`, transform: `translate(${placement.x} ${placement.y}) rotate(${placement.rotation || 0})`, 'data-id': component.id, tabindex: 0, role: 'button', 'aria-label': `${component.ref}, ${def.name}, ${component.value}` });
      addSymbol(group, component.type);
      const labelY = component.type === 'esp32' ? 225 : component.type === 'display' ? 112 : component.type === 'voltage' || component.type === 'capacitor' ? 76 : 58;
      const labelGroup = node('g', { transform: `rotate(${-(placement.rotation || 0)})` });
      labelGroup.append(node('text', { x: 0, y: labelY, class: 'component-ref' }, component.ref));
      labelGroup.append(node('text', { x: 0, y: labelY + 15, class: 'component-value' }, component.value));
      group.append(labelGroup);
      def.pins.forEach((pin, index) => {
        group.append(node('circle', { cx: pin.x, cy: pin.y, r: 10, class: 'pin-hit', 'data-pin': index }));
        group.append(node('circle', { cx: pin.x, cy: pin.y, r: 3.4, class: 'pin-visible' }));
      });
      group.addEventListener('pointerdown', (event) => onComponentPointerDown(event, component));
      group.addEventListener('click', (event) => {
        const hitPin = event.target.closest('[data-pin]');
        if (hitPin && activeTool === 'wire') { event.stopPropagation(); handlePinClick(component, Number(hitPin.dataset.pin)); return; }
        if (!dragging && activeTool === 'select') { event.stopPropagation(); selected = { kind: 'component', id: component.id }; renderInspector(); renderComponents(); }
      });
      group.addEventListener('dblclick', (event) => { event.stopPropagation(); rotateComponent(component); });
      componentLayer.append(group);
    });
  }

  function addSymbol(group, type) {
    const body = (d, attrs = {}) => group.append(node('path', { d, class: 'component-body', ...attrs }));
    const line = (x1, y1, x2, y2, attrs = {}) => group.append(node('line', { x1, y1, x2, y2, class: 'component-body', ...attrs }));
    const circle = (cx, cy, r, attrs = {}) => group.append(node('circle', { cx, cy, r, class: 'component-body', ...attrs }));
    switch (type) {
      case 'resistor': body('M -60 0 H -35 L -25 -17 L -12 17 L 0 -17 L 12 17 L 25 -17 L 35 0 H 60'); break;
      case 'capacitor': line(0, -50, 0, -12); line(-18, -12, 18, -12); line(-18, 12, 18, 12); line(0, 12, 0, 50); break;
      case 'inductor': body('M -60 0 H -42 C -42 -25 -12 -25 -12 0 C -12 -25 18 -25 18 0 C 18 -25 45 -25 45 0 H 60'); break;
      case 'led': body('M -55 0 H -23'); body('M -23 -25 L 22 0 L -23 25 Z'); line(22, -29, 22, 29); line(3, -25, 20, -42, { 'marker-end': 'url(#arrowHead)' }); line(18, -10, 35, -27, { 'marker-end': 'url(#arrowHead)' }); line(22, 0, 55, 0); break;
      case 'diode': line(-55, 0, -24, 0); body('M -24 -25 L 22 0 L -24 25 Z'); line(22, -29, 22, 29); line(22, 0, 55, 0); break;
      case 'npn': circle(0, 0, 29); line(-50, -35, -3, -10); line(-3, -10, 19, -31); line(19, -31, 50, -45); line(-3, 10, 18, 31); line(18, 31, 50, 45); line(6, 19, 19, 31); line(12, 30, 19, 31); line(19, 31, 18, 23); line(-50, -35, -4, -35); line(-4, -35, -4, 35); break;
      case 'opamp': body('M -35 -48 L 43 0 L -35 48 Z'); line(-60, -25, -35, -25); line(-60, 25, -35, 25); line(43, 0, 60, 0); group.append(node('text', { x: -26, y: -17, class: 'component-value', 'font-size': 13 }, '+')); group.append(node('text', { x: -26, y: 33, class: 'component-value', 'font-size': 13 }, '−')); break;
      case 'voltage': circle(0, 0, 27); line(0, -45, 0, -27); line(0, 27, 0, 45); line(-9, -8, 9, -8); line(0, -17, 0, 1); line(-8, 12, 8, 12); break;
      case 'ground': line(0, -25, 0, 0); line(-20, 0, 20, 0); line(-13, 8, 13, 8); line(-6, 16, 6, 16); break;
      case 'connector': body('M -28 -34 H 24 V 34 H -28 Z'); group.append(node('circle', { cx: -7, cy: -20, r: 5, class: 'component-fill' })); group.append(node('circle', { cx: -7, cy: 20, r: 5, class: 'component-fill' })); line(-50, -20, -12, -20); line(-50, 20, -12, 20); break;
      case 'esp32': {
        group.append(node('rect', { x: -100, y: -174, width: 200, height: 348, rx: 7, class: 'component-fill' }));
        group.append(node('text', { x: 0, y: 4, class: 'component-ref' }, 'ESP32'));
        defPins(type).forEach((pin) => {
          if (pin.pad === '39') {
            group.append(node('line', { x1: 0, y1: pin.y, x2: 0, y2: 174, class: 'component-body' }));
            group.append(node('text', { x: -8, y: pin.y + 3, class: 'symbol-pin-label', 'text-anchor': 'end' }, '39 EPAD/GND'));
            return;
          }
          const left = pin.x < 0;
          group.append(node('line', { x1: pin.x, y1: pin.y, x2: left ? -100 : 100, y2: pin.y, class: 'component-body' }));
          group.append(node('text', { x: left ? -94 : 94, y: pin.y + 3, class: 'symbol-pin-label', 'text-anchor': left ? 'start' : 'end' }, `${pin.pad} ${pin.name}`));
        });
        break;
      }
      case 'display': {
        group.append(node('rect', { x: -40, y: -94, width: 80, height: 188, rx: 5, class: 'component-fill' }));
        group.append(node('text', { x: 0, y: -105, class: 'component-ref' }, 'ST7789 IPS'));
        defPins(type).forEach((pin) => {
          group.append(node('line', { x1: pin.x, y1: pin.y, x2: -40, y2: pin.y, class: 'component-body' }));
          group.append(node('text', { x: -34, y: pin.y + 3, class: 'symbol-pin-label' }, `${pin.pad} ${pin.name}`));
        });
        break;
      }
    }
  }
  function defPins(type) { return definitions[type].pins; }

  function renderAnnotations() {
    annotationLayer.replaceChildren();
    project.annotations.forEach((annotation) => {
      const text = node('text', { x: annotation.x, y: annotation.y, class: 'annotation-text' }, annotation.text);
      text.addEventListener('dblclick', () => { const value = prompt('Edit note', annotation.text); if (value !== null) { saveHistory(); annotation.text = value; setSaved(); renderAnnotations(); } });
      annotationLayer.append(text);
    });
  }

  function renderBoard() {
    boardLayer.replaceChildren();
    if (!project.board) return;
    const board = project.board;
    const root = node('g', { transform: `translate(${BOARD_OFFSET.x} ${BOARD_OFFSET.y}) scale(${BOARD_SCALE})` });
    boardLayer.append(root);
    root.append(node('rect', { x: 0, y: 0, width: board.width, height: board.height, rx: 1.2, class: 'pcb-substrate' }));
    root.append(node('rect', { x: 0.5, y: 0.5, width: board.width - 1, height: board.height - 1, rx: 1, class: 'board-edge' }));
    (board.moutingHoles || board.mountingHoles || []).forEach((hole) => {
      root.append(node('circle', { cx: hole.x, cy: hole.y, r: hole.diameter / 2, class: 'mounting-hole' }));
      root.append(node('circle', { cx: hole.x, cy: hole.y, r: 0.55, class: 'mounting-hole-center' }));
    });
    (board.keepouts || []).forEach((zone) => {
      if (zone.layer && zone.layer !== activeCopperLayer && zone.layer !== 'all') return;
      root.append(node('rect', { x: zone.x, y: zone.y, width: zone.width, height: zone.height, class: 'antenna-keepout' }));
      root.append(node('text', { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2, class: 'keepout-label', 'text-anchor': 'middle' }, 'ANTENNA · NO COPPER'));
    });
    (board.tracks || []).filter((item) => item.layer === activeCopperLayer).forEach((item) => {
      const from = boardPadPosition(item.from.componentId, item.from.pad);
      const to = boardPadPosition(item.to.componentId, item.to.pad);
      if (!from || !to) return;
      const pts = [from, ...(item.waypoints || []), to].map((p) => `${p.x},${p.y}`).join(' ');
      const trackGroup = node('g', { class: 'pcb-track-group', 'data-net': item.net });
      trackGroup.append(node('polyline', { points: pts, class: 'pcb-track', stroke: NET_COLORS[item.net] || '#6674f3', 'stroke-width': item.width || 0.25 }));
      trackGroup.append(node('polyline', { points: pts, class: 'pcb-track-hit', 'stroke-width': Math.max(1.2, (item.width || 0.25) * 2) }));
      root.append(trackGroup);
    });
    (board.vias || []).forEach((via) => {
      root.append(node('circle', { cx: via.x, cy: via.y, r: 0.38, class: `pcb-via ${via.net === 'GND' ? 'via-ground' : ''}` }));
      root.append(node('circle', { cx: via.x, cy: via.y, r: 0.12, class: 'pcb-via-hole' }));
    });
    project.components.filter((component) => component.footprint && component.pcb && FOOTPRINTS[component.footprint]).forEach((component) => {
      renderFootprint(root, component);
    });
    root.append(node('text', { x: board.width / 2, y: board.height + 2.6, class: 'board-dimension-label', 'text-anchor': 'middle' }, `${board.width} mm`));
    root.append(node('text', { x: board.width + 2.5, y: board.height / 2, class: 'board-dimension-label', transform: `rotate(90 ${board.width + 2.5} ${board.height / 2})`, 'text-anchor': 'middle' }, `${board.height} mm`));
  }

  function renderFootprint(root, component) {
    const footprint = FOOTPRINTS[component.footprint];
    const placement = component.pcb;
    const selectedClass = selected?.kind === 'board-component' && selected.id === component.id ? ' selected' : '';
    const group = node('g', { class: `pcb-footprint${selectedClass}`, transform: `translate(${placement.x} ${placement.y}) rotate(${placement.rotation || 0})`, 'data-board-component': component.id, tabindex: 0, role: 'button', 'aria-label': `${component.ref}, footprint ${footprint.name}` });
    if (footprint.kind === 'module') {
      group.append(node('rect', { x: footprint.body.x, y: footprint.body.y, width: footprint.body.w, height: footprint.body.h, rx: 0.7, class: 'module-body' }));
      group.append(node('text', { x: 0, y: -2, class: 'module-label', 'text-anchor': 'middle' }, 'ESPRESSIF'));
      group.append(node('text', { x: 0, y: 0, class: 'module-sublabel', 'text-anchor': 'middle' }, 'ESP32-WROOM-32E'));
      group.append(node('rect', { x: -4.5, y: -5, width: 9, height: 7, rx: 0.5, class: 'module-shield' }));
    } else if (footprint.body) {
      group.append(node('rect', { x: footprint.body.x, y: footprint.body.y, width: footprint.body.w, height: footprint.body.h, rx: footprint.kind === 'header' ? 0.35 : 0.2, class: footprint.kind === 'header' ? 'header-body' : 'smd-body' }));
    }
    footprint.pads.forEach((pad) => {
      const net = component.padNets?.[pad.number] || '';
      const padClass = `pcb-pad ${pad.type === 'thru_hole' ? 'thru-hole-pad' : 'smd-pad'}${net === 'GND' ? ' ground-pad' : ''}`;
      const padNode = pad.shape === 'circle'
        ? node('circle', { cx: pad.x, cy: pad.y, r: Math.max(pad.w, pad.h) / 2, class: padClass, 'data-pad': pad.number })
        : node('rect', { x: pad.x - pad.w / 2, y: pad.y - pad.h / 2, width: pad.w, height: pad.h, rx: 0.05, class: padClass, 'data-pad': pad.number });
      const title = node('title', {}, `${component.ref} pad ${pad.number} · ${pad.name}${net ? ` · ${net}` : ' · no net'}`); padNode.append(title); group.append(padNode);
      if (footprint.kind === 'module' && pad.number !== '39') group.append(node('text', { x: pad.x, y: pad.y + 0.18, class: 'pad-number', 'text-anchor': 'middle' }, pad.number));
    });
    group.append(node('text', { x: 0, y: footprint.kind === 'module' ? 12 : footprint.kind === 'header' ? -12 : -1.25, class: 'footprint-reference', 'text-anchor': 'middle' }, component.ref));
    if (footprint.kind === 'module') {
      group.append(node('path', { d: 'M -8.8 9.4 h 17.6', class: 'module-notch' }));
    }
    group.addEventListener('pointerdown', (event) => onBoardPointerDown(event, component));
    group.addEventListener('click', (event) => { event.stopPropagation(); if (!boardDragging) { selected = { kind: 'board-component', id: component.id }; renderInspector(); renderBoard(); } });
    group.addEventListener('dblclick', (event) => { event.stopPropagation(); saveHistory(); placement.rotation = ((placement.rotation || 0) + 90) % 360; setSaved(); renderBoard(); });
    root.append(group);
  }

  function boardPadPosition(componentId, padNumber) {
    const component = componentById(componentId); if (!component?.pcb) return null;
    const footprint = FOOTPRINTS[component.footprint]; if (!footprint) return null;
    const pad = footprint.pads.find((item) => item.number === String(padNumber)); if (!pad) return null;
    const angle = (component.pcb.rotation || 0) * Math.PI / 180;
    return { x: component.pcb.x + pad.x * Math.cos(angle) - pad.y * Math.sin(angle), y: component.pcb.y + pad.x * Math.sin(angle) + pad.y * Math.cos(angle) };
  }

  function onBoardPointerDown(event, component) {
    if (event.button !== 0) return;
    const p = coordsIn(boardSvg, event);
    const boardX = (p.x - BOARD_OFFSET.x) / BOARD_SCALE, boardY = (p.y - BOARD_OFFSET.y) / BOARD_SCALE;
    selected = { kind: 'board-component', id: component.id };
    boardDragging = { id: component.id, dx: boardX - component.pcb.x, dy: boardY - component.pcb.y, moved: false, before: JSON.stringify(project) };
    event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.classList.add('selected'); renderInspector();
  }
  boardSvg.addEventListener('pointermove', (event) => {
    const p = coordsIn(boardSvg, event);
    const x = (p.x - BOARD_OFFSET.x) / BOARD_SCALE, y = (p.y - BOARD_OFFSET.y) / BOARD_SCALE;
    $('#coordinateReadout').textContent = `X ${Math.max(0, x).toFixed(2)} mm · Y ${Math.max(0, y).toFixed(2)} mm`;
    if (!boardDragging) return;
    const component = componentById(boardDragging.id); if (!component) return;
    const nextX = Math.max(1, Math.min(project.board.width - 1, Math.round((x - boardDragging.dx) * 4) / 4));
    const nextY = Math.max(1, Math.min(project.board.height - 1, Math.round((y - boardDragging.dy) * 4) / 4));
    if (component.pcb.x !== nextX || component.pcb.y !== nextY) {
      if (!boardDragging.moved) { undoStack.push(boardDragging.before); if (undoStack.length > 80) undoStack.shift(); redoStack = []; updateHistoryButtons(); }
      component.pcb.x = nextX; component.pcb.y = nextY; boardDragging.moved = true;
      const group = boardLayer.querySelector(`[data-board-component="${component.id}"]`);
      if (group) group.setAttribute('transform', `translate(${component.pcb.x} ${component.pcb.y}) rotate(${component.pcb.rotation || 0})`);
    }
  });
  boardSvg.addEventListener('pointerup', () => { if (boardDragging?.moved) { setSaved(); renderBoard(); renderInspector(); } boardDragging = null; });
  boardSvg.addEventListener('pointercancel', () => { boardDragging = null; });
  boardSvg.addEventListener('click', (event) => { if (!event.target.closest('.pcb-footprint') && !event.target.closest('.pcb-track-group')) { selected = null; renderInspector(); renderBoard(); } });

  function updateView() {
    const isBoard = activeView === 'board';
    svg.classList.toggle('hidden', isBoard); boardSvg.classList.toggle('hidden', !isBoard);
    $('#canvasWrap').classList.toggle('board-active', isBoard);
    $('#boardLayerToggle').hidden = !isBoard;
    document.querySelectorAll('.board-layer-toggle button').forEach((button) => button.classList.toggle('active', button.dataset.layer === activeCopperLayer));
    document.querySelectorAll('.tab[data-view]').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === activeView));
    document.querySelectorAll('.tool-button[data-tool]').forEach((button) => { button.hidden = isBoard && button.dataset.tool === 'wire'; });
    $('#textToolButton').hidden = isBoard;
    $('#toolHint').textContent = isBoard ? `${activeCopperLayer} · drag footprints · inspect pad-to-net assignments` : 'Schematic · select a component to inspect its pins and device data';
    $('#gridStatus').textContent = isBoard ? 'Grid 0.25 mm' : 'Grid 20 mil';
    $('#sheetStatus').textContent = isBoard ? `Board ${project.board.width} × ${project.board.height} mm` : 'Schematic · 1 sheet';
    $('#statusMessage').textContent = isBoard ? `${project.components.filter((component) => component.footprint).length} footprints · ${project.board.tracks.length} routed segments · ${project.board.vias.length} vias` : `${project.components.length} parts · ${project.nets.length} named nets · 4-wire SPI`;
    $('#checkStatus').textContent = isBoard ? 'Footprints assigned · review antenna keepout' : '3.3 V logic · SPI mode 0';
    $('#checkStatus').previousElementSibling.style.background = isBoard ? '#e2a950' : '#58bc91';
    if (isBoard) setZoom(100);
  }

  function setView(view) {
    activeView = view; selected = null; pendingWire = null; render();
  }

  function onComponentPointerDown(event, component) {
    const hitPin = event.target.closest('[data-pin]');
    if (hitPin && activeTool === 'wire') return;
    if (activeTool !== 'select' || event.button !== 0) return;
    const p = coords(event); selected = { kind: 'component', id: component.id };
    const placement = component.schematic || component;
    dragging = { id: component.id, dx: p.x - placement.x, dy: p.y - placement.y, moved: false, before: JSON.stringify(project) };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('selected');
    renderInspector();
  }
  svg.addEventListener('pointermove', (event) => {
    const p = coords(event);
    $('#coordinateReadout').textContent = `X ${Math.round(p.x)} · Y ${Math.round(p.y)}`;
    if (pendingWire) { pendingWire.cursor = p; renderWires(); }
    if (dragging) {
      const component = componentById(dragging.id); if (!component) return;
      const placement = component.schematic || component;
      const nextX = Math.min(SHEET.width - 60, Math.max(60, snap(p.x - dragging.dx)));
      const nextY = Math.min(SHEET.height - 70, Math.max(70, snap(p.y - dragging.dy)));
      if (placement.x !== nextX || placement.y !== nextY) {
        if (!dragging.moved) { undoStack.push(dragging.before); if (undoStack.length > 80) undoStack.shift(); redoStack = []; updateHistoryButtons(); }
        placement.x = nextX; placement.y = nextY; dragging.moved = true;
        const group = componentLayer.querySelector(`[data-id="${component.id}"]`);
        if (group) group.setAttribute('transform', `translate(${placement.x} ${placement.y}) rotate(${placement.rotation || 0})`);
        renderWires();
      }
    }
  });
  svg.addEventListener('pointerup', () => { if (dragging?.moved) { setSaved(); renderComponents(); } dragging = null; });
  svg.addEventListener('pointercancel', () => { dragging = null; });
  svg.addEventListener('click', (event) => {
    if (event.target.closest('.component') || event.target.closest('.wire-path')) return;
    if (activeTool === 'wire') { pendingWire = null; renderWires(); $('#toolHint').textContent = 'Click a component pin to start a wire'; return; }
    if (selected) { selected = null; render(); }
  });
  svg.addEventListener('dblclick', (event) => {
    if (event.target.closest('.component')) return;
    const p = coords(event); const text = prompt('Add a text note');
    if (text?.trim()) { saveHistory(); project.annotations.push({ id: makeId('note'), text: text.trim(), x: snap(p.x), y: snap(p.y) }); setSaved(); renderAnnotations(); }
  });

  function handlePinClick(component, pin) {
    const endpoint = { componentId: component.id, pin };
    if (!pendingWire) { pendingWire = endpoint; $('#toolHint').textContent = `Starting at ${component.ref}.${definitions[component.type].pins[pin].name} · choose an end pin`; renderWires(); return; }
    if (pendingWire.componentId === endpoint.componentId && pendingWire.pin === endpoint.pin) return;
    if (project.wires.some((wire) => (sameEnd(wire.from, pendingWire) && sameEnd(wire.to, endpoint)) || (sameEnd(wire.from, endpoint) && sameEnd(wire.to, pendingWire)))) { showToast('Those pins are already connected'); pendingWire = null; renderWires(); return; }
    saveHistory(); project.wires.push({ id: makeId('wire'), from: pendingWire, to: endpoint, name: '' }); pendingWire = null; setSaved(); $('#toolHint').textContent = 'Wire added · click a pin to start another'; render();
  }
  function sameEnd(a, b) { return a.componentId === b.componentId && a.pin === b.pin; }
  function rotateComponent(component) { const placement = component.schematic || component; saveHistory(); placement.rotation = ((placement.rotation || 0) + 90) % 360; setSaved(); render(); }
  function setTool(tool) {
    activeTool = tool; pendingWire = null;
    document.querySelectorAll('.tool-button[data-tool]').forEach((button) => button.classList.toggle('selected', button.dataset.tool === tool));
    $('#toolHint').textContent = tool === 'wire' ? 'Click a component pin to start a wire' : 'Select and drag parts · Click a pin to inspect it';
    svg.style.cursor = tool === 'wire' ? 'crosshair' : 'default'; renderWires();
  }

  function nextReference(type) {
    const prefix = definitions[type].prefix;
    if (prefix === 'GND') return `GND${project.components.filter((c) => c.type === type).length + 1}`;
    let i = 1; while (project.components.some((component) => component.ref === `${prefix}${i}`)) i++;
    return `${prefix}${i}`;
  }
  function addComponent(type) {
    saveHistory();
    const count = project.components.length;
    const component = { id: makeId('cmp'), type, ref: nextReference(type), value: definitions[type].defaultValue, footprint: definitions[type].footprint, padNets: {}, schematic: { x: snap(300 + (count % 4) * 100), y: snap(300 + (Math.floor(count / 4) % 3) * 80), rotation: 0 } };
    if (component.footprint && project.board) component.pcb = { x: 12 + (count % 4) * 8, y: 12 + (Math.floor(count / 4) % 4) * 7, rotation: 0 };
    project.components.push(component); selected = { kind: 'component', id: component.id }; setSaved(); render(); showToast(`${definitions[type].name} added`);
  }
  function removeSelected() {
    if (!selected) { showToast('Select a component or wire first'); return; }
    saveHistory();
    if (selected.kind === 'component') {
      project.components = project.components.filter((component) => component.id !== selected.id);
      project.wires = project.wires.filter((wire) => wire.from.componentId !== selected.id && wire.to.componentId !== selected.id);
    } else project.wires = project.wires.filter((wire) => wire.id !== selected.id);
    selected = null; pendingWire = null; setSaved(); render();
  }

  function renderInspector() {
    const content = $('#inspectorContent');
    if (activeView === 'board') { if (inspectorTab === 'checks') renderBoardChecksPanel(content); else renderBoardInspector(content); return; }
    if (inspectorTab === 'checks') { renderChecksPanel(content); return; }
    if (!selected) {
      content.innerHTML = `<div class="inspector-placeholder"><div class="selection-icon">⌁</div><h2>Nothing selected</h2><p>Select a component to inspect its properties, pins, and connected nets.</p></div><div class="inspector-section"><span class="field-label">SCHEMATIC</span><div class="field-row"><div><span class="field-label">Components</span><input class="field-input" value="${project.components.length}" readonly /></div><div><span class="field-label">Wires</span><input class="field-input" value="${project.wires.length}" readonly /></div></div><p class="property-note">Click and drag to arrange parts. Double-click a component to rotate it 90°.</p></div>`;
      return;
    }
    if (selected.kind === 'wire') {
      const wire = project.wires.find((item) => item.id === selected.id);
      if (!wire) { selected = null; renderInspector(); return; }
      content.innerHTML = `<div class="inspector-section"><div class="inspector-title"><span class="part-type-icon">⌁</span><h2>Wire properties</h2></div><label class="field-label">NET LABEL</label><input class="field-input" id="wireName" value="${esc(wire.name)}" placeholder="e.g. VCC" /><p class="property-note">Name this connection to make the net easier to identify in the schematic.</p></div><div class="inspector-section"><span class="field-label">ENDPOINTS</span><p class="property-note">${esc(endpointLabel(wire.from))} ↔ ${esc(endpointLabel(wire.to))}</p></div>`;
      $('#wireName').addEventListener('change', (event) => { saveHistory(); wire.name = event.target.value.trim(); setSaved(); renderWires(); });
      return;
    }
    const component = componentById(selected.id);
    if (!component) { selected = null; renderInspector(); return; }
    const def = definitions[component.type];
    const placement = component.schematic || component;
    const pinRows = def.pins.map((pin, index) => {
      const connected = project.wires.some((wire) => sameEnd(wire.from, { componentId: component.id, pin: index }) || sameEnd(wire.to, { componentId: component.id, pin: index }));
      return `<div class="pin-row"><span class="pin-number">${index + 1}</span><span>${esc(pin.name)}</span><span class="pin-badge">${connected ? 'CONNECTED' : 'NO CONNECT'}</span></div>`;
    }).join('');
    content.innerHTML = `<div class="inspector-section"><div class="inspector-title"><span class="part-type-icon">${iconLetter(component.type)}</span><h2>${esc(def.name)}</h2></div><label class="field-label">REFERENCE</label><input class="field-input" id="componentRef" value="${esc(component.ref)}" /><label class="field-label">VALUE</label><input class="field-input" id="componentValue" value="${esc(component.value)}" /><div class="field-row"><div><label class="field-label">X POSITION</label><input class="field-input" id="componentX" type="number" step="20" value="${placement.x}" /></div><div><label class="field-label">Y POSITION</label><input class="field-input" id="componentY" type="number" step="20" value="${placement.y}" /></div></div><label class="field-label">ROTATION</label><select class="field-select" id="componentRotation"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select><p class="property-note">Double-click the symbol on the sheet to rotate it.</p></div><div class="inspector-section"><div class="inspector-title"><h2>Pins</h2><span class="check-count">${def.pins.length}</span></div><div class="pin-list">${pinRows}</div></div><div class="inspector-section"><span class="field-label">SIMULATION MODEL</span><p class="property-note">Component models and circuit simulation are on the roadmap.</p></div>`;
    $('#componentRotation').value = String(placement.rotation || 0);
    $('#componentRef').addEventListener('change', (event) => updateComponentField(component, 'ref', event.target.value.trim()));
    $('#componentValue').addEventListener('change', (event) => updateComponentField(component, 'value', event.target.value.trim()));
    $('#componentX').addEventListener('change', (event) => updateSchematicField(component, 'x', snap(Number(event.target.value) || 0)));
    $('#componentY').addEventListener('change', (event) => updateSchematicField(component, 'y', snap(Number(event.target.value) || 0)));
    $('#componentRotation').addEventListener('change', (event) => updateSchematicField(component, 'rotation', Number(event.target.value)));
  }
  function renderBoardInspector(content) {
    const component = selected?.kind === 'board-component' ? componentById(selected.id) : null;
    if (!component) {
      content.innerHTML = `<div class="inspector-placeholder"><div class="selection-icon">▦</div><h2>Board overview</h2><p>Custom two-layer controller PCB with assigned footprints, routed copper and pad-to-net mapping.</p></div><div class="inspector-section"><span class="field-label">BOARD</span><div class="field-row"><div><span class="field-label">WIDTH</span><input class="field-input" value="${project.board.width} mm" readonly /></div><div><span class="field-label">HEIGHT</span><input class="field-input" value="${project.board.height} mm" readonly /></div></div><div class="field-row"><div><span class="field-label">FOOTPRINTS</span><input class="field-input" value="${project.components.filter((item) => item.footprint).length}" readonly /></div><div><span class="field-label">NETS</span><input class="field-input" value="${project.nets.length}" readonly /></div></div></div><div class="inspector-section"><span class="field-label">ROUTED NETS</span><div class="net-list">${project.nets.map((net) => `<div class="net-row"><i style="background:${NET_COLORS[net.name] || '#6674f3'}"></i><span>${esc(net.name)}</span><small>${net.endpoints.length} pads</small></div>`).join('')}</div></div><div class="check-issue"><strong>Design assumption</strong>J2 requires an external regulated 3.3 V supply rated for at least 500 mA. Manufacturing DRC has not been run.</div>`;
      return;
    }
    const footprint = FOOTPRINTS[component.footprint];
    if (!footprint) { content.innerHTML = `<div class="inspector-section"><h2>${esc(component.ref)}</h2><p class="property-note">No PCB footprint assigned.</p></div>`; return; }
    const distinctPads = [...new Map(footprint.pads.map((pad) => [pad.number, pad])).values()];
    const pads = distinctPads.map((pad) => `<div class="pad-map-row"><span class="pad-map-number">${esc(pad.number)}</span><span>${esc(pad.name)}</span><span class="pad-map-net" style="color:${NET_COLORS[component.padNets?.[pad.number]] || '#9aa4ab'}">${esc(component.padNets?.[pad.number] || '—')}</span></div>`).join('');
    content.innerHTML = `<div class="inspector-section"><div class="inspector-title"><span class="part-type-icon">${iconLetter(component.type)}</span><h2>${esc(component.ref)} · ${esc(component.value)}</h2></div><span class="field-label">FOOTPRINT</span><div class="footprint-name">${esc(component.footprint)}</div><div class="field-row"><div><label class="field-label">X · MM</label><input class="field-input" id="boardX" type="number" step="0.25" value="${component.pcb.x}" /></div><div><label class="field-label">Y · MM</label><input class="field-input" id="boardY" type="number" step="0.25" value="${component.pcb.y}" /></div></div><label class="field-label">ROTATION</label><select class="field-select" id="boardRotation"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select><p class="property-note">${esc(component.manufacturer || '')} · ${esc(component.mpn || '')}</p></div><div class="inspector-section"><div class="inspector-title"><h2>Pad → net map</h2><span class="check-count">${footprint.pads.length}</span></div><div class="pad-map">${pads}</div></div><div class="inspector-section"><span class="field-label">FOOTPRINT SOURCE</span><p class="property-note">${esc(footprint.source)}</p></div>`;
    $('#boardRotation').value = String(component.pcb.rotation || 0);
    $('#boardX').addEventListener('change', (event) => updateBoardField(component, 'x', Math.max(0, Number(event.target.value) || 0)));
    $('#boardY').addEventListener('change', (event) => updateBoardField(component, 'y', Math.max(0, Number(event.target.value) || 0)));
    $('#boardRotation').addEventListener('change', (event) => updateBoardField(component, 'rotation', Number(event.target.value)));
  }
  function updateBoardField(component, key, value) {
    if (component.pcb[key] === value) return;
    saveHistory(); component.pcb[key] = value; setSaved(); renderBoard(); renderBoardInspector($('#inspectorContent'));
  }
  function updateComponentField(component, key, value) { if (component[key] === value) return; saveHistory(); component[key] = value; setSaved(); render(); }
  function updateSchematicField(component, key, value) { const placement = component.schematic || component; if (placement[key] === value) return; saveHistory(); placement[key] = value; setSaved(); render(); }
  function endpointLabel(endpoint) { const c = componentById(endpoint.componentId); return c ? `${c.ref}.${definitions[c.type].pins[endpoint.pin].name}` : 'Missing pin'; }
  function iconLetter(type) { return ({ resistor: 'R', capacitor: 'C', inductor: 'L', led: '↗', diode: '▷', npn: 'Q', opamp: '△', voltage: '±', ground: '⏚', connector: 'J' })[type] || '•'; }

  function runChecks() {
    checks = [];
    const seenRefs = new Set();
    project.components.forEach((component) => {
      const def = definitions[component.type];
      if (seenRefs.has(component.ref)) checks.push({ type: 'error', title: `Duplicate reference ${component.ref}`, detail: `${component.ref} is used by more than one component.` });
      seenRefs.add(component.ref);
      def.pins.forEach((pin, index) => {
        const connected = project.wires.some((wire) => sameEnd(wire.from, { componentId: component.id, pin: index }) || sameEnd(wire.to, { componentId: component.id, pin: index }));
        if (!connected && component.type !== 'ground') checks.push({ type: 'warning', title: `${component.ref}.${pin.name} is unconnected`, detail: `Connect pin ${pin.name} or intentionally leave it unconnected.` });
      });
    });
    $('#checkCount').textContent = checks.length;
    $('#checkStatus').textContent = checks.length ? `${checks.length} issue${checks.length === 1 ? '' : 's'} found` : 'No known issues';
    $('#checkStatus').previousElementSibling.style.background = checks.length ? '#e2a950' : '#58bc91';
    showToast(checks.length ? `${checks.length} electrical check${checks.length === 1 ? '' : 's'} found` : 'Electrical checks passed');
    renderInspector();
    if (inspectorTab !== 'checks') document.querySelector('[data-inspector="checks"]').classList.add('has-issues');
  }
  function runBoardChecks() {
    checks = validateGeneratedProject(project).map((detail) => ({ type: 'error', title: 'Project model', detail }));
    project.components.forEach((component) => {
      if (!component.footprint || !FOOTPRINTS[component.footprint]) checks.push({ type: 'error', title: `${component.ref} has no known footprint`, detail: 'Assign a library footprint before manufacturing.' });
      if (!component.pcb) checks.push({ type: 'error', title: `${component.ref} is not placed`, detail: 'Place the footprint on the board.' });
      Object.entries(component.padNets || {}).forEach(([padNumber, net]) => {
        const footprint = FOOTPRINTS[component.footprint];
        if (footprint && !footprint.pads.some((pad) => pad.number === padNumber)) checks.push({ type: 'error', title: `${component.ref} pad ${padNumber} is missing`, detail: `Net ${net} refers to a pad absent from the footprint.` });
      });
    });
    project.board.tracks.forEach((item) => {
      [item.from, item.to].forEach((endpoint) => {
        const component = componentById(endpoint.componentId);
        if (!component?.padNets?.[endpoint.pad]) checks.push({ type: 'warning', title: `${item.net} track endpoint has no net assignment`, detail: `${endpoint.componentId} pad ${endpoint.pad} is not assigned to ${item.net}.` });
        else if (component.padNets[endpoint.pad] !== item.net) checks.push({ type: 'error', title: `Track/net mismatch on ${item.net}`, detail: `${endpoint.componentId} pad ${endpoint.pad} belongs to ${component.padNets[endpoint.pad]}.` });
      });
    });
    $('#checkCount').textContent = checks.length;
    $('#checkStatus').textContent = checks.length ? `${checks.length} PCB issue${checks.length === 1 ? '' : 's'}` : 'Footprint/net checks passed';
    $('#checkStatus').previousElementSibling.style.background = checks.length ? '#e2a950' : '#58bc91';
    inspectorTab = 'checks'; document.querySelectorAll('.inspector-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.inspector === 'checks'));
    renderInspector(); showToast(checks.length ? `${checks.length} PCB check${checks.length === 1 ? '' : 's'} found` : 'Footprint and net checks passed');
  }
  function renderBoardChecksPanel(content) {
    if (!checks.length) content.innerHTML = `<div class="checks-empty"><span>✓</span><div><strong>Footprints and nets match</strong><p>Every routed endpoint maps to a pad assigned to the same electrical net.</p></div></div><div class="check-issue"><strong>Manufacturing release still needs review</strong>Run DRC, verify the exact display breakout, regulator/power source, clearances and antenna keepout in a full PCB CAD tool.</div>`;
    else content.innerHTML = checks.map((item) => `<div class="check-issue"><strong>${esc(item.title)}</strong>${esc(item.detail)}</div>`).join('');
  }
  function renderChecksPanel(content) {
    if (!checks.length) {
      content.innerHTML = `<div class="checks-empty"><span>✓</span><div><strong>All checks passed</strong><p>No unconnected component pins or duplicate references found in the current schematic.</p></div></div><div class="inspector-section"><span class="field-label">CHECKS RUN</span><p class="property-note">Basic connectivity and reference checks. More electrical rules will be added as the schematic model grows.</p></div>`;
    } else {
      content.innerHTML = checks.map((item) => `<div class="check-issue"><strong>${esc(item.title)}</strong>${esc(item.detail)}</div>`).join('');
    }
  }
  function updateCounts() {
    const connectedPins = new Set(); project.wires.forEach((wire) => { connectedPins.add(`${wire.from.componentId}:${wire.from.pin}`); connectedPins.add(`${wire.to.componentId}:${wire.to.pin}`); });
    $('#statusMessage').textContent = `Ready · ${project.components.length} component${project.components.length === 1 ? '' : 's'} · ${connectedPins.size ? project.wires.length : 0} wire${project.wires.length === 1 ? '' : 's'}`;
  }

  function renderLibrary() {
    const groups = { passive: $('#componentList'), semiconductor: $('#semiconductorList'), power: $('#powerList') };
    Object.values(groups).forEach((container) => container.replaceChildren());
    const query = $('#componentSearch').value.trim().toLowerCase();
    Object.entries(definitions).forEach(([type, def]) => {
      if (query && !`${def.name} ${type}`.toLowerCase().includes(query)) return;
      const button = document.createElement('button'); button.className = 'component-row'; button.title = `Add ${def.name}`;
      button.innerHTML = `<span class="component-icon">${miniIcon(type)}</span><span class="component-label">${esc(def.name)}<small>${esc(def.group === 'passive' ? 'Passive component' : def.group === 'power' ? 'Power symbol' : 'Semiconductor')}</small></span><span class="component-add">＋</span>`;
      button.addEventListener('click', () => addComponent(type)); groups[def.group].append(button);
    });
  }
  function miniIcon(type) {
    const paths = { resistor: '<path d="M2 12h4l2-5 3 10 3-10 3 5h5"/>', capacitor: '<path d="M12 2v7m-6 0h12m-12 5h12m-6 0v7"/>', inductor: '<path d="M2 12h3a3 3 0 016 0 3 3 0 016 0h5"/>', led: '<path d="M2 12h6m0-5l8 5-8 5zM16 6v12m1-12l4-4m-3 8l4-4"/>', diode: '<path d="M2 12h6m0-5l8 5-8 5zM16 6v12m0-6h6"/>', npn: '<circle cx="12" cy="12" r="8"/><path d="M3 6l7 4 5-5m-5 9 5 5m-5-9v9"/>', opamp: '<path d="M5 3l15 9-15 9zM2 8h4m-4 8h4m14-4h3"/>', voltage: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5m-3-2h6m-5 5h4"/>', ground: '<path d="M12 3v8m-8 0h16m-13 4h10m-7 4h4"/>', connector: '<rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="10" cy="8" r="1.5"/><circle cx="10" cy="16" r="1.5"/>', esp32: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M1 6h3m-3 4h3m-3 4h3m-3 4h3m16-12h3m-3 4h3m-3 4h3m-3 4h3"/>', display: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M2 5h4m-4 2h4m-4 2h4m-4 2h4m-4 2h4m-4 2h4m-4 2h4m-4 2h4"/>' };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type]}</svg>`;
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function saveProject() {
    const filename = `${(project.name || 'schematic').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}.circuit.json`;
    download(filename, JSON.stringify(project, null, 2), 'application/json');
    $('#savedLabel').textContent = 'Downloaded'; $('#savedLabel').classList.remove('unsaved'); showToast('Project saved as JSON');
  }
  function exportSvg() {
    const source = activeView === 'board' ? boardSvg : svg;
    const clone = source.cloneNode(true);
    clone.setAttribute('xmlns', SVG);
    if (activeView === 'board') { clone.setAttribute('width', 760); clone.setAttribute('height', 560); }
    else { clone.setAttribute('width', SHEET.width); clone.setAttribute('height', SHEET.height); }
    const style = node('style');
    style.textContent = activeView === 'board'
      ? `.pcb-substrate{fill:#315f52;stroke:#203d37}.board-edge{fill:none;stroke:#d2a875;stroke-dasharray:1.2 .6}.mounting-hole{fill:#eef1f2;stroke:#c49d70}.antenna-keepout{fill:#fff2d8;stroke:#d6a746;stroke-dasharray:.8 .45}.keepout-label{font:1.05px monospace;fill:#9b7431}.pcb-track{fill:none;stroke-linecap:round;stroke-linejoin:round;vector-effect:none}.module-body{fill:#202a2e;stroke:#10191c}.module-label{font:1.55px sans-serif;fill:#d3dcde;font-weight:bold}.module-sublabel{font:1.05px monospace;fill:#9eb2b0}.module-shield{fill:#465258}.smd-body,.header-body{fill:#899395;stroke:#cad1cf}.pcb-pad{fill:#d9bd70;stroke:#d6bc73}.ground-pad{fill:#c6d4aa}.footprint-reference{font:1.12px monospace;fill:#fff;stroke:#315f52;stroke-width:.23}.board-dimension-label{font:1.15px monospace;fill:#60716f}`
      : `.wire-path{fill:none;stroke:#33424d;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}.net-link-stub{stroke:#8b96a0;stroke-width:1.5;stroke-linecap:round}.net-tag-bg{fill:#f0f2ff;stroke:#d8dcfb}.net-tag-label{font:9px monospace;fill:#5361cd}.component-body{stroke:#2f3d47;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none}.component-fill{stroke:#2f3d47;stroke-width:2;fill:#fff}.component-ref{font:600 12px sans-serif;fill:#3c4952;text-anchor:middle}.component-value{font:10px sans-serif;fill:#849097;text-anchor:middle}.symbol-pin-label{font:8px monospace;fill:#67747c}.pin-hit{display:none}.pin-visible{fill:#fff;stroke:#45545e;stroke-width:1.6}.wire-label{font:10px monospace;fill:#697780}.annotation-text{font:12px sans-serif;fill:#65717a}`;
    clone.insertBefore(style, clone.firstChild);
    clone.querySelectorAll('.component,.pcb-footprint').forEach((el) => el.classList.remove('selected'));
    clone.querySelectorAll('.pin-hit').forEach((el) => el.remove()); clone.querySelectorAll('.wire-preview').forEach((el) => el.remove());
    clone.querySelectorAll('.pcb-track-hit').forEach((el) => el.remove());
    const suffix = activeView === 'board' ? '-pcb' : '-schematic';
    download(`${(project.name || 'design').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}${suffix}.svg`, new XMLSerializer().serializeToString(clone), 'image/svg+xml');
    showToast(`${activeView === 'board' ? 'PCB layout' : 'Schematic'} exported as SVG`);
  }
  function loadProject(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const loaded = JSON.parse(reader.result);
        if (loaded.format !== 'circuit-studio' || !Array.isArray(loaded.components) || !Array.isArray(loaded.wires)) throw new Error('Unsupported project file');
        loaded.components.forEach((c) => { if (!definitions[c.type]) throw new Error(`Unknown component type: ${c.type}`); });
        if (loaded.version === 2) { const issues = validateGeneratedProject(loaded); if (issues.length) throw new Error(issues.slice(0, 5).join(' ')); }
        saveHistory(); project = normalizeProject(loaded); selected = null; activeView = 'schematic'; setSaved(); render(); showToast('Project opened');
      } catch (error) { showToast(error.message || 'Could not open project'); }
      $('#fileInput').value = '';
    };
    reader.readAsText(file);
  }
  async function loadProjectFromUrl() {
    const source = new URLSearchParams(window.location.search).get('project');
    if (!source) return;
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Project load failed (${response.status})`);
      const loaded = await response.json();
      if (loaded.format !== 'circuit-studio' || !Array.isArray(loaded.components)) throw new Error('Unsupported project file');
      loaded.components.forEach((component) => { if (!definitions[component.type]) throw new Error(`Unknown component type: ${component.type}`); });
      if (loaded.version === 2) { const issues = validateGeneratedProject(loaded); if (issues.length) throw new Error(issues.slice(0, 5).join(' ')); }
      project = normalizeProject(loaded);
      activeView = new URLSearchParams(window.location.search).get('view') === 'board' ? 'board' : 'schematic';
      setSaved(); render(); showToast(`Opened ${project.name}`);
      if (new URLSearchParams(window.location.search).get('checks') === 'board') runBoardChecks();
    } catch (error) { showToast(error.message || 'Could not open linked project'); }
  }
  function normalizeProject(loaded) {
    const normalized = { ...loaded, nets: loaded.nets || [], wires: loaded.wires || [], annotations: Array.isArray(loaded.annotations) ? loaded.annotations : [], board: loaded.board || { width: 76, height: 52, layers: ['F.Cu', 'B.Cu'], tracks: [], vias: [], keepouts: [], mountingHoles: [] } };
    normalized.components = loaded.components.map((component) => ({ ...component, schematic: component.schematic || { x: component.x || 300, y: component.y || 300, rotation: component.rotation || 0 }, padNets: { ...(component.padNets || {}) } }));
    normalized.nets.forEach((net) => net.endpoints.forEach((endpoint) => {
      const component = normalized.components.find((item) => item.id === endpoint.componentId);
      if (component) component.padNets[endpoint.pad] = net.name;
    }));
    if (!normalized.wires.length && normalized.nets.length) normalized.wires = makeSchematicWires(normalized.components, normalized.nets);
    return normalized;
  }
  function makeSchematicWires(components, nets) {
    const wires = [];
    nets.forEach((net) => {
      const first = net.endpoints[0];
      net.endpoints.slice(1).forEach((target, index) => {
        const fromComponent = components.find((component) => component.id === first.componentId);
        const toComponent = components.find((component) => component.id === target.componentId);
        const fromPin = fromComponent ? definitions[fromComponent.type].pins.findIndex((pin) => pin.pad === String(first.pad)) : -1;
        const toPin = toComponent ? definitions[toComponent.type].pins.findIndex((pin) => pin.pad === String(target.pad)) : -1;
        if (fromPin >= 0 && toPin >= 0) wires.push({ id: `w-${net.name}-${index}`, from: { componentId: first.componentId, pin: fromPin }, to: { componentId: target.componentId, pin: toPin }, name: net.name });
      });
    });
    return wires;
  }

  function validateGeneratedProject(candidate) {
    const issues = [];
    const issue = (message) => issues.push(message);
    if (!candidate || typeof candidate !== 'object') return ['Response must be a JSON project object.'];
    if (candidate.format !== 'circuit-studio' || candidate.version !== 2) issue('Use format "circuit-studio" and version 2.');
    if (!Array.isArray(candidate.components) || candidate.components.length === 0) issue('Add at least one component.');
    if (!Array.isArray(candidate.nets)) issue('Provide a nets array.');
    if (!candidate.board || !Number.isFinite(candidate.board.width) || !Number.isFinite(candidate.board.height) || candidate.board.width <= 0 || candidate.board.height <= 0) issue('Provide positive PCB width and height in millimetres.');
    if (!candidate.board || !Array.isArray(candidate.board.layers) || !candidate.board.layers.includes('F.Cu')) issue('The board must include an F.Cu layer.');
    if (!Array.isArray(candidate.board?.tracks)) issue('Provide board.tracks as an array (it may be empty).');
    if (issues.length) return issues;

    const componentsById = new Map();
    const refs = new Set();
    candidate.components.forEach((component, index) => {
      if (!component || typeof component !== 'object') { issue(`Component ${index + 1} must be an object.`); return; }
      const prefix = `Component ${component.ref || index + 1}`;
      if (!component.id || componentsById.has(component.id)) issue(`${prefix}: id is missing or duplicated.`);
      else componentsById.set(component.id, component);
      if (!definitions[component.type]) issue(`${prefix}: unsupported part type "${component.type}".`);
      if (!component.ref || refs.has(component.ref)) issue(`${prefix}: reference is missing or duplicated.`);
      refs.add(component.ref);
      if (!component.footprint || !FOOTPRINTS[component.footprint]) issue(`${prefix}: choose a footprint from the supplied library.`);
      if (!isFinitePoint(component.schematic) || !isFinitePoint(component.pcb)) issue(`${prefix}: add schematic and PCB x/y placements.`);
      else if (component.pcb.x < 0 || component.pcb.y < 0 || component.pcb.x > candidate.board.width || component.pcb.y > candidate.board.height) issue(`${prefix}: PCB placement anchor is outside the board.`);
    });

    const padToNet = new Map();
    const netNames = new Set();
    candidate.nets.forEach((net) => {
      if (!net || typeof net !== 'object') { issue('Every net must be an object.'); return; }
      if (!net.name || netNames.has(net.name)) issue(`Net name "${net.name || '(empty)'}" is missing or duplicated.`);
      netNames.add(net.name);
      if (!Array.isArray(net.endpoints) || net.endpoints.length < 2) issue(`Net ${net.name}: add at least two pad endpoints.`);
      (net.endpoints || []).forEach((endpoint) => {
        if (!endpoint || typeof endpoint !== 'object' || endpoint.componentId === undefined || endpoint.pad === undefined) { issue(`Net ${net.name}: endpoint needs componentId and pad.`); return; }
        const component = componentsById.get(endpoint.componentId);
        if (!component || !definitions[component.type]) { issue(`Net ${net.name}: unknown component ${endpoint.componentId}.`); return; }
        const pad = String(endpoint.pad);
        if (!definitions[component.type].pins.some((pin) => pin.pad === pad)) { issue(`Net ${net.name}: ${component.ref} has no schematic pin/pad ${pad}.`); return; }
        const key = `${component.id}:${pad}`;
        if (padToNet.has(key) && padToNet.get(key) !== net.name) issue(`${component.ref} pad ${pad} is assigned to multiple nets.`);
        padToNet.set(key, net.name);
      });
    });

    candidate.board.tracks.forEach((track, index) => {
      if (!track || typeof track !== 'object') { issue(`Track ${index + 1} must be an object.`); return; }
      const label = `Track ${track.id || index + 1}`;
      if (!candidate.board.layers.includes(track.layer)) issue(`${label}: layer ${track.layer} is not enabled on the board.`);
      if (!netNames.has(track.net)) issue(`${label}: net ${track.net} is not declared.`);
      [track.from, track.to].forEach((endpoint) => {
        const key = `${endpoint?.componentId}:${String(endpoint?.pad)}`;
        if (!padToNet.has(key)) issue(`${label}: endpoint ${key} has no net assignment.`);
        else if (padToNet.get(key) !== track.net) issue(`${label}: endpoint ${key} belongs to ${padToNet.get(key)}, not ${track.net}.`);
      });
      if (track.waypoints !== undefined && !Array.isArray(track.waypoints)) issue(`${label}: waypoints must be an array.`);
      (Array.isArray(track.waypoints) ? track.waypoints : []).forEach((point) => {
        if (!isFinitePoint(point) || point.x < 0 || point.y < 0 || point.x > candidate.board.width || point.y > candidate.board.height) issue(`${label}: waypoint lies outside the board.`);
      });
    });
    return issues;
  }
  function isFinitePoint(value) { return value && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y)); }

  function buildAiPrompt() {
    const brief = $('#designBrief').value.trim();
    if (!brief) { setAiValidation('Describe the circuit or PCB you want first.', 'error'); return null; }
    const supportedParts = Object.entries(definitions).filter(([, def]) => def.footprint && FOOTPRINTS[def.footprint]).map(([type, def]) => ({ type, symbol: def.name, footprint: def.footprint, pins: def.pins.map((pin) => ({ pad: pin.pad, name: pin.name, electricalType: pin.electricalType || 'passive' })) }));
    const schemaExample = {
      format: 'circuit-studio', version: 2, name: 'Design name', units: 'mm',
      design: { description: 'Short design description', revision: 'A', layers: ['F.Cu', 'B.Cu'], source: 'Datasheets or references used' },
      schematic: { width: 1200, height: 700, title: 'Schematic title' },
      components: [
        { id: 'U1', type: 'esp32', ref: 'U1', value: 'ESP32-WROOM-32E-N4', footprint: 'Espressif:ESP32-WROOM-32E', schematic: { x: 270, y: 355, rotation: 0 }, pcb: { x: 18, y: 27, rotation: 0 } },
        { id: 'J1', type: 'display', ref: 'J1', value: 'SPI display', footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical', schematic: { x: 870, y: 310, rotation: 0 }, pcb: { x: 49, y: 19, rotation: 0 } },
      ],
      nets: [{ name: 'LCD_SCK', class: 'spi', endpoints: [{ componentId: 'U1', pad: '30' }, { componentId: 'J1', pad: '3' }] }],
      wires: [],
      board: { width: 76, height: 52, layers: ['F.Cu', 'B.Cu'], tracks: [{ net: 'LCD_SCK', layer: 'F.Cu', width: 0.25, from: { componentId: 'U1', pad: '30' }, to: { componentId: 'J1', pad: '3' }, waypoints: [{ x: 34, y: 24 }, { x: 34, y: 15 }] }], vias: [], keepouts: [], mountingHoles: [] },
      annotations: [], assumptions: ['List hardware, footprint, supply and layout assumptions.'],
    };
    const mode = $('#aiMode').value;
    const existing = mode === 'modify' ? `\nCURRENT PROJECT JSON (modify this design and return the complete replacement project):\n${JSON.stringify(project, null, 2)}\n` : '';
    return `OUTPUT CONTRACT\n- Return exactly one valid JSON object. Do not include Markdown fences, prose, or comments.\n- Use format "circuit-studio", version 2, units "mm". Follow this shape; preserve all required fields:\n${JSON.stringify(schemaExample, null, 2)}\n- Use only these supported component types and exact footprint IDs. Do not invent symbols, pads, footprint names, datasheet facts, or GPIO capabilities:\n${JSON.stringify(supportedParts, null, 2)}\n- For every net endpoint, use a real pad number from the selected component definition. Pad numbers are strings.\n- Every component needs a unique id and reference, a supported footprint, schematic {x,y,rotation}, and PCB {x,y,rotation}. Keep the full part inside the board.\n- Each physical pad may belong to only one net. Put each named net in nets[].endpoints. Set wires to [] so the editor derives the schematic connections from the netlist.\n- Every track endpoint must be assigned to that exact same named net. Use only enabled copper layers. Use straight/orthogonal waypoints, sensible trace widths, and vias when changing layers. Stay inside the outline and outside keepouts.\n- Add decoupling, pull-ups, series resistors, connectors, and power details that the requested circuit actually needs. Do not leave critical power/reset requirements implicit.\n- Keep analog/radio/high-speed and antenna constraints in mind. In particular, do not use ESP32 GPIO6–GPIO11 as normal GPIO; they are reserved for module flash.\n- Put assumptions, exact-part uncertainties, supply requirements, and omissions in assumptions[]. Never claim DRC/manufacturing approval.\n- Schematic positions use a 1200×700 coordinate space; PCB positions and waypoints use millimetres. Allowed rotations: 0, 90, 180, 270.\n\nDESIGN BRIEF\n${brief}\n${existing}`;
  }

  function buildAiSystemPrompt() {
    return `You are Circuit Studio's electronics design copilot. Circuit Studio is a static browser app for PCB/electronics design. Its UI has a schematic view, a PCB layout view with F.Cu/B.Cu selection, a properties/pad-to-net inspector, project JSON Open/Save, and electrical/footprint consistency checks. Users can either import a .circuit.json file or paste a design response into Build with AI. A version-2 project contains components with separate schematic and PCB placements, named nets with physical pad endpoints, and board copper tracks/vias/keepouts. On load, the app builds named schematic connections from nets[].endpoints and draws physical footprints and routed layers from the board model. The prompt provided by the user explains the exact schema, coordinate spaces, supported part/pad/footprint inventory, and their design request.\n\nGenerate a complete, internally consistent Circuit Studio project object. Use only the exact supported part, pad, and footprint inventory in the user prompt. Model physical pad-to-net assignments correctly, include all power/reset/decoupling details, and route copper using straight track segments. Record all assumptions and any unknown exact parts. Do not use tools, edit files, claim DRC approval, or return anything except the single JSON object.`;
  }

  function buildHandoffPrompt() {
    const request = buildAiPrompt();
    return request ? `SYSTEM PROMPT FOR YOUR AI ASSISTANT\n${buildAiSystemPrompt()}\n\nUSER REQUEST AND LIVE PROJECT SCHEMA\n${request}` : null;
  }

  function setAiValidation(message, state = '') {
    const status = $('#aiValidation'); status.textContent = message; status.classList.toggle('error', state === 'error'); status.classList.toggle('success', state === 'success');
  }
  async function copyAiPrompt() {
    const prompt = buildHandoffPrompt(); if (!prompt) return;
    const preview = $('#aiPromptPreview'); preview.value = prompt;
    try {
      let copied = false;
      if (navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(prompt); copied = true; } catch {} }
      if (!copied) { $('.ai-prompt-preview').open = true; preview.focus(); preview.select(); copied = document.execCommand('copy'); }
      if (copied) {
        setAiValidation('Prompt copied. Paste it into your preferred AI assistant, then paste its complete JSON response below.', 'success');
        showToast('Design prompt copied');
      } else setAiValidation('Prompt ready below. Expand “Review or copy the prompt manually”, select the text, and copy it into your preferred AI assistant.', 'success');
    } catch (error) { setAiValidation(`${error.message}. Select and copy the prompt manually from your assistant workflow.`, 'error'); }
  }
  function loadAiSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || '{}');
      if (saved.workflowMode) $('#aiWorkflowMode').value = saved.workflowMode;
      if (saved.connectionMode) $('#aiConnectionMode').value = saved.connectionMode;
      if (saved.baseUrl) $('#aiBaseUrl').value = saved.baseUrl;
      if (saved.model) $('#aiModel').value = saved.model;
      if (saved.openCodeModel) preferredOpenCodeModel = saved.openCodeModel;
      if (saved.openCodeFamily) { preferredOpenCodeFamily = saved.openCodeFamily; $('#openCodeFamily').value = saved.openCodeFamily; }
      if (saved.openCodeOrgId) $('#opencodeOrgId').value = saved.openCodeOrgId;
      if (saved.openCodeProxyUrl) $('#openCodeProxyUrl').value = saved.openCodeProxyUrl;
      const rememberedKey = localStorage.getItem(AI_KEY_STORAGE_KEY);
      if (rememberedKey) { $('#aiApiKey').value = rememberedKey; $('#rememberAiKey').checked = true; }
      const rememberedOpenCodeToken = localStorage.getItem(AI_OPENCODE_TOKEN_KEY);
      if (rememberedOpenCodeToken) { $('#opencodeToken').value = rememberedOpenCodeToken; $('#rememberOpenCodeToken').checked = true; }
    } catch { /* Local-file/private browsing modes may block localStorage; settings remain available for this tab. */ }
    updateAiWorkflowUi(); updateAiConnectionUi(); updateAiKeyStorageState(); updateOpenCodeTokenStorageState();
  }
  function saveAiSettings() {
    const settings = {
      workflowMode: $('#aiWorkflowMode').value,
      connectionMode: $('#aiConnectionMode').value,
      baseUrl: $('#aiBaseUrl').value.trim(),
      model: $('#aiModel').value.trim(),
      openCodeModel: $('#openCodeModelSelect').value || preferredOpenCodeModel,
      openCodeFamily: $('#openCodeFamily').value,
      openCodeOrgId: $('#opencodeOrgId').value.trim(),
      openCodeProxyUrl: $('#openCodeProxyUrl').value.trim(),
    };
    try { localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings)); } catch { /* The current form values still work for this tab. */ }
    persistAiKeyPreference();
  }
  function persistAiKeyPreference() {
    const remember = $('#rememberAiKey').checked;
    const key = $('#aiApiKey').value.trim();
    try {
      if (remember && key) localStorage.setItem(AI_KEY_STORAGE_KEY, key);
      else localStorage.removeItem(AI_KEY_STORAGE_KEY);
    } catch { /* If storage is unavailable, the key remains only in this page's input. */ }
    updateAiKeyStorageState();
  }
  function persistOpenCodeTokenPreference() {
    const remember = $('#rememberOpenCodeToken').checked;
    const token = $('#opencodeToken').value.trim();
    try {
      if (remember && token) localStorage.setItem(AI_OPENCODE_TOKEN_KEY, token);
      else localStorage.removeItem(AI_OPENCODE_TOKEN_KEY);
    } catch { /* A token can still be used for the current tab. */ }
    updateOpenCodeTokenStorageState();
  }
  function updateAiKeyStorageState() {
    const status = $('#aiKeyStorageState');
    status.textContent = $('#rememberAiKey').checked && $('#aiApiKey').value ? 'Saved in this browser only; never added to project files.' : $('#rememberAiKey').checked ? 'The key will be saved here after you enter it.' : 'Key stays in memory for this tab.';
  }
  function updateOpenCodeTokenStorageState() {
    $('#openCodeTokenStorageState').textContent = $('#rememberOpenCodeToken').checked && $('#opencodeToken').value ? 'Saved unencrypted in this browser only; never in project files.' : $('#rememberOpenCodeToken').checked ? 'The token will be saved here after you enter it.' : 'Token stays in memory for this tab.';
  }
  function updateAiWorkflowUi() {
    const direct = $('#aiWorkflowMode').value === 'direct';
    $('#aiConnectionCard').hidden = !direct;
    $('#aiHandoffControls').hidden = direct;
    $('#aiHandoffPromptControls').hidden = direct;
    $('#aiGenerateRow').hidden = !direct;
    $('#aiLivePreview').hidden = !direct;
    $('#aiResponseLabel').textContent = direct ? 'LIVE AI RESPONSE · CIRCUIT STUDIO JSON' : 'AI-GENERATED CIRCUIT STUDIO JSON';
    $('#aiProjectResponse').placeholder = direct ? 'The generated project will stream into this editor while the request runs…' : 'Paste the complete .circuit.json response here…';
    $('#validateAiProjectButton').textContent = direct ? 'Validate pasted response' : 'Validate & load';
    updateAiConnectionUi();
    updateAiFooterInfo();
  }
  function updateAiConnectionUi() {
    const openCode = $('#aiConnectionMode').value === 'opencode-inference';
    $('#compatibleSettings').hidden = openCode;
    $('#opencodeSettings').hidden = !openCode;
    $('#openCodeFamily').disabled = !verifiedOpenCodeModels.length;
    $('#aiGenerateRow').querySelector('span').textContent = openCode
      ? 'Verify the token, choose a model, then generate. Parts/nets preview live and the board loads when inference completes.'
      : 'Response text and detected parts/nets stream live; the validated design loads when complete.';
    updateOpenCodeGenerateState();
    updateAiFooterInfo();
  }
  function updateAiFooterInfo() {
    const direct = $('#aiWorkflowMode').value === 'direct';
    const openCode = $('#aiConnectionMode').value === 'opencode-inference';
    $('#aiFooterInfo').textContent = !direct
      ? 'Copy/paste makes no AI request from Circuit Studio and needs no API key.'
      : openCode
        ? 'Your browser sends the verified token and prompt directly to OpenCode Inference, not through Circuit Studio.'
        : 'Direct browser-to-provider connection. The selected API receives your prompt and, if entered, your key.';
  }
  function bindAiSettings() {
    loadAiSettings();
    $('#aiWorkflowMode').addEventListener('change', () => { updateAiWorkflowUi(); saveAiSettings(); });
    $('#aiConnectionMode').addEventListener('change', () => { updateAiConnectionUi(); saveAiSettings(); });
    ['aiBaseUrl', 'aiModel', 'opencodeOrgId', 'openCodeProxyUrl'].forEach((id) => $(`#${id}`).addEventListener('change', saveAiSettings));
    $('#openCodeModelSelect').addEventListener('change', () => { preferredOpenCodeModel = $('#openCodeModelSelect').value; saveAiSettings(); updateOpenCodeGenerateState(); updateOpenCodeModelStatus(); });
    $('#openCodeFamily').addEventListener('change', () => { preferredOpenCodeFamily = $('#openCodeFamily').value; saveAiSettings(); updateOpenCodeModelStatus(); });
    $('#rememberAiKey').addEventListener('change', () => { persistAiKeyPreference(); saveAiSettings(); });
    $('#aiApiKey').addEventListener('change', persistAiKeyPreference);
    $('#aiApiKey').addEventListener('input', () => { if ($('#rememberAiKey').checked) persistAiKeyPreference(); });
    $('#clearAiKeyButton').addEventListener('click', () => { $('#aiApiKey').value = ''; $('#rememberAiKey').checked = false; persistAiKeyPreference(); saveAiSettings(); });
    $('#toggleAiKeyButton').addEventListener('click', () => {
      const input = $('#aiApiKey'); const reveal = input.type === 'password'; input.type = reveal ? 'text' : 'password'; $('#toggleAiKeyButton').textContent = reveal ? 'Hide' : 'Show';
    });
    $('#opencodeToken').addEventListener('input', () => {
      if ($('#opencodeToken').value.trim() !== openCodeVerifiedToken) invalidateOpenCodeVerification();
      updateOpenCodeTokenStorageState(); if ($('#rememberOpenCodeToken').checked) persistOpenCodeTokenPreference();
    });
    $('#rememberOpenCodeToken').addEventListener('change', () => { persistOpenCodeTokenPreference(); saveAiSettings(); });
    $('#clearOpenCodeTokenButton').addEventListener('click', () => { $('#opencodeToken').value = ''; $('#rememberOpenCodeToken').checked = false; persistOpenCodeTokenPreference(); saveAiSettings(); invalidateOpenCodeVerification(); });
    $('#toggleOpenCodeTokenButton').addEventListener('click', () => {
      const input = $('#opencodeToken'); const reveal = input.type === 'password'; input.type = reveal ? 'text' : 'password'; $('#toggleOpenCodeTokenButton').textContent = reveal ? 'Hide' : 'Show';
    });
    $('#verifyOpenCodeTokenButton').addEventListener('click', verifyOpenCodeToken);
    $('#generateAiProjectButton').addEventListener('click', generateAiProject);
  }
  function invalidateOpenCodeVerification() {
    openCodeVerifiedToken = ''; verifiedOpenCodeModels = [];
    const select = $('#openCodeModelSelect'); select.replaceChildren(new Option('Verify token to load models', '')); select.disabled = true;
    $('#openCodeFamily').disabled = true;
    setOpenCodeVerifyStatus('Token changed. Verify it to load available models.'); updateOpenCodeGenerateState();
  }
  function setOpenCodeVerifyStatus(message, state = '') {
    const label = $('#openCodeVerifyStatus'); label.textContent = message; label.classList.toggle('error', state === 'error'); label.classList.toggle('success', state === 'success');
  }
  function detectOpenCodeFamily(modelID) {
    const family = openCodeFamilyFor(modelID);
    return family === 'unsupported' ? 'openai-chat' : family;
  }
  function fillOpenCodeModelSelect(models) {
    const select = $('#openCodeModelSelect');
    const usable = models.filter((model) => openCodeFamilyFor(model.id) !== 'unsupported');
    const order = ['openai-responses', 'anthropic', 'gemini', 'openai-chat'];
    const groups = new Map(order.map((family) => [family, []]));
    usable.forEach((model) => groups.get(openCodeFamilyFor(model.id)).push(model));
    select.replaceChildren();
    order.forEach((family) => {
      const entries = groups.get(family);
      if (!entries.length) return;
      const group = document.createElement('optgroup');
      group.label = familyLabel(family);
      entries.forEach((model) => group.appendChild(new Option(model.name, model.id)));
      select.appendChild(group);
    });
    return usable;
  }
  function updateOpenCodeModelStatus() {
    if (!openCodeVerifiedToken) return;
    const model = $('#openCodeModelSelect').value;
    if (!model) { setOpenCodeVerifyStatus(`Token verified · ${verifiedOpenCodeModels.length} models loaded.`, 'success'); return; }
    const chosen = $('#openCodeFamily').value;
    const family = chosen === 'auto' ? detectOpenCodeFamily(model) : chosen;
    setOpenCodeVerifyStatus(`Token verified · ${verifiedOpenCodeModels.length} models loaded · ${model} via ${familyLabel(family)}${chosen === 'auto' ? ' (auto)' : ' (manual)'}.`, 'success');
  }
  function updateOpenCodeGenerateState() {
    const button = $('#generateAiProjectButton'); if (!button) return;
    const needsOpenCodeModel = $('#aiConnectionMode').value === 'opencode-inference';
    const ready = !needsOpenCodeModel || (openCodeVerifiedToken && openCodeVerifiedToken === $('#opencodeToken').value.trim() && !!$('#openCodeModelSelect').value);
    button.disabled = aiGenerating || !ready;
  }
  async function verifyOpenCodeToken() {
    const token = $('#opencodeToken').value.trim();
    if (!token) { setOpenCodeVerifyStatus('Enter your OpenCode Inference service-account token.', 'error'); return; }
    const button = $('#verifyOpenCodeTokenButton'); button.disabled = true; button.textContent = 'Verifying…';
    setOpenCodeVerifyStatus('Contacting OpenCode Inference and loading its model list…');
    try {
      const response = await fetch('https://opencode.ai/inference/v1/models', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`OpenCode returned HTTP ${response.status}.`);
      const result = await response.json();
      const models = Array.isArray(result.data) ? result.data.filter((item) => item?.id).map((item) => ({ id: String(item.id), name: String(item.name || item.id) })) : [];
      if (!models.length) throw new Error('OpenCode returned no models. Check the token and try again.');
      openCodeVerifiedToken = token; verifiedOpenCodeModels = models;
      const select = $('#openCodeModelSelect');
      const usable = fillOpenCodeModelSelect(models);
      if (!usable.length) throw new Error('OpenCode returned only models that this app cannot call as a chat model.');
      select.disabled = false;
      preferredOpenCodeModel = usable.some((model) => model.id === preferredOpenCodeModel) ? preferredOpenCodeModel : usable[0].id;
      select.value = preferredOpenCodeModel;
      if (!['auto', 'openai-chat', 'openai-responses', 'anthropic', 'gemini'].includes($('#openCodeFamily').value)) $('#openCodeFamily').value = 'auto';
      preferredOpenCodeFamily = $('#openCodeFamily').value;
      $('#openCodeFamily').disabled = false;
      updateOpenCodeModelStatus();
      saveAiSettings(); updateOpenCodeGenerateState();
    } catch (error) {
      invalidateOpenCodeVerification(); setOpenCodeVerifyStatus(`${error.message} Check connectivity, token, and browser CORS permission.`, 'error');
    } finally { button.disabled = false; button.textContent = 'Verify token & load models'; }
  }
  function familyLabel(family) { return ({ 'openai-chat': 'OpenAI Chat Completions', 'openai-responses': 'OpenAI Responses', anthropic: 'Anthropic Messages', gemini: 'Gemini' })[family] || family; }
  function baseApiUrl(raw, suffix) {
    const url = new URL(raw.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Enter an HTTP(S) API base URL without embedded credentials, query parameters, or fragments.');
    const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !localHost) throw new Error('Use HTTPS for remote API endpoints; plain HTTP is limited to localhost.');
    url.pathname = `${url.pathname.replace(/\/+$/, '')}${suffix}`;
    return url.toString();
  }
  async function generateAiProject() {
    if (aiGenerating) return;
    const userPrompt = buildAiPrompt(); if (!userPrompt) return;
    const button = $('#generateAiProjectButton'); aiGenerating = true; button.disabled = true; button.textContent = 'Generating…';
    $('#aiProjectResponse').value = '';
    updateAiLivePreview('');
    const openCode = $('#aiConnectionMode').value === 'opencode-inference';
    setAiValidation(openCode ? 'Sending the design brief to OpenCode Inference…' : 'Connecting directly to the configured API…');
    try {
      const output = openCode
        ? await generateThroughOpenCodeInference(userPrompt)
        : await generateThroughCompatibleApi(userPrompt);
      $('#aiProjectResponse').value = output;
      $('#aiProjectResponse').dispatchEvent(new Event('input', { bubbles: true }));
      setAiValidation('Response complete. Validating parts, footprints, nets, and routing…', 'success');
      validateAndLoadAiProject();
    } catch (error) {
      setAiValidation(`${error.message}\n\nNo project was loaded. Check the endpoint, model, credentials, and browser CORS permission, then retry.`, 'error');
    } finally { aiGenerating = false; button.textContent = 'Generate project with AI'; updateOpenCodeGenerateState(); }
  }
  function updateAiStream(text) {
    $('#aiProjectResponse').value = text;
    $('#aiProjectResponse').scrollTop = $('#aiProjectResponse').scrollHeight;
    const { components, nets } = updateAiLivePreview(text);
    setAiValidation(`Receiving AI response… ${text.length.toLocaleString()} characters · ${components} parts · ${nets} nets detected.`);
  }
  function extractCompleteJsonArrayObjects(source, property) {
    const marker = new RegExp(`"${property}"\\s*:\\s*\\[`).exec(source);
    if (!marker) return [];
    const startIndex = marker.index + marker[0].length;
    const result = []; let objectStart = -1, depth = 0, inString = false, escaped = false;
    for (let index = startIndex; index < source.length; index++) {
      const char = source[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; continue; }
      if (char === '{') { if (depth === 0) objectStart = index; depth++; continue; }
      if (char === '}') {
        depth--;
        if (depth === 0 && objectStart >= 0) {
          try { result.push(JSON.parse(source.slice(objectStart, index + 1))); } catch {}
          objectStart = -1;
        }
        continue;
      }
      if (char === ']' && depth === 0) break;
    }
    return result;
  }
  function updateAiLivePreview(source) {
    const components = extractCompleteJsonArrayObjects(source, 'components');
    const nets = extractCompleteJsonArrayObjects(source, 'nets');
    $('#aiLiveSummary').textContent = source ? `${components.length} part${components.length === 1 ? '' : 's'} · ${nets.length} net${nets.length === 1 ? '' : 's'} received` : 'Waiting for generated components…';
    const list = $('#aiLiveParts');
    if (!components.length) list.innerHTML = '<span class="ai-live-empty">New part records will appear here while the model streams.</span>';
    else {
      const cards = components.map((component) => `<div class="ai-live-part"><b>${esc(component.ref || component.id || 'Part')}</b><span>${esc(component.value || component.type || 'Component')}</span><small>${esc(component.footprint || component.type || '')}</small></div>`).join('');
      const netChips = nets.map((net) => `<span class="ai-live-net">${esc(net.name || 'unnamed net')}</span>`).join('');
      list.innerHTML = `${cards}${netChips}`;
    }
    return { components: components.length, nets: nets.length };
  }
  async function generateThroughCompatibleApi(userPrompt) {
    const endpoint = baseApiUrl($('#aiBaseUrl').value, '/chat/completions');
    const model = $('#aiModel').value.trim();
    if (!model) throw new Error('Enter a model ID for the selected API.');
    const key = $('#aiApiKey').value.trim();
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers.Authorization = `Bearer ${key}`;
    const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ model, stream: true, messages: [{ role: 'system', content: buildAiSystemPrompt() }, { role: 'user', content: userPrompt }] }) });
    if (!response.ok) { const detail = (await response.text()).slice(0, 500); throw new Error(`Provider returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`); }
    if (!(response.headers.get('content-type') || '').includes('text/event-stream') || !response.body?.getReader) {
      const result = await response.json(); const text = compatibleResponseText(result);
      if (!text) throw new Error('The API response did not contain assistant text.');
      updateAiStream(text); return text;
    }
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let output = ''; let finished = false;
    const consumeEvent = (event) => {
      const data = event.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
      if (!data || data === '[DONE]') { if (data === '[DONE]') finished = true; return; }
      let chunk; try { chunk = JSON.parse(data); } catch { return; }
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') { output += delta; updateAiStream(output); }
      else if (Array.isArray(delta)) { const text = delta.map((part) => part.text || '').join(''); output += text; if (text) updateAiStream(output); }
    };
    while (!finished) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }); buffer = buffer.replace(/\r\n/g, '\n');
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) { consumeEvent(buffer.slice(0, boundary)); buffer = buffer.slice(boundary + 2); if (finished) break; }
    }
    buffer += decoder.decode(); if (buffer.trim()) consumeEvent(buffer);
    if (!output.trim()) throw new Error('The API stream ended without generated text.');
    return output;
  }
  function compatibleResponseText(result) {
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map((part) => part.text || '').join('');
    return '';
  }
  const OPENCODE_ORIGIN = 'https://opencode.ai';
  const OPENCODE_SYSTEM_HINT = 'The requested output must be one complete JSON object for Circuit Studio. Reply with JSON only, without commentary or markdown fences.';
  const OPENCODE_UNSUPPORTED = /^jev-/;
  const OPENCODE_FAMILY_RULES = [
    { family: 'gemini', test: /^gemini-/ },
    { family: 'anthropic', test: /^claude-/ },
    { family: 'openai-responses', test: /^(gpt|grok|muse-spark)-/ },
    { family: 'anthropic', test: /^qwen3\.(?:[567]-|8-flash)/ },
    { family: 'openai-chat', test: /^qwen3\.8-max/ },
  ];
  function openCodeFamilyFor(modelID) {
    if (OPENCODE_UNSUPPORTED.test(String(modelID).toLowerCase())) return 'unsupported';
    const rule = OPENCODE_FAMILY_RULES.find((entry) => entry.test.test(String(modelID).toLowerCase()));
    return rule ? rule.family : 'openai-chat';
  }
  function openCodeEndpointURL(target) {
    const proxy = $('#openCodeProxyUrl').value.trim();
    if (!proxy) throw new Error('OpenCode generation needs a CORS proxy URL. OpenCode sends no CORS headers for generation, so a browser cannot call it from this page. Deploy the Worker in proxy/opencode-cors-worker.js and paste its URL here.');
    const url = new URL(proxy);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Enter a plain HTTPS CORS proxy URL without credentials, query parameters, or fragments.');
    const [path, search = ''] = target.split('?');
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/${path}`;
    url.search = search;
    return url.toString();
  }
  function openCodeInferenceRequest(userPrompt) {
    const token = $('#opencodeToken').value.trim();
    if (!token || token !== openCodeVerifiedToken) throw new Error('Verify your OpenCode Inference token before generating, then select a model.');
    const model = $('#openCodeModelSelect').value;
    if (!model) throw new Error('Select a verified OpenCode model before generating.');
    const family = $('#openCodeFamily').value === 'auto' ? detectOpenCodeFamily(model) : $('#openCodeFamily').value;
    if (!['openai-chat', 'openai-responses', 'anthropic', 'gemini'].includes(family)) throw new Error('Choose a valid OpenCode API family.');
    const system = `${buildAiSystemPrompt()}\n\n${OPENCODE_SYSTEM_HINT}`;
    const user = `${userPrompt}`;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'text/event-stream' };
    const orgId = $('#opencodeOrgId').value.trim();
    if (orgId) headers['x-opencode-org-id'] = orgId;
    if (family === 'openai-chat') return {
      family, model, headers,
      url: openCodeEndpointURL('inference/openai/v1/chat/completions'),
      body: { model, stream: true, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] },
    };
    if (family === 'openai-responses') return {
      family, model, headers,
      url: openCodeEndpointURL('inference/openai/v1/responses'),
      body: { model, stream: true, instructions: system, input: [{ role: 'user', content: [{ type: 'input_text', text: user }] }] },
    };
    if (family === 'anthropic') return {
      family, model, headers: { ...headers, 'anthropic-version': '2023-06-01' },
      url: openCodeEndpointURL('inference/anthropic/v1/messages'),
      body: { model, stream: true, max_tokens: 16000, system, messages: [{ role: 'user', content: user }] },
    };
    return {
      family, model, headers,
      url: openCodeEndpointURL(`inference/google/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`),
      body: { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }] },
    };
  }
  function openCodeDeltaText(chunk, family) {
    if (family === 'openai-chat') {
      const delta = chunk?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') return delta;
      if (Array.isArray(delta)) return delta.map((part) => part.text || '').join('');
      return '';
    }
    if (family === 'openai-responses') {
      if (chunk?.type === 'response.output_text.delta' && typeof chunk.delta === 'string') return chunk.delta;
      if (chunk?.type === 'response.completed' && typeof chunk.response?.output_text === 'string') return '';
      return '';
    }
    if (family === 'anthropic') {
      if (chunk?.type === 'content_block_delta' && typeof chunk.delta?.text === 'string') return chunk.delta.text;
      return '';
    }
    const parts = chunk?.candidates?.[0]?.content?.parts;
    return Array.isArray(parts) ? parts.map((part) => part.text || '').join('') : '';
  }
  function openCodeWholeResponseText(result, family) {
    if (family === 'openai-chat') return compatibleResponseText(result);
    if (family === 'openai-responses') return typeof result?.output_text === 'string' ? result.output_text : (result?.output || []).flatMap((item) => item.content || []).map((part) => part.text || '').join('');
    if (family === 'anthropic') return (result?.content || []).map((part) => part.text || '').join('');
    return (result?.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('');
  }
  function openCodeGeminiBulkText(raw) {
    const fromChunks = raw.split('\n').map((line) => line.trim().replace(/^data:\s*/, '')).filter(Boolean).flatMap((line) => {
      try { const parsed = JSON.parse(line); return Array.isArray(parsed) ? parsed : [parsed]; } catch { return []; }
    });
    const text = fromChunks.map((chunk) => openCodeDeltaText(chunk, 'gemini')).join('');
    if (text) return text;
    return [...raw.matchAll(/"text"\s*:\s*("(?:[^"\\]|\\.)*")/g)].map((match) => { try { return JSON.parse(match[1]); } catch { return ''; } }).join('');
  }
  async function generateThroughOpenCodeInference(userPrompt) {
    const request = openCodeInferenceRequest(userPrompt);
    setAiValidation(`Generating with OpenCode Inference · ${request.model} · ${familyLabel(request.family)}…`);
    let response;
    try { response = await fetch(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(request.body) }); }
    catch (error) { throw new Error(`Could not reach the OpenCode endpoint (${error.message}). Check the CORS proxy URL, that it is deployed, and that it allows this site. See the "Why a proxy?" note in the OpenCode panel.`); }
    if (!response.ok) { const detail = (await response.text()).slice(0, 500); throw new Error(`OpenCode Inference returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`); }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream') || !response.body?.getReader) {
      const raw = await response.text();
      let text = '';
      try { text = openCodeWholeResponseText(JSON.parse(raw), request.family); } catch { text = ''; }
      if (!text.trim() && request.family === 'gemini') text = openCodeGeminiBulkText(raw);
      if (!text.trim()) throw new Error('OpenCode Inference returned no assistant text.');
      updateAiStream(text); return text;
    }
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let output = ''; let stopped = false;
    const consumeEvent = (event) => {
      const data = event.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
      if (!data || data === '[DONE]') { if (data === '[DONE]') stopped = true; return; }
      let chunk; try { chunk = JSON.parse(data); } catch { return; }
      if (request.family === 'openai-responses' && (chunk?.type === 'response.failed' || chunk?.type === 'response.error')) {
        const detail = chunk.response?.error?.message || chunk.message || 'unknown streaming error';
        throw new Error(`OpenCode Inference stream error: ${detail}`);
      }
      if (request.family === 'anthropic' && chunk?.type === 'error') throw new Error(`OpenCode Inference stream error: ${chunk.error?.message || 'unknown streaming error'}`);
      const delta = openCodeDeltaText(chunk, request.family);
      if (delta) { output += delta; updateAiStream(output); }
    };
    while (!stopped) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }); buffer = buffer.replace(/\r\n/g, '\n');
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) { consumeEvent(buffer.slice(0, boundary)); buffer = buffer.slice(boundary + 2); if (stopped) break; }
    }
    buffer += decoder.decode(); if (buffer.trim()) consumeEvent(buffer);
    if (!output.trim()) throw new Error('The OpenCode Inference stream ended without generated text.');
    return output;
  }
  function validateAndLoadAiProject() {
    const source = $('#aiProjectResponse').value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let candidate;
    try { candidate = JSON.parse(source); }
    catch (error) { setAiValidation(`Could not parse JSON: ${error.message}`, 'error'); return; }
    const issues = validateGeneratedProject(candidate);
    if (issues.length) { setAiValidation(`Project needs fixes:\n• ${issues.slice(0, 8).join('\n• ')}${issues.length > 8 ? `\n• …and ${issues.length - 8} more` : ''}`, 'error'); return; }
    saveHistory(); project = normalizeProject(candidate); selected = null; checks = []; inspectorTab = 'properties'; activeView = 'schematic'; setSaved(); render(); $('#aiDialog').close();
    showToast('AI-generated project loaded');
  }
  $('#aiBuildButton').addEventListener('click', () => { setAiValidation('The validator checks part types, footprints, pad-to-net references, board dimensions and routed-net endpoints.'); $('#aiDialog').showModal(); $('#designBrief').focus(); });
  $('#aiCloseButton').addEventListener('click', () => $('#aiDialog').close());
  $('#copyAiPromptButton').addEventListener('click', copyAiPrompt);
  $('#validateAiProjectButton').addEventListener('click', validateAndLoadAiProject);
  $('#aiDialog').addEventListener('click', (event) => { if (event.target === $('#aiDialog')) $('#aiDialog').close(); });

  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  function setZoom(next) { zoom = Math.max(50, Math.min(150, next)); svg.style.transform = `scale(${zoom / 100})`; svg.style.transformOrigin = 'center center'; boardSvg.style.transform = `scale(${zoom / 100})`; boardSvg.style.transformOrigin = 'center center'; $('#zoomLabel').textContent = `${zoom}%`; }

  document.querySelectorAll('.tool-button[data-tool]').forEach((button) => button.addEventListener('click', () => setTool(button.dataset.tool)));
  $('#componentSearch').addEventListener('input', renderLibrary);
  $('#saveButton').addEventListener('click', saveProject); $('#shareButton').addEventListener('click', saveProject);
  $('#exportButton').addEventListener('click', exportSvg);
  $('#openButton').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', (event) => { if (event.target.files[0]) loadProject(event.target.files[0]); });
  $('#newProjectButton').addEventListener('click', () => { if (confirm('Start a new PCB project? You can save the current project first.')) { saveHistory(); project = { format: 'circuit-studio', version: 2, name: 'Untitled PCB project', units: 'mm', design: { revision: 'A', layers: ['F.Cu', 'B.Cu'] }, schematic: { width: 1200, height: 700 }, components: [], nets: [], wires: [], board: { width: 76, height: 52, layers: ['F.Cu', 'B.Cu'], tracks: [], vias: [], keepouts: [], mountingHoles: [] }, annotations: [] }; selected = null; checks = []; activeView = 'schematic'; setSaved(); render(); } });
  $('#undoButton').addEventListener('click', () => restoreHistory(undoStack, redoStack)); $('#redoButton').addEventListener('click', () => restoreHistory(redoStack, undoStack));
  $('#deleteButton').addEventListener('click', removeSelected);
  $('#runChecksButton').addEventListener('click', () => activeView === 'board' ? runBoardChecks() : runChecks()); $('#propertiesCheckButton').addEventListener('click', () => activeView === 'board' ? runBoardChecks() : runChecks());
  $('#zoomInButton').addEventListener('click', () => setZoom(zoom + 10)); $('#zoomOutButton').addEventListener('click', () => setZoom(zoom - 10)); $('#fitButton').addEventListener('click', () => setZoom(100));
  $('#textToolButton').addEventListener('click', () => showToast('Double-click an empty area of the sheet to add a note'));
  document.querySelectorAll('.inspector-tab').forEach((tab) => tab.addEventListener('click', () => { inspectorTab = tab.dataset.inspector; document.querySelectorAll('.inspector-tab').forEach((item) => item.classList.toggle('active', item === tab)); renderInspector(); }));
  document.querySelectorAll('.tab[data-view]').forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));
  document.querySelectorAll('.board-layer-toggle button').forEach((button) => button.addEventListener('click', () => { activeCopperLayer = button.dataset.layer; document.querySelectorAll('.board-layer-toggle button').forEach((item) => item.classList.toggle('active', item === button)); renderBoard(); updateView(); }));
  bindAiSettings();
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input,textarea,select')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); restoreHistory(event.shiftKey ? redoStack : undoStack, event.shiftKey ? undoStack : redoStack); return; }
    if (event.key === 'Delete' || event.key === 'Backspace') removeSelected();
    if (event.key.toLowerCase() === 'v') setTool('select'); if (event.key.toLowerCase() === 'w') setTool('wire');
    if (event.key === 'Escape') { pendingWire = null; renderWires(); setTool('select'); }
    if (event.key === '/') { event.preventDefault(); $('#componentSearch').focus(); }
  });

  renderLibrary(); render(); updateHistoryButtons();
  const startupParams = new URLSearchParams(window.location.search);
  if (startupParams.get('checks') === 'board' && !startupParams.get('project')) runBoardChecks();
  if (startupParams.get('ai') === '1') $('#aiDialog').showModal();
  loadProjectFromUrl();
  // Arrow marker shared by the LED symbol.
  const marker = node('marker', { id: 'arrowHead', markerWidth: 5, markerHeight: 5, refX: 4, refY: 2.5, orient: 'auto', markerUnits: 'strokeWidth' });
  marker.append(node('path', { d: 'M0,0 L5,2.5 L0,5', fill: 'none', stroke: '#2f3d47', 'stroke-width': 1 }));
  svg.querySelector('defs').append(marker);
})();
