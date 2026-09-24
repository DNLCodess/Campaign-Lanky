"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const control =
  "rounded-brand border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none";

/** Search + filters that live in the URL, so a filtered view survives refresh, back and sharing. */
export function NominationFilters({ wards }: { wards: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  // Keep the box in step when filters are cleared from elsewhere (e.g. "Clear filters").
  const urlQ = params.get("q") ?? "";
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setQ(urlQ);
  }

  function onSearch(value: string) {
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value.trim() }), 350);
  }

  const ward = params.get("ward") ?? "";
  const sort = params.get("sort") ?? "";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-56 flex-1">
        <label htmlFor="nomination-search" className="sr-only">
          Search nominations
        </label>
        <input
          id="nomination-search"
          type="search"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search name, phone, email or reference"
          className={`${control} w-full placeholder:text-text-muted/60`}
        />
      </div>
      {wards.length > 1 && (
        <select
          aria-label="Filter by ward"
          value={ward}
          onChange={(e) => update({ ward: e.target.value })}
          className={control}
        >
          <option value="">All wards</option>
          {wards.map((w) => (
            <option key={w} value={w}>
              Ward {w}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label="Sort nominations"
        value={sort}
        onChange={(e) => update({ sort: e.target.value })}
        className={control}
      >
        <option value="">Sort: Newest first</option>
        <option value="oldest">Sort: Oldest first</option>
        <option value="name">Sort: Name A–Z</option>
        <option value="unit">Sort: Polling unit</option>
      </select>
    </div>
  );
}
