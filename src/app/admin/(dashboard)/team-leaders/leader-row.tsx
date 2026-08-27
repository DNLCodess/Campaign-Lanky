"use client";

import { useState } from "react";
import type { TeamLeader } from "@/lib/team-leaders";
import { deleteTeamLeader } from "@/app/admin/(dashboard)/team-leaders/actions";
import { LeaderForm } from "@/app/admin/(dashboard)/team-leaders/leader-form";

type GeoRow = { lga: string; ward: number; pu_code: string; pu_name: string };

function geoLabel(leader: TeamLeader): string {
  if (leader.level === "constituency") return "Constituency-wide";
  if (leader.level === "lga") return leader.lga ?? "—";
  if (leader.level === "ward") return `${leader.lga} · Ward ${leader.ward}`;
  return `${leader.lga} · Ward ${leader.ward} · ${leader.polling_unit}`;
}

/** Desktop table row with inline edit toggle. */
export function LeaderRow({ leader, geo }: { leader: TeamLeader; geo: GeoRow[] }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <tr className="border-t border-border/40">
        <td colSpan={6} className="px-4 py-4">
          <LeaderForm leader={leader} geo={geo} onDone={() => setEditing(false)} />
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-border/40">
      <td className="px-4 py-3 text-text">
        {leader.full_name}
        {leader.portal_account_id && (
          <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
            portal-linked
          </span>
        )}
      </td>
      <td className="px-4 py-3">{leader.title}</td>
      <td className="px-4 py-3">{geoLabel(leader)}</td>
      <td className="px-4 py-3">{leader.phone ?? "—"}</td>
      <td className="px-4 py-3">{leader.email ?? "—"}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-brand border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent hover:text-text"
          >
            Edit
          </button>
          <DeleteButton id={leader.id} name={leader.full_name} />
        </div>
      </td>
    </tr>
  );
}

/** Mobile card with inline edit toggle. */
export function LeaderCard({ leader, geo }: { leader: TeamLeader; geo: GeoRow[] }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="rounded-brand border border-border bg-surface/40 p-4">
        <LeaderForm leader={leader} geo={geo} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="rounded-brand border border-border bg-surface/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-text">
            {leader.full_name}
            {leader.portal_account_id && (
              <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                portal-linked
              </span>
            )}
          </p>
          <p className="text-xs text-text-muted">{leader.title}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3 text-sm">
        <Meta label="Level" value={geoLabel(leader)} />
        <Meta label="Phone" value={leader.phone ?? "—"} />
        <Meta label="Email" value={leader.email ?? "—"} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-brand border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          Edit
        </button>
        <DeleteButton id={leader.id} name={leader.full_name} />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-text-muted/70">{label}</span>
      <span className="text-right text-text-muted">{value}</span>
    </div>
  );
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteTeamLeader}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(`Remove ${name}?`)) e.preventDefault();
        }}
        className="rounded-brand border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-primary hover:text-primary"
      >
        Remove
      </button>
    </form>
  );
}
