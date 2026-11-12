import test from "node:test";
import assert from "node:assert/strict";
import { buildViewerSequence } from "./viewer-sequence";
import type { FeedBlock, PublicEntry, PublicItem, EntryKind } from "./types";

const it_ = (id: string): PublicItem => ({
  id, type: "image", width: 100, height: 50, blur: null, src: `${id}.webp`, srcSet: null,
  videoUrl: null, durationS: null, youtubeId: null, caption: null,
});

const pe = (id: string, kind: EntryKind, itemIds: string[]): PublicEntry => ({
  id, kind, slug: id, title: `T-${id}`, body: null, place: null, takenOn: "2026-11-03",
  publishedAt: "2026-11-03T10:00:00+00:00", coverItemId: null, items: itemIds.map(it_),
});

const blocks: FeedBlock[] = [
  { type: "singles", entries: [pe("s1", "single", ["a"]), pe("s2", "single", ["b"])] },
  { type: "outing", entry: pe("o1", "outing", ["x", "y", "z"]) },
  { type: "singles", entries: [pe("s3", "single", ["c"]), pe("s4", "single", []), pe("s5", "single", ["d"])] },
];

const ids = (items: PublicItem[]) => items.map((i) => i.id);

test("outing opens its own items at the tapped index", () => {
  const seq = buildViewerSequence(blocks, "o1", 2)!;
  assert.deepEqual(ids(seq.items), ["x", "y", "z"]);
  assert.equal(seq.startIndex, 2);
  assert.deepEqual(seq.titles, ["T-o1", "T-o1", "T-o1"]);
});

test("outing index is clamped", () => {
  assert.equal(buildViewerSequence(blocks, "o1", 9)!.startIndex, 2);
  assert.equal(buildViewerSequence(blocks, "o1", -3)!.startIndex, 0);
  assert.equal(buildViewerSequence(blocks, "o1", Number.NaN)!.startIndex, 0);
});

test("single steps through only its own singles block", () => {
  const seq = buildViewerSequence(blocks, "s2", 0)!;
  assert.deepEqual(ids(seq.items), ["a", "b"]);
  assert.equal(seq.startIndex, 1);
  assert.deepEqual(seq.titles, ["T-s1", "T-s2"]);
});

test("singles without items are skipped and positions follow", () => {
  const seq = buildViewerSequence(blocks, "s5", 0)!;
  assert.deepEqual(ids(seq.items), ["c", "d"]);
  assert.equal(seq.startIndex, 1);
  assert.equal(buildViewerSequence(blocks, "s4", 0), null);
});

test("unknown entry → null", () => {
  assert.equal(buildViewerSequence(blocks, "nope", 0), null);
  assert.equal(buildViewerSequence([], "s1", 0), null);
});
