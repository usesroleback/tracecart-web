@AGENTS.md

# tracecart-web

The website of Tracecart, a product of Roleback Platforms: a tools store with AI search, a marketplace, and cross-border sourcing and logistics. The brand guidelines and design system are in [docs/brand/](docs/brand/README.md). The plan and the decision log (for both apps) are in tracecart-api's `docs/` (`PLAN.md`, `DECISIONS.md`).

- Package manager: pnpm. Node 24.
- Deployed by CI to Dokploy on Hetzner (README "CI/CD", "Deploying"): image to GHCR, a Dokploy application pulls it.
- API types come from the API's contract: `pnpm api:sync` after tracecart-api changes, then commit `openapi/openapi.json` and `src/lib/api/schema.d.ts`. Use the typed client (`src/lib/api/client.ts`) in new code.
- Every visible string goes in `messages/{fr,en}`; `pnpm i18n:check` must pass.
- Role checks in layouts are for display only; the API enforces access.
- On a low-memory machine, build with `NEXT_BUILD_CPUS=1 pnpm exec next build --webpack`. A build is verified only when it exits 0 and prints the route table.
- Brand: "Tracecart" in visible text; technical names stay lowercase.
