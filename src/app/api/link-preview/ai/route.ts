import { NextResponse } from "next/server";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { giftFromLink } from "@/lib/server/gift-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Kado-idee uit een link met Gemini (naam, omschrijving, prijs, foto). Enkel voor wie aangemeld is. */
const PER_HOUR = 40;
const used = new Map<string, { hour: number; n: number }>();

export async function POST(req: Request) {
  const owner = await verifiedUserId(req);
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const hour = Math.floor(Date.now() / 3600_000);
  const u = used.get(owner);
  const n = u?.hour === hour ? u.n : 0;
  if (n >= PER_HOUR) return NextResponse.json({ error: "hourly-limit" }, { status: 429 });
  used.set(owner, { hour, n: n + 1 });

  let url = "";
  try {
    const body = (await req.json()) as { url?: unknown };
    url = typeof body?.url === "string" ? body.url.trim().slice(0, 2000) : "";
  } catch {
    /* lege body */
  }
  if (!url) return NextResponse.json({ error: "invalid-url" }, { status: 400 });
  try {
    return NextResponse.json(await giftFromLink(url), { headers: { "Cache-Control": "no-store, private" } });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code !== "ai-unavailable" && code !== "invalid-ai-output" && code !== "ai-not-configured") console.error("Gift AI failed:", code);
    return NextResponse.json({ error: code === "ai-not-configured" ? code : "ai-unavailable" }, { status: 502 });
  }
}
