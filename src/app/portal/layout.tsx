import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Results Portal", template: "%s | Lanky Results Portal" },
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg text-text">{children}</div>;
}
