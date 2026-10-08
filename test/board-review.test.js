'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { reviewBoard, loadedSummary, segmentsCross, NOT_CHECKED } = require('../board-review.js');

const track = (net, layer, waypoints) => ({ net, layer, waypoints });
const base = (extra = {}) => ({ components: [], nets: [], board: { width: 50, height: 40, tracks: [], vias: [], ...extra } });

test('segment crossing ignores touching ends and parallel lines', () => {
  assert.ok(segmentsCross({ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }, { x: 4, y: 0 }));
  assert.ok(!segmentsCross({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 1 }, { x: 4, y: 1 }));
  assert.ok(!segmentsCross({ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 0 }));
});

test('flags unrouted nets and stray vias', () => {
  const project = base({ tracks: [track('A', 'F.Cu', [])], vias: [{ x: 1, y: 1, net: 'B' }] });
  project.nets = [{ name: 'A', endpoints: [1, 2] }, { name: 'B', endpoints: [1, 2] }, { name: 'S', endpoints: [1] }];
  const titles = reviewBoard(project).map((w) => w.title);
  assert.ok(titles.some((t) => /1 net has no routed track/.test(t)));
  assert.ok(titles.some((t) => /1 via on a net with no track/.test(t)));
});

test('flags crossings only for different nets on the same layer', () => {
  const x = (n1, l1, n2, l2) => reviewBoard(base({ tracks: [track(n1, l1, [{ x: 0, y: 0 }, { x: 10, y: 10 }]), track(n2, l2, [{ x: 0, y: 10 }, { x: 10, y: 0 }])] })).filter((w) => /crossing/.test(w.title)).length;
  assert.equal(x('A', 'F.Cu', 'B', 'F.Cu'), 1);
  assert.equal(x('A', 'F.Cu', 'A', 'F.Cu'), 0);
  assert.equal(x('A', 'F.Cu', 'B', 'B.Cu'), 0);
});

test('flags parts outside the outline and survives malformed input', () => {
  const project = base(); project.components = [{ ref: 'U9', pcb: { x: 99, y: 1 } }];
  assert.match(reviewBoard(project)[0].detail, /U9/);
  for (const bad of [null, undefined, {}, { board: { tracks: [{ waypoints: [null, { x: 'a' }] }] } }]) assert.doesNotThrow(() => reviewBoard(bad));
});

test('the bundled example reviews without throwing and the summary admits its limits', () => {
  const example = JSON.parse(fs.readFileSync(`${__dirname}/../examples/esp32-st7789-ips.circuit.json`, 'utf8'));
  assert.ok(Array.isArray(reviewBoard(example)));
  assert.ok(loadedSummary(example).includes(NOT_CHECKED));
  assert.match(NOT_CHECKED, /clearance/);
});

test('a board with no tracks gets one honest note instead of a per-net list', () => {
  const project = base(); project.nets = [{ name: 'A', endpoints: [1, 2] }, { name: 'B', endpoints: [1, 2] }];
  const warnings = reviewBoard(project);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].title, /No copper routing/);
  assert.match(warnings[0].detail, /ratsnest/);
  assert.equal(reviewBoard(base()).length, 0);
});
