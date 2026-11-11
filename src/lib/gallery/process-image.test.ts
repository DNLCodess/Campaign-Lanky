import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { processImage, UnsupportedImageError } from "./process-image";

const jpeg = (w: number, h: number, orientation?: number) => {
  let s = sharp({ create: { width: w, height: h, channels: 3, background: "#888" } }).jpeg();
  if (orientation) s = s.withMetadata({ orientation });
  return s.toBuffer();
};

test("EXIF orientation 6 reports portrait dims and emits rotated variants", async () => {
  const r = await processImage(await jpeg(400, 300, 6));
  assert.equal(r.width, 300);
  assert.equal(r.height, 400);
  const m = await sharp(r.variants[0].data).metadata();
  assert.equal(m.width, 300);
  assert.equal(m.height, 400);
});

test("never upscales; small image gets a single variant", async () => {
  const r = await processImage(await jpeg(500, 400));
  assert.equal(r.variants.length, 1);
  assert.equal(r.variants[0].width, 640);
  assert.equal((await sharp(r.variants[0].data).metadata()).width, 500);
});

test("large image gets 640/1280/2048", async () => {
  const r = await processImage(await jpeg(3000, 2000));
  assert.deepEqual(r.variants.map((v) => v.width), [640, 1280, 2048]);
  for (const v of r.variants) {
    const m = await sharp(v.data).metadata();
    assert.equal(m.width, v.width);
    assert.ok(Math.abs(m.height! - Math.round((v.width * 2) / 3)) <= 1);
  }
});

test("mid-size image only gets variants up to source width", async () => {
  const r = await processImage(await jpeg(1500, 1000));
  assert.deepEqual(r.variants.map((v) => v.width), [640, 1280]);
});

test("blur is a small webp data URI", async () => {
  const r = await processImage(await jpeg(800, 600));
  assert.match(r.blur, /^data:image\/webp;base64,/);
  const buf = Buffer.from(r.blur.split(",")[1], "base64");
  assert.equal((await sharp(buf).metadata()).width, 16);
});

test("output has no EXIF", async () => {
  const r = await processImage(await jpeg(800, 600, 6));
  assert.equal((await sharp(r.variants[0].data).metadata()).exif, undefined);
});

test("garbage throws UnsupportedImageError", async () => {
  await assert.rejects(processImage(Buffer.from("nope")), UnsupportedImageError);
});
