/* Heuristic review of an AI-generated board. NOT design-rule checking (see AI_WORKFLOW.md).
   Shared by app.js (browser) and the node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CircuitBoardReview = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // What the review does NOT look at, shown to the user next to its findings.
  const NOT_CHECKED = 'Not checked: copper clearance, courtyard overlap, pad-to-track geometry, ERC, power budget, signal integrity, antenna keepouts or manufacturing rules.';

  function orient(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); }
  function segmentsCross(p1, p2, p3, p4) {
    const d1 = orient(p3, p4, p1), d2 = orient(p3, p4, p2), d3 = orient(p1, p2, p3), d4 = orient(p1, p2, p4);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }
  const segmentsOf = (track) => {
    const points = (track.waypoints || []).filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y));
    return points.slice(1).map((p, i) => [points[i], p]);
  };

  /** Returns [{ title, detail }] heuristic warnings. Never throws on malformed input. */
  function reviewBoard(project) {
    const warnings = [];
    const board = project?.board || {};
    const tracks = Array.isArray(board.tracks) ? board.tracks : [];
    const vias = Array.isArray(board.vias) ? board.vias : [];
    const nets = Array.isArray(project?.nets) ? project.nets : [];
    const routed = new Set(tracks.map((t) => t.net));

    const unrouted = nets.filter((net) => (net.endpoints?.length || 0) >= 2 && !routed.has(net.name)).map((net) => net.name);
    if (unrouted.length) warnings.push({ title: `${unrouted.length} net${unrouted.length === 1 ? ' has' : 's have'} no routed track`, detail: `${unrouted.join(', ')}. Ground or power may be meant for a plane or pour, which this model does not describe.` });

    const strayVias = vias.filter((via) => !routed.has(via.net));
    if (strayVias.length) warnings.push({ title: `${strayVias.length} via${strayVias.length === 1 ? '' : 's'} on a net with no track`, detail: `Nets: ${[...new Set(strayVias.map((v) => v.net || '(none)'))].join(', ')}.` });

    const crossings = new Set();
    for (let i = 0; i < tracks.length; i++) for (let j = i + 1; j < tracks.length; j++) {
      const a = tracks[i], b = tracks[j];
      if (a.net === b.net || a.layer !== b.layer) continue;
      if (segmentsOf(a).some(([a1, a2]) => segmentsOf(b).some(([b1, b2]) => segmentsCross(a1, a2, b1, b2)))) crossings.add(`${a.net} × ${b.net} on ${a.layer}`);
    }
    if (crossings.size) warnings.push({ title: `${crossings.size} same-layer track crossing${crossings.size === 1 ? '' : 's'} between different nets`, detail: `${[...crossings].join('; ')}. Only waypoint segments are compared, not the pad-to-first-waypoint legs.` });

    const outside = (project?.components || []).filter((c) => c.pcb && board.width && board.height && (c.pcb.x < 0 || c.pcb.y < 0 || c.pcb.x > board.width || c.pcb.y > board.height)).map((c) => c.ref);
    if (outside.length) warnings.push({ title: 'Parts outside the board outline', detail: outside.join(', ') });
    return warnings;
  }

  /** Honest success message: states what was checked, and what was not. */
  function loadedSummary(project) {
    return `Loaded. Structure checked: part types, footprints, pad-to-net references, board extents and track endpoints. ${NOT_CHECKED}`;
  }
  return { NOT_CHECKED, reviewBoard, loadedSummary, segmentsCross };
});
