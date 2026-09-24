"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A table row that opens `href` when clicked anywhere. Real links inside it
 * (name, View, phone) keep working as normal, and so does selecting text.
 * Keyboard users use the name link, so the row itself needs no tab stop.
 */
export function ClickableRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      className={`cursor-pointer ${className ?? ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        if (window.getSelection()?.toString()) return;
        router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
