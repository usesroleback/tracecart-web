# Environment variables

What tracecart-web reads. `NEXT_PUBLIC_*` values are compiled into the browser bundle: changing one means rebuilding (the Docker image too). The Clerk secret key stays on the server. Secrets never go in git: locally they live in `.env.local` (ignored), in production in the deployment's environment.

## Local development

Create `.env.local` in this folder with at least:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…   # same Clerk app as the API
CLERK_SECRET_KEY=sk_test_…
```

### Required

| Variable | Default / example | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | The API as browsers reach it. NEXT_PUBLIC_* values are compiled into the browser bundle: changing them means rebuilding (the Docker image too). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | — | Clerk (sign-in): Clerk dashboard -> API keys. Same Clerk app as the API's. Read by @clerk/nextjs; the secret key stays on the server. |
| `CLERK_SECRET_KEY` | — | Clerk secret key, server-side only (same Clerk app as the API). |

### Optional

| Variable | Default / example | What it does |
| --- | --- | --- |
| `API_INTERNAL_URL` | — | Optional. Server-side calls (session lookup, the API proxy) on a private network, e.g. http://api:4000 in docker-compose. Unset: NEXT_PUBLIC_API_URL. |
| `SITE_URL` | `https://tracecart.example` | Optional. The site's public address, for canonical links, the sitemap and structured data (read at runtime). Unset: the address each request came to. |
| `NEXT_PUBLIC_IMAGE_HOSTS` | `placehold.co,xyz.supabase.co` | Optional. Image hosts next/image may fetch and resize (comma-separated; compiled in). Photos on other hosts are shown as they are. Default: placehold.co. |

### Building on small machines

| Variable | Default / example | What it does |
| --- | --- | --- |
| `NEXT_BUILD_CPUS` | `1         cap build workers when memory is short` | Optional. |
| `NEXT_SKIP_TYPECHECK` | `1     skip the build's own type check (run `pnpm typecheck` instead)` | Optional. |
| `NEXT_OUTPUT` | `standalone    self-contained server bundle (the Dockerfile sets it)` | Optional. |

### API contract (pnpm api:sync / api:check)

| Variable | Default / example | What it does |
| --- | --- | --- |
| `TRACECART_API_SPEC` | — | Optional. Where the API's openapi.json is: a path or an https URL. Default: ../tracecart-api/openapi.json (both repos checked out side by side). |

### Browser tests (pnpm test:e2e)

| Variable | Default / example | What it does |
| --- | --- | --- |
| `TRACECART_API_DIR` | `../tracecart-api   the API checkout the tests build and start` | Optional. |
| `E2E_WEB_URL` | `http://localhost:3000` | Optional. |
| `E2E_API_URL` | `http://localhost:4000` | Optional. |
