/**
 * Basis-URL van de Vercel Blob-store met de grote afbeeldingsmappen
 * (zie scripts/sync-static-images.mjs). In next.config.mjs wordt /images/*
 * hiernaar doorgestuurd wanneer het bestand niet in de deployment zit.
 */
export const STATIC_IMAGES_BASE_URL =
  process.env.STATIC_IMAGES_BASE_URL ??
  "https://qkivl469lscxy579.public.blob.vercel-storage.com";
