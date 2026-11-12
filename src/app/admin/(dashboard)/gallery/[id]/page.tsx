import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { galleryPublicUrl, getAdminEntry } from "@/lib/gallery/queries";
import { toAdminEntryView, toAdminItemView } from "../_components/admin-view";
import { EntryEditor } from "../_components/entry-editor";

export const dynamic = "force-dynamic";

export default async function GalleryEntryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const data = await getAdminEntry(id);
  if (!data) notFound();

  return (
    <EntryEditor
      entry={toAdminEntryView(data.entry)}
      items={data.items.map((row) => toAdminItemView(row, galleryPublicUrl))}
    />
  );
}
