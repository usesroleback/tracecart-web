// The characters that must never appear raw inside a JSON-LD script: tag
// brackets, ampersands, and JavaScript's two line separators (U+2028, U+2029).
const UNSAFE = new RegExp(`[<>&${String.fromCharCode(0x2028, 0x2029)}]`, "g");

/**
 * JSON for a `<script type="application/ld+json">`, with every unsafe
 * character written as a backslash-u escape, so no value (a seller's product
 * title) can close the script or open another tag (ADR-083).
 */
export function jsonLdText(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(UNSAFE, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}
