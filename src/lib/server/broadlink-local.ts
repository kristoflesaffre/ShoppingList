import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { verifiedUserId } from "./google-connection-store";
const execute = promisify(execFile);
const commands = ["up", "stop", "down", "calibrate", "preset"] as const;
export function broadlinkAction(value: unknown): "status" | typeof commands[number] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== 1 || typeof data.action !== "string") return null;
  return ["status", ...commands].includes(data.action) ? data.action as "status" | typeof commands[number] : null;
}
export async function broadlinkLocal(request: NextRequest) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  // This runtime exists on the Mac only. Never spawn Python inside a cloud deployment.
  if (process.env.NETLIFY || process.env.VERCEL || !["localhost", "127.0.0.1", "[::1]"].includes(request.nextUrl.hostname)) return reply({ error: "mac-required", configured: false }, 503);
  if (request.headers.get("origin") !== request.nextUrl.origin) return reply({ error: "invalid-origin" }, 403);
  const ownerId = await verifiedUserId(request);
  if (!ownerId) return reply({ error: "not-signed-in" }, 401);
  const action = broadlinkAction(await request.json().catch(() => null));
  if (!action) return reply({ error: "invalid-command" }, 400);
  try {
    const config = JSON.parse(await readFile(path.join(process.cwd(), ".cache/broadlink/screen.json"), "utf8"));
    if (config.ownerId !== ownerId) return reply({ error: "not-authorized" }, 403);
    
    const { stdout } = await execute(path.join(process.cwd(), ".cache/broadlink/venv/bin/python"), [path.join(process.cwd(), "scripts/broadlink-screen.py"), action], { timeout: action === "preset" ? 75_000 : 10_000, maxBuffer: 4096, windowsHide: true });
    const result = JSON.parse(stdout);
    if (action !== "status" && result.accepted !== true) throw new Error();
    return reply(result);
  } catch {
    return reply({ error: action === "status" ? "not-configured" : "command-not-confirmed" }, 503);
  }
}
