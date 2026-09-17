import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Party Agent Nominations",
  robots: { index: false, follow: false },
};

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-bg">{children}</div>;
}
