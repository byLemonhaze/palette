import type { Metadata } from "next";
import { Syne, Fragment_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700", "800"],
  display: "swap"
});

const fragmentMono = Fragment_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: "400",
  style: ["normal", "italic"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Palette Engine",
  description: "Generative color palette engine. Seeded, lockable, themeable."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${fragmentMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
