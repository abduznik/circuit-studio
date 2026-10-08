'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createServer } = require('../server.js');

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
const close = (server) => new Promise((resolve) => { server.closeAllConnections?.(); server.close(resolve); });

let upstream, app, base, seen;
test.before(async () => {
  seen = [];
  upstream = http.createServer((req, res) => {
    let body = ''; req.on('data', (c) => { body += c; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization, org: req.headers['x-opencode-org-id'], body });
      if (req.url === '/inference/v1/models') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'gpt-5.1' }, { id: 'big-pickle' }] })); }
      if (req.url === '/inference/openai/v1/chat/completions' && body.includes('big-pickle')) { res.writeHead(403, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ type: 'error', error: { type: 'FreeTierError', message: "OpenCode's free tier can only be used from within OpenCode" } })); }
      if (req.url.startsWith('/inference/')) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write('data: {"choices":[{"delta":{"content":"first"}}]}\n\n');
        setTimeout(() => { res.write('data: [DONE]\n\n'); res.end(); }, 150);
        return;
      }
      res.writeHead(404).end();
    });
  });
  const upstreamBase = await listen(upstream);
  app = await createServer({ upstream: upstreamBase });
  base = await listen(app);
});
test.after(async () => { await close(app); await close(upstream); });

test('serves the app and health endpoint', async () => {
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /opencode-core\.js/);
  const health = await (await fetch(`${base}/opencode-proxy/health`)).json();
  assert.equal(health.proxy, 'circuit-studio-local');
});

test('static serving refuses server code, dotfiles, tests and traversal', async () => {
  for (const p of ['/server.js', '/.git/config', '/test/server.test.js', '/package.json', '/%2e%2e/etc/passwd', '/nope.html']) {
    const response = await fetch(`${base}${p}`);
    assert.ok([400, 404].includes(response.status), `${p} -> ${response.status}`);
  }
  assert.equal((await fetch(`${base}/app.js`)).status, 200);
  assert.equal((await fetch(`${base}/examples/esp32-st7789-ips.circuit.json`)).status, 200);
});

test('token verification: models list is relayed with the bearer token and CORS headers', async () => {
  seen.length = 0;
  const response = await fetch(`${base}/opencode-proxy/inference/v1/models`, { headers: { Authorization: 'Bearer sk-test', 'x-opencode-org-id': 'org_1' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.deepEqual((await response.json()).data.map((m) => m.id), ['gpt-5.1', 'big-pickle']);
  assert.equal(seen[0].auth, 'Bearer sk-test');
  assert.equal(seen[0].org, 'org_1');
});

test('preflight succeeds with the headers the app sends', async () => {
  const response = await fetch(`${base}/opencode-proxy/inference/openai/v1/chat/completions`, { method: 'OPTIONS' });
  assert.equal(response.status, 204);
  assert.match(response.headers.get('access-control-allow-headers'), /Authorization/i);
});

test('generation POST streams unbuffered', async () => {
  const started = Date.now();
  const response = await fetch(`${base}/opencode-proxy/inference/openai/v1/chat/completions`, { method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-5.1', stream: true }) });
  const reader = response.body.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.match(first, /first/);
  assert.ok(Date.now() - started < 140, 'first chunk should arrive before the upstream finishes');
  while (!(await reader.read()).done);
});

test('Gemini path and query string are preserved', async () => {
  seen.length = 0;
  await (await fetch(`${base}/opencode-proxy/inference/google/v1beta/models/gemini-3-pro:streamGenerateContent?alt=sse`, { method: 'POST', body: '{}' })).text();
  assert.equal(seen[0].url, '/inference/google/v1beta/models/gemini-3-pro:streamGenerateContent?alt=sse');
});

test('free-tier 403 is passed through with CORS so the app can explain it (issue #2)', async () => {
  const response = await fetch(`${base}/opencode-proxy/inference/openai/v1/chat/completions`, { method: 'POST', body: JSON.stringify({ model: 'big-pickle' }) });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.match(await response.text(), /FreeTierError/);
});

test('proxy is not an open relay', async () => {
  seen.length = 0;
  for (const p of ['inference/../admin', 'admin', 'inference/v1/models/../../secret', 'inference/google/v1beta/models/a/b:generateContent']) {
    const response = await fetch(`${base}/opencode-proxy/${p}`, { method: 'POST', body: '{}' });
    assert.equal(response.status, 403, p);
  }
  assert.equal((await fetch(`${base}/opencode-proxy/inference/v1/models`, { method: 'DELETE' })).status, 405);
  assert.equal(seen.length, 0);
});
