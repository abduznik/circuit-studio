# AI design workflow

Circuit Studio is intentionally easy to use with a coding assistant or LLM. The app's **Build with AI** dialog creates a prompt from the user's design brief, supported component/pin inventory, footprint IDs, and—when editing—a snapshot of the open project. The AI returns a complete `.circuit.json` document that can be validated and loaded into the editor.

## User flow

1. Click **Build with AI** and describe the circuit, interfaces, power source, constraints, and desired board size.
2. Choose **Create a new PCB project** or **Modify the open project**.
3. Click **Copy design prompt** and paste it into the user's preferred AI assistant.
4. Ask for the complete JSON response, paste it into Circuit Studio, and click **Validate & load**.
5. Inspect the schematic and board, adjust placements/routes, run footprint/net checks, then save the `.circuit.json` project.

The handoff is provider-neutral and works without an API key. The assistant connection remains user-controlled; the editor does not transmit design data to a model provider.

## Project contract (version 2)

The project is a JSON object with `format: "circuit-studio"`, `version: 2`, millimetre board geometry, components, named nets, schematic layout, PCB layout, and assumptions.

### Components

Each component has a unique `id` and `ref`, a supported `type`, `value`, exact `footprint` library ID, and two placements:

```json
{
  "id": "U1",
  "type": "esp32",
  "ref": "U1",
  "value": "ESP32-WROOM-32E-N4",
  "footprint": "Espressif:ESP32-WROOM-32E",
  "schematic": { "x": 270, "y": 355, "rotation": 0 },
  "pcb": { "x": 18, "y": 27, "rotation": 0 }
}
```

Coordinates in `schematic` use the 1200×700 sheet space; `pcb` uses millimetres. Rotations are 0, 90, 180, or 270 degrees.

### Nets and physical pad assignments

`nets[].endpoints[]` connect a component ID and its actual symbol/footprint pad number. Pad numbers are strings. The schematic is regenerated from the netlist (`wires: []` is accepted). The same named net must own both endpoints of every copper track.

```json
{
  "name": "LCD_SCK",
  "class": "spi",
  "endpoints": [
    { "componentId": "U1", "pad": "30" },
    { "componentId": "J1", "pad": "3" }
  ]
}
```

### PCB routing

`board` declares width/height, enabled copper layers, tracks, vias, keepouts, and optional mounting holes. Tracks use millimetres and straight segments; `waypoints` are interior route points.

```json
{
  "net": "LCD_SCK",
  "layer": "F.Cu",
  "width": 0.25,
  "from": { "componentId": "U1", "pad": "30" },
  "to": { "componentId": "J1", "pad": "3" },
  "waypoints": [{ "x": 34, "y": 24 }, { "x": 34, "y": 15 }]
}
```

## Library contract

The prompt dynamically supplies component pin names, pad numbers, and footprint IDs from `app.js`. Currently board-ready types are:

- `esp32` — `Espressif:ESP32-WROOM-32E`
- `display` — `Connector_PinHeader_2.54mm:PinHeader_1x08_P2.54mm_Vertical`
- `connector` — `Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical`
- `resistor` — `Resistor_SMD:R_0603_1608Metric`
- `capacitor` — `Capacitor_SMD:C_0603_1608Metric`

Use only listed footprints unless the library is extended first. If the user's exact display, IC, connector, or package is missing, ask for the part number or use a clearly identified connector placeholder and record the assumption. Never infer a custom footprint from a generic part name.

## Validation boundary

**Validate & load** checks JSON syntax, version/type support, unique references and IDs, footprint availability, pad/net assignments, board extents, copper layers, and track endpoint/net agreement. These checks catch common AI output mistakes but do not perform geometric collision detection, clearance checks, full ERC, signal-integrity analysis, or fabrication DRC. Review datasheets and inspect the board in an engineering CAD tool before manufacturing.

## Guidance for future contributors

- Keep the project model serializable and deterministic; IDs, references, net names, and pad numbers should be stable.
- Add a library part's symbol, physical footprint/pads, pin map, source and license before advertising it as supported to AI prompts.
- Keep prompt inventory generated from the live library instead of maintaining a second hard-coded list.
- Extend validation alongside the schema whenever components, layers, pad properties, or routing objects are added.
- Treat model output as an editable design proposal; never imply a generated project passed a check that is not implemented.
