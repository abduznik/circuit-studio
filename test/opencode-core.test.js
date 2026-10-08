'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../opencode-core.js');

test('family routing follows the documented endpoint table (issue #6)', () => {
  const cases = {
    'gpt-5.1': 'openai-responses', 'grok-4': 'openai-responses', 'muse-spark-1.3': 'openai-responses',
    'claude-sonnet-4-5': 'anthropic', 'gemini-3-pro': 'gemini',
    'qwen3.6-plus': 'anthropic', 'qwen3.7-max': 'anthropic', 'qwen3.8-flash': 'anthropic',
    'qwen3.8-max': 'openai-chat',
    'kimi-k2': 'openai-chat', 'glm-4.6': 'openai-chat', 'deepseek-v3': 'openai-chat', 'totally-new-model': 'openai-chat',
    'jev-1': 'unsupported', 'JEV-2': 'unsupported',
  };
  for (const [model, family] of Object.entries(cases)) assert.equal(core.openCodeFamilyFor(model), family, model);
});

test('free-tier models are flagged, paid ones are not (issue #2)', () => {
  for (const id of ['big-pickle', 'space-bunny-free', 'mimo-v2', 'ling-1t', 'nemotron-3', 'longcat-flash', 'muse-spark-1.3-contributor-free']) assert.ok(core.isLikelyFreeModel(id), id);
  for (const id of ['gpt-5.1', 'claude-sonnet-4-5', 'kimi-k2', 'qwen3.8-max']) assert.ok(!core.isLikelyFreeModel(id), id);
});

test('buildOpenCodeURL builds direct and proxied URLs and rejects unsafe proxies', () => {
  assert.equal(core.buildOpenCodeURL(core.OPENCODE_ORIGIN, 'inference/v1/models'), 'https://opencode.ai/inference/v1/models');
  assert.equal(core.buildOpenCodeURL('https://p.example/w/', 'inference/google/v1beta/models/g:streamGenerateContent?alt=sse'), 'https://p.example/w/inference/google/v1beta/models/g:streamGenerateContent?alt=sse');
  assert.throws(() => core.buildOpenCodeURL('https://u:p@p.example', 'x'));
  assert.throws(() => core.buildOpenCodeURL('https://p.example?x=1', 'x'));
  assert.throws(() => core.buildOpenCodeURL('ftp://p.example', 'x'));
  assert.throws(() => core.buildOpenCodeURL('not a url', 'x'));
});

test('streaming delta extraction for each family', () => {
  assert.equal(core.openCodeDeltaText({ choices: [{ delta: { content: 'a' } }] }, 'openai-chat'), 'a');
  assert.equal(core.openCodeDeltaText({ choices: [{ delta: { content: [{ text: 'a' }, { text: 'b' }] } }] }, 'openai-chat'), 'ab');
  assert.equal(core.openCodeDeltaText({ type: 'response.output_text.delta', delta: 'x' }, 'openai-responses'), 'x');
  assert.equal(core.openCodeDeltaText({ type: 'response.completed', response: { output_text: 'full' } }, 'openai-responses'), '');
  assert.equal(core.openCodeDeltaText({ type: 'content_block_delta', delta: { text: 'y' } }, 'anthropic'), 'y');
  assert.equal(core.openCodeDeltaText({ type: 'ping' }, 'anthropic'), '');
  assert.equal(core.openCodeDeltaText({ candidates: [{ content: { parts: [{ text: 'g' }, { text: 'h' }] } }] }, 'gemini'), 'gh');
  assert.equal(core.openCodeDeltaText(null, 'gemini'), '');
});

test('non-streaming responses for each family', () => {
  assert.equal(core.openCodeWholeResponseText({ choices: [{ message: { content: 'c' } }] }, 'openai-chat'), 'c');
  assert.equal(core.openCodeWholeResponseText({ output_text: 'r' }, 'openai-responses'), 'r');
  assert.equal(core.openCodeWholeResponseText({ output: [{ content: [{ text: 'r1' }, { text: 'r2' }] }] }, 'openai-responses'), 'r1r2');
  assert.equal(core.openCodeWholeResponseText({ content: [{ text: 'a' }, { text: 'b' }] }, 'anthropic'), 'ab');
  assert.equal(core.openCodeWholeResponseText({ candidates: [{ content: { parts: [{ text: 'g' }] } }] }, 'gemini'), 'g');
});

test('Gemini bulk fallback handles chunked JSON arrays and raw text scraping', () => {
  const chunk = (t) => ({ candidates: [{ content: { parts: [{ text: t }] } }] });
  assert.equal(core.openCodeGeminiBulkText(JSON.stringify([chunk('a'), chunk('b')])), 'ab');
  assert.equal(core.openCodeGeminiBulkText(`data: ${JSON.stringify(chunk('x'))}\n\ndata: ${JSON.stringify(chunk('y'))}`), 'xy');
  assert.equal(core.openCodeGeminiBulkText('[{"foo":1,"text":"he said \\"hi\\""'), 'he said "hi"');
});

test('error details: FreeTierError is explained, others pass through (issue #2)', () => {
  const free = core.openCodeErrorDetail(JSON.stringify({ type: 'error', error: { type: 'FreeTierError', message: "OpenCode's free tier can only be used from within OpenCode" } }));
  assert.match(free, /paid model/);
  assert.equal(core.openCodeErrorDetail(JSON.stringify({ error: { message: 'bad key' } })), 'bad key');
  assert.equal(core.openCodeErrorDetail('plain text failure'), 'plain text failure');
  assert.equal(core.openCodeErrorDetail('x'.repeat(500)).length, 300);
});

test('extractCompleteJsonArrayObjects returns only finished objects, tolerating braces in strings', () => {
  const partial = '{"components":[{"ref":"R1","value":"a } b"},{"ref":"C1"},{"ref":"U1","val';
  assert.deepEqual(core.extractCompleteJsonArrayObjects(partial, 'components').map((c) => c.ref), ['R1', 'C1']);
  assert.deepEqual(core.extractCompleteJsonArrayObjects('{"nets":[]}', 'nets'), []);
  assert.deepEqual(core.extractCompleteJsonArrayObjects('{}', 'nets'), []);
});

test('family mismatch hint only appears for auto-detected families on rejection statuses (issue #6)', () => {
  assert.match(core.familyMismatchHint(404, true), /API FAMILY/);
  assert.match(core.familyMismatchHint(400, true), /API FAMILY/);
  assert.equal(core.familyMismatchHint(404, false), '');
  assert.equal(core.familyMismatchHint(401, true), '');
  assert.equal(core.familyMismatchHint(403, true), '');
});

const sseResponse = (...parts) => ({ body: new ReadableStream({ start(controller) { parts.forEach((p) => controller.enqueue(new TextEncoder().encode(p))); controller.close(); } }) });

test('readSseStream handles split chunks, CRLF, multi-line data, [DONE] and trailing unterminated events', async () => {
  const got = [];
  await core.readSseStream(sseResponse('data: {"a"', ':1}\r\n\r\nevent: x\ndata: l1\ndata: l2\n\n', 'data: [DONE]\n\ndata: after\n\n'), (d) => { got.push(d); });
  assert.deepEqual(got, ['{"a":1}', 'l1\nl2']);
  const tail = []; await core.readSseStream(sseResponse('data: one\n\ndata: two'), (d) => { tail.push(d); });
  assert.deepEqual(tail, ['one', 'two']);
});

test('readSseStream stops when the handler returns true and propagates handler errors', async () => {
  const got = []; await core.readSseStream(sseResponse('data: 1\n\ndata: 2\n\n'), (d) => { got.push(d); return true; });
  assert.deepEqual(got, ['1']);
  await assert.rejects(core.readSseStream(sseResponse('data: x\n\n'), () => { throw new Error('boom'); }), /boom/);
});

test('OpenCode Go routing differs from the Inference API where verified live', () => {
  const go = (m) => core.openCodeFamilyFor(m, 'go');
  assert.equal(go('gpt-6-luna'), 'openai-responses');
  assert.equal(go('grok-4.7'), 'openai-responses');
  assert.equal(go('claude-haiku-5-5'), 'anthropic');
  for (const m of ['glm-5.3-flash', 'kimi-k3', 'deepseek-v4-pro', 'omen-alpha', 'hy3', 'minimax-m3', 'qwen3.8-max', 'unknown-model']) assert.equal(go(m), 'openai-chat', m);
  assert.equal(core.openCodeFamilyFor('minimax-m3'), 'openai-chat'); // default plan keeps its own rules
  assert.equal(core.openCodeFamilyFor('qwen3.8-flash'), 'anthropic');
  assert.equal(go('jev-1'), 'unsupported');
});

test('plan-specific paths and extra headers', () => {
  assert.equal(core.openCodeModelsPath('go'), 'zen/go/v1/models');
  assert.equal(core.openCodeModelsPath('inference'), 'inference/v1/models');
  assert.equal(core.openCodePathFor('go', 'openai-chat', 'm'), 'zen/go/v1/chat/completions');
  assert.equal(core.openCodePathFor('go', 'openai-responses', 'm'), 'zen/go/v1/responses');
  assert.equal(core.openCodePathFor('go', 'anthropic', 'm'), 'zen/go/v1/messages');
  assert.equal(core.openCodePathFor('inference', 'gemini', 'g/1'), 'inference/google/v1beta/models/g%2F1:streamGenerateContent?alt=sse');
  assert.throws(() => core.openCodePathFor('go', 'gemini', 'g'), /no Gemini/);
  assert.throws(() => core.openCodePathFor('go', 'bogus', 'm'));
  assert.deepEqual(core.openCodeExtraHeaders('go', 'openai-chat', 'T', 'S'), { 'x-opencode-session': 'S' });
  assert.deepEqual(core.openCodeExtraHeaders('go', 'anthropic', 'T', 'S'), { 'x-opencode-session': 'S', 'anthropic-version': '2023-06-01', 'x-api-key': 'T' });
  assert.deepEqual(core.openCodeExtraHeaders('inference', 'anthropic', 'T', 'S'), { 'anthropic-version': '2023-06-01' });
  assert.deepEqual(core.openCodeExtraHeaders('inference', 'openai-chat', 'T', 'S'), {});
});

test('reasoning deltas are separated from answer text for each family', () => {
  assert.equal(core.openCodeReasoningText({ choices: [{ delta: { reasoning_content: 'think' } }] }, 'openai-chat'), 'think');
  assert.equal(core.openCodeReasoningText({ choices: [{ delta: { reasoning: 'k3' } }] }, 'openai-chat'), 'k3');
  assert.equal(core.openCodeDeltaText({ choices: [{ delta: { reasoning_content: 'think' } }] }, 'openai-chat'), '');
  assert.equal(core.openCodeReasoningText({ type: 'content_block_delta', delta: { thinking: 'hm' } }, 'anthropic'), 'hm');
  assert.equal(core.openCodeReasoningText({ type: 'response.reasoning_summary_text.delta', delta: 'r' }, 'openai-responses'), 'r');
  assert.equal(core.openCodeReasoningText({ choices: [{ delta: { content: 'a' } }] }, 'openai-chat'), '');
  assert.equal(core.openCodeReasoningText(null, 'gemini'), '');
});

test('thinking is switched off only where it is verified (Go chat), and only when asked', () => {
  assert.deepEqual(core.openCodeThinkingParams('go', 'openai-chat', true), { reasoning_effort: 'none' });
  assert.deepEqual(core.openCodeThinkingParams('go', 'openai-chat', false), {});
  assert.deepEqual(core.openCodeThinkingParams('go', 'anthropic', true), {});
  assert.deepEqual(core.openCodeThinkingParams('go', 'openai-responses', true), {});
  assert.deepEqual(core.openCodeThinkingParams('inference', 'openai-chat', true), {});
});

test('a 400 that blames the reasoning parameter is retried without it; other errors are not', () => {
  assert.ok(core.shouldRetryWithoutThinking(400, '{"error":"[unsupported_parameter] The request contains an unsupported parameter"}'));
  assert.ok(core.shouldRetryWithoutThinking(400, 'invalid request body: json: unknown field "reasoning_effort"'));
  assert.ok(!core.shouldRetryWithoutThinking(400, '{"error":"messages is required"}'));
  assert.ok(!core.shouldRetryWithoutThinking(401, 'unsupported_parameter'));
  assert.ok(!core.shouldRetryWithoutThinking(402, 'reasoning'));
});

test('repair request lists every problem and carries the previous response', () => {
  const text = core.buildRepairRequest(['Net LOAD_OUT: has 1 pad endpoint(s)', 'Component U9: bad footprint'], '{"nets":[]}');
  assert.match(text, /- Net LOAD_OUT: has 1 pad endpoint/);
  assert.match(text, /- Component U9: bad footprint/);
  assert.match(text, /at least two pad endpoints/);
  assert.ok(text.endsWith('{"nets":[]}'));
});

test('self-check checklist covers every rule the validator enforces', () => {
  const rules = [/at least TWO endpoints/, /unique id, unique ref/, /footprint from the supported list/, /No pad may appear in more than one net/, /SAME net/, /waypoint inside the board/, /F\.Cu/, /complete corrected JSON/];
  for (const rule of rules) assert.match(core.AI_SELF_CHECK, rule);
});

test('JSON syntax errors are described with a marked excerpt for repair', () => {
  const source = '{"id":"R6","type="resistor","ref":"R6"}';
  let message; try { JSON.parse(source); } catch (error) { message = error.message; }
  const text = core.describeJsonError(message, source);
  assert.match(text, /<<HERE>>/);
  assert.match(text, /"type=<<HERE>>|"type<<HERE>>=|type="<<HERE>>/);
  assert.match(core.describeJsonError('weird message', 'x'), /not valid JSON: weird message$/);
});
