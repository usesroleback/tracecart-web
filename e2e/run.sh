#!/bin/sh
# Builds and starts the API and web app against a disposable database, seeds
# the browser-test data, and runs the Playwright tests. Used by CI; run it
# yourself the same way (see README "Tests").
#
# Needs: DATABASE_URL (database name must contain "test"), REDIS_URL, and
# Playwright's Chromium (`pnpm exec playwright install --with-deps chromium`, from apps/web).
set -eu

: "${DATABASE_URL:?set DATABASE_URL to a disposable database}"
: "${REDIS_URL:?set REDIS_URL}"
case "$DATABASE_URL" in
  *test*) ;;
  *) echo "Refusing to run: the browser tests change data, and DATABASE_URL doesn't contain \"test\"." >&2; exit 1 ;;
esac

cd "$(dirname "$0")/../../.."

# Placeholders are enough: these tests only cover pages that need no sign-in.
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:4000}"
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-pk_test_Y2xlcmsuZXhhbXBsZS5jb20k}"
export CLERK_SECRET_KEY="${CLERK_SECRET_KEY:-sk_test_e2e_placeholder}"
export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:3000}"
export NODE_ENV=production

pnpm --filter @tracecart/api migrate:deploy
pnpm --filter @tracecart/api seed:e2e
pnpm --filter @tracecart/api build
pnpm --filter @tracecart/web build

node apps/api/dist/index.js > e2e-api.log 2>&1 &
API_PID=$!
(cd apps/web && pnpm exec next start -p 3000 > ../../e2e-web.log 2>&1) &
WEB_PID=$!
trap 'kill $API_PID $WEB_PID 2>/dev/null || true' EXIT

for i in $(seq 1 60); do
  if curl -sf http://localhost:4000/health >/dev/null && curl -sf http://localhost:3000/api/health >/dev/null; then break; fi
  [ "$i" = 60 ] && { echo "Servers didn't start:"; tail -n 40 e2e-api.log e2e-web.log; exit 1; }
  sleep 1
done

cd apps/web && pnpm exec playwright test "$@"
