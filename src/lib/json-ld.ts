/**
 * Serialize JSON-LD for an inline <script type="application/ld+json">.
 *
 * JSON.stringify alone is not safe there: a value containing "</script>"
 * (e.g. a blog post title) would close the tag and let the rest run as HTML.
 * Escaping <, > and & as unicode escapes keeps the JSON identical to parsers
 * while making a breakout impossible; U+2028/9 are escaped for older JS parsers.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
