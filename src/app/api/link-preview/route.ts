import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Voorbeeld van een productlink (kado-ideeën): haalt de pagina op en leest titel, foto en prijs uit
 * wat webwinkels zelf in hun pagina zetten — Open Graph-tags (`og:title`, `og:image`,
 * `product:price:amount`) en schema.org «Product» in JSON-LD. Geen AI nodig.
 */

export type LinkPreview = {
  url: string;
  store: string;
  title: string | null;
  image: string | null;
  price: string | null;
};

const MAX_BYTES = 3_000_000;

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** Enkel publieke http(s)-adressen (geen localhost of intern netwerk). */
async function assertPublicUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Enkel http(s)-links.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("Geen interne adressen.");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new Error("Geen interne adressen.");
  return u;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Alle `<meta>`-tags als kaart (property/name/itemprop → content); eerste waarde wint. */
function readMeta(html: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of Array.from(html.matchAll(/<meta\b[^>]*>/gi))) {
    const tag = m[0];
    const key = /\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    const content = /\bcontent\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? /\bcontent\s*=\s*'([^']*)'/i.exec(tag)?.[1];
    if (key && content != null && !out.has(key)) out.set(key, decodeEntities(content.trim()));
  }
  return out;
}

type Json = unknown;

/** Zoekt een schema.org Product in alle JSON-LD-blokken (ook in `@graph` en lijsten). */
function findProduct(html: string): Record<string, Json> | null {
  const visit = (node: Json): Record<string, Json> | null => {
    if (Array.isArray(node)) {
      for (const n of node) {
        const hit = visit(n);
        if (hit) return hit;
      }
      return null;
    }
    if (!node || typeof node !== "object") return null;
    const obj = node as Record<string, Json>;
    const type = obj["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.some((t) => typeof t === "string" && /^(Product|ProductGroup|IndividualProduct)$/i.test(t))) return obj;
    return visit(obj["@graph"]) ?? visit(obj.mainEntity);
  };
  for (const m of Array.from(html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))) {
    try {
      const hit = visit(JSON.parse(m[1].trim()));
      if (hit) return hit;
    } catch {
      /* kapotte JSON-LD overslaan */
    }
  }
  return null;
}

function firstString(v: Json): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    for (const x of v) {
      const s = firstString(x);
      if (s) return s;
    }
    return null;
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, Json>;
    return firstString(o.url ?? o.contentUrl ?? o["@id"]);
  }
  return null;
}

function productPrice(p: Record<string, Json>): { amount: string; currency: string | null } | null {
  const offers = Array.isArray(p.offers) ? p.offers : p.offers ? [p.offers] : [];
  for (const raw of offers) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, Json>;
    const spec = Array.isArray(o.priceSpecification) ? o.priceSpecification[0] : o.priceSpecification;
    const amount = o.price ?? o.lowPrice ?? (spec && typeof spec === "object" ? (spec as Record<string, Json>).price : undefined);
    if (amount != null && amount !== "") {
      const currency = o.priceCurrency ?? (spec && typeof spec === "object" ? (spec as Record<string, Json>).priceCurrency : null);
      return { amount: String(amount), currency: typeof currency === "string" ? currency : null };
    }
  }
  return null;
}

function formatPrice(amount: string, currency: string | null): string | null {
  const n = Number(amount.replace(/\s/g, "").replace(/,(\d{1,2})$/, ".$1").replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return new Intl.NumberFormat("nl-BE", { style: "currency", currency: currency || "EUR" }).format(n);
  } catch {
    return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(n);
  }
}

function absolutize(src: string | null | undefined, base: URL): string | null {
  if (!src) return null;
  try {
    const u = new URL(decodeEntities(src.trim()), base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function cleanTitle(t: string | null, siteName: string | null): string | null {
  if (!t) return null;
  let s = decodeEntities(t).replace(/\s+/g, " ").trim();
  if (siteName) s = s.replace(new RegExp(`\\s*[|–—-]\\s*${siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "");
  return s || null;
}

function parsePreview(html: string, pageUrl: URL): LinkPreview {
  const meta = readMeta(html);
  const product = findProduct(html);
  const siteName = meta.get("og:site_name") ?? null;

  const title = cleanTitle(
    (typeof product?.name === "string" ? product.name : null) ??
      meta.get("og:title") ??
      meta.get("twitter:title") ??
      /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ??
      null,
    siteName,
  );
  const image = absolutize(
    meta.get("og:image:secure_url") ?? meta.get("og:image") ?? meta.get("twitter:image") ?? meta.get("twitter:image:src") ?? (product ? firstString(product.image) : null) ?? meta.get("image"),
    pageUrl,
  );
  const fromLd = product ? productPrice(product) : null;
  const metaAmount = meta.get("product:price:amount") ?? meta.get("og:price:amount") ?? meta.get("price");
  const metaCurrency = meta.get("product:price:currency") ?? meta.get("og:price:currency") ?? meta.get("pricecurrency") ?? null;
  const price = fromLd ? formatPrice(fromLd.amount, fromLd.currency) : metaAmount ? formatPrice(metaAmount, metaCurrency) : null;

  return { url: pageUrl.toString(), store: pageUrl.hostname.replace(/^www\./, ""), title, image, price };
}

async function readLimited(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

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
    // Omleidingen zelf volgen, zodat elke tussenstap ook een publiek adres moet zijn.
    let url = target;
    let res: Response | null = null;
    for (let hop = 0; hop < 5; hop++) {
      res = await fetch(url, {
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "nl-BE,nl;q=0.9,en;q=0.6",
        },
        signal: AbortSignal.timeout(10_000),
      });
      const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!loc) break;
      url = await assertPublicUrl(new URL(loc, url).toString());
    }
    if (!res || !res.ok) return NextResponse.json({ ...fallback, url: url.toString(), blocked: true });
    const html = await readLimited(res);
    return NextResponse.json(parsePreview(html, url));
  } catch {
    return NextResponse.json({ ...fallback, blocked: true });
  }
}
