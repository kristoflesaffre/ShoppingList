/**
 * HTTP/2 in front of the local HTTPS preview. `next dev --experimental-https` only speaks HTTP/1.1, so the browser
 * opens at most six connections: slow device reads (BREL, Panasonic, Hue…) filled them and the start page's photos
 * waited behind them. Over HTTP/2 everything shares one connection without that limit.
 *
 * The Host header and HTTPS stay the same end to end, so origin checks (local-mac-guard, OAuth) see exactly what the
 * browser sent. HMR websockets arrive as HTTP/1.1 upgrades and are piped through untouched.
 *
 * Usage: node scripts/local-h2-proxy.mjs <listen-port> <upstream-port>
 */
import fs from "node:fs";
import http2 from "node:http2";
import https from "node:https";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [listenPort, upstreamPort] = process.argv.slice(2).map(Number);
if (!listenPort || !upstreamPort) {
  console.error("Usage: local-h2-proxy.mjs <listen-port> <upstream-port>");
  process.exit(1);
}

const certificate = { key: fs.readFileSync(path.join(root, "certificates/localhost-key.pem")), cert: fs.readFileSync(path.join(root, "certificates/localhost.pem")) };
// Upstream is Next on loopback with the same local certificate; nothing leaves this Mac.
const upstream = { host: "localhost", port: upstreamPort, servername: "localhost", rejectUnauthorized: false };
const agent = new https.Agent({ ...upstream, keepAlive: true, maxSockets: 64 });
const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade", "http2-settings", "te", "trailer"]);

function forwardHeaders(source) {
  const headers = {};
  for (const [name, value] of Object.entries(source)) {
    if (name.startsWith(":") || HOP_BY_HOP.has(name)) continue;
    headers[name] = value;
  }
  return headers;
}

const server = http2.createSecureServer({ ...certificate, allowHTTP1: true }, (request, response) => {
  const headers = forwardHeaders(request.headers);
  // HTTP/2 carries the host as :authority.
  headers.host = request.headers[":authority"] ?? request.headers.host;
  const proxied = https.request({ ...upstream, agent, method: request.method, path: request.url, headers }, upstreamResponse => {
    response.writeHead(upstreamResponse.statusCode ?? 502, forwardHeaders(upstreamResponse.headers));
    upstreamResponse.pipe(response);
  });
  proxied.on("error", () => {
    if (!response.headersSent) response.writeHead(502, { "content-type": "text/plain" });
    response.end("Local preview is not reachable.");
  });
  request.on("aborted", () => proxied.destroy());
  request.pipe(proxied);
});

// HMR (webpack-hmr) websockets: HTTP/1.1 upgrade, piped byte for byte.
server.on("upgrade", (request, socket, head) => {
  const target = tls.connect(upstream, () => {
    const lines = [`${request.method} ${request.url} HTTP/1.1`, ...Object.entries(request.headers).flatMap(([name, value]) => (Array.isArray(value) ? value : [value]).map(item => `${name}: ${item}`))];
    target.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head?.length) target.write(head);
    target.pipe(socket);
    socket.pipe(target);
  });
  const close = () => { target.destroy(); socket.destroy(); };
  target.on("error", close);
  socket.on("error", close);
});

server.listen(listenPort, "localhost", () => console.log(`HTTP/2 preview on https://localhost:${listenPort} → Next on ${upstreamPort}`));
