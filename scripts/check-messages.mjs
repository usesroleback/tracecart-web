// Fails when the locales' message files drift apart: a namespace or key in
// one locale but not the other, or a message whose {placeholders} differ.
// Run with `pnpm i18n:check` (from apps/web).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "messages");
const locales = readdirSync(root);
const [base, ...others] = locales;

const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)]],
  );

// Argument names ({name} or {name, plural…}); plural/select branch text such
// as "{no results}" isn't an argument and is ignored.
const placeholders = (msg) => [...new Set([...msg.matchAll(/\{\s*([A-Za-z_]\w*)\s*[,}]/g)].map((m) => m[1]))].sort().join(",");

const load = (locale) =>
  Object.fromEntries(
    readdirSync(join(root, locale))
      .filter((f) => f.endsWith(".json"))
      .map((f) => [f.replace(/\.json$/, ""), new Map(flatten(JSON.parse(readFileSync(join(root, locale, f), "utf8"))))]),
  );

const problems = [];
const ref = load(base);
for (const locale of others) {
  const cur = load(locale);
  for (const ns of new Set([...Object.keys(ref), ...Object.keys(cur)])) {
    const a = ref[ns] ?? new Map();
    const b = cur[ns] ?? new Map();
    for (const [key, msg] of a) {
      if (!b.has(key)) problems.push(`${locale}/${ns}.json is missing ${key}`);
      else if (placeholders(msg) !== placeholders(b.get(key)))
        problems.push(`${ns}.${key}: placeholders differ (${base}: {${placeholders(msg)}}, ${locale}: {${placeholders(b.get(key))}})`);
    }
    for (const key of b.keys()) if (!a.has(key)) problems.push(`${base}/${ns}.json is missing ${key}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Messages match across ${locales.join(", ")}.`);
