// Fails when the locales' message files drift apart: a namespace or key in
// one locale but not the other, or a message whose {placeholders} differ.
// Run with `pnpm i18n:check` (from this folder).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "messages");
const locales = readdirSync(root);
const [base, ...others] = locales;

const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)]],
  );

// Argument names ({name} or {name, plural…}), from a small ICU parser: the
// text of plural/select branches ("=0 {Add}", "other {# orders}") is message
// text, not an argument, however much it looks like one.
function placeholders(msg) {
  const names = new Set();
  let i = 0;
  const skipSpace = () => {
    while (i < msg.length && /\s/.test(msg[i])) i++;
  };
  const readWord = () => {
    const start = i;
    while (i < msg.length && !/[\s,{}]/.test(msg[i])) i++;
    return msg.slice(start, i);
  };
  // Message text up to an unmatched "}" (or the end), collecting arguments.
  const text = () => {
    while (i < msg.length && msg[i] !== "}") {
      if (msg[i] === "{") argument();
      else i++;
    }
  };
  // At "{": name, then an optional type and style; branches for plural/select.
  const argument = () => {
    i++;
    skipSpace();
    names.add(readWord());
    skipSpace();
    if (msg[i] === ",") {
      i++;
      skipSpace();
      const type = readWord();
      skipSpace();
      if (msg[i] === ",") i++;
      if (["plural", "select", "selectordinal"].includes(type)) {
        for (;;) {
          skipSpace();
          if (i >= msg.length || msg[i] === "}") break;
          if (msg[i] === "{") {
            i++;
            text();
            i++;
          } else readWord();
        }
      } else {
        // number/date/time styles: skip to the matching "}".
        for (let depth = 0; i < msg.length && (msg[i] !== "}" || depth > 0); i++) depth += msg[i] === "{" ? 1 : msg[i] === "}" ? -1 : 0;
      }
    }
    i++;
  };
  text();
  return [...names].sort().join(",");
}

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
