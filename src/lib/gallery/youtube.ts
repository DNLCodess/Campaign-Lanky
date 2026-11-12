const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const WATCH_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

export function parseYouTubeUrl(input: string): { id: string; short: boolean } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);
  let id: string | undefined;
  let short = false;

  if (host === "youtu.be") {
    id = segments[0];
  } else if (WATCH_HOSTS.has(host)) {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v") ?? undefined;
    } else if (segments[0] === "live" || segments[0] === "shorts") {
      id = segments[1];
      short = segments[0] === "shorts";
    }
  }

  return id && ID_RE.test(id) ? { id, short } : null;
}

/** mqdefault is a true 16:9 frame; hqdefault (4:3, letterboxed) suits 9:16 Shorts better. */
export function youTubeThumb(id: string, short = false): string {
  return `https://i.ytimg.com/vi/${id}/${short ? "hqdefault" : "mqdefault"}.jpg`;
}

export function youTubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}
