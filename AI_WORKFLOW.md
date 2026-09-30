# AI design workflow

Circuit Studio's **Build with AI** dialog creates a prompt from the user's design brief, supported component/pin inventory, footprint IDs, and—when editing—a snapshot of the open project. The assistant returns a complete `.circuit.json` document that can be validated and loaded into the editor.

## User flow

1. Click **Build with AI** and describe the circuit, interfaces, power source, constraints, and desired board size.
2. Choose **Create a new PCB project** or **Modify the open project**.
3. Choose one of two methods:
   - **Copy/paste:** copy the generated prompt to an external assistant, then paste its JSON response into Circuit Studio and choose **Validate & load**.
   - **Direct API:** configure an OpenAI-compatible endpoint, or use the hosted OpenCode Inference API. Choose **Generate project with AI** to stream response text and progressively detected parts/nets into the live preview, validate it, and load it automatically when complete.
4. Inspect the schematic and board, adjust placements/routes, run footprint/net checks, then save the `.circuit.json` project.

Copy/paste works without an API key and makes no AI request from Circuit Studio. Direct API mode sends the prompt to the configured endpoint. For a direct OpenAI-compatible connection, Circuit Studio's browser sends the bearer API key to that endpoint; it never goes through a Circuit Studio backend. If **Remember key on this browser** is selected, the key is stored unencrypted in this browser's local storage and is not included in project files. Any script executing on the site origin can read browser local storage, so OpenAI recommends keeping API keys server-side. Do not use a high-privilege key in a public browser app.

## OpenCode Inference

OpenCode mode talks to OpenCode's hosted inference gateway at `https://opencode.ai/inference`. It does **not** use a local `opencode serve` session.

1. Paste a Console **service-account key** in the token field. An Org ID is only needed for a user session token, which also requires the `x-opencode-org-id` header.
2. Choose **Verify token & load models**. Circuit Studio calls `GET /inference/v1/models` with `Authorization: Bearer <token>`. A `401`/`403` clears the model list and reports the HTTP status; a network error is reported as a connectivity/CORS problem. Editing or clearing the token invalidates verification, so a model can only be chosen after a successful check.
3. Pick a model. The list is grouped by the API family OpenCode serves that model with, and the status line shows the resolved endpoint. **API FAMILY** overrides the detected family if OpenCode adds a model that the app cannot classify yet.
4. Paste a CORS proxy URL (see below) and choose **Generate project with AI**.

| Family | Endpoint | Request shape | Stream text |
| --- | --- | --- | --- |
| OpenAI Chat Completions | `POST /inference/openai/v1/chat/completions` | `model`, `messages`, `stream` | `choices[0].delta.content` |
| OpenAI Responses | `POST /inference/openai/v1/responses` | `model`, `instructions`, `input`, `stream` | `response.output_text.delta` events |
| Anthropic Messages | `POST /inference/anthropic/v1/messages` | `model`, `max_tokens` (required), `system`, `messages`, `stream` | `content_block_delta` events with `delta.text` |
| Gemini | `POST /inference/google/v1beta/models/<model>:streamGenerateContent?alt=sse` | `systemInstruction`, `contents` | `candidates[0].content.parts[].text` |

Family detection follows OpenCode's published endpoint table, which is *not* a simple prefix rule: `grok-*` and `muse-spark-*` use Responses, `qwen3.6-plus`/`qwen3.7-*`/`qwen3.8-flash` use Anthropic Messages, but `qwen3.8-max` uses Chat Completions, and `kimi-*`, `glm-*`, `minimax-*`, `deepseek-*`, and the free models use Chat Completions. `jev-*` models use OpenCode's System One endpoint and are filtered out of the list because they do not return text. Non-streaming JSON responses are supported as a fallback, including a chunked-array shape for Gemini.

### CORS proxy (required for generation)

`GET /inference/v1/models` sends `Access-Control-Allow-Origin: *`, so token verification and the model list work straight from the browser. The generation endpoints send no CORS headers and their `OPTIONS` preflight returns `404`, so a static page **cannot** call them directly. `proxy/opencode-cors-worker.js` is a ready-to-deploy Cloudflare Worker that forwards the four generation paths to `https://opencode.ai` and adds CORS headers, streaming responses included.

1. Sign in at <https://dash.cloudflare.com>, create a Worker, and replace the generated code with `proxy/opencode-cors-worker.js`.
2. Deploy it and paste the worker URL into **CORS proxy URL**. The worker allow-lists upstream paths, so it cannot be used as an open relay.

The worker sees the OpenCode token, so deploy it yourself and keep it private. Nothing is sent through a Circuit Studio backend; requests go from the browser to the proxy to OpenCode.


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

The live API flow uses an HTTP `POST` to `/v1/chat/completions` with streaming enabled for OpenAI-compatible endpoints, and to the matching OpenCode family endpoint for OpenCode mode. Both stream generated text and completed component/net records into the live preview; the full board is loaded after the JSON response passes validation. A non-streaming JSON response is also accepted.

## Guidance for future contributors

- Keep the project model serializable and deterministic; IDs, references, net names, and pad numbers should be stable.
- Add a library part's symbol, physical footprint/pads, pin map, source and license before advertising it as supported to AI prompts.
- Keep prompt inventory generated from the live library instead of maintaining a second hard-coded list.
- Extend validation alongside the schema whenever components, layers, pad properties, or routing objects are added.
- Treat model output as an editable design proposal; never imply a generated project passed a check that is not implemented.

## Provider references

- [OpenAI API authentication and key handling](https://platform.openai.com/docs/api-reference/responses#authentication)
- [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create)
- [OpenCode Inference API](https://opencode.ai/v2/docs/console/inference)
- [OpenCode Console model endpoints and pricing](https://opencode.ai/v2/docs/console/models)
