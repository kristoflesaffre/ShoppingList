import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#f5f3fb",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Shopping List",
  description: "Samen boodschappenlijsten beheren",
  applicationName: "Shopping List",
  appleWebApp: {
    capable: true,
    title: "Shopping List",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
