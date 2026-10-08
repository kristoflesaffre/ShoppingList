import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppPersistentBottomNav } from "@/components/app_chrome";
import { ThemeSync } from "@/components/theme_sync";
import { InAppHistoryTracker } from "@/components/in_app_history_tracker";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "@/lib/theme";

const HEAD_CLEANUP_SCRIPT = `(function(){var n=document.head.firstChild;while(n){var x=n.nextSibling;if(n.nodeType===8||(n.nodeType===3&&!n.textContent.trim()))n.remove();n=x;}})();`;
import "./globals.css";

export const viewport: Viewport = {
  /** Statusbalk/splash = `--bg-app` van het actieve thema; `ThemeSync` volgt een handmatige keuze. */
  themeColor: THEME_COLORS.light,
  width: "device-width",
  initialScale: 1,
  /** iOS: pagina mag onder notch/statusbalk tekenen → app-achtergrond zichtbaar i.p.v. witte balk. */
  viewportFit: "cover",
  /**
   * Virtueel toetsenbord legt over de pagina i.p.v. layout te verkleinen
   * (voorkomt dat modals/slide-ins omhoog springen en inhoud eronder tonen).
   */
  interactiveWidget: "overlays-content",
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
     * "black-translucent" = inhoud loopt door onder de balk; zie body-achtergrond + safe-area padding.
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
    /* `data-theme` wordt vóór de eerste paint gezet door THEME_INIT_SCRIPT, dus wijkt af van de server-HTML. */
    <html lang="nl" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Netlify zet op *.netlify.app een HTML-commentaar in <head>; React
            hydrateert dan niet. Verwijder commentaar/witruimte vóór hydratatie. */}
        <script dangerouslySetInnerHTML={{ __html: HEAD_CLEANUP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        <InAppHistoryTracker />
        {children}
        <Suspense fallback={null}>
          <AppPersistentBottomNav />
        </Suspense>
      </body>
    </html>
  );
}
