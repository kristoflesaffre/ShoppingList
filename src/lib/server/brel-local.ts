import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { NextRequest } from "next/server";
import { blindRequest } from "@/lib/brel-blinds";
import { localMacOwner, localReply as reply } from "./local-mac-guard";
const execute = promisify(execFile);

/** BREL Home Hub over the home network, through the Mac's Python runner. Same boundary as the projection screen. */
export async function brelLocal(request: NextRequest) {
  // This runtime exists on the Mac only. Never spawn Python inside a cloud deployment.
  const guard = await localMacOwner(request);
  if ("rejected" in guard) return guard.rejected;
  const parsed = blindRequest(await request.json().catch(() => null));
  if (!parsed) return reply({ error: "invalid-command" }, 400);
  try {
    const config = JSON.parse(await readFile(path.join(process.cwd(), ".cache/brel/blinds.json"), "utf8"));
    if (config.ownerId !== guard.ownerId) return reply({ error: "not-authorized" }, 403);
    const args = parsed.action === "status" ? ["status"]
      : parsed.action === "position" ? ["position", parsed.blind, String(parsed.position)]
      : parsed.action === "tilt" ? ["tilt", parsed.blind, String(parsed.angle)]
      : [parsed.action, parsed.blind];
    // The library resends up to three times after a 3 s timeout; every command is absolute, so that is safe.
    const { stdout } = await execute(path.join(process.cwd(), ".cache/brel/venv/bin/python"), [path.join(process.cwd(), "scripts/brel-blinds.py"), ...args], { timeout: 15_000, maxBuffer: 16_384, windowsHide: true });
    const result = JSON.parse(stdout);
    if (parsed.action !== "status" && result.accepted !== true) throw new Error();
    return reply(result);
  } catch {
    return reply({ error: parsed.action === "status" ? "not-configured" : "command-not-confirmed" }, 503);
  }
}
