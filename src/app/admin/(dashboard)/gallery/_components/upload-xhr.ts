// Browser-only: XHR upload to a Supabase signed upload URL with progress.
// Mirrors storage-js `uploadToSignedUrl` for a Blob body: PUT multipart
// FormData { cacheControl, "": file } with `x-upsert: false`, plus the
// apikey/Authorization headers a browser supabase-js client would add.

export function uploadWithProgress(
  signedUrl: string,
  file: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload cancelled", "AbortError"));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("x-upsert", "false");
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anon) {
      xhr.setRequestHeader("apikey", anon);
      xhr.setRequestHeader("Authorization", `Bearer ${anon}`);
    }

    // The multipart part's content type is what Storage records, so make it explicit
    // (some browsers give HEIC/MOV files an empty type).
    const name = file instanceof File && file.name ? file.name : "upload";
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", new File([file], name, { type: contentType }));

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(Math.min(1, e.loaded / e.total));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else {
        let message = `Upload failed (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          if (parsed.message || parsed.error) message = `${message}: ${parsed.message ?? parsed.error}`;
        } catch {
          // non-JSON body; keep the status message
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(body);
  });
}

/**
 * Process an uploaded item via the finalize route handler (not a server action,
 * so it doesn't block the serialised action queue). Throws on network errors and
 * non-2xx responses (treated as transient → Retry calls it again); resolves with
 * `{ error }` for processing failures the server recorded on the item.
 */
export async function requestFinalize(itemId: string): Promise<{ error?: string }> {
  const res = await fetch("/admin/gallery-api/finalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ itemId }),
  });
  let data: { error?: string } = {};
  try {
    data = (await res.json()) as { error?: string };
  } catch {
    // empty / non-JSON body
  }
  if (!res.ok) throw new Error(data.error ?? `Finalize failed (${res.status})`);
  return data.error ? { error: data.error } : {};
}
