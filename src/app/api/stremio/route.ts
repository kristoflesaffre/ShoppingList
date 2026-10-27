import { NextRequest, NextResponse } from "next/server";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { clearStremioCache, loginStremio, readStremioProgress } from "@/lib/server/stremio-cloud";
import { deleteStremio, loadStremio, saveStremio, stremioConfigured } from "@/lib/server/stremio-store";
import { readBoundedText } from "@/lib/server/read-bounded-text";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const attempts = new Map<string, { count: number; expires: number }>();
function failure(error: unknown) {
  const allowed = ["login-failed", "session-expired", "session-invalid", "not-configured", "invalid-library"];
  const code = error instanceof Error && allowed.includes(error.message) ? error.message : "upstream-unavailable";
  return reply({ error: code }, code === "login-failed" ? 401 : 503);
}
export async function GET(request: NextRequest) {
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  if (!stremioConfigured()) return reply({ error: "not-configured" }, 503);
  try {
    const session = await loadStremio(owner);
    return session ? reply({ connected: true, ...await readStremioProgress(session) }) : reply({ connected: false, items: [], syncedAt: null });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== googleRequestOrigin(request)) return reply({ error: "invalid-origin" }, 403);
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  if (!stremioConfigured()) return reply({ error: "not-configured" }, 503);
  const text = await readBoundedText(request.body, 8192).catch(() => null);
  if (text === null) return reply({ error: "invalid-request" }, 400);
  let body;
  try { body = JSON.parse(text); } catch { return reply({ error: "invalid-request" }, 400); }
  if (!body || Array.isArray(body) || Object.keys(body).length !== 2 || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) || body.email.length > 254 || typeof body.password !== "string" || !body.password || body.password.length > 4096) return reply({ error: "invalid-request" }, 400);
  const now = Date.now();
  for (const [id, attempt] of Array.from(attempts)) if (attempt.expires <= now) attempts.delete(id);
  const attempt = attempts.get(owner) ?? { count: 0, expires: now + 900_000 };
  if (attempt.count >= 5 || attempts.size > 10_000) return reply({ error: "rate-limited" }, 429);
  attempt.count++; attempts.set(owner, attempt);
  try {
    const authKey = await loginStremio(body.email.trim(), body.password);
    body.password = "";
    const session = { ownerId: owner, authKey };
    // Check the read path before replacing an existing connection.
    const snapshot = await readStremioProgress(session);
    await saveStremio(session);
    attempts.delete(owner);
    return reply({ connected: true, ...snapshot });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: NextRequest) {
  if (request.headers.get("origin") !== googleRequestOrigin(request)) return reply({ error: "invalid-origin" }, 403);
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  try {
    await deleteStremio(owner);
    clearStremioCache();
    return reply({ connected: false, items: [], syncedAt: null });
  } catch (error) { return failure(error); }
}
