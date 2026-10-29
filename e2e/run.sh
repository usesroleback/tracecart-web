#!/bin/sh
# Builds and starts tracecart-api and this web app against a disposable
# database, seeds the browser-test data, and runs the Playwright tests. Used by
# CI; run it yourself the same way (`pnpm test:e2e`, see README "Tests").
#
# Needs: DATABASE_URL (database name must contain "test"), REDIS_URL, a
# checkout of tracecart-api with its dependencies installed (TRACECART_API_DIR,
# default ../tracecart-api), and Playwright's Chromium
# (`pnpm exec playwright install --with-deps chromium`).
set -eu

: "${DATABASE_URL:?set DATABASE_URL to a disposable database}"
: "${REDIS_URL:?set REDIS_URL}"
case "$DATABASE_URL" in
  *test*) ;;
  *) echo "Refusing to run: the browser tests change data, and DATABASE_URL doesn't contain \"test\"." >&2; exit 1 ;;
esac

WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$(cd "${TRACECART_API_DIR:-$WEB_DIR/../tracecart-api}" && pwd)"

# Placeholders are enough: these tests only cover pages that need no sign-in.
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:4000}"
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-pk_test_Y2xlcmsuZXhhbXBsZS5jb20k}"
export CLERK_SECRET_KEY="${CLERK_SECRET_KEY:-sk_test_e2e_placeholder}"
export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:3000}"
export NODE_ENV=production

(cd "$API_DIR" && pnpm migrate:deploy && pnpm seed:e2e && pnpm build)
(cd "$WEB_DIR" && pnpm build)

(cd "$API_DIR" && exec node dist/index.js > "$WEB_DIR/e2e-api.log" 2>&1) &
API_PID=$!
(cd "$WEB_DIR" && exec node_modules/.bin/next start -p 3000 > "$WEB_DIR/e2e-web.log" 2>&1) &
WEB_PID=$!
trap 'kill $API_PID $WEB_PID 2>/dev/null || true' EXIT

for i in $(seq 1 60); do
  if curl -sf http://localhost:4000/health >/dev/null && curl -sf http://localhost:3000/api/health >/dev/null; then break; fi
  [ "$i" = 60 ] && { echo "Servers didn't start:"; tail -n 40 "$WEB_DIR/e2e-api.log" "$WEB_DIR/e2e-web.log"; exit 1; }
  sleep 1
done

cd "$WEB_DIR" && pnpm exec playwright test "$@"
