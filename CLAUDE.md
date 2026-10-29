@AGENTS.md

# tracecart-web

The website of Tracecart, a product of Roleback Platforms: a tools store with AI search, a marketplace, and cross-border sourcing and logistics. The plan, decisions and product docs live in tracecart-platforms (`../docs/PLAN.md`, `../docs/DECISIONS.md` when checked out side by side; github.com/tracecartops/tracecart).

- Package manager: pnpm. Node 24.
- API types come from the API's contract: `pnpm api:sync` after tracecart-api changes, then commit `openapi/openapi.json` and `src/lib/api/schema.d.ts`. Use the typed client (`src/lib/api/client.ts`) in new code.
- Every visible string goes in `messages/{fr,en}`; `pnpm i18n:check` must pass.
- Role checks in layouts are for display only; the API enforces access.
- On a low-memory machine, build with `NEXT_BUILD_CPUS=1 pnpm exec next build --webpack`. A build is verified only when it exits 0 and prints the route table.
- Brand: "Tracecart" in visible text; technical names stay lowercase.
