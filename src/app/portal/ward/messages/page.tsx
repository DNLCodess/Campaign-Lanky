import { requirePortalRole } from "@/lib/portal/session";
import { listLeaderMessages } from "@/app/portal/actions/messaging";
import { ComposeMessageForm } from "@/app/portal/_components/compose-message-form";
import { MessageHistory } from "@/app/portal/_components/message-history";

export const dynamic = "force-dynamic";

const ROLE_OPTIONS = [{ value: "pu_agent" as const, label: "PU Agents" }];

export default async function WardMessagesPage() {
  const session = await requirePortalRole(["ward_agent"]);
  const messages = await listLeaderMessages();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-text">
          Message Leaders — {session.lga}, Ward {session.ward}
        </h1>
        <p className="mt-1 text-sm text-text-muted">Send to your PU agents.</p>
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
