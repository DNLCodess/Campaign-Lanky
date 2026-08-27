type HistoryRow = {
  id: string;
  subject: string;
  body: string;
  target_description: string;
  emailed_count: number;
  total_count: number;
  created_at: string;
};

export function MessageHistory({ messages }: { messages: HistoryRow[] }) {
  if (messages.length === 0) {
    return (
      <div className="rounded-brand border border-border bg-surface/30 px-4 py-8 text-center text-sm text-text-muted">
        No messages sent yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <details key={m.id} className="rounded-brand border border-border bg-surface/20">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <span className="text-sm text-text">{m.subject}</span>
              <span className="ml-2 text-xs text-text-muted">— {m.target_description}</span>
            </div>
            <span className="text-xs text-text-muted">
              {m.emailed_count}/{m.total_count} emailed · {new Date(m.created_at).toLocaleDateString()}
            </span>
          </summary>
          <div className="border-t border-border/60 px-4 py-3 text-sm text-text-muted">{m.body}</div>
        </details>
      ))}
    </div>
  );
}
