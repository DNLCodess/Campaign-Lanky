import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { processImage, UnsupportedImageError, ImageTooLargeError, MAX_INPUT_PIXELS } from "./process-image";

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

test("output has no EXIF (GPS) in variants or blur", async () => {
  const src = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#888" } })
    .jpeg()
    .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "7/1 23/1 0/1" } })
    .toBuffer();
  assert.ok((await sharp(src).metadata()).exif, "fixture must carry EXIF");
  const r = await processImage(src);
  for (const v of r.variants) assert.equal((await sharp(v.data).metadata()).exif, undefined);
  const blur = Buffer.from(r.blur.split(",")[1], "base64");
  assert.equal((await sharp(blur).metadata()).exif, undefined);
});

test("exactly 640px source gets one variant", async () => {
  const r = await processImage(await jpeg(640, 480));
  assert.deepEqual(r.variants.map((v) => v.width), [640]);
});

test("garbage throws UnsupportedImageError", async () => {
  await assert.rejects(processImage(Buffer.from("nope")), UnsupportedImageError);
});

test("image over the pixel cap is rejected with ImageTooLargeError", async () => {
  const r = await processImage(await jpeg(100, 100)); // normal passes
  assert.equal(r.width, 100);
  await assert.rejects(
    processImage(await jpeg(101, 100), { maxPixels: 10_000 }),
    ImageTooLargeError,
  );
});

test("real over-cap image (10001x10000 png) is rejected quickly", async () => {
  const big = await sharp({
    create: { width: 10001, height: 10000, channels: 3, background: "#000" },
    limitInputPixels: false,
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
  assert.ok(10001 * 10000 > MAX_INPUT_PIXELS);
  await assert.rejects(processImage(big), ImageTooLargeError);
});
