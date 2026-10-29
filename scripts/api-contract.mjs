// The API contract: openapi/openapi.json is a copy of tracecart-api's
// openapi.json, and src/lib/api/schema.d.ts is generated from it.
//
//   pnpm api:sync       copy the API's spec in, then regenerate the types.
//                       From ../tracecart-api/openapi.json, or TRACECART_API_SPEC
//                       (a path or an https URL).
//   pnpm api:generate   regenerate the types from the copy.
//   pnpm api:check      fail if the types don't match the copy, or, when
//                       TRACECART_API_SPEC is set (CI), if the copy doesn't
//                       match the API's spec.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = path.join(root, "openapi", "openapi.json");
const TYPES = path.join(root, "src", "lib", "api", "schema.d.ts");

const HEADER = `// Generated from openapi/openapi.json (tracecart-api's contract) by
// \`pnpm api:generate\`. Don't edit: run \`pnpm api:sync\` after the API changes.

`;

const normalize = (s) => s.replace(/\r\n/g, "\n");

async function readSource(source) {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Couldn't fetch ${source}: ${res.status}`);
    return res.text();
  }
  if (!fs.existsSync(source)) throw new Error(`No API spec at ${source}. Check out tracecart-api next to this repo, or set TRACECART_API_SPEC.`);
  return fs.readFileSync(source, "utf8");
}

async function types() {
  const spec = JSON.parse(fs.readFileSync(SPEC, "utf8"));
  return HEADER + astToString(await openapiTS(spec));
}

async function main() {
  const command = process.argv[2];

  if (command === "sync") {
    const source = process.env.TRACECART_API_SPEC || path.join(root, "..", "tracecart-api", "openapi.json");
    const json = normalize(await readSource(source));
    JSON.parse(json);
    fs.mkdirSync(path.dirname(SPEC), { recursive: true });
    fs.writeFileSync(SPEC, json);
    console.log(`Copied the API spec from ${source}.`);
  }

  if (command === "sync" || command === "generate") {
    fs.mkdirSync(path.dirname(TYPES), { recursive: true });
    fs.writeFileSync(TYPES, await types());
    console.log(`Wrote ${path.relative(root, TYPES)}.`);
    return;
  }

  if (command === "check") {
    let stale = false;
    if (process.env.TRACECART_API_SPEC) {
      const upstream = normalize(await readSource(process.env.TRACECART_API_SPEC));
      if (upstream !== normalize(fs.readFileSync(SPEC, "utf8"))) {
        console.error(`openapi/openapi.json differs from the API's spec (${process.env.TRACECART_API_SPEC}): run \`pnpm api:sync\` and commit.`);
        stale = true;
      }
    }
    const committed = fs.existsSync(TYPES) ? normalize(fs.readFileSync(TYPES, "utf8")) : "";
    if (committed !== (await types())) {
      console.error("src/lib/api/schema.d.ts is out of date: run `pnpm api:generate` and commit.");
      stale = true;
    }
    if (stale) process.exit(1);
    console.log("The API client is up to date.");
    return;
  }

  console.error("Usage: api-contract.mjs sync | generate | check");
  process.exit(2);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
