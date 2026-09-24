"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CandidateForm } from "@/app/admin/(dashboard)/agent-nominations/candidates/candidate-form";
import { CopyButton, Modal } from "@/app/admin/(dashboard)/agent-nominations/candidates/candidate-modal";
import { agentLink } from "@/app/admin/(dashboard)/agent-nominations/candidates/agent-link";
import { ELECTION_TYPE_LABELS, type ElectionType } from "@/lib/agents/constants";

const selectClass =
  "rounded-brand border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none";

export type CandidateRow = {
  id: string;
  full_name: string;
  email: string;
  office: string;
  election_type: string;
  slug: string;
  is_active: boolean | null;
};

export function CandidatesView({ candidates }: { candidates: CandidateRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<"name" | "newest">("name");

  const types = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.election_type))),
    [candidates],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = candidates.filter(
      (c) =>
        (type === "all" || c.election_type === type) &&
        (!q || [c.full_name, c.email, c.office].some((v) => v.toLowerCase().includes(q))),
    );
    // candidates arrive newest-first from the server
    return sort === "name"
      ? [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name))
      : rows;
  }, [candidates, query, type, sort]);

  const isFiltered = query.trim() !== "" || type !== "all";

  function close() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="candidate-search" className="sr-only">
            Search candidates
          </label>
          <input
            id="candidate-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or office"
            className="w-full rounded-brand border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
          />
        </div>
        {types.length > 1 && (
          <select
            aria-label="Filter by election type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={selectClass}
          >
            <option value="all">All election types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {ELECTION_TYPE_LABELS[t as ElectionType]}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Sort candidates"
          value={sort}
          onChange={(e) => setSort(e.target.value as "name" | "newest")}
          className={selectClass}
        >
          <option value="name">Sort: A–Z</option>
          <option value="newest">Sort: Newest first</option>
        </select>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-brand bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          + Add candidate
        </button>
      </div>

      <p className="mt-4 text-sm text-text-muted" aria-live="polite">
        {isFiltered
          ? `${filtered.length} of ${candidates.length} candidates`
          : `${candidates.length} ${candidates.length === 1 ? "candidate" : "candidates"}`}
      </p>

      {candidates.length === 0 ? (
        <div className="mt-3 rounded-brand border border-dashed border-border p-10 text-center">
          <p className="font-medium text-text">No candidates yet</p>
          <p className="mt-1 text-sm text-text-muted">
            Add a candidate to give them a login and a link for their agents.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 rounded-brand bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            + Add candidate
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-3 rounded-brand border border-dashed border-border p-8 text-center text-sm text-text-muted">
          No candidate matches “{query}”.
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-brand border border-border">
          <table className="w-full text-left text-sm">
            <thead className="hidden bg-surface/60 text-xs text-text-muted md:table-header-group">
              <tr>
                <th className="px-4 py-2.5 font-medium">Candidate</th>
                <th className="px-4 py-2.5 font-medium">Office</th>
                <th className="px-4 py-2.5 text-right font-medium">Agents’ link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 md:table-row md:px-0 md:py-0 hover:bg-surface/30">
                  <td className="col-start-1 row-start-1 md:table-cell md:px-4 md:py-2.5">
                    <p className="flex items-center gap-2 font-medium text-text">
                      {c.full_name}
                      {c.is_active === false && (
                        <span className="rounded-full bg-border px-2 py-0.5 text-xs font-normal text-text-muted">
                          Inactive
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-text-muted">{c.email}</p>
                  </td>
                  <td className="col-start-1 row-start-2 mt-1 text-text-muted md:table-cell md:px-4 md:py-2.5">
                    <p className="truncate text-sm md:max-w-64" title={c.office}>
                      {c.office}
                    </p>
                    <p className="text-xs text-text-muted/80">
                      {ELECTION_TYPE_LABELS[c.election_type as ElectionType]}
                    </p>
                  </td>
                  <td className="col-start-2 row-span-2 row-start-1 md:table-cell md:px-4 md:py-2.5 md:text-right">
                    <CopyButton
                      text={agentLink(c.slug)}
                      label="Copy link"
                      copiedLabel="Copied"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={close} title="Add a candidate">
        <CandidateForm onDone={close} />
      </Modal>
    </>
  );
}
