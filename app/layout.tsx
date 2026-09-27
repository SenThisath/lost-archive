import type { Metadata } from "next";
import "./globals.css";
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
