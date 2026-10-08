/* Pure OpenCode / AI-response helpers shared by app.js (browser) and the node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CircuitOpenCode = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const OPENCODE_ORIGIN = 'https://opencode.ai';
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

  function compatibleResponseText(result) {
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map((part) => part.text || '').join('');
    return '';
  }

  const OPENCODE_UNSUPPORTED = /^jev-/;
  const OPENCODE_FAMILY_RULES = [
    { family: 'gemini', test: /^gemini-/ },
    { family: 'anthropic', test: /^claude-/ },
    { family: 'openai-responses', test: /^(gpt|grok|muse-spark)-/ },
    { family: 'anthropic', test: /^qwen3\.(?:[567]-|8-flash)/ },
    { family: 'openai-chat', test: /^qwen3\.8-max/ },
  ];
  // OpenCode Go (subscription) serves a different endpoint set. Verified live against /zen/go/v1:
  // gpt-* is Responses-only, claude-* is Messages-only, everything else (including qwen3.8-max and
  // minimax-m3, which accept both) is reliable on Chat Completions.
  const OPENCODE_GO_FAMILY_RULES = [
    { family: 'anthropic', test: /^claude-/ },
    { family: 'openai-responses', test: /^(gpt|grok|muse-spark)-/ },
  ];
  const OPENCODE_PLANS = {
    inference: {
      label: 'OpenCode Inference API (Console credits)',
      modelsPath: 'inference/v1/models',
      paths: { 'openai-chat': 'inference/openai/v1/chat/completions', 'openai-responses': 'inference/openai/v1/responses', anthropic: 'inference/anthropic/v1/messages' },
    },
    go: {
      label: 'OpenCode Go (subscription)',
      modelsPath: 'zen/go/v1/models',
      paths: { 'openai-chat': 'zen/go/v1/chat/completions', 'openai-responses': 'zen/go/v1/responses', anthropic: 'zen/go/v1/messages' },
    },
  };
  function openCodeFamilyFor(modelID, plan = 'inference') {
    const id = String(modelID).toLowerCase();
    if (OPENCODE_UNSUPPORTED.test(id)) return 'unsupported';
    const rules = plan === 'go' ? OPENCODE_GO_FAMILY_RULES : OPENCODE_FAMILY_RULES;
    const rule = rules.find((entry) => entry.test.test(id));
    return rule ? rule.family : 'openai-chat';
  }
  function openCodeModelsPath(plan) { return (OPENCODE_PLANS[plan] || OPENCODE_PLANS.inference).modelsPath; }
  /** Upstream path for a request. Gemini exists only on the Inference API. */
  function openCodePathFor(plan, family, model) {
    const config = OPENCODE_PLANS[plan] || OPENCODE_PLANS.inference;
    if (family === 'gemini') {
      if (plan === 'go') throw new Error('OpenCode Go has no Gemini endpoint. Choose another API family or model.');
      return `inference/google/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
    }
    const path = config.paths[family];
    if (!path) throw new Error(`Unknown OpenCode API family: ${family}`);
    return path;
  }
  /** Headers the plan requires beyond content type and bearer auth. */
  function openCodeExtraHeaders(plan, family, token, sessionId) {
    if (plan !== 'go') return family === 'anthropic' ? { 'anthropic-version': '2023-06-01' } : {};
    const headers = { 'x-opencode-session': sessionId };
    if (family === 'anthropic') { headers['anthropic-version'] = '2023-06-01'; headers['x-api-key'] = token; }
    return headers;
  }
  function buildOpenCodeURL(base, target) {
    const [path, search = ''] = target.split('?');
    if (base === OPENCODE_ORIGIN) return `${OPENCODE_ORIGIN}/${path}${search ? `?${search}` : ''}`;
    const url = new URL(base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Enter a plain HTTPS CORS proxy URL without credentials, query parameters, or fragments.');
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/${path}`;
    url.search = search;
    return url.toString();
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
  function openCodeErrorDetail(raw) {
    try {
      const data = JSON.parse(raw);
      const error = data?.error || data;
      const type = error?.type || data?.type || '';
      const message = error?.message || data?.message || '';
      if (type === 'FreeTierError' || /free tier/i.test(message)) return `${message} Pick a paid model and add credits in the OpenCode Console; free models are reserved for the OpenCode app.`;
      return message || raw.slice(0, 300);
    } catch { return raw.slice(0, 300); }
  }

  // Models OpenCode reserves for its own app (issue #2). Curated from the pricing docs; the
  // runtime FreeTierError handling stays the source of truth, this only warns early.
  const OPENCODE_FREE_MODELS = /^(big-pickle$|.*-free$|mimo-|ling-|nemotron-|longcat-)/;
  function isLikelyFreeModel(modelID) { return OPENCODE_FREE_MODELS.test(String(modelID).toLowerCase()); }
  // Reads a Server-Sent Events body; calls onData(dataString) per event, stops when it returns true or on [DONE].
  async function readSseStream(response, onData) {
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let stopped = false;
    const consume = (event) => {
      const data = event.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
      if (!data) return;
      if (data === '[DONE]') { stopped = true; return; }
      if (onData(data)) stopped = true;
    };
    while (!stopped) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }); buffer = buffer.replace(/\r\n/g, '\n');
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) { consume(buffer.slice(0, boundary)); buffer = buffer.slice(boundary + 2); if (stopped) break; }
    }
    buffer += decoder.decode(); if (!stopped && buffer.trim()) consume(buffer.replace(/\r\n/g, '\n'));
  }
  // When auto-detect guessed the family and the endpoint rejects the model (issue #6), point at the manual override.
  function familyMismatchHint(status, autoDetected) {
    return autoDetected && [400, 404, 422].includes(status) ? ' The API family was auto-detected and may be wrong for this model: try another family in "API FAMILY".' : '';
  }
  return { OPENCODE_PLANS, openCodeModelsPath, openCodePathFor, openCodeExtraHeaders, readSseStream, familyMismatchHint, OPENCODE_ORIGIN, extractCompleteJsonArrayObjects, compatibleResponseText, openCodeFamilyFor, buildOpenCodeURL, openCodeDeltaText, openCodeWholeResponseText, openCodeGeminiBulkText, openCodeErrorDetail, isLikelyFreeModel };
});
