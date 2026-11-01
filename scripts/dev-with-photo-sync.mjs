/**
 * Keep a local photo backup alongside Next; photo failures never stop the app. With --https, Next runs on an internal
 * port and scripts/local-h2-proxy.mjs serves https://localhost:3011 over HTTP/2 (Next's own HTTPS is HTTP/1.1 only,
 * whose six-connection limit made the start page's photos wait behind slow device reads).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const https = process.argv.includes("--https");
const env = { ...process.env, ...(https ? { LOCAL_HTTPS_DEV: "1" } : {}) };
const PUBLIC_PORT = "3011";
const NEXT_PORT = "3012";
const nextArgs = [path.join(root, "node_modules/next/dist/bin/next"), "dev", ...(https ? ["--hostname", "localhost", "--port", NEXT_PORT, "--experimental-https"] : []), ...process.argv.slice(2).filter(arg => arg !== "--https")];
const next = spawn(process.execPath, nextArgs, { cwd: root, env, stdio: "inherit" });
const proxy = https ? spawn(process.execPath, [path.join(root, "scripts/local-h2-proxy.mjs"), PUBLIC_PORT, NEXT_PORT], { cwd: root, env, stdio: "inherit" }) : null;
const photos = spawn(process.execPath, [path.join(root, "scripts/export-recipe-photos.mjs"), "--watch"], { cwd: root, env, stdio: "inherit" });
let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true; next.kill(signal); photos.kill(signal); proxy?.kill(signal);
  // Network requests may still be finishing; never leave an orphan sync worker.
  const timer = setTimeout(() => { next.kill("SIGKILL"); photos.kill("SIGKILL"); proxy?.kill("SIGKILL"); }, 3000);
  timer.unref();
}
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => stop(signal));
next.once("error", () => { console.error("Local preview failed to start."); stop(); process.exitCode = 1; });
photos.once("error", () => console.warn("Recipe photo backup could not start; the app remains available."));
next.once("exit", code => { stop(); process.exitCode = code ?? 0; });
// Without the proxy nothing answers on 3011: stop so the launch agent starts everything again.
proxy?.once("exit", code => { if (stopping) return; console.error("HTTP/2 proxy stopped."); stop(); process.exitCode = code || 1; });
