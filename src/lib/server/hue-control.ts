import { NextRequest, NextResponse } from "next/server";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { HUE_AUTH_COOKIE, hueConfig, hueCookieOptions, hueTokens, HueReconnectRequired, readHueConnection, sealHue, type HueConnection } from "@/lib/server/hue-auth";

/**
 * Lampbediening via de Hue-cloud (CLIP v2 achter api.meethue.com/route): per kamer de «grouped_light».
 * Zelfde beveiliging als /api/hue/status: geregistreerde origin, ingelogde gebruiker, versleutelde cookie;
 * een bijna verlopen token wordt eerst vernieuwd en opnieuw opgeslagen.
 */

const CLIP = "https://api.meethue.com/route/clip/v2/resource";

export type HueRoom = { id: string; name: string; archetype: string; on: boolean; brightness: number | null };

type ClipRoom = { id: string; metadata?: { name?: string; archetype?: string }; services?: { rid: string; rtype: string }[] };
type ClipGroupedLight = { id: string; on?: { on?: boolean }; dimming?: { brightness?: number } };

/** Kamers + hun grouped_light samenvoegen tot een eenvoudige lijst (alfabetisch). */
export function mapHueRooms(rooms: readonly ClipRoom[], groups: readonly ClipGroupedLight[]): HueRoom[] {
  const byId = new Map(groups.map((g) => [g.id, g]));
  return rooms
    .map((room) => {
      const rid = room.services?.find((s) => s.rtype === "grouped_light")?.rid;
      const group = rid ? byId.get(rid) : undefined;
      if (!group) return null;
      return {
        id: group.id,
        name: room.metadata?.name?.trim() || "Kamer",
        archetype: room.metadata?.archetype ?? "other",
        on: group.on?.on === true,
        brightness: typeof group.dimming?.brightness === "number" ? Math.round(group.dimming.brightness) : null,
      };
    })
    .filter((r): r is HueRoom => r !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

export type HueContact = { id: string; name: string; open: boolean | null; changed: string | null };

type ClipContact = { id: string; owner?: { rid: string }; enabled?: boolean; contact_report?: { state?: string; changed?: string } };
type ClipDevice = { id: string; metadata?: { name?: string } };

/** Contactsensoren met de naam van hun toestel; `open` = geen contact (de magneet is weg), null = onbekend of uitgeschakeld. */
export function mapHueContacts(contacts: readonly ClipContact[], devices: readonly ClipDevice[]): HueContact[] {
  const names = new Map(devices.map((d) => [d.id, d.metadata?.name?.trim()]));
  return contacts.map((c) => {
    const state = c.enabled === false ? undefined : c.contact_report?.state;
    return {
      id: c.id,
      name: (c.owner && names.get(c.owner.rid)) || "Contactsensor",
      open: state === "no_contact" ? true : state === "contact" ? false : null,
      changed: c.contact_report?.changed ?? null,
    };
  });
}

export async function hueClip(connection: HueConnection, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${CLIP}/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { authorization: `Bearer ${connection.accessToken}`, "hue-application-key": connection.applicationKey, "content-type": "application/json" },
  });
}

/** Voert `run` uit met een geldige Hue-verbinding, of geeft de juiste foutstatus terug. */
export async function withHueConnection(request: NextRequest, run: (connection: HueConnection) => Promise<NextResponse>): Promise<NextResponse> {
  const config = hueConfig();
  if (!config.configured) return NextResponse.json({ configured: false, connected: false });
  if (request.headers.get("origin") !== config.origin) return NextResponse.json({ error: "invalid-origin" }, { status: 403 });
  const ownerId = await verifiedUserId(request);
  if (!ownerId) return NextResponse.json({ error: "not-signed-in" }, { status: 401 });
  let connection = readHueConnection(request.cookies.get(HUE_AUTH_COOKIE)?.value, config.secret, ownerId, config.clientId);
  if (!connection) return NextResponse.json({ configured: true, connected: false });
  let refreshed = false;
  try {
    if (connection.expiresAt <= Date.now() + 60_000) {
      connection = { ...connection, ...(await hueTokens(new URLSearchParams({ grant_type: "refresh_token", refresh_token: connection.refreshToken }), config)) };
      refreshed = true;
    }
    const response = await run(connection);
    response.headers.set("Cache-Control", "no-store");
    if (refreshed) response.cookies.set(HUE_AUTH_COOKIE, sealHue(connection, config.secret), { ...hueCookieOptions, maxAge: 60 * 60 * 24 * 90 });
    return response;
  } catch (error) {
    if (error instanceof HueReconnectRequired) {
      const response = NextResponse.json({ configured: true, connected: false, reconnect: true });
      response.cookies.set(HUE_AUTH_COOKIE, "", { ...hueCookieOptions, maxAge: 0 });
      return response;
    }
    return NextResponse.json({ error: "temporarily-unavailable" }, { status: 503 });
  }
}
