import type { NextRequest } from "next/server";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";

export function privateIpv4(host: string): boolean {
  const octets = host.split(".").map(Number);
  if (octets.length !== 4 || octets.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return octets[0] === 10 || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
}

/** A configured private-LAN origin (http(s), no credentials or path), or null. Never on hosted runtimes. */
function lanOrigin(configured: string | undefined): string | null {
  if (process.env.NETLIFY || process.env.VERCEL || !configured) return null;
  try {
    const allowed = new URL(configured);
    if (!privateIpv4(allowed.hostname) || !["http:", "https:"].includes(allowed.protocol) || allowed.username || allowed.password || allowed.pathname !== "/") return null;
    return allowed.origin;
  } catch { return null; }
}

/** Explicit, process-local opt-in; never enables LAN access on hosted runtimes. */
export function temporaryProjectorHost(request: NextRequest): boolean {
  const allowed = lanOrigin(process.env.PROJECTOR_LOCAL_ORIGIN);
  if (!allowed) return false;
  try {
    return googleRequestOrigin(request) === allowed || ["localhost", "127.0.0.1", "[::1]"].includes(request.nextUrl.hostname);
  } catch { return false; }
}

/** Screen controls from one exact home-network origin (iPad/iPhone), only with `SCREEN_LOCAL_ORIGIN` set. */
export function screenLanHost(request: NextRequest): boolean {
  const allowed = lanOrigin(process.env.SCREEN_LOCAL_ORIGIN);
  if (!allowed) return false;
  try { return googleRequestOrigin(request) === allowed; } catch { return false; }
}
