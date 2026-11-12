import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateEntryOp } from "./ops";
import type { EntryRow } from "./types";

/** Just enough of the Supabase query builder for updateEntryOp. */
function fakeDb(entry: EntryRow) {
  const updates: Record<string, unknown>[] = [];
  let reads = 0;
  const db = {
    from() {
      const chain = {
        select: () => chain,
        eq: () => chain,
        neq: () => chain,
        // getEntry() reads the entry; the slug-clash probe finds nothing.
        maybeSingle: async () => ({ data: reads++ === 0 ? entry : null, error: null }),
        update(row: Record<string, unknown>) {
          updates.push(row);
          return { eq: async () => ({ error: null }) };
        },
      };
      return chain;
    },
  };
  return { db: db as unknown as SupabaseClient, updates };
}

const base: EntryRow = {
  id: "11111111-2222-3333-4444-555555555555", kind: "outing", title: "Old title", body: null,
  place: null, taken_on: "2026-11-03", slug: "old-title", status: "draft", cover_item_id: null,
  published_at: null, created_at: "2026-11-01T00:00:00+00:00", updated_at: "2026-11-01T00:00:00+00:00",
};
const fields = { title: "New title", body: null, place: null, takenOn: "2026-11-03" };

test("updateEntryOp reslugs an entry that was never published", async () => {
  const { db, updates } = fakeDb({ ...base });
  await updateEntryOp(db, base.id, fields);
  assert.equal(updates[0]?.slug, "new-title");
});

test("updateEntryOp keeps the slug once an entry has been published", async () => {
  const { db, updates } = fakeDb({ ...base, status: "published", published_at: "2026-11-04T00:00:00+00:00" });
  await updateEntryOp(db, base.id, fields);
  assert.equal(updates[0]?.slug, "old-title");
  assert.equal(updates[0]?.title, "New title");
});

test("updateEntryOp keeps the slug of an unpublished-again entry that was published before", async () => {
  const { db, updates } = fakeDb({ ...base, status: "draft", published_at: "2026-11-04T00:00:00+00:00" });
  await updateEntryOp(db, base.id, { ...fields, title: "" });
  assert.equal(updates[0]?.slug, "old-title");
});
