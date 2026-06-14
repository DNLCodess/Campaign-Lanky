// Server-side Tiptap JSON → HTML serializer.
// Tiptap v3's generateHTML requires window, so we roll our own pure-Node serializer.

type TNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
};

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(s: string) {
  return s.replace(/"/g, "&quot;");
}

function applyMark(
  html: string,
  mark: { type: string; attrs?: Record<string, unknown> },
): string {
  switch (mark.type) {
    case "bold":      return `<strong>${html}</strong>`;
    case "italic":    return `<em>${html}</em>`;
    case "code":      return `<code>${html}</code>`;
    case "strike":    return `<s>${html}</s>`;
    case "underline": return `<u>${html}</u>`;
    case "link": {
      const href   = escAttr(String(mark.attrs?.href   ?? "#"));
      const target = escAttr(String(mark.attrs?.target ?? "_blank"));
      return `<a href="${href}" target="${target}" rel="noopener noreferrer">${html}</a>`;
    }
    default: return html;
  }
}

function serializeChildren(node: TNode): string {
  return (node.content ?? []).map(serializeNode).join("");
}

function serializeNode(node: TNode): string {
  switch (node.type) {
    case "doc":
      return serializeChildren(node);

    case "paragraph":
      return `<p>${serializeChildren(node)}</p>`;

    case "heading": {
      const l = Number(node.attrs?.level ?? 1);
      return `<h${l}>${serializeChildren(node)}</h${l}>`;
    }

    case "bulletList":
      return `<ul>${serializeChildren(node)}</ul>`;

    case "orderedList":
      return `<ol>${serializeChildren(node)}</ol>`;

    case "listItem":
      return `<li>${serializeChildren(node)}</li>`;

    case "blockquote":
      return `<blockquote>${serializeChildren(node)}</blockquote>`;

    case "codeBlock":
      return `<pre><code>${serializeChildren(node)}</code></pre>`;

    case "horizontalRule":
      return "<hr />";

    case "hardBreak":
      return "<br />";

    case "image": {
      const src   = escAttr(String(node.attrs?.src   ?? ""));
      const alt   = escAttr(String(node.attrs?.alt   ?? ""));
      const title = node.attrs?.title ? ` title="${escAttr(String(node.attrs.title))}"` : "";
      return `<img src="${src}" alt="${alt}"${title} />`;
    }

    case "text": {
      let out = escHtml(node.text ?? "");
      for (const mark of node.marks ?? []) out = applyMark(out, mark);
      return out;
    }

    default:
      return serializeChildren(node);
  }
}

export function tiptapToHtml(body: Record<string, unknown>): string {
  try {
    return serializeNode(body as TNode);
  } catch {
    return "";
  }
}

// ── React component ───────────────────────────────────────────────

export function PostBody({ body }: { body: Record<string, unknown> }) {
  const html = tiptapToHtml(body);

  return (
    <div
      className={[
        "prose prose-invert prose-lg max-w-none",
        "prose-headings:font-heading prose-headings:text-text prose-headings:font-normal",
        "prose-p:text-text-muted prose-p:leading-relaxed",
        "prose-a:text-accent prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-text prose-strong:font-semibold",
        "prose-blockquote:border-l-primary prose-blockquote:text-text-muted prose-blockquote:font-heading prose-blockquote:not-italic",
        "prose-code:text-accent prose-code:bg-surface/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-surface/60 prose-pre:border prose-pre:border-border",
        "prose-img:rounded-brand prose-img:border prose-img:border-border",
        "prose-hr:border-border/60",
        "prose-li:text-text-muted",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
