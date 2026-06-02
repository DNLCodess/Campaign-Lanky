import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lanky.ng"),
  title: {
    default: "Lanky — The Bridge-Builder | Ibadan SW/NW Federal Constituency",
    template: "%s | Lanky for Ibadan",
  },
  description:
    "Okesooto Olanrewaju Moses — Labour Party candidate for the Federal House of Representatives, Ibadan Southwest / Northwest. Innovation for Ibadan: Securing Our Future, Together.",
  keywords: [
    "Lanky",
    "Okesooto Olanrewaju Moses",
    "Ibadan Southwest Northwest",
    "Federal House of Representatives",
    "Labour Party",
    "Ibadan",
  ],
  openGraph: {
    title: "Lanky — The Bridge-Builder",
    description: "Innovation for Ibadan: Securing Our Future, Together.",
    type: "website",
    locale: "en_NG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
