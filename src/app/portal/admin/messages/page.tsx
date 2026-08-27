import { requirePortalRole } from "@/lib/portal/session";
import { listLeaderMessages } from "@/app/portal/actions/messaging";
import { ComposeMessageForm } from "@/app/portal/_components/compose-message-form";
import { MessageHistory } from "@/app/portal/_components/message-history";

export const dynamic = "force-dynamic";

const ROLE_OPTIONS = [
  { value: "lga_coordinator" as const, label: "LGA Coordinators" },
  { value: "ward_agent" as const, label: "Ward Agents" },
  { value: "pu_agent" as const, label: "PU Agents" },
];

export default async function AdminMessagesPage() {
  await requirePortalRole(["constituency_admin"]);
  const messages = await listLeaderMessages();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">Message Leaders</h1>
        <p className="mt-1 text-sm text-text-muted">
          Send to any tier of the hierarchy — LGA coordinators, ward agents, or PU agents — across
          both LGAs.
        </p>
      </div>

      <div className="rounded-brand border border-border bg-surface/40 p-6">
        <ComposeMessageForm roleOptions={ROLE_OPTIONS} />
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
