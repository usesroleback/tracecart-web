# tracecart-web

The Tracecart website: the public site and shop, customer accounts, the back office (staff and carriers), and the customer's quote and tracking page. Next.js (App Router), Tailwind CSS, Clerk, next-intl (French and English). A product of Roleback Platforms.

It talks to [tracecart-api](https://github.com/tracecartops/tracecart-api) only through the API's contract: a copy of its `openapi.json` in [`openapi/`](./openapi), from which the typed client in `src/lib/api/` is generated.

## Run it

Needs Node 24, [pnpm](https://pnpm.io) (`corepack enable` gives the pinned version), and a running tracecart-api.

```bash
cp .env.example .env.local   # the API URL and the Clerk keys
pnpm install
pnpm dev                     # http://localhost:3000 (pnpm dev --port 3001 if 3000 is taken)
```

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev`, `pnpm build`, `pnpm start` | Next.js dev server, production build, production server |
| `pnpm lint`, `pnpm typecheck`, `pnpm format` | ESLint, `tsc --noEmit`, Prettier (with the Tailwind class sorter) |
| `pnpm i18n:check` | French and English messages have the same keys and the same arguments |
| `pnpm api:sync` | Copy the API's `openapi.json` in (from `../tracecart-api`, or `TRACECART_API_SPEC`) and regenerate the client types |
| `pnpm api:generate` / `pnpm api:check` | Regenerate the types from the copy / fail if they're stale |
| `pnpm test:e2e` | Browser tests (below) |

## Calling the API

In the browser, every call goes through the Route Handler `app/api/tracecart/[...path]`, which attaches the user's Clerk session token. The API never sees a cookie. On the server, layouts and server components call the API directly with the token.

The typed client checks paths, parameters, bodies and responses at compile time:

```ts
import { browserApi, apiWithToken } from "@/lib/api/client";

const { data, error } = await browserApi.GET("/hubs");                      // in a client component
await apiWithToken(token).PATCH("/me/locale", { body: { locale: "en" } });  // on the server
```

When the API changes: `pnpm api:sync`, fix what no longer type-checks, and commit `openapi/openapi.json` with `src/lib/api/schema.d.ts`. CI fails if the types are stale, or if the copy differs from tracecart-api's `main`. Pages not moved to the typed client yet use `src/lib/apiClient.ts`, with hand-written types in `src/lib/types.ts`.

## Access

`src/middleware.ts` sends signed-out visitors of the console to `/login`. The public site, `/account`, `/ship`, the quote page (`/q/…`) and legal pages stay open. Each console section's `layout.tsx` checks the role, **for display only**: the API enforces access on every request.

## Tests

`pnpm test:e2e` (`e2e/run.sh`) builds and starts tracecart-api and this app, seeds fixed test data, and runs Playwright: the customer quote and tracking page in French and English, accept and decline (including an answer given elsewhere), its error states, the public homepage, and signed-out redirects.

It needs a checkout of tracecart-api with dependencies installed (`TRACECART_API_DIR`, default `../tracecart-api`), a disposable Postgres and Redis, and Chromium. It **changes data**, so it refuses to run unless the database name contains `test`. It uses ports 3000 and 4000.

```bash
pnpm exec playwright install chromium   # once
DATABASE_URL=postgresql://test:test@localhost:5544/tracecart_test REDIS_URL=redis://localhost:6399 pnpm test:e2e
```

## Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... \
  -t tracecart-web .
```

Node 24 on Debian slim, non-root, Next's standalone output. `NEXT_PUBLIC_*` values are compiled in: changing them means rebuilding. At runtime it needs `CLERK_SECRET_KEY`, and optionally `API_INTERNAL_URL` to reach the API over a private network. Health check: `GET /api/health`.

## CI/CD

`.github/workflows/ci.yml`, on every push and pull request:

1. **check**: lint, typecheck, French and English messages match, the API client is current, build, dependency audit.
2. **contract**: `openapi/openapi.json` matches tracecart-api's `main`.
3. **e2e**: Playwright on the built app and API (tracecart-api checked out beside it).
4. **image**: shell lint and the Docker image. On `main` it's built with the production `NEXT_PUBLIC_*` values (repository **variables** `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) and pushed to `ghcr.io/tracecartops/tracecart-web:<commit sha>`. Until those variables exist, it's built with placeholders and not pushed.
5. **deploy** (`main` only, after 1–4 pass): the image becomes `:latest`, then Dokploy is asked to redeploy through its webhook. Until the secret `DOKPLOY_DEPLOY_WEBHOOK` exists, nothing is deployed.

While tracecart-api is private, the contract and e2e jobs need the secret `API_REPO_TOKEN`: a fine-grained token with read access to its contents.

## Deploying (Dokploy on Hetzner)

On the same Dokploy server as the API (tracecart-api README, "Deploying"):

1. Create an **Application** with source **Docker image** `ghcr.io/tracecartops/tracecart-web:latest` (GHCR registry credentials as for the API).
2. Environment: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (the same production values the image was built with) and `API_INTERNAL_URL`, the API on the server's private network (`http://<api service>:4000`), so server-side calls don't loop out through the internet.
3. Domains: the site's hostname, port 3000, HTTPS. The API's `CORS_ORIGIN` must be this URL.
4. Copy the application's deploy webhook URL into this repository's secret `DOKPLOY_DEPLOY_WEBHOOK` (environment `production`).

`NEXT_PUBLIC_API_URL` and the Clerk publishable key are compiled into the browser code: changing them means changing the repository variables and letting CI rebuild. To roll back, point the application at an earlier `:<sha>` tag and redeploy.

## Design

The design tokens in `src/app/globals.css` and the components in `src/components/ui/` mirror the Roleback design system (themes `tracecart-light` / `tracecart-dark`).

## Configuration

Every variable is listed in [`.env.example`](./.env.example).
