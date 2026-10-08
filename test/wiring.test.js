'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);

test('every script in index.html exists and parses', () => {
  assert.ok(scripts.length >= 4);
  for (const file of scripts) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotThrow(() => new vm.Script(source, { filename: file }), file);
  }
});

test('scripts load in dependency order: libraries before ai-panel.js before app.js', () => {
  const at = (name) => scripts.indexOf(name);
  assert.ok(at('opencode-core.js') >= 0 && at('board-review.js') >= 0);
  assert.ok(at('opencode-core.js') < at('ai-panel.js') && at('board-review.js') < at('ai-panel.js'));
  assert.ok(at('ai-panel.js') < at('app.js'));
});

test('every element id the AI panel looks up exists in index.html', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  for (const file of ['ai-panel.js']) { // app.js also builds inspector fields dynamically, so only the static panel is checked
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const used = [...source.matchAll(/\$\('#([A-Za-z][\w-]*)'\)/g)].map((m) => m[1]);
    const missing = [...new Set(used)].filter((id) => !ids.has(id));
    assert.deepEqual(missing, [], `${file} references ids that are not in index.html`);
  }
});

test('the validator rules the self-check mentions still exist in app.js (keep them in sync)', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  for (const fragment of ['a net needs at least two', 'assigned to multiple nets', 'is not declared', 'waypoint lies outside the board', 'is not enabled on the board']) assert.ok(app.includes(fragment), fragment);
});

test('LED and diode parts carry footprints and pad numbers so the AI can use them', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  for (const part of ['led', 'diode']) {
    const line = app.split('\n').find((l) => l.trim().startsWith(`${part}: {`));
    assert.ok(line && /footprint: '/.test(line) && (line.match(/pad: '/g) || []).length === 2, part);
  }
  assert.ok(app.includes("'LED_SMD:LED_0603_1608Metric'") && app.includes("'Diode_SMD:D_SOD-123'"));
});

test('the prompt example is generic and the contract tells the model to design only what was asked', () => {
  const panel = fs.readFileSync(path.join(root, 'ai-panel.js'), 'utf8');
  const example = panel.slice(panel.indexOf('const schemaExample'), panel.indexOf('annotations: [], assumptions'));
  assert.ok(example.length > 200);
  assert.ok(!/esp32|display|LCD_/i.test(example), 'models copy examples, so the example must not contain an MCU or display');
  assert.match(panel, /Design ONLY what the request asks for/);
  assert.match(panel, /If, and only if, you use the ESP32 part/);
});
