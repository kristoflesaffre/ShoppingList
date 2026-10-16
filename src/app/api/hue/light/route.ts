import { NextRequest, NextResponse } from "next/server";
import { hueClip, withHueConnection } from "@/lib/server/hue-control";
export const runtime = "nodejs";
const ID = /^[0-9a-f-]{36}$/i;
/** Eén kamer aan/uit (en optioneel helderheid 1–100). Body: { id, on, brightness? }. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { id?: unknown; on?: unknown; brightness?: unknown } | null;
  const id = typeof body?.id === "string" && ID.test(body.id) ? body.id : null;
  if (!id || typeof body?.on !== "boolean") return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  const command: { on: { on: boolean }; dimming?: { brightness: number } } = { on: { on: body.on } };
  if (typeof body.brightness === "number" && Number.isFinite(body.brightness)) command.dimming = { brightness: Math.min(100, Math.max(1, body.brightness)) };
  return withHueConnection(request, async (connection) => {
    const response = await hueClip(connection, `grouped_light/${id}`, { method: "PUT", body: JSON.stringify(command) });
    if (!response.ok) return NextResponse.json({ error: "bridge-unavailable" }, { status: 502 });
    return NextResponse.json({ ok: true });
  });
}
