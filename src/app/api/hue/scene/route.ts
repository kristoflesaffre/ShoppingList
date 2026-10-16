import { NextRequest, NextResponse } from "next/server";
import { hueClip, withHueConnection } from "@/lib/server/hue-control";
export const runtime = "nodejs";

type ClipRoom = { id: string; metadata?: { name?: string }; services?: { rid: string; rtype: string }[] };
type ClipScene = { id: string; metadata?: { name?: string }; group?: { rid: string; rtype: string } };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const text = (v: unknown) => (typeof v === "string" && v.trim().length > 0 && v.length <= 40 ? v : null);

/**
 * Scène oproepen in één kamer (bv. «Cinema» in de woonkamer), optioneel met alle andere kamers uit.
 * Body: { room, scene, othersOff? }. Kamer en scène worden op naam gezocht (hoofdletters/accenten maken niet uit).
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { room?: unknown; scene?: unknown; othersOff?: unknown } | null;
  const roomName = text(body?.room);
  const sceneName = text(body?.scene);
  if (!roomName || !sceneName) return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  const othersOff = body?.othersOff === true;

  return withHueConnection(request, async (connection) => {
    const [roomsRes, scenesRes] = await Promise.all([hueClip(connection, "room"), hueClip(connection, "scene")]);
    if (!roomsRes.ok || !scenesRes.ok) return NextResponse.json({ error: "bridge-unavailable" }, { status: 502 });
    const rooms = ((await roomsRes.json()) as { data?: ClipRoom[] }).data ?? [];
    const scenes = ((await scenesRes.json()) as { data?: ClipScene[] }).data ?? [];

    const room = rooms.find((r) => norm(r.metadata?.name ?? "") === norm(roomName)) ?? rooms.find((r) => norm(r.metadata?.name ?? "").includes(norm(roomName)));
    if (!room) return NextResponse.json({ error: "room-not-found" }, { status: 404 });
    const inRoom = scenes.filter((s) => s.group?.rid === room.id);
    const scene = inRoom.find((s) => norm(s.metadata?.name ?? "") === norm(sceneName)) ?? inRoom.find((s) => norm(s.metadata?.name ?? "").includes(norm(sceneName)));
    if (!scene) return NextResponse.json({ error: "scene-not-found", room: room.metadata?.name ?? roomName }, { status: 404 });

    const recall = await hueClip(connection, `scene/${scene.id}`, { method: "PUT", body: JSON.stringify({ recall: { action: "active" } }) });
    if (!recall.ok) return NextResponse.json({ error: "bridge-unavailable" }, { status: 502 });

    let switchedOff = 0;
    if (othersOff) {
      const others = rooms
        .filter((r) => r.id !== room.id)
        .map((r) => r.services?.find((s) => s.rtype === "grouped_light")?.rid)
        .filter((rid): rid is string => Boolean(rid));
      const results = await Promise.all(
        others.map((rid) => hueClip(connection, `grouped_light/${rid}`, { method: "PUT", body: JSON.stringify({ on: { on: false } }) }).then((r) => r.ok).catch(() => false)),
      );
      switchedOff = results.filter(Boolean).length;
    }
    return NextResponse.json({ ok: true, room: room.metadata?.name ?? roomName, scene: scene.metadata?.name ?? sceneName, switchedOff });
  });
}
