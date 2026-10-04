#!/bin/sh
# Start script of a storefront container.
#
# Next.js inlines NEXT_PUBLIC_* values at build time and pre-renders pages
# from the backend, so the build runs here, at container start, once the
# backend is reachable and the brand's publishable key is known. The build is
# kept in a volume and reused until the image or the configuration changes.
set -e

: "${NEXT_PUBLIC_MEDUSA_BACKEND_URL:?NEXT_PUBLIC_MEDUSA_BACKEND_URL is required}"
PORT="${PORT:-8000}"

# 1. Publishable key: explicit env var, or the file the backend exported.
if [ -z "$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY" ]; then
  KEY_FILE="${PUBLISHABLE_KEY_DIR:-/shared/keys}/${BRAND_SLUG:?BRAND_SLUG or NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is required}"
  echo "[start] Waiting for publishable key $KEY_FILE"
  i=0
  until [ -s "$KEY_FILE" ]; do
    i=$((i + 1))
    if [ "$i" -gt 120 ]; then
      echo "[start] No publishable key after 10 minutes. Is the backend running?" >&2
      exit 1
    fi
    sleep 5
  done
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$(cat "$KEY_FILE")"
  export NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
fi

# 2. The backend must answer on its public URL (DNS and TLS included),
#    because that is the URL the build and the browser both use.
echo "[start] Waiting for $NEXT_PUBLIC_MEDUSA_BACKEND_URL/health"
i=0
until node -e "fetch(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"; do
  i=$((i + 1))
  if [ "$i" -gt 120 ]; then
    echo "[start] Backend not reachable after 10 minutes." >&2
    exit 1
  fi
  sleep 5
done

# 3. Build, unless a build for exactly this image and configuration exists.
STAMP="$(cat /app/.image-id)|$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY|$NEXT_PUBLIC_MEDUSA_BACKEND_URL|$NEXT_PUBLIC_BASE_URL|$NEXT_PUBLIC_DEFAULT_REGION|$NEXT_PUBLIC_STORE_NAME|$NEXT_PUBLIC_STORE_TAGLINE"

if [ -f .next/BUILD_ID ] && [ "$(cat .next/.stamp 2>/dev/null)" = "$STAMP" ]; then
  echo "[start] Reusing existing build"
else
  echo "[start] Building storefront for ${NEXT_PUBLIC_STORE_NAME:-default shop}"
  pnpm exec next build
  printf '%s' "$STAMP" > .next/.stamp
fi

echo "[start] Starting storefront on port $PORT"
export NODE_ENV=production
exec pnpm exec next start -p "$PORT"
