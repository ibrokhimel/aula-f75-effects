import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AULA F75 Controller",
  description: "Configure the AULA F75 keyboard from Linux over WebHID — effects, remapping, per-key colors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
