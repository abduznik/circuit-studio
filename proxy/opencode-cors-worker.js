/**
 * OpenCode Inference CORS proxy for Circuit Studio.
 *
 * Why this exists
 * ---------------
 * `GET https://opencode.ai/inference/v1/models` sends `Access-Control-Allow-Origin: *`,
 * so a browser can verify a token and list models directly. The generation endpoints
 * (`/inference/openai/v1/chat/completions`, `/inference/openai/v1/responses`,
 * `/inference/anthropic/v1/messages`, `/inference/google/v1beta/models/*`) send no CORS
 * headers at all, and their OPTIONS preflight returns 404, so a static page cannot call
 * them from the browser. This Worker forwards the request and adds CORS headers.
 *
 * It also sees your OpenCode token, so only deploy it yourself and keep it private.
 *
 * Deploy (Cloudflare Workers, free tier)
 * --------------------------------------
 * 1. Sign in at https://dash.cloudflare.com and create a Worker.
 * 2. Replace the generated code with the contents of this file.
 * 3. Deploy, then paste the worker URL (https://<name>.<subdomain>.workers.dev)
 *    into Circuit Studio's "CORS proxy URL" field.
 *
 * The Worker keeps a strict allow-list of upstream paths, so it cannot be used to
 * request arbitrary URLs.
 */

const UPSTREAM = 'https://opencode.ai';
const ALLOWED_PATHS = new Set([
  'inference/v1/models',
  'inference/openai/v1/chat/completions',
  'inference/openai/v1/responses',
  'inference/anthropic/v1/messages',
]);
const FORWARDED_HEADERS = [
  'authorization',
  'content-type',
  'accept',
  'anthropic-version',
  'x-api-key',
  'x-goog-api-key',
  'x-opencode-org-id',
  'x-org-id',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Anthropic-Version, X-Api-Key, X-Goog-Api-Key, X-Opencode-Org-Id, X-Org-Id',
  'Access-Control-Max-Age': '86400',
};

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== 'GET' && request.method !== 'POST') return json({ error: { message: 'Method not allowed' } }, 405);

    const incoming = new URL(request.url);
    const path = incoming.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!ALLOWED_PATHS.has(path) && !/^inference\/google\/v1beta\/models\/[^/]+:(streamGenerateContent|generateContent)$/.test(path)) {
      return json({ error: { message: `Path not allowed: ${path || '/'}` } }, 403);
    }

    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('Accept-Encoding', 'identity');

    let body;
    if (request.method === 'POST') body = await request.text();

    let upstream;
    try {
      upstream = await fetch(`${UPSTREAM}/${path}${incoming.search}`, { method: request.method, headers, body, redirect: 'follow' });
    } catch (error) {
      return json({ error: { message: `Could not reach OpenCode: ${error.message}` } }, 502);
    }

    const responseHeaders = new Headers(upstream.headers);
    for (const [name, value] of Object.entries(CORS_HEADERS)) responseHeaders.set(name, value);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.set('X-Proxy-Upstream', `${UPSTREAM}/${path}`);

    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  },
};
