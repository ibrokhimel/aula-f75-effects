import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AULA F75 Controller",
  description: "Keyboard RGB effects with a shared engine and an AULA F75 bridge — Windows desktop app and browser preview.",
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
