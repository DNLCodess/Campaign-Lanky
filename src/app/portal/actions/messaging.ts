"use server";

import { requirePortalRole, logPortalAudit, type PortalSession } from "@/lib/portal/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { notifyLeader } from "@/lib/email";
import type { PortalRole } from "@/lib/portal/constants";

export type MessageActionState = {
  error?: string;
  success?: string;
};

export type MessageFilters = {
  role?: PortalRole;
  ward?: number;
  includeTeamLeaders?: boolean;
};

type Recipient = { name: string; email: string | null; phone: string | null; via: "portal" | "team_leader" };

/** Roles this session is allowed to target, and the geographic ceiling it can't broaden past. */
function scopeFor(session: PortalSession): { allowedRoles: PortalRole[]; lga: string | null; ward: number | null } {
  if (session.role === "constituency_admin") {
    return { allowedRoles: ["lga_coordinator", "ward_agent", "pu_agent"], lga: null, ward: null };
  }
  if (session.role === "lga_coordinator") {
    return { allowedRoles: ["ward_agent", "pu_agent"], lga: session.lga, ward: null };
  }
  // ward_agent
  return { allowedRoles: ["pu_agent"], lga: session.lga, ward: session.ward };
}

export async function getMessageAudience(filters: MessageFilters): Promise<{
  recipients: Recipient[];
  description: string;
}> {
  const session = await requirePortalRole(["constituency_admin", "lga_coordinator", "ward_agent"]);
  const scope = scopeFor(session);

  const targetRole = filters.role && scope.allowedRoles.includes(filters.role) ? filters.role : undefined;
  const targetWard = scope.ward ?? filters.ward;

  const admin = createAdminSupabase();
  let query = admin
    .from("portal_accounts")
    .select("full_name, email, phone, role, lga, ward")
    .in("role", targetRole ? [targetRole] : scope.allowedRoles)
    .eq("is_active", true);
  if (scope.lga) query = query.eq("lga", scope.lga);
  if (targetWard) query = query.eq("ward", targetWard);

  const { data: accounts } = await query;
  const recipients: Recipient[] = (accounts ?? []).map((a) => ({
    name: a.full_name,
    email: a.email,
    phone: a.phone,
    via: "portal",
  }));

  if (filters.includeTeamLeaders) {
    let tlQuery = admin.from("team_leaders").select("full_name, email, phone, level, lga, ward");
    if (scope.lga) tlQuery = tlQuery.eq("lga", scope.lga);
    if (targetWard) tlQuery = tlQuery.eq("ward", targetWard);
    const { data: leaders } = await tlQuery;
    recipients.push(
      ...(leaders ?? []).map((l) => ({ name: l.full_name, email: l.email, phone: l.phone, via: "team_leader" as const })),
    );
  }

  const parts = [
    targetRole ? targetRole.replace("_", " ") : "all leaders",
    scope.lga ?? "both LGAs",
    targetWard ? `Ward ${targetWard}` : null,
  ].filter(Boolean);
  const description = parts.join(" · ");

  return { recipients, description };
}

export async function sendLeaderMessage(
  _prev: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const session = await requirePortalRole(["constituency_admin", "lga_coordinator", "ward_agent"]);

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const role = String(formData.get("role") ?? "") as PortalRole | "";
  const wardRaw = String(formData.get("ward") ?? "").trim();
  const includeTeamLeaders = formData.get("include_team_leaders") === "on";

  if (!subject) return { error: "Subject is required." };
  if (!body) return { error: "Message body is required." };

  const filters: MessageFilters = {
    role: role || undefined,
    ward: wardRaw ? Number(wardRaw) : undefined,
    includeTeamLeaders,
  };

  const { recipients, description } = await getMessageAudience(filters);
  if (recipients.length === 0) return { error: "No leaders match that audience." };

  let emailedCount = 0;
  for (const r of recipients) {
    if (!r.email) continue;
    const ok = await notifyLeader({ to: r.email, name: r.name, subject, body });
    if (ok) emailedCount += 1;
  }

  const admin = createAdminSupabase();
  await admin.from("leader_messages").insert({
    subject,
    body,
    target_description: description,
    target_filter: filters,
    recipients,
    emailed_count: emailedCount,
    total_count: recipients.length,
    sent_by: session.id,
  });

  await logPortalAudit({
    action: "MESSAGE_SENT",
    tableName: "leader_messages",
    performedBy: session.id,
    notes: `"${subject}" to ${description} (${emailedCount}/${recipients.length} emailed)`,
  });

  return {
    success: `Sent to ${emailedCount} of ${recipients.length} leaders by email (${description}). ${
      recipients.length - emailedCount
    } have no email on file — see the recipient list below for their phone numbers.`,
  };
}

export async function listLeaderMessages() {
  const session = await requirePortalRole(["constituency_admin", "lga_coordinator", "ward_agent"]);
  const admin = createAdminSupabase();
  let query = admin
    .from("leader_messages")
    .select("id, subject, body, target_description, emailed_count, total_count, created_at, sent_by")
    .order("created_at", { ascending: false })
    .limit(50);
  if (session.role !== "constituency_admin") query = query.eq("sent_by", session.id);
  const { data } = await query;
  return data ?? [];
}
