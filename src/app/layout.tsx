import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppPersistentBottomNav } from "@/components/app_chrome";
import "./globals.css";

/** Bovenste gradientkleur (blue-100) — sluit aan bij globals.css voor statusbalk/splash. */
const APP_THEME_TOP = "#dcddfc";

export const viewport: Viewport = {
  themeColor: APP_THEME_TOP,
  width: "device-width",
  initialScale: 1,
  /** iOS: pagina mag onder notch/statusbalk tekenen → gradient zichtbaar i.p.v. witte balk. */
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Shopping List",
  description: "Samen boodschappenlijsten beheren",
  applicationName: "Shopping List",
  appleWebApp: {
    capable: true,
    title: "Shopping List",
    /**
     * "default" = op iPhone vaak een **ondoorzichtige witte** statusbalk (standalone/PWA).
     * "black-translucent" = inhoud loopt door onder de balk; zie body-gradient + safe-area padding.
     */
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        {children}
        <Suspense fallback={null}>
          <AppPersistentBottomNav />
        </Suspense>
      </body>
    </html>
  );
}
