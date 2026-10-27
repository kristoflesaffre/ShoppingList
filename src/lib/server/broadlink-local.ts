import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { NextRequest } from "next/server";
import { localMacOwner, localReply } from "./local-mac-guard";
import { projectorConfigured, wakeProjector, sleepProjector } from "./projector-local";
const execute = promisify(execFile);
const commands = ["up", "stop", "down", "calibrate", "preset"] as const;
export function broadlinkAction(value: unknown): "status" | typeof commands[number] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== 1 || typeof data.action !== "string") return null;
  return ["status", ...commands].includes(data.action) ? data.action as "status" | typeof commands[number] : null;
}
/** `{ action }`, or `{ action, projector: false }` to move the screen without touching projector power (film mode). */
export function broadlinkRequest(value: unknown): { action: NonNullable<ReturnType<typeof broadlinkAction>>; projector: boolean } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { projector, ...rest } = value as Record<string, unknown>;
  if ("projector" in value && projector !== false) return null;
  const action = broadlinkAction(rest);
  if (!action || (projector === false && !["up", "down", "preset"].includes(action))) return null;
  return { action, projector: projector !== false };
}
export async function broadlinkLocal(request: NextRequest) {
  const reply = localReply;
  // This runtime exists on the Mac only. Never spawn Python inside a cloud deployment.
  const guard = await localMacOwner(request);
  if ("rejected" in guard) return guard.rejected;
  const { ownerId } = guard;
  const parsed = broadlinkRequest(await request.json().catch(() => null));
  if (!parsed) return reply({ error: "invalid-command" }, 400);
  const { action } = parsed;
  try {
    const config = JSON.parse(await readFile(path.join(process.cwd(), ".cache/broadlink/screen.json"), "utf8"));
    if (config.ownerId !== ownerId) return reply({ error: "not-authorized" }, 403);
    if (config.paused) return action === "status"
      ? reply({ configured: false, paused: true, durationSeconds: null, calibrating: false, running: false })
      : reply({ error: "controls-paused" }, 423);

    // Start explicit projector power and screen movement together. Projector failure must never
    // block a motor command (especially Stop), nor retry a screen transmission.
    const projector = !parsed.projector ? null : action === "down" ? sleepProjector(ownerId) : action === "up" || action === "preset" ? wakeProjector(ownerId) : null;
    const { stdout } = await execute(path.join(process.cwd(), ".cache/broadlink/venv/bin/python"), [path.join(process.cwd(), "scripts/broadlink-screen.py"), action], { timeout: action === "preset" ? 75_000 : 10_000, maxBuffer: 4096, windowsHide: true });
    const result = JSON.parse(stdout);
    if (action !== "status" && result.accepted !== true) throw new Error();
    if (action === "status") return reply({ ...result, projectorConfigured: await projectorConfigured(ownerId) });
    return reply(projector ? { ...result, projector: await projector } : result);
  } catch {
    return reply({ error: action === "status" ? "not-configured" : "command-not-confirmed" }, 503);
  }
}
