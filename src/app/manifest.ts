import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shopping List",
    short_name: "Boodschappen",
    description: "Samen boodschappenlijsten beheren",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f3fb",
    theme_color: "#f5f3fb",
    icons: [
      {
        src: "/apple-icon.png",
        sizes: "360x360",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
