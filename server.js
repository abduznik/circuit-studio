#!/usr/bin/env node
// Local Circuit Studio server: serves the static app and relays OpenCode Inference
// calls under /opencode-proxy/ (OpenCode sends no CORS headers; see issue #1).
// Usage: node server.js [--port 8080] [--host 127.0.0.1]
// Zero dependencies. Requires Node 22.12+.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pathToFileURL } = require('node:url');

const ROOT = __dirname;
const PROXY_PREFIX = '/opencode-proxy/';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8',
};
const HIDDEN = /^(\.|node_modules$|test$|package(-lock)?\.json$|server\.js$)/;

async function createServer({ upstream } = {}) {
  const worker = (await import(pathToFileURL(path.join(ROOT, 'proxy', 'opencode-cors-worker.js')))).default;
  const env = upstream ? { UPSTREAM: upstream } : {};

  async function relay(req, res, url) {
    const body = req.method === 'POST' ? await new Promise((resolve, reject) => {
      const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject);
    }) : undefined;
    const target = new URL(url.pathname.slice(PROXY_PREFIX.length - 1) + url.search, 'http://proxy.local');
    const response = await worker.fetch(new Request(target, { method: req.method, headers: req.headers, body }), env);
    const headers = {}; response.headers.forEach((value, name) => { headers[name] = value; });
    res.writeHead(response.status, headers);
    if (!response.body) return res.end();
    const stream = Readable.fromWeb(response.body);
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  }

  function serveStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end('Method not allowed'); return; }
    let rel; try { rel = decodeURIComponent(url.pathname); } catch { res.writeHead(400).end('Bad request'); return; }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(ROOT, `.${rel}`);
    const parts = path.relative(ROOT, file).split(path.sep);
    if (parts[0] === '..' || path.isAbsolute(parts[0]) || parts.some((part) => HIDDEN.test(part)) || !TYPES[path.extname(file)]) { res.writeHead(404).end('Not found'); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)], 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    try {
      if (url.pathname === '/opencode-proxy/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, proxy: 'circuit-studio-local' }));
      } else if (url.pathname.startsWith(PROXY_PREFIX)) await relay(req, res, url);
      else serveStatic(req, res, url);
    } catch (error) {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: error.message } }));
    }
  });
}

module.exports = { createServer };

if (require.main === module) {
  const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
  const host = arg('host', '127.0.0.1'); const port = Number(arg('port', process.env.PORT || 8080));
  createServer().then((server) => server.listen(port, host, () => {
    console.log(`Circuit Studio running at http://${host}:${port}/`);
    console.log('OpenCode requests are relayed automatically; open Build with AI, choose OpenCode Inference, paste your token.');
  }));
}
