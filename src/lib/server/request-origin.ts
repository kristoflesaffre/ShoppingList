import type { NextRequest } from "next/server";

/**
 * Het adres waarop de browser de app opende. Lokaal staat er een HTTP/2-proxy (3011) vóór Next (3012); Next
 * bouwt `nextUrl` dan met zijn eigen poort, terwijl de proxy de Host-header van de browser ongewijzigd doorgeeft.
 * Vergelijk Origin-headers en bouw terugkeer-adressen daarom hiermee, niet met `request.nextUrl.origin`.
 */
export function requestOrigin(request: Pick<NextRequest, "headers" | "nextUrl">): string {
  const host = request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  try {
    return new URL(`${request.nextUrl.protocol}//${host}`).origin;
  } catch {
    return request.nextUrl.origin;
  }
}
