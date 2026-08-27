import { requirePortalRole } from "@/lib/portal/session";
import { listLeaderMessages } from "@/app/portal/actions/messaging";
import { listWards } from "@/lib/portal/geo";
import { ComposeMessageForm } from "@/app/portal/_components/compose-message-form";
import { MessageHistory } from "@/app/portal/_components/message-history";

export const dynamic = "force-dynamic";

const ROLE_OPTIONS = [
  { value: "ward_agent" as const, label: "Ward Agents" },
  { value: "pu_agent" as const, label: "PU Agents" },
];

export default async function LgaMessagesPage() {
  const session = await requirePortalRole(["lga_coordinator"]);
  const [messages, wards] = await Promise.all([listLeaderMessages(), listWards(session.lga!)]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">Message Leaders — {session.lga}</h1>
        <p className="mt-1 text-sm text-text-muted">
          Send to your ward agents or PU agents, optionally narrowed to one ward.
        </p>
      </div>

      <div className="rounded-brand border border-border bg-surface/40 p-6">
        <ComposeMessageForm roleOptions={ROLE_OPTIONS} wards={wards} />
      </div>

      <div>
        <h2 className="font-heading text-lg text-text">Sent messages</h2>
        <div className="mt-3">
          <MessageHistory messages={messages} />
        </div>
      </div>
    </div>
  );
}
