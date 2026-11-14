import { readBoundedText } from "./read-bounded-text";
import { absolutize, assertPublicUrl, decodeEntities, fetchPage, findProduct, firstString, formatPrice, parsePreview, readMeta } from "./link-preview";
import { isBlockedPage } from "@/lib/link-preview-url";

/**
 * Kado-idee uit een link met Gemini: naam, korte omschrijving, prijs en productfoto. Gemini krijgt wat wij zelf van
 * de pagina konden lezen (meta-tags, schema.org Product, zichtbare tekst en de foto's op de pagina) én leest de
 * pagina zelf (`url_context`), met Google Search als de winkel ons weigert. De foto moet een echte afbeelding zijn:
 * elke kandidaat wordt nagekeken voor hij terugkomt.
 */

export type GiftInfo = {
  url: string;
  store: string;
  title: string | null;
  description: string | null;
  price: string | null;
  image: string | null;
  /** Wat Gemini zelf zei (om te tonen dat AI het vond). */
  ai: boolean;
};

const MODEL_DEFAULT = "gemini-3.8-flash";
const TEXT_CHARS = 9000;
const MAX_IMAGES = 40;

/** Zichtbare tekst van de pagina (zonder scripts, stijlen, menu's), ingekort. */
export function pageText(html: string): string {
  const body = html
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer|header)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(body).replace(/[ \t\f\r]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{2,}/g, "\n").trim().slice(0, TEXT_CHARS);
}

/** Productfoto's op de pagina: og:image, schema.org, en grote `<img>`'s (geen iconen, logo's of sprites). */
export function imageCandidates(html: string, base: URL): string[] {
  const out: string[] = [];
  const add = (src: string | null | undefined) => {
    const abs = absolutize(src, base);
    if (!abs || out.includes(abs) || out.length >= MAX_IMAGES) return;
    if (/\.svg(\?|$)|sprite|favicon|logo|icon|pixel|spacer|placeholder|data:image|1x1/i.test(abs)) return;
    out.push(abs);
  };
  const meta = readMeta(html);
  add(meta.get("og:image:secure_url"));
  add(meta.get("og:image"));
  add(meta.get("twitter:image"));
  const product = findProduct(html);
  if (product) {
    const imgs = Array.isArray(product.image) ? product.image : [product.image];
    for (const i of imgs) add(firstString(i));
  }
  for (const m of Array.from(html.matchAll(/<img\b[^>]*>/gi))) {
    const tag = m[0];
    const pick = (attr: string) => new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag)?.[1];
    const srcset = pick("srcset") ?? pick("data-srcset");
    const largest = srcset?.split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean).pop();
    add(pick("data-old-hires") ?? largest ?? pick("data-src") ?? pick("src"));
  }
  return out;
}

/** Eerste JSON-object uit een antwoord (Gemini met tools kan er tekst rond zetten). */
export function parseGiftJson(text: string): { title?: unknown; description?: unknown; price?: unknown; currency?: unknown; image?: unknown; imageIndex?: unknown } | null {
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1));
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.replace(/\s+/g, " ").trim().slice(0, max) : null);

/** Een prijs als «€ 34,99», uit «34.99», «34,99 EUR», 34.99 … */
export function giftPrice(price: unknown, currency: unknown): string | null {
  if (typeof price === "number") return formatPrice(String(price), typeof currency === "string" ? currency : null);
  if (typeof price !== "string" || !price.trim()) return null;
  const cur = typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? currency : /\$/.test(price) ? "USD" : /£/.test(price) ? "GBP" : "EUR";
  let digits = price.replace(/[^\d,.]/g, "");
  // «1.299,00» en «1,299.00» → 1299.00
  if (/,\d{1,2}$/.test(digits)) digits = digits.replace(/\./g, "").replace(",", ".");
  else digits = digits.replace(/,/g, "");
  return formatPrice(digits, cur);
}

/** Bestaat de foto echt (publiek adres, afbeelding, niet piepklein)? */
export async function isRealImage(url: string): Promise<boolean> {
  try {
    const u = await assertPublicUrl(url);
    const res = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36", Accept: "image/*", Range: "bytes=0-2047" },
      signal: AbortSignal.timeout(6000),
    });
    const type = res.headers.get("content-type") ?? "";
    void res.body?.cancel().catch(() => undefined);
    if (!res.ok || !type.startsWith("image/") || type.includes("svg")) return false;
    const size = Number(res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length") ?? 0);
    return !size || size > 3000;
  } catch {
    return false;
  }
}

async function askGemini(system: string, prompt: string, tools: object[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("ai-not-configured");
  const model = process.env.GEMINI_GIFT_MODEL || MODEL_DEFAULT;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools,
      generationConfig: { temperature: 0.1, maxOutputTokens: 1200, thinkingConfig: { thinkingLevel: "low" } },
    }),
  });
  if (!response.ok) throw new Error("ai-unavailable");
  const payload = JSON.parse(await readBoundedText(response.body, 400_000));
  return payload?.candidates?.[0]?.content?.parts?.map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : p.text ?? "")).join("") ?? "";
}

const SYSTEM = [
  "Je haalt de gegevens van één product uit een webwinkelpagina, voor een cadeaulijstje.",
  "Antwoord enkel met JSON: {\"title\":\"…\",\"description\":\"…\",\"price\":\"…\",\"currency\":\"EUR\",\"imageIndex\":0,\"image\":\"…\"}.",
  "title: de productnaam zoals een mens hem zou noemen, zonder winkelnaam, reclame of een opsomming van kenmerken (hoogstens ± 70 tekens).",
  "description: 2 à 3 korte zinnen in het Nederlands (Vlaams) over wat het is en wat het bijzonder maakt. Geen reclametaal, geen verzendinfo.",
  "price: de huidige verkoopprijs van dit product zoals op de pagina (geen doorstreepte prijs, geen prijs per stuk of per maand). Onbekend = null.",
  "imageIndex: het nummer van de beste productfoto uit de lijst (de foto van het product zelf, liefst op een effen achtergrond; geen logo, banner of ander product). Staat er geen goede in de lijst: null, en zet in image de volledige URL van de productfoto als je die op de pagina vindt, anders null.",
  "Verzin niets: wat je niet vindt, is null.",
].join("\n");

/** Gemini leest de link; wat de gewone lezer al vond, dient als hulp en als vangnet. */
export async function giftFromLink(raw: string): Promise<GiftInfo> {
  const target = await assertPublicUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  const page = await fetchPage(target).catch(() => null);
  const html = page?.html && !isBlockedPage(page.html) ? page.html : null;
  const pageUrl = page?.url ?? target;
  const scraped = html ? parsePreview(html, pageUrl) : null;
  const candidates = html ? imageCandidates(html, pageUrl) : [];
  const meta = html ? readMeta(html) : new Map<string, string>();
  const product = html ? findProduct(html) : null;

  const parts = [`Link: ${pageUrl.toString()}`];
  if (html) {
    if (scraped?.title || scraped?.price) parts.push(`Al gevonden: naam «${scraped?.title ?? "?"}», prijs «${scraped?.price ?? "?"}».`);
    const desc = meta.get("og:description") ?? meta.get("description") ?? (typeof product?.description === "string" ? product.description : null);
    if (desc) parts.push(`Omschrijving uit de pagina: ${desc.slice(0, 1500)}`);
    if (candidates.length) parts.push(`Foto's op de pagina:\n${candidates.map((c, i) => `${i}: ${c}`).join("\n")}`);
    parts.push(`Tekst van de pagina:\n${pageText(html)}`);
  } else {
    parts.push("De winkel liet ons de pagina niet lezen. Lees ze zelf via de link, of zoek het product op.");
  }
  // De pagina zelf lezen (url_context) en, als wij ze niet konden lezen, ook zoeken.
  const tools = html ? [{ url_context: {} }] : [{ url_context: {} }, { google_search: {} }];
  const answer = parseGiftJson(await askGemini(SYSTEM, parts.join("\n\n"), tools));
  if (!answer) throw new Error("invalid-ai-output");

  const index = typeof answer.imageIndex === "number" && Number.isInteger(answer.imageIndex) ? answer.imageIndex : null;
  const picks = [
    index != null ? candidates[index] : null,
    typeof answer.image === "string" ? absolutize(answer.image, pageUrl) : null,
    scraped?.image ?? null,
  ].filter((v, i, a): v is string => !!v && a.indexOf(v) === i);
  let image: string | null = null;
  for (const p of picks) {
    if (await isRealImage(p)) {
      image = p;
      break;
    }
  }
  return {
    url: pageUrl.toString(),
    store: pageUrl.hostname.replace(/^www\./, ""),
    title: str(answer.title, 140) ?? scraped?.title ?? null,
    description: str(answer.description, 600),
    price: giftPrice(answer.price, answer.currency) ?? scraped?.price ?? null,
    image,
    ai: true,
  };
}
