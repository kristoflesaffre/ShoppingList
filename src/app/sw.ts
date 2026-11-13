/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheableResponsePlugin, CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

/**
 * Service worker: de app opent ook zonder internet.
 * - App-code (`/_next/static`) en de iconen staan vooraf in de cache (`__SW_MANIFEST`, per build).
 * - Pagina's: meteen de bewaarde versie (de app opent zonder op het netwerk te wachten), op de achtergrond vernieuwd.
 *   De paginacache hoort bij één build (`pages-<build>`): een nieuwe deploy begint met een verse cache, zodat er
 *   nooit HTML van een oude build met de app-code van een nieuwe gemengd wordt. Na een deploy toont de eerste
 *   start dus nog de vorige versie (of meteen de nieuwe als die al bij het installeren bewaard werd).
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

/** Het precache-manifest mag maar één keer in de bron staan (workbox/serwist vervangt die ene plek). */
const MANIFEST = self.__SW_MANIFEST;
/** Build-id: de revisie van `/offline` in het manifest (commit-sha op Vercel, anders het bouwtijdstip). */
const BUILD =
  (MANIFEST ?? []).map((e) => (typeof e === "string" ? null : e.url === "/offline" ? e.revision : null)).find(Boolean) ?? "dev";
const PAGES_CACHE = `pages-${BUILD}`;
const RSC_CACHE = `pages-rsc-${BUILD}`;
/** Paginacaches van vorige builds (en de oude namen zonder build). */
const isOldPageCache = (name: string) => (name === "pages" || name === "pages-rsc" || name.startsWith("pages-")) && name !== PAGES_CACHE && name !== RSC_CACHE;

const serwist = new Serwist({
  precacheEntries: MANIFEST,
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
      // Volledige pagina's (openen, herladen): meteen uit de cache van deze build, op de achtergrond vernieuwd.
      // Alle gegevens komen daarna uit InstantDB (lokaal bewaard), dus de pagina zelf is enkel de app-schil.
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: new StaleWhileRevalidate({
        cacheName: PAGES_CACHE,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 24 * 60 * 60 }),
        ],
      }),
    },
    {
      // Navigeren binnen de app (React Server Components-payload).
      matcher: ({ request, sameOrigin }) => sameOrigin && request.headers.get("RSC") === "1",
      handler: new NetworkFirst({
        cacheName: RSC_CACHE,
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

// Nieuwe build actief: paginacaches van vorige builds weg (hun HTML verwijst naar app-code die er niet meer is).
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter(isOldPageCache).map((name) => caches.delete(name)))));
});

serwist.addEventListeners();
