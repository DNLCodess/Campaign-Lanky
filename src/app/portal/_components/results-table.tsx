type ResultRow = {
  id: string;
  lga: string;
  ward: number;
  polling_unit: string;
  votes_cast: number;
  accredited_voters: number;
  registered_voters: number;
  created_at: string;
  candidates: { name: string; party: string | null } | { name: string; party: string | null }[] | null;
  portal_accounts: { full_name: string } | { full_name: string }[] | null;
};

function one<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function ResultsTable({ rows }: { rows: ResultRow[] }) {
  return (
    <div className="overflow-x-auto rounded-brand border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Polling Unit</th>
            <th className="px-4 py-3 font-medium">Ward</th>
            <th className="px-4 py-3 font-medium">Candidate</th>
            <th className="px-4 py-3 font-medium">Votes</th>
            <th className="px-4 py-3 font-medium">Accredited / Registered</th>
            <th className="px-4 py-3 font-medium">Submitted by</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-text-muted">
                No results submitted yet.
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const candidate = one(r.candidates);
            const agent = one(r.portal_accounts);
            return (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 text-text">{r.polling_unit}</td>
                <td className="px-4 py-3 text-text-muted">{r.ward}</td>
                <td className="px-4 py-3 text-text">
                  {candidate?.name} <span className="text-text-muted">({candidate?.party || "—"})</span>
                </td>
                <td className="px-4 py-3 text-text">{r.votes_cast}</td>
                <td className="px-4 py-3 text-text-muted">
                  {r.accredited_voters} / {r.registered_voters}
                </td>
                <td className="px-4 py-3 text-text-muted">{agent?.full_name ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
