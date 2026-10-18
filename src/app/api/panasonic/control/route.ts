import { NextRequest, NextResponse } from "next/server";
import { acParameters } from "@/lib/panasonic";
import { discoverPanasonic, panasonicCloud, readPanasonicDevice } from "@/lib/server/panasonic-cloud";
import { withPanasonic } from "@/lib/server/panasonic-route";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return withPanasonic(request, async session => {
    const parsed = acParameters(await request.json().catch(() => null));
    if (!parsed) return NextResponse.json({ error: "invalid-command" }, { status: 400 });
    const devices = await discoverPanasonic(session);
    const device = devices.find(item => item.deviceGuid === parsed.command.deviceId);
    if (!device) return NextResponse.json({ error: "device-not-found" }, { status: 404 });
    const current = await readPanasonicDevice(session, device);
    if (!current.available || current.on === null) return NextResponse.json({ error: "device-unavailable" }, { status: 409 });
    if (parsed.command.mode && !current.modes.includes(parsed.command.mode)) return NextResponse.json({ error: "unsupported-mode" }, { status: 400 });
    // Changing settings on an off unit is intentionally blocked: no implicit power-on.
    if (!current.on && parsed.command.power !== true && Object.keys(parsed.parameters).some(k => k !== "operate")) return NextResponse.json({ error: "device-off" }, { status: 409 });
    await panasonicCloud(session, "/deviceStatus/control", { deviceGuid: device.deviceGuid, parameters: parsed.parameters });
    // Do not retry a command if the response is uncertain. Confirmation comes from a later read.
    return NextResponse.json({ accepted: true });
  });
}
