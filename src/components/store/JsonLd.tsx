import { jsonLdText } from "@/lib/jsonLd";

/** Structured data for search engines (schema.org), as JSON-LD, escaped so no value can close the script. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
