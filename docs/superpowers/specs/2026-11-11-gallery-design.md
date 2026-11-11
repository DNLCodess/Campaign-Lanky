# Gallery & Videos — Design

**Date:** 2026-11-11
**Status:** Ready for approval
**Replaces:** the hardcoded 3-image "Gallery & videos" strip on `/news` (`src/app/news/page.tsx`)

## Intent

Visitors to the campaign site should be able to see what the candidate has been up to — market visits, courtesy calls, town halls, radio interviews — as photos and short videos. It is a **visual record of the campaign trail**, meant to be an enjoyable continuous scroll, not something to read or interact with. Long-form writing already lives in the blog; the gallery does not compete with it.

Admins post media from outings, sometimes from a phone at or straight after the event, sometimes from a laptop later with better camera shots.

The CAMPAIGN_BRIEF (§5, "Gallery & Videos: Hi-res photos and short videos with market women, elders, youth groups") is the original requirement.

## Goals

1. A public `/gallery` page: one continuous, newest-first feed of photos, short uploaded videos and YouTube videos.
2. Content can be **grouped as an outing** (title, date, place, short text, many items) **or posted as a standalone single** (one photo / clip / YouTube link with a caption).
3. **Every image and video is shown at its true aspect ratio.** Never cropped, stretched, squashed or letterboxed into a fixed box. The layout adapts to the media, not the other way round. (Explicit client requirement.)
4. Admin management inside the existing `/admin` dashboard, usable comfortably on a phone and on a laptop.
5. Fast on Nigerian mobile data.

## Non-goals (v1)

- Likes, comments, share counts, view counts, reactions — anything that makes it feel like a social network or a second blog.
- Separate pages per outing. Everything happens on the one feed (client decision).
- Public/visitor uploads.
- Server-side video transcoding.
- Tagging people, search, or Photos/Videos filters.
- Audio-only uploads (radio interviews go up as a video file or a YouTube link).

## Anti-goals (would make this a failure even if it "works")

These were delegated to the builder's judgement by the client; they are **my calls**, recorded so they can be vetoed:

- A face or group cut off by cropping; any distorted image.
- The page jumping around as images load (layout shift).
- A heavy page that crawls on 3G / burns visitors' data.
- Video autoplaying with sound.
- An admin at an event losing uploads to a flaky connection with no way to tell what made it.
- An empty or broken-looking gallery being publicly visible.

## Public experience

### Location & entry points

- Route: **`/gallery`**. Add "Gallery" to the main nav in `src/lib/site.ts`, directly after "News & Media".
- The existing strip on `/news` becomes a **live teaser**: the latest ~6 **entries**, one tile each (an outing shows its cover item, a single shows its item), aspect-true, plus a "See the full gallery" link. Tapping a tile goes to `/gallery#<slug>` (outing) or `/gallery` (single). If nothing is published, the strip is hidden. (My call: one big outing shouldn't fill the whole strip.)
- Add `/gallery` to `src/app/sitemap.ts`; give it page metadata and OG/Twitter images consistent with the other public pages.
- If nothing is published yet, `/gallery` shows a tasteful "Photos from the campaign trail are coming soon" state and the nav item is still shown (my call: simpler than conditional nav).

### Feed layout (chosen option: "grid with outing strips")

Entries are ordered by **event date, newest first** (ties broken by publish time). The feed renders them in that order:

- **Outing** → a full-width block: heading line (title · date · place · item count), the short text, then a **horizontal swipeable strip** of its items. Every item in the strip has the **same height**; each item's **width = height × its aspect ratio**. Scroll-snap, arrow buttons on desktop, natural swipe on touch. Strip height roughly 220px on phones, 300px+ on desktop (builder to tune).
- **Run of consecutive singles** → laid out as **justified rows** (Google Photos / Flickr style): each row's items keep their true ratios and the row height is solved so the row exactly fills the width. The last incomplete row must not be blown up — cap it at the target row height and left-align. Each single shows its caption under/over it (builder's call, keep it light).
- An outing between singles breaks the run; singles before and after it form separate row blocks.
- Singles need a stable anchor too, so give every entry a slug (outings: from title; singles: from caption or id).
- Each outing block gets an anchor id from its slug (e.g. `/gallery#bodija-market-visit`) so a specific outing can be linked/shared. (My call — gives sharing without separate pages.)

### Aspect-ratio handling

- Width and height are known for every item **before render** (stored in the DB), so space is reserved exactly and nothing shifts.
- Extreme shapes: clamp the *layout* ratio to a sane range (e.g. 0.5–2.5) so a panorama doesn't become a sliver row; when clamped, the tile shows the **whole image contained** on a subtle branded backdrop — never a crop.
- YouTube: 16:9, except Shorts URLs (`/shorts/`) which are 9:16.
- Phone videos: their real ratio (commonly 9:16 or 16:9).

### Viewing

- Tapping any item opens a **full-screen viewer** (lightbox) at that item: image shown whole (`contain`) on a dark background, swipe / arrow keys to move, Esc / close button to exit, caption shown. Within an outing the viewer steps through that outing's items; from a single row, it steps through the visible singles (builder may choose to step through the whole loaded feed instead).
- Uploaded videos play in the viewer with controls; they never autoplay with sound. In the feed they show a poster frame, a ▶ badge and duration.
- YouTube items show the YouTube thumbnail in the feed; the actual player iframe (use `youtube-nocookie.com`) loads only when opened. No iframes in the initial page.
- (My call: one place where media plays — the viewer — rather than inline players scattered through the feed. Keeps the feed light and avoids multiple players fighting.)

### Loading & performance

- First page of entries server-rendered; more load automatically on scroll (cursor pagination on `(taken_on, published_at, id)`), with a "Load more" button fallback.
- Images served from pre-generated web-sized variants with `srcset`/`sizes`; a tiny blur placeholder fills each tile until the image arrives.
- Lazy-load everything below the first screen.

## Content model

Two tables (new SQL migration under `docs/superpowers/specs/`, following the repo's existing pattern of SQL files applied to Supabase).

**`gallery_entries`** — one row per outing or single.

| column | notes |
|---|---|
| `id` uuid pk | |
| `kind` | `'outing'` \| `'single'` |
| `title` | outing title; for a single, its caption (may be empty for single) |
| `body` text null | outing short text (plain text, a few sentences; no rich text) |
| `place` text null | free text, e.g. "Bodija Market, Ibadan North" |
| `taken_on` date | event date; drives ordering; defaults to today |
| `slug` text unique | anchor id for every entry |
| `status` | `'draft'` \| `'published'` |
| `cover_item_id` uuid null | outing cover (used by the `/news` teaser and OG); defaults to first item |
| `published_at`, `created_at`, `updated_at` | |

**`gallery_items`** — media inside an entry. A single is an entry with exactly one item.

| column | notes |
|---|---|
| `id` uuid pk, `entry_id` fk → entries (on delete cascade) | |
| `position` int | order within the outing |
| `media_type` | `'image'` \| `'video'` \| `'youtube'` |
| `storage_path` text null | original upload (image/video) |
| `variants` jsonb null | `{ "640": url, "1280": url, "2048": url }` WebP variants; for video, of the poster |
| `poster_path` text null | video poster frame |
| `blur` text null | tiny base64 placeholder |
| `width`, `height` int | true display dimensions (after EXIF rotation) |
| `duration_s` numeric null | video |
| `youtube_id` text null, `youtube_short` bool | |
| `caption` text null | optional per-item caption inside an outing |
| `hidden` bool default false | hide one item without deleting it |
| `processing` | `'pending'` \| `'ready'` \| `'failed'` (+ `error` text) |

Public reads only `published` entries and `ready`, non-hidden items. Reads go through the server with `createAdminSupabase()` like `src/lib/blog.ts`; RLS enabled with no public policies (match existing tables). A published outing with zero ready items is not shown.

## Storage & processing

- New Supabase Storage bucket **`gallery`**, **public read** (public content; avoids signed-URL churn on a public page). Allowed types: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/quicktime`, `video/webm`. Bucket file-size limit **50 MB** (also the Supabase free-plan per-file ceiling — confirm the project's plan; if higher, keep 50 MB anyway).
- **Two buckets (my call, for privacy):** phone photos carry EXIF metadata including GPS, which would reveal the candidate's movements. So **image originals go to a private `gallery-originals` bucket**; only the processed WebP variants and video posters (written by `sharp`, which drops metadata) go to the public `gallery` bucket. Video files can't be stripped without transcoding, so they live in the public bucket under unguessable random paths; the admin uploader notes that video files may carry location data. Draft media is likewise only reachable by its random URL.
- **Video egress (my call):** videos play from the original file and the Supabase project is shared with the election portal, so feed videos use `preload="none"` and only download when a visitor opens one. Cap stays at **50 MB, which is roughly 30–40 seconds of 1080p phone video**. The uploader says so plainly and points longer clips (e.g. full radio interviews) to YouTube. Builder: check the project's Supabase plan egress allowance and flag if it is the free tier.
- **Uploads go directly from the browser to Storage** via signed upload URLs issued by an admin-gated server action — they must *not* pass through a server action / route body (the app's `serverActions.bodySizeLimit` is 11 MB, and the blog's `/api/blog/upload` route caps at 5 MB).
- **Per-file progress** is required (supabase-js `uploadToSignedUrl` doesn't report progress; use XHR to the signed URL or a resumable/TUS upload — builder's choice). Each file uploads independently: one failure doesn't block the rest, and failed files show a Retry.
- **Images:** after upload the client calls a server action to finalise the item. The server downloads the original, applies `sharp().rotate()` (EXIF orientation — critical for phone photos, otherwise width/height are wrong), records true width/height, writes WebP variants at 640 / 1280 / 2048px wide (never upscale) plus a blur placeholder, and marks the item `ready`. The original is kept.
- **Videos:** no server transcoding. The browser reads `videoWidth`, `videoHeight` and `duration` from the selected file and grabs a poster frame onto a canvas; the poster is uploaded and processed like an image. Server sanity-checks the client-reported dimensions.
- **HEIC:** iOS Safari normally converts to JPEG when picking from the photo library; if a HEIC still arrives and sharp can't decode it, mark the item `failed` with a plain message ("Unsupported photo format — export as JPEG"). Builder: verify sharp's prebuilt support on the deploy target.
- **iPhone `.mov` (HEVC):** accept, but show a soft notice in the admin uploader that some older Android phones may not play it, suggesting YouTube for anything important.
- Deleting an item or entry deletes its storage objects (original, variants, poster).
- YouTube thumbnails come from `i.ytimg.com` — add it to `images.remotePatterns` in `next.config.ts` if using `next/image`.

## Admin experience

New sidebar item **"Gallery"** (`src/app/admin/(dashboard)/_components/admin-sidebar.tsx`), after Blog. Same access as the rest of `/admin` (`requireAdmin()` on every page and action — derive the user inside each action, never accept it as a parameter).

- **`/admin/gallery`** — list of entries, newest event first: cover thumbnail, kind, title, date, item count, status, any failed items flagged. Buttons: **New outing**, **New single**.
- **New outing / New single** — creates a draft entry immediately (same pattern as `createDraftPost`) so uploads have somewhere to attach, then opens the editor.
- **Editor (`/admin/gallery/[id]`)**
  - Fields: title, date (defaults today), place, short text (outing); caption + date (single).
  - **Add media:** one button that opens the device picker (`multiple`, images + video; on phones this offers camera roll *and* camera), drag-and-drop on desktop, and a "Paste YouTube link" field (accepts `watch?v=`, `youtu.be/`, `/shorts/`, `/live/`; reject anything else with a clear message).
  - Live grid of items with thumbnails, per-file progress bars, status (uploading / processing / ready / failed + Retry), drag to reorder, set cover, per-item caption, hide, remove.
  - A single accepts exactly one item.
  - **Save draft / Publish / Unpublish / Delete** (delete asks for in-page confirmation — no `confirm()`).
  - Outings can be reopened and added to at any time (phone at the venue → laptop later).
  - **Live editing (client decision):** on a *published* entry, new items go public as soon as they finish processing, and text edits save live — there is no separate draft copy of a published entry. "Save draft" only exists while an entry is unpublished; once published the buttons are **Save** and **Unpublish**. `hidden` is the way to pull a single bad shot without unpublishing the outing.
  - Uploads continue while the admin edits text; leaving the page with uploads in progress warns them.
- Use the existing admin styling/components; the portal form primitives (`src/app/portal/_components/form/`) are portal-scoped — reuse patterns, not necessarily the components.
- Publishing/unpublishing/editing revalidates `/gallery` and `/news`.

## Constraints

- Next.js **16.2.7** — breaking changes vs. older Next. Read the relevant guides in `node_modules/next/dist/docs/` (images, server actions, caching/revalidation, route handlers) before writing code.
- Supabase (shared project with the election portal). Existing storage pattern: `createAdminSupabase()` server-side.
- `sharp` is already a dependency.
- Brand palette tokens in `src/app/globals.css` (navy/steel/red, dark surfaces).
- Don't remove the transparent candidate PNGs in `public/brand/` — they're used elsewhere (structured data).

## Left to the builder

- Exact strip heights, row target heights, gaps, breakpoints, typography.
- Justified-row implementation (CSS flex-grow trick vs. small JS layout pass) — as long as no cropping, no shift, and the last row isn't inflated.
- Lightbox implementation (hand-rolled or a small, well-maintained library).
- Upload transport for progress (XHR vs. TUS).
- Page size for infinite scroll.
- Whether singles' viewer steps through visible singles or the whole loaded feed.
- Structured data (`ImageGallery` / `VideoObject`) if cheap.
