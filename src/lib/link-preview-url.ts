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
