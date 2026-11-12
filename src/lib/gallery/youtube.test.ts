import test from "node:test";
import assert from "node:assert/strict";
import { parseYouTubeUrl, youTubeThumb, youTubeEmbed } from "./youtube";

const ok = (u: string, id: string, short = false) =>
  assert.deepEqual(parseYouTubeUrl(u), { id, short });

test("watch urls", () => {
  ok("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ");
  ok("https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s", "dQw4w9WgXcQ");
  ok("https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ", "dQw4w9WgXcQ");
  ok("  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ", "dQw4w9WgXcQ");
});

test("short links, live, shorts", () => {
  ok("https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ");
  ok("https://www.youtube.com/live/dQw4w9WgXcQ?si=x", "dQw4w9WgXcQ");
  ok("https://youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ", true);
});

test("rejects", () => {
  for (const u of [
    "",
    "not a url",
    "https://vimeo.com/123",
    "https://www.youtube.com/playlist?list=PL1",
    "https://www.youtube.com/@channel",
    "https://www.youtube.com/watch?v=short",
    "https://evil.com/watch?v=dQw4w9WgXcQ",
  ])
    assert.equal(parseYouTubeUrl(u), null);
});

test("thumb and embed urls", () => {
  assert.equal(youTubeThumb("dQw4w9WgXcQ"), "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
  assert.equal(youTubeThumb("dQw4w9WgXcQ", false), "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
  assert.equal(youTubeThumb("dQw4w9WgXcQ", true), "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  assert.equal(
    youTubeEmbed("dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
  );
});
