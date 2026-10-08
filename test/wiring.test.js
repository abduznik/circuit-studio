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
