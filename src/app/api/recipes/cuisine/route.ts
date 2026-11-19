import { NextResponse } from "next/server";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { getInstantAdminDb } from "@/lib/server/instant-admin";
import { CUISINE_BATCH, classifyCuisines, type CuisineInput } from "@/lib/server/recipe-cuisine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vult de keuken in van recepten die er nog geen hebben (eerst «Te testen»), CUISINE_BATCH per oproep. De
 * receptenpagina roept dit aan zolang er zulke recepten zijn, dus ook nieuwe imports krijgen vanzelf een keuken.
 * Enkel de eigen recepten van wie aangemeld is; een keuken die al ingevuld is, wordt nooit overschreven.
 */
const PER_HOUR = 30;
const used = new Map<string, { hour: number; n: number }>();

const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, private" } });

export async function POST(req: Request) {
  const owner = await verifiedUserId(req);
  if (!owner) return reply({ error: "unauthorized" }, 401);
  const hour = Math.floor(Date.now() / 3600_000);
  const u = used.get(owner);
  const n = u?.hour === hour ? u.n : 0;
  if (n >= PER_HOUR) return reply({ error: "hourly-limit" }, 429);
  used.set(owner, { hour, n: n + 1 });

  const db = getInstantAdminDb();
  if (!db) return reply({ error: "not-configured" }, 503);
  try {
    const data = await db.query({ recipes: { $: { where: { ownerId: owner } }, ingredients: {} } });
    const missing = data.recipes
      .filter((r) => !r.cuisine)
      .sort((a, b) => Number(b.category === "nog_te_testen") - Number(a.category === "nog_te_testen"));
    const batch: CuisineInput[] = missing.slice(0, CUISINE_BATCH).map((r) => ({
      id: r.id,
      name: r.name,
      ingredients: [...(r.ingredients ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((i) => i.name),
    }));
    const found = await classifyCuisines(batch);
    const updates = Array.from(found, ([id, cuisine]) => db.tx.recipes[id].update({ cuisine }));
    for (let i = 0; i < updates.length; i += 50) await db.transact(updates.slice(i, i + 50));
    return reply({ classified: found.size, remaining: missing.length - found.size });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "ai-not-configured") return reply({ error: code }, 503);
    console.error("Recipe cuisine failed:", code || String(e));
    return reply({ error: "ai-unavailable" }, 502);
  }
}
