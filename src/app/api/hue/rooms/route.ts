import { NextRequest, NextResponse } from "next/server";
import { hueClip, mapHueRooms, withHueConnection } from "@/lib/server/hue-control";
export const runtime = "nodejs";
/** Kamers met hun lichtstatus. POST omdat een verlopen token hierbij vernieuwd en opgeslagen wordt. */
export async function POST(request: NextRequest) {
  return withHueConnection(request, async (connection) => {
    const [rooms, groups] = await Promise.all([hueClip(connection, "room"), hueClip(connection, "grouped_light")]);
    if (!rooms.ok || !groups.ok) return NextResponse.json({ error: "bridge-unavailable" }, { status: 502 });
    const roomData = ((await rooms.json()) as { data?: [] }).data ?? [];
    const groupData = ((await groups.json()) as { data?: [] }).data ?? [];
    return NextResponse.json({ configured: true, connected: true, rooms: mapHueRooms(roomData, groupData) });
  });
}
