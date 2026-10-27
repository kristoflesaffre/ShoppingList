import { NextRequest, NextResponse } from "next/server";
import { hueClip, mapHueContacts, withHueConnection } from "@/lib/server/hue-control";
export const runtime = "nodejs";
/** Contactsensoren (open/dicht) met de naam van hun toestel. Alleen lezen; POST omdat een verlopen token hierbij vernieuwd wordt. */
export async function POST(request: NextRequest) {
  return withHueConnection(request, async (connection) => {
    const [contacts, devices] = await Promise.all([hueClip(connection, "contact"), hueClip(connection, "device")]);
    if (!contacts.ok || !devices.ok) return NextResponse.json({ error: "bridge-unavailable" }, { status: 502 });
    const contactData = ((await contacts.json()) as { data?: [] }).data ?? [];
    const deviceData = ((await devices.json()) as { data?: [] }).data ?? [];
    return NextResponse.json({ configured: true, connected: true, contacts: mapHueContacts(contactData, deviceData) });
  });
}
