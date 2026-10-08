/* AI design panel: prompt building, provider settings, OpenCode / OpenAI-compatible generation,
   and the post-load review notice. Wired to the editor through the `host` object given to init(). */
(function () {
  'use strict';
  window.CircuitAiPanel = {
    init(host) {
      const { $, esc, definitions, FOOTPRINTS } = host;
  let aiGenerating = false;
  let openCodeVerifiedToken = '';
  let verifiedOpenCodeModels = [];
  let preferredOpenCodeModel = '';
  let preferredOpenCodeFamily = 'auto';
  const AI_SETTINGS_KEY = 'circuit-studio.ai-settings.v1';
  const AI_KEY_STORAGE_KEY = 'circuit-studio.ai-key.v1';
  const AI_OPENCODE_TOKEN_KEY = 'circuit-studio.opencode-token.v1';
  const { OPENCODE_ORIGIN, extractCompleteJsonArrayObjects, compatibleResponseText, openCodeFamilyFor, openCodeModelsPath, openCodePathFor, openCodeExtraHeaders, openCodeThinkingParams, shouldRetryWithoutThinking, buildOpenCodeURL, openCodeDeltaText, openCodeReasoningText, openCodeWholeResponseText, openCodeGeminiBulkText, openCodeErrorDetail, isLikelyFreeModel, familyMismatchHint, readSseStream } = window.CircuitOpenCode;
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
    const existing = mode === 'modify' ? `\nCURRENT PROJECT JSON (modify this design and return the complete replacement project):\n${JSON.stringify(host.getProject(), null, 2)}\n` : '';
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
        host.showToast('Design prompt copied');
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
      if (saved.openCodePlan === 'go' || saved.openCodePlan === 'inference') $('#openCodePlan').value = saved.openCodePlan;
      if (saved.openCodeThinking === 'off' || saved.openCodeThinking === 'default') $('#openCodeThinking').value = saved.openCodeThinking;
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
      openCodePlan: $('#openCodePlan').value,
      openCodeThinking: $('#openCodeThinking').value,
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
        ? 'Your browser sends the verified token and prompt to OpenCode Inference, through a CORS proxy if one is used.'
        : 'Direct browser-to-provider connection. The selected API receives your prompt and, if entered, your key.';
  }
  function bindAiSettings() {
    loadAiSettings();
    $('#aiWorkflowMode').addEventListener('change', () => { updateAiWorkflowUi(); saveAiSettings(); });
    $('#aiConnectionMode').addEventListener('change', () => { updateAiConnectionUi(); saveAiSettings(); });
    ['aiBaseUrl', 'aiModel', 'opencodeOrgId', 'openCodeProxyUrl'].forEach((id) => $(`#${id}`).addEventListener('change', saveAiSettings));
    $('#openCodeModelSelect').addEventListener('change', () => { preferredOpenCodeModel = $('#openCodeModelSelect').value; saveAiSettings(); updateOpenCodeGenerateState(); updateOpenCodeModelStatus(); });
    $('#openCodeThinking').addEventListener('change', saveAiSettings);
    $('#openCodePlan').addEventListener('change', () => { saveAiSettings(); invalidateOpenCodeVerification(); });
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
  const openCodePlan = () => $('#openCodePlan').value;
  const openCodeSessionId = (window.crypto?.randomUUID?.() || `cs-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const freeTierApplies = () => openCodePlan() === 'inference';
  function detectOpenCodeFamily(modelID) {
    const family = openCodeFamilyFor(modelID, openCodePlan());
    return family === 'unsupported' ? 'openai-chat' : family;
  }
  function fillOpenCodeModelSelect(models) {
    const select = $('#openCodeModelSelect');
    const usable = models.filter((model) => openCodeFamilyFor(model.id, openCodePlan()) !== 'unsupported');
    const order = ['openai-responses', 'anthropic', 'gemini', 'openai-chat'];
    const groups = new Map(order.map((family) => [family, []]));
    usable.forEach((model) => groups.get(openCodeFamilyFor(model.id, openCodePlan())).push(model));
    select.replaceChildren();
    order.forEach((family) => {
      const entries = groups.get(family);
      if (!entries.length) return;
      const group = document.createElement('optgroup');
      group.label = familyLabel(family);
      entries.forEach((model) => group.appendChild(new Option(freeTierApplies() && isLikelyFreeModel(model.id) ? `${model.name} (free tier — app only)` : model.name, model.id)));
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
    const freeNote = freeTierApplies() && isLikelyFreeModel(model) ? ' Free-tier models only work inside the OpenCode app; pick a paid model.' : '';
    setOpenCodeVerifyStatus(`Token verified · ${verifiedOpenCodeModels.length} models loaded · ${model} via ${familyLabel(family)}${chosen === 'auto' ? ' (auto)' : ' (manual)'}.${freeNote}`, freeNote ? '' : 'success');
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
      const token = $('#opencodeToken').value.trim();
      const proxy = await resolveOpenCodeProxy();
      const send = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      let response;
      try { response = await send(proxy.url ? buildOpenCodeURL(proxy.url, openCodeModelsPath(openCodePlan())) : `${OPENCODE_ORIGIN}/${openCodeModelsPath(openCodePlan())}`); }
      catch (error) { if (!proxy.url) throw error; response = await send(buildOpenCodeURL(proxy.url, openCodeModelsPath(openCodePlan()))); }
      if (!response.ok) throw new Error(`OpenCode returned HTTP ${response.status}.`);
      const result = await response.json();
      const models = Array.isArray(result.data) ? result.data.filter((item) => item?.id).map((item) => ({ id: String(item.id), name: String(item.name || item.id) })) : [];
      if (!models.length) throw new Error('OpenCode returned no models. Check the token and try again.');
      openCodeVerifiedToken = token; verifiedOpenCodeModels = models;
      const select = $('#openCodeModelSelect');
      const usable = fillOpenCodeModelSelect(models);
      if (!usable.length) throw new Error('OpenCode returned only models that this app cannot call as a chat model.');
      select.disabled = false;
      preferredOpenCodeModel = usable.some((model) => model.id === preferredOpenCodeModel) ? preferredOpenCodeModel : (usable.find((model) => !(freeTierApplies() && isLikelyFreeModel(model.id))) || usable[0]).id;
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
    let output = '';
    await readSseStream(response, (data) => {
      let chunk; try { chunk = JSON.parse(data); } catch { return; }
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') { output += delta; updateAiStream(output); }
      else if (Array.isArray(delta)) { const text = delta.map((part) => part.text || '').join(''); output += text; if (text) updateAiStream(output); }
    });
    if (!output.trim()) throw new Error('The API stream ended without generated text.');
    return output;
  }
  const OPENCODE_SYSTEM_HINT = 'The requested output must be one complete JSON object for Circuit Studio. Reply with JSON only, without commentary or markdown fences.';
  let openCodeProxyCache = null;
  async function resolveOpenCodeProxy() {
    const typed = $('#openCodeProxyUrl').value.trim();
    if (typed) return { url: typed, source: 'your' };
    if (openCodeProxyCache) return openCodeProxyCache;
    let resolved = { url: '', source: 'none' };
    if (/^https?:$/.test(location.protocol)) {
      try {
        const health = await fetch('opencode-proxy/health', { cache: 'no-store' });
        if (health.ok && (await health.json()).proxy === 'circuit-studio-local') { openCodeProxyCache = { url: new URL('opencode-proxy', location.href).href, source: 'local' }; return openCodeProxyCache; }
      } catch { /* Not served by server.js. */ }
    }
    try {
      const response = await fetch('proxy/config.json', { cache: 'no-store' });
      if (response.ok) { const data = await response.json(); if (typeof data.proxyUrl === 'string' && data.proxyUrl.trim()) resolved = { url: data.proxyUrl.trim(), source: 'site' }; }
    } catch { /* No bundled proxy: generation falls back to a direct call. */ }
    openCodeProxyCache = resolved;
    return resolved;
  }
  async function openCodeInferenceRequest(userPrompt) {
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
    const proxy = await resolveOpenCodeProxy();
    const path = openCodePathFor(openCodePlan(), family, model);
    const body = family === 'gemini'
      ? { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }] }
      : family === 'openai-chat'
        ? { model, stream: true, ...openCodeThinkingParams(openCodePlan(), family, $('#openCodeThinking').value === 'off'), messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }
        : family === 'openai-responses'
          ? { model, stream: true, instructions: system, input: [{ role: 'user', content: [{ type: 'input_text', text: user }] }] }
          : { model, stream: true, max_tokens: 16000, system, messages: [{ role: 'user', content: user }] };
    Object.assign(headers, openCodeExtraHeaders(openCodePlan(), family, token, openCodeSessionId));
    return {
      family, model, headers, body, proxy, autoFamily: $('#openCodeFamily').value === 'auto',
      directUrl: buildOpenCodeURL(OPENCODE_ORIGIN, path),
      proxyUrl: proxy.url ? buildOpenCodeURL(proxy.url, path) : '',
    };
  }
  async function sendOpenCodeRequest(request) {
    const attempt = async (url) => {
      const post = (body) => fetch(url, { method: 'POST', headers: request.headers, body: JSON.stringify(body) });
      let response = await post(request.body);
      if (response.ok) return response;
      let raw = await response.text();
      // A model that rejects the reasoning-off parameter is retried once without it.
      if (request.body.reasoning_effort && shouldRetryWithoutThinking(response.status, raw)) {
        const { reasoning_effort: dropped, ...plain } = request.body;
        response = await post(plain);
        if (response.ok) return response;
        raw = await response.text();
      }
      return { error: `OpenCode Inference returned HTTP ${response.status}: ${openCodeErrorDetail(raw)}${response.status === 402 ? ' Add credits in the OpenCode Console (Billing); the token is valid but the account has no funds.' : ''}${familyMismatchHint(response.status, request.autoFamily)}` };
    };
    if (request.proxyUrl) return attempt(request.proxyUrl);
    try { return await attempt(request.directUrl); }
    catch (error) {
      if (!request.proxyUrl) throw new Error(`The browser could not read a response from OpenCode (${error.message}). OpenCode's inference endpoints send no CORS headers and return 404 to preflight requests, so a static page cannot call them directly — this is a known upstream bug (github.com/anomalyco/opencode/issues/31041). Generation needs a CORS proxy: the site can provide one, or paste your own URL in "CORS proxy URL".`);
      throw error;
    }
  }
  async function generateThroughOpenCodeInference(userPrompt) {
    const request = await openCodeInferenceRequest(userPrompt);
    const via = request.proxyUrl ? ({ site: "this site's CORS proxy", local: 'the local Circuit Studio server', your: 'your CORS proxy' })[request.proxy.source] : 'OpenCode directly';
    setAiValidation(`Generating with OpenCode Inference · ${request.model} · ${familyLabel(request.family)} · via ${via}…`);
    const outcome = await sendOpenCodeRequest(request);
    if (outcome.error) throw new Error(outcome.error);
    const response = outcome;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream') || !response.body?.getReader) {
      const raw = await response.text();
      let text = '';
      try { text = openCodeWholeResponseText(JSON.parse(raw), request.family); } catch { text = ''; }
      if (!text.trim() && request.family === 'gemini') text = openCodeGeminiBulkText(raw);
      if (!text.trim()) throw new Error('OpenCode Inference returned no assistant text.');
      updateAiStream(text); return text;
    }
    let output = ''; let reasoned = 0; let lastReasonNote = 0;
    await readSseStream(response, (data) => {
      let chunk; try { chunk = JSON.parse(data); } catch { return; }
      if (request.family === 'openai-responses' && (chunk?.type === 'response.failed' || chunk?.type === 'response.error')) {
        const detail = chunk.response?.error?.message || chunk.message || 'unknown streaming error';
        throw new Error(`OpenCode Inference stream error: ${detail}`);
      }
      if (request.family === 'anthropic' && chunk?.type === 'error') throw new Error(`OpenCode Inference stream error: ${chunk.error?.message || 'unknown streaming error'}`);
      const delta = openCodeDeltaText(chunk, request.family);
      if (delta) { output += delta; updateAiStream(output); }
      else if (!output) {
        const thought = openCodeReasoningText(chunk, request.family);
        if (thought) { reasoned += thought.length; if (reasoned - lastReasonNote >= 500) { lastReasonNote = reasoned; setAiValidation(`The model is reasoning before it answers (${reasoned.toLocaleString()} characters so far). The design JSON starts streaming when it finishes; reasoning models can take a minute or more.`); } }
      }
    });
    if (!output.trim()) throw new Error('The OpenCode Inference stream ended without generated text.');
    return output;
  }
  function validateAndLoadAiProject() {
    const source = $('#aiProjectResponse').value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let candidate;
    try { candidate = JSON.parse(source); }
    catch (error) { setAiValidation(`Could not parse JSON: ${error.message}`, 'error'); return; }
    const issues = host.validate(candidate);
    if (issues.length) { setAiValidation(`Project needs fixes:\n• ${issues.slice(0, 8).join('\n• ')}${issues.length > 8 ? `\n• …and ${issues.length - 8} more` : ''}`, 'error'); return; }
    const loaded = host.load(candidate); $('#aiDialog').close();
    showAiReviewNotice(loaded); host.host.showToast('AI-generated project loaded. Not DRC-checked; review before building');
  }
  function showAiReviewNotice(loaded) {
    const warnings = window.CircuitBoardReview.reviewBoard(loaded);
    const assumptions = (loaded.assumptions || []).filter((item) => typeof item === 'string' && item.trim());
    $('#aiReviewSummary').textContent = window.CircuitBoardReview.loadedSummary(loaded);
    const section = (title, items, cls) => items.length ? `<h3>${title}</h3><ul class="${cls}">${items.map((item) => `<li>${item}</li>`).join('')}</ul>` : '';
    $('#aiReviewBody').innerHTML = section('Heuristic warnings (not DRC)', warnings.map((w) => `<b>${esc(w.title)}</b> ${esc(w.detail)}`), 'warn') + section('Model assumptions', assumptions.map(esc), 'assume') + (assumptions.length ? '' : '<h3>Model assumptions</h3><p>The model listed none. Treat that as unverified, not as “nothing assumed”.</p>');
    $('#aiReviewNotice').hidden = false;
  }
  const hideAiReviewNotice = () => { $('#aiReviewNotice').hidden = true; };
  $('#aiReviewDismiss').addEventListener('click', hideAiReviewNotice);
  $('#aiBuildButton').addEventListener('click', () => { setAiValidation('The validator checks part types, footprints, pad-to-net references, board dimensions and routed-net endpoints.'); $('#aiDialog').showModal(); $('#designBrief').focus(); });
  $('#aiCloseButton').addEventListener('click', () => $('#aiDialog').close());
  $('#copyAiPromptButton').addEventListener('click', copyAiPrompt);
  $('#validateAiProjectButton').addEventListener('click', validateAndLoadAiProject);
  $('#aiDialog').addEventListener('click', (event) => { if (event.target === $('#aiDialog')) $('#aiDialog').close(); });
      bindAiSettings();
      return { hideReviewNotice: hideAiReviewNotice };
    },
  };
})();
