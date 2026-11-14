import { NextResponse } from "next/server";
import { amazonFallbackUrl, isBlockedPage } from "@/lib/link-preview-url";
import { assertPublicUrl, fetchPage, parsePreview, RETRY_DELAYS_MS, MAX_RETRY_MS, type LinkPreview } from "@/lib/server/link-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Voorbeeld van een productlink (kado-ideeën): zie `src/lib/server/link-preview.ts`. Geen AI. */

export async function POST(req: Request) {
  let target: URL;
  try {
    const body = (await req.json()) as { url?: unknown };
    const raw = typeof body?.url === "string" ? body.url.trim() : "";
    target = await assertPublicUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Ongeldige link." }, { status: 400 });
  }

  const fallback: LinkPreview = { url: target.toString(), store: target.hostname.replace(/^www\./, ""), title: null, image: null, price: null };
  try {
    // Een winkel die weigert, laat het een poging later vaak wel toe. Binnen de tijd die een bezoeker wil wachten.
    const started = Date.now();
    let lastUrl = target;
    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]));
      const page = await fetchPage(target);
      lastUrl = page.url;
      if (page.html != null && !isBlockedPage(page.html)) return NextResponse.json(parsePreview(page.html, page.url));
      if (!page.retry || Date.now() - started > MAX_RETRY_MS) break;
    }
    const blocked = NextResponse.json({ ...fallback, url: lastUrl.toString(), blocked: true });
    const sibling = amazonFallbackUrl(lastUrl);
    if (!sibling) return blocked;
    const page = await fetchPage(sibling).catch(() => null);
    if (page?.html == null || isBlockedPage(page.html)) return blocked;
    const preview = parsePreview(page.html, page.url);
    if (!preview.title && !preview.image) return blocked;
    // De link en winkel blijven die van de gebruiker; de prijs op amazon.nl hoeft daar niet te gelden.
    return NextResponse.json({ ...preview, url: lastUrl.toString(), store: fallback.store, price: null });
  } catch {
    return NextResponse.json({ ...fallback, blocked: true });
  }
}
