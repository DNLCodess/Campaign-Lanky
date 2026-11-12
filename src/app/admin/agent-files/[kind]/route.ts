import { getAdminUser } from "@/lib/admin-auth";
import { isFileKind, zipResponse } from "@/lib/agents/admin-file-downloads";

export const dynamic = "force-dynamic";

/** ZIP of every agent's file of one kind (signature | id | photo) for a candidate, optionally one ward. */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (!(await getAdminUser())) return new Response("Unauthorized", { status: 401 });
  const { kind } = await params;
  if (!isFileKind(kind)) return new Response("Not found", { status: 404 });
  return zipResponse(kind, new URL(req.url).searchParams);
}
