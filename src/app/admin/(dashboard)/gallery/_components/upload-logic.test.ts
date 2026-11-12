import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  classifyFile,
  createLimiter,
  createSerial,
  formatDuration,
  isIsoDate,
  MAX_UPLOAD_BYTES,
  moveId,
  retryMode,
  sameIdSet,
  serverRetryMode,
  SERVER_MSG,
  UNSUPPORTED_FILE,
  VIDEO_SIZE_COPY,
} from "./upload-logic";

test("classifyFile: types, extension fallback, size", () => {
  assert.deepEqual(classifyFile({ name: "a.jpg", type: "image/jpeg", size: 10 }), {
    ok: true, kind: "image", contentType: "image/jpeg", isMov: false,
  });
  assert.deepEqual(classifyFile({ name: "IMG_1.HEIC", type: "", size: 10 }), {
    ok: true, kind: "image", contentType: "image/heic", isMov: false,
  });
  assert.deepEqual(classifyFile({ name: "clip.mov", type: "video/quicktime", size: 10 }), {
    ok: true, kind: "video", contentType: "video/quicktime", isMov: true,
  });
  assert.deepEqual(classifyFile({ name: "clip.MOV", type: "application/octet-stream", size: 10 }), {
    ok: true, kind: "video", contentType: "video/quicktime", isMov: true,
  });
  assert.deepEqual(classifyFile({ name: "x.gif", type: "image/gif", size: 10 }), { ok: false, error: UNSUPPORTED_FILE });
  assert.deepEqual(classifyFile({ name: "noext", type: "", size: 10 }), { ok: false, error: UNSUPPORTED_FILE });
  assert.deepEqual(classifyFile({ name: "big.mp4", type: "video/mp4", size: MAX_UPLOAD_BYTES + 1 }), {
    ok: false, error: VIDEO_SIZE_COPY,
  });
  assert.equal(classifyFile({ name: "edge.mp4", type: "video/mp4", size: MAX_UPLOAD_BYTES }).ok, true);
  assert.equal(classifyFile({ name: "e.jpg", type: "image/jpeg", size: 0 }).ok, false);
});

test("createLimiter never exceeds the limit and runs everything", async () => {
  const run = createLimiter(3);
  let active = 0;
  let peak = 0;
  const done: number[] = [];
  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      run(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 5 + (i % 3)));
        active--;
        done.push(i);
        return i;
      }),
    ),
  );
  assert.equal(peak, 3);
  assert.equal(done.length, 10);
});

test("createLimiter keeps going after a rejection", async () => {
  const run = createLimiter(1);
  await assert.rejects(run(async () => { throw new Error("boom"); }));
  assert.equal(await run(async () => 7), 7);
});

test("createSerial runs in order, one at a time", async () => {
  const run = createSerial();
  const order: string[] = [];
  await Promise.all([
    run(async () => { order.push("a1"); await new Promise((r) => setTimeout(r, 10)); order.push("a2"); }),
    run(async () => { order.push("b1"); order.push("b2"); }),
  ]);
  assert.deepEqual(order, ["a1", "a2", "b1", "b2"]);
});

test("retryMode decisions", () => {
  assert.equal(retryMode("upload"), "reupload");
  assert.equal(retryMode("finalize", undefined, true), "refinalize");
  assert.equal(retryMode("finalize", SERVER_MSG.unsupportedPhoto), "none");
  assert.equal(retryMode("finalize", SERVER_MSG.tooLargePhoto), "none");
  assert.equal(retryMode("finalize", SERVER_MSG.uploadMissing), "reupload");
  assert.equal(retryMode("finalize", SERVER_MSG.processFailed), "refinalize");
  assert.equal(serverRetryMode(SERVER_MSG.processFailed), "refinalize");
  assert.equal(serverRetryMode(SERVER_MSG.unsupportedPhoto), "none");
  assert.equal(serverRetryMode(null), "none");
});

test("server messages still match ops.ts / process-image.ts", () => {
  const root = path.resolve(import.meta.dirname, "../../../../../lib/gallery");
  const src = readFileSync(path.join(root, "ops.ts"), "utf8") + readFileSync(path.join(root, "process-image.ts"), "utf8");
  for (const msg of Object.values(SERVER_MSG)) assert.ok(src.includes(msg), `missing: ${msg}`);
});

test("isIsoDate", () => {
  assert.equal(isIsoDate("2026-11-11"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("2026-1-1"), false);
  assert.equal(isIsoDate(""), false);
});

test("sameIdSet and moveId", () => {
  assert.equal(sameIdSet(["a", "b"], ["b", "a"]), true);
  assert.equal(sameIdSet(["a", "b"], ["a"]), false);
  assert.equal(sameIdSet(["a", "a"], ["a", "b"]), false);
  assert.equal(sameIdSet(["a", "b"], ["a", "a"]), false);
  assert.deepEqual(moveId(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
  assert.deepEqual(moveId(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
  assert.deepEqual(moveId(["a", "b"], 0, 5), ["a", "b"]);
});

test("formatDuration", () => {
  assert.equal(formatDuration(65.4), "1:05");
  assert.equal(formatDuration(null), null);
});
