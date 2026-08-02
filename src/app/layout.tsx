import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteChrome } from "@/components/site-chrome";
import { StructuredData } from "@/components/structured-data";
import { site } from "@/lib/site";

// latin-ext carries U+20A0–20AB — without it the naira sign (₦) falls back to a
// system font and renders mismatched next to the loaded digits.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Lanky — The Bridge-Builder | Ibadan SW/NW Federal Constituency",
    template: "%s | Lanky for Ibadan",
  },
  description:
    "Olanrewaju Okesooto — Labour Party candidate for the Federal House of Representatives, Ibadan Southwest / Northwest. Innovation for Ibadan: Securing Our Future, Together.",
  applicationName: `${site.shortName} for Ibadan`,
  authors: [{ name: site.candidate }],
  creator: site.candidate,
  publisher: `${site.shortName} Campaign`,
  keywords: [
    "Lanky",
    "Olanrewaju Okesooto",
    "Ibadan Southwest Northwest",
    "Federal House of Representatives",
    "Labour Party",
    "Oyo State",
    "Ibadan",
    "2027 elections",
    "Nigeria elections",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Lanky — The Bridge-Builder",
    description: site.slogan,
    siteName: `${site.shortName} for Ibadan`,
    url: site.url,
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lanky — The Bridge-Builder",
    description: site.slogan,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon_io/apple-touch-icon.png",
  },
  category: "politics",
  // verification: { google: "<token>", other: { "facebook-domain-verification": "<token>" } },
};

export const viewport: Viewport = {
  themeColor: "#071a26",
  colorScheme: "dark",
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
        <StructuredData />
        <SiteChrome header={<SiteHeader />} footer={<SiteFooter />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
