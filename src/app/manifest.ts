import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shopping List",
    short_name: "Boodschappen",
    description: "Samen boodschappenlijsten beheren",
    start_url: "/",
    display: "fullscreen",
    background_color: "#f5f6fa",
    theme_color: "#f5f6fa",
    icons: [
      {
        src: "/icons/family-home/app-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/family-home/app-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
