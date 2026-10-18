import { NextRequest, NextResponse } from "next/server";
import { discoverPanasonic, readPanasonicDevice } from "@/lib/server/panasonic-cloud";
import { withPanasonic } from "@/lib/server/panasonic-route";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return withPanasonic(request, async session => {
    const list = await discoverPanasonic(session);
    const devices = await Promise.all(list.map(device => readPanasonicDevice(session, device)));
    return NextResponse.json({ configured: true, connected: true, devices });
  });
}
