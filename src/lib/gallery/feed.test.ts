import test from "node:test";
import assert from "node:assert/strict";
import {
  toPublicEntries, groupFeed, appendFeed, encodeCursor, decodeCursor, cursorFilter,
} from "./feed";
import type { EntryRow, ItemRow, PublicEntry, EntryKind } from "./types";

const url = (p: string) => `u/${p}`;

const entry = (id: string, kind: EntryKind = "single", over: Partial<EntryRow> = {}): EntryRow => ({
  id, kind, title: `t${id}`, body: null, place: null, taken_on: "2026-11-03",
  slug: `s${id}`, status: "published", cover_item_id: null, published_at: null,
  created_at: "2026-11-01T00:00:00+00:00", updated_at: "2026-11-01T00:00:00+00:00",
  ...over,
});

const item = (id: string, entry_id: string, over: Partial<ItemRow> = {}): ItemRow => ({
  id, entry_id, position: 0, media_type: "image", storage_path: null,
  variants: { "640": `${id}/640`, "1280": `${id}/1280` }, poster_path: null, blur: null,
  width: 100, height: 50, duration_s: null, youtube_id: null, youtube_short: false,
  caption: null, hidden: false, processing: "ready", error: null, ...over,
});

const pe = (id: string, kind: EntryKind): PublicEntry => ({
  id, kind, slug: id, title: id, body: null, place: null, takenOn: "2026-11-03",
  publishedAt: "2026-11-03T10:00:00+00:00", coverItemId: null, items: [],
});

test("drops entries with no ready, visible items", () => {
  const items = [
    item("a", "e1", { processing: "pending" }),
    item("b", "e1", { processing: "failed" }),
    item("c", "e1", { hidden: true }),
  ];
  assert.deepEqual(toPublicEntries([entry("e1", "outing")], items, url), []);
});

test("srcSet lists only present variants, sorted by width", () => {
  const [e] = toPublicEntries(
    [entry("e1")],
    [item("a", "e1", { variants: { "1280": "a/1280", "640": "a/640" } })],
    url,
  );
  assert.equal(e.items[0].srcSet, "u/a/640 640w, u/a/1280 1280w");
  assert.equal(e.items[0].src, "u/a/1280");
});

test("sorts by position, maps video and youtube, falls back publishedAt", () => {
  const items = [
    item("y", "e1", { position: 2, media_type: "youtube", variants: null, youtube_id: "abc" }),
    item("v", "e1", { position: 1, media_type: "video", storage_path: "v/file.mp4", duration_s: 12 }),
    item("i", "e1", { position: 0 }),
  ];
  const [e] = toPublicEntries([entry("e1", "outing")], items, url);
  assert.deepEqual(e.items.map((x) => x.id), ["i", "v", "y"]);
  assert.equal(e.publishedAt, "2026-11-01T00:00:00+00:00");
  assert.equal(e.takenOn, "2026-11-03");
  const [, v, y] = e.items;
  assert.equal(v.videoUrl, "u/v/file.mp4");
  assert.equal(v.src, "u/v/1280");
  assert.equal(v.durationS, 12);
  assert.deepEqual([y.src, y.srcSet, y.videoUrl, y.youtubeId], [null, null, null, "abc"]);
});

test("preserves entry order", () => {
  const out = toPublicEntries(
    [entry("b"), entry("a")],
    [item("1", "a"), item("2", "b")],
    url,
  );
  assert.deepEqual(out.map((e) => e.id), ["b", "a"]);
});

const types = (b: ReturnType<typeof groupFeed>) => b.map((x) => x.type);

test("groups consecutive singles, outings stand alone", () => {
  const blocks = groupFeed([pe("1", "single"), pe("2", "single"), pe("3", "outing"), pe("4", "single")]);
  assert.deepEqual(types(blocks), ["singles", "outing", "singles"]);
  const first = blocks[0];
  assert.equal(first.type === "singles" && first.entries.length, 2);
});

test("appendFeed joins a singles run across pages", () => {
  const blocks = appendFeed(groupFeed([pe("1", "outing"), pe("2", "single")]), [pe("3", "single"), pe("4", "outing")]);
  assert.deepEqual(types(blocks), ["outing", "singles", "outing"]);
  const mid = blocks[1];
  assert.equal(mid.type === "singles" && mid.entries.length, 2);
});

const c = { takenOn: "2026-11-03", publishedAt: "2026-11-03T10:00:00+00:00", id: "b" };

const UUID = "123e4567-e89b-12d3-a456-426614174000";
const good = { takenOn: "2026-11-03", publishedAt: "2026-11-03T10:00:00.123+00:00", id: UUID };
const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

test("decodeCursor rejects injection attempts and accepts valid cursors", () => {
  assert.deepEqual(decodeCursor(enc(good)), good);
  assert.equal(decodeCursor(enc({ ...good, id: "x),status.eq.draft" })), null);
  assert.equal(decodeCursor(enc({ ...good, takenOn: "2026-11-03,foo" })), null);
  assert.equal(decodeCursor(enc({ ...good, publishedAt: '2026-11-03T10:00:00+00:00"' })), null);
});

test("cursor round-trips and rejects garbage", () => {
  assert.deepEqual(decodeCursor(encodeCursor(good)), good);
  assert.equal(decodeCursor("%%%"), null);
  assert.equal(decodeCursor(Buffer.from('{"takenOn":1}').toString("base64url")), null);
  assert.equal(decodeCursor(Buffer.from("[]").toString("base64url")), null);
});

test("cursorFilter breaks same-day ties by published_at then id", () => {
  assert.equal(
    cursorFilter(c),
    'taken_on.lt.2026-11-03,and(taken_on.eq.2026-11-03,published_at.lt."2026-11-03T10:00:00+00:00"),and(taken_on.eq.2026-11-03,published_at.eq."2026-11-03T10:00:00+00:00",id.lt.b)',
  );
});
