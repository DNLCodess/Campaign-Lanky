// Finalises (processes) an uploaded gallery item. A route handler rather than a
// server action so slow sharp work doesn't block the client's serialised
// server-action queue (createUpload, caption saves, Publish).
import { revalidatePath } from "next/cache";
import { type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { finalizeItemOp } from "@/lib/gallery/ops";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  // CSRF guard: only same-origin browser requests.
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const user = await getAdminUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  let itemId: unknown;
  try {
    ({ itemId } = (await request.json()) as { itemId?: unknown });
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof itemId !== "string" || !UUID_RE.test(itemId)) {
    return Response.json({ error: "Invalid item id." }, { status: 400 });
  }

  try {
    const result = await finalizeItemOp(createAdminSupabase(), itemId);
    if (!result.error) {
      revalidatePath("/gallery");
      revalidatePath("/news");
    }
    return Response.json(result.error ? { error: result.error } : {});
  } catch {
    return Response.json({ error: "Processing didn't finish. Retry." }, { status: 500 });
  }
}
