import type { MetadataRoute } from "next";

// Next 14's bundled manifest types still describe the obsolete share_target draft.
// This is the current Web App Manifest shape consumed by supporting browsers.
type RecipeShareManifest = Omit<MetadataRoute.Manifest, "share_target"> & {
  share_target: {
    action: string;
    method: "GET";
    enctype: "application/x-www-form-urlencoded";
    params: { title: string; text: string; url: string };
  };
};

export default function manifest(): RecipeShareManifest {
  return {
    name: "Shopping List",
    short_name: "Boodschappen",
    description: "Samen boodschappenlijsten beheren",
    start_url: "/",
    share_target: {
      action: "/recepten/importeren",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: { title: "title", text: "text", url: "url" },
    },
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
