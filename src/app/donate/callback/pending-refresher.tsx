"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Invisibly polls for a status update when a donation is pending confirmation.
 * Calls router.refresh() every 15s (up to 8 attempts = 2 min) so the server
 * component re-runs and shows "success" as soon as the webhook fires.
 */
export function PendingRefresher() {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;
    const MAX = 8;
    const id = setInterval(() => {
      attempts++;
      router.refresh();
      if (attempts >= MAX) clearInterval(id);
    }, 15_000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
