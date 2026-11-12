import { getAdminUser } from "@/lib/admin-auth";
import {
  downloadStoredFile,
  getAdminNomination,
  getFilePaths,
  nominationFileBase,
} from "@/lib/agents/admin-nominations";

export const dynamic = "force-dynamic";

/** Downloads one agent's specimen signature as the original PNG. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const nomination = await getAdminNomination(id);
  if (!nomination) return new Response("Not found", { status: 404 });

  const path = (await getFilePaths([id], "specimen_signature")).get(id);
  const bytes = path ? await downloadStoredFile(path) : null;
  if (!bytes) return new Response("Signature not found", { status: 404 });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${nominationFileBase(nomination)}_signature.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
