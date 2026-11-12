// Browser-only: read a video's true size/length and grab a JPEG poster frame.

const PROBE_TIMEOUT_MS = 20000;

export function probeVideo(
  file: File,
): Promise<{ width: number; height: number; durationS: number; poster: Blob }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (err: Error | null, value?: { width: number; height: number; durationS: number; poster: Blob }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      if (err) reject(err);
      else resolve(value!);
    };
    const timer = setTimeout(() => finish(new Error("Couldn't read that video. Try a different file.")), PROBE_TIMEOUT_MS);

    // iOS Safari won't decode a frame for drawImage unless the video is loaded and
    // has been played (muted + inline is allowed without a user gesture).
    video.preload = "auto";
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.onerror = () => finish(new Error("Couldn't read that video. Try a different file."));
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (!video.videoWidth || !video.videoHeight) {
        finish(new Error("Couldn't read that video's size. Try a different file."));
        return;
      }
      const seek = () => {
        video.currentTime = Math.min(1, duration / 2);
      };
      // Muted play()→pause() primes decoding on iOS; if play() is refused, seek anyway.
      let primed: Promise<void>;
      try {
        primed = Promise.resolve(video.play()).then(() => video.pause());
      } catch {
        primed = Promise.resolve();
      }
      primed.then(seek, seek);
    };
    video.onseeked = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const durationS = Number.isFinite(video.duration) ? video.duration : 0;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        finish(new Error("Couldn't capture a poster frame."));
        return;
      }
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) finish(null, { width, height, durationS, poster: blob });
          else finish(new Error("Couldn't capture a poster frame."));
        },
        "image/jpeg",
        0.85,
      );
    };
    video.src = url;
  });
}
