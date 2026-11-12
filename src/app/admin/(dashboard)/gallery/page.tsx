import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminEntries, type AdminEntry } from "@/lib/gallery/queries";
import { youTubeThumb } from "@/lib/gallery/youtube";
import { createEntry } from "./actions";

export const dynamic = "force-dynamic";

// POST (form) rather than a GET page so link prefetching can never create drafts.
async function newOuting() {
  "use server";
  await requireAdmin();
  const id = await createEntry("outing");
  redirect(`/admin/gallery/${id}`);
}

async function newSingle() {
  "use server";
  await requireAdmin();
  const id = await createEntry("single");
  redirect(`/admin/gallery/${id}`);
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

const primaryBtn =
  "rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover";
const ghostBtn =
  "rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text";

export default async function AdminGalleryPage() {
  await requireAdmin();
  const entries = await getAdminEntries();

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <Link href="/admin" className="text-sm text-text-muted/60 hover:text-text-muted">
            ← Campaign Admin
          </Link>
          <h1 className="mt-2 font-heading text-2xl text-text">Gallery</h1>
        </div>
        <div className="flex gap-2">
          <form action={newSingle}>
            <button type="submit" className={ghostBtn}>New single</button>
          </form>
          <form action={newOuting}>
            <button type="submit" className={primaryBtn}>New outing</button>
          </form>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-16 text-center text-text-muted">
          Nothing here yet. Start with a new outing (many photos from one event) or a new single.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border/40">
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryRow({ entry }: { entry: AdminEntry }) {
  const cover = entry.cover;
  const thumb = cover ? (cover.type === "youtube" && cover.youtubeId ? youTubeThumb(cover.youtubeId, cover.width < cover.height) : cover.src) : null;
  const published = entry.status === "published";
  const title = entry.title.trim() || "Untitled";

  return (
    <li>
      <Link
        href={`/admin/gallery/${entry.id}`}
        className="flex items-center gap-4 py-4 transition-colors hover:bg-surface/20"
      >
        <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-brand bg-bg sm:h-20 sm:w-28">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              srcSet={cover?.type !== "youtube" ? (cover?.srcSet ?? undefined) : undefined}
              sizes="112px"
              alt=""
              loading="lazy"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-[10px] text-text-muted/60">No media</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                published ? "bg-green-500/15 text-green-300" : "bg-white/10 text-text-muted"
              }`}
            >
              {published ? "Published" : "Draft"}
            </span>
            <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-xs text-accent">
              {entry.kind === "outing" ? "Outing" : "Single"}
            </span>
            {entry.failed_count > 0 && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300">
                {entry.failed_count} failed
              </span>
            )}
            {published && !cover && (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">
                Not visible: no visible items
              </span>
            )}
          </div>
          <h2 className={`mt-1 truncate font-heading text-lg ${entry.title.trim() ? "text-text" : "text-text-muted"}`}>
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-text-muted/70">
            {formatDay(entry.taken_on)}
            {entry.place ? ` · ${entry.place}` : ""}
            {" · "}
            {entry.item_count} {entry.item_count === 1 ? "item" : "items"}
          </p>
        </div>
      </Link>
    </li>
  );
}
