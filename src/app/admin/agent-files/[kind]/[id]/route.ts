import { getAdminUser } from "@/lib/admin-auth";
import { isFileKind, singleFileResponse } from "@/lib/agents/admin-file-downloads";

export const dynamic = "force-dynamic";

/** One agent's file (signature | id | photo) in its original format. */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  if (!(await getAdminUser())) return new Response("Unauthorized", { status: 401 });
  const { kind, id } = await params;
  if (!isFileKind(kind)) return new Response("Not found", { status: 404 });
  return singleFileResponse(kind, id);
}
