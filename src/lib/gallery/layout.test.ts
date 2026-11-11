import test from "node:test";
import assert from "node:assert/strict";
import { clampRatio, tileFlex, itemRatio } from "./layout";
import type { PublicItem } from "./types";

test("clamps extreme ratios", () => {
  assert.deepEqual(clampRatio(4000, 1000), { ratio: 2.5, clamped: true });
  assert.deepEqual(clampRatio(500, 2000), { ratio: 0.5, clamped: true });
  assert.deepEqual(clampRatio(1600, 900), { ratio: 1600 / 900, clamped: false });
});

test("tileFlex scales basis with ratio so a row shares one height", () => {
  assert.deepEqual(tileFlex(1.5, 200), { flexGrow: 1.5, flexBasis: "300px" });
});

const it = (over: Partial<PublicItem>): PublicItem => ({
  id: "i", type: "image", width: 1000, height: 500, blur: null, src: null,
  srcSet: null, videoUrl: null, durationS: null, youtubeId: null, caption: null,
  ...over,
});

test("itemRatio uses clamped dimensions and youtube orientation", () => {
  assert.equal(itemRatio(it({ width: 1000, height: 500 })), 2);
  assert.equal(itemRatio(it({ width: 4000, height: 1000 })), 2.5);
  assert.equal(itemRatio(it({ type: "youtube", width: 1600, height: 900 })), 16 / 9);
  assert.equal(itemRatio(it({ type: "youtube", width: 900, height: 1600 })), 9 / 16);
});
