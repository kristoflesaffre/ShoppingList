/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheableResponsePlugin, CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

/**
 * Service worker: de app opent ook zonder internet.
 * - App-code (`/_next/static`) en de iconen staan vooraf in de cache (`__SW_MANIFEST`, per build).
 * - Pagina's: eerst het netwerk (zo zie je meteen een nieuwe deploy), offline of na 3 s de laatst bewaarde versie.
 * - Foto's: meteen uit de cache, op de achtergrond vernieuwd.
 * - `/api/*` (Hue, projector, films, AI, weer, agenda) altijd live, nooit uit de cache.
 * De gegevens zelf (lijstjes, recepten, diepvries) bewaart InstantDB lokaal; wijzigingen offline gaan
 * mee zodra er weer verbinding is.
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Hoofdpagina's die al bij het installeren bewaard worden, zodat ze offline openen ook als je ze nog niet bezocht. */
const WARM_PAGES = ["/", "/recepten", "/te-kopen", "/diepvriesvoorraad", "/voorraadkast", "/todo", "/kalender"];
const PAGES_CACHE = "pages";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/films-series/nu-kijken"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      // Volledige pagina's (openen, herladen).
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE,
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 24 * 60 * 60 })],
      }),
    },
    {
      // Navigeren binnen de app (React Server Components-payload).
      matcher: ({ request, sameOrigin }) => sameOrigin && request.headers.get("RSC") === "1",
      handler: new NetworkFirst({
        cacheName: "pages-rsc",
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 365 * 24 * 60 * 60 })],
      }),
    },
    {
      // Eigen foto's (productfoto's, gerechten) en `/_next/image`.
      matcher: ({ request, sameOrigin }) => sameOrigin && request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "images",
        plugins: [new ExpirationPlugin({ maxEntries: 600, maxAgeSeconds: 60 * 24 * 60 * 60, purgeOnQuotaError: true })],
      }),
    },
    {
      // Foto's van elders (posters, opgeladen receptfoto's): beperkt, want die tellen zwaar mee in de opslag.
      matcher: ({ request, sameOrigin }) => !sameOrigin && request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "images-external",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

// Hoofdpagina's alvast bewaren; een pagina die niet lukt (bv. offline tijdens installeren) slaan we over.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) =>
      Promise.all(WARM_PAGES.map((path) => cache.add(new Request(path, { credentials: "same-origin" })).catch(() => undefined))),
    ),
  );
});

serwist.addEventListeners();
