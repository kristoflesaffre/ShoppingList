/**
 * Amazon weigert productpagina's met een taalstukje in het pad (`/-/en/`, `/-/nl/`) wanneer een server
 * ze ophaalt; dezelfde link zonder dat stukje werkt wel. Op een computer met Amazon in het Engels zit
 * het in elke gekopieerde link. Alleen voor het ophalen: de link van de gebruiker blijft zoals ze is.
 */
export function linkPreviewFetchUrl(url: URL): URL {
  if (!/(^|\.)amazon\.[a-z.]+$/i.test(url.hostname)) return url;
  const pathname = url.pathname.replace(/^\/-\/[a-z]{2}(?:[-_][a-z]{2})?(?=\/|$)/i, "");
  if (pathname === url.pathname) return url;
  const out = new URL(url);
  out.pathname = pathname || "/";
  return out;
}

const BLOCKED_TITLE = /^\s*(server busy|robot check|access denied|just a moment|attention required|are you a robot|pardon our interruption|toegang geweigerd)\b/i;

/**
 * Een winkel die de server weigert, antwoordt soms met een gewone pagina (status 200) in plaats van
 * een foutcode: bij Amazon «Server Busy» of een captcha. Dat is geen product, en vaak lukt het even later wel.
 */
export function isBlockedPage(html: string): boolean {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  return BLOCKED_TITLE.test(title) || /\/errors\/validateCaptcha/i.test(html);
}

/**
 * Hetzelfde product op amazon.nl, als een andere Amazon-winkel de server blijft weigeren. Enkel voor
 * naam en foto: de prijs kan per winkel verschillen.
 */
export function amazonFallbackUrl(url: URL): URL | null {
  if (!/(^|\.)amazon\.[a-z.]+$/i.test(url.hostname) || /(^|\.)amazon\.nl$/i.test(url.hostname)) return null;
  const asin = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i.exec(url.pathname)?.[1];
  return asin ? new URL(`https://www.amazon.nl/dp/${asin.toUpperCase()}`) : null;
}
