# Circuit Studio

A browser prototype for **PCB/electronics EDA**, with a schematic view and a custom PCB-layout view.

## Run

Open `index.html` in a current browser. No build or package installation is needed. The built-in example is the ESP32 + IPS display project.

To load the included project file instead, choose **Open** and select [`examples/esp32-st7789-ips.circuit.json`](examples/esp32-st7789-ips.circuit.json).

## ESP32 + ST7789 example

- `U1`: Espressif ESP32-WROOM-32E-N4 module, with its 38 castellated pads and nine exposed-ground land pads represented in the footprint.
- `J1`: generic 1×8, 2.54 mm header for an external LCDWIKI MSP1691/ST7789 display breakout.
- `J2`: regulated 3.3 V power input; add a stable supply rated for at least 500 mA.
- `R1`: 10 kΩ EN pull-up; `C1`/`C2`: 10 µF bulk and 100 nF bypass capacitors.
- SPI/control mapping: GPIO18→SCL/SCK, GPIO23→SDA/MOSI, GPIO17→RES, GPIO16→DC, GPIO5→CS. Display BLK is tied high to 3V3.
- Two-layer 76 × 52 mm board outline, mounting holes, F.Cu/B.Cu traces, vias and the module antenna keepout.

The display is treated as a breakout connected by a generic 1×8 header, not as a specific bare LCD/FPC assembly. Confirm that your module uses the listed pin order and 3.3 V supply before building hardware. The sample does not include a regulator, USB interface, or firmware. Its in-app checks validate footprint/pad/net references; they are not full PCB DRC or manufacturing sign-off.

## Editor interactions

- Switch between **Schematic** and **PCB layout** tabs.
- The sample uses named net labels at both ends of remote connections, keeping the ESP32/SPI schematic legible while retaining a shared electrical netlist. Label stubs are horizontal or vertical straight segments.
- In PCB view, switch F.Cu/B.Cu, drag footprints, double-click to rotate, and click a part to inspect its footprint and pad-to-net mapping.
- In schematic view, use `V` to select and `W` to connect symbol pins.
- **Save project** downloads a `.circuit.json` design file; **Open** loads that format. **Export SVG** exports the active view.
- **Build with AI** creates a provider-neutral prompt with the current pin and footprint inventory. Paste the assistant's JSON response back into the dialog to validate and load it.
- Undo/redo: `Ctrl/⌘+Z` and `Ctrl/⌘+Shift+Z`.

## Current model

Project JSON stores symbol instances, named electrical nets, pin-to-pad associations, board placements, copper-layer tracks, vias and keepouts. Footprint geometry is supplied by the current app library. The custom file is the editable source of truth; SVG export is for viewing/sharing.

For AI prompt structure, import checks and coding-assistant guidance, see [AI_WORKFLOW.md](AI_WORKFLOW.md).

## Reference data

- [Espressif ESP32-WROOM-32E datasheet](https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.pdf)
- [LCDWIKI MSP1691 1.69-inch ST7789 SPI module manual](https://www.lcdwiki.com/res/MSP1691/1.69inch_4-line-SPI_IPS_Module_MSP1691_User_Manual_EN.pdf)
- [Espressif's official KiCad ESP32-WROOM-32E footprint](https://github.com/espressif/kicad-libraries/blob/master/footprints/Espressif.pretty/ESP32-WROOM-32E.kicad_mod)
