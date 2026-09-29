import type { Metadata, Viewport } from "next";
import "./globals.css";
// Keep browser zoom available; fit content around phone notches and keyboards.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#080e17",
};
export const metadata: Metadata = {
  title: "PROJECT 19 — The Lost Archive",
  description: "A story waiting to be found.",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
