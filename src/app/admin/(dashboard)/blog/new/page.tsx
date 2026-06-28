import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { createDraftPost } from "@/app/admin/(dashboard)/blog/actions";

// Immediately creates a draft row and redirects to the editor.
export default async function NewBlogPostPage() {
  await requireAdmin();
  const id = await createDraftPost();
  redirect(`/admin/blog/${id}/edit`);
}
