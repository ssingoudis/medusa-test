#!/bin/sh
# Start script of the backend container: prepares the database, then starts
# Medusa. Every step is safe to repeat on each container start.
set -e

MEDUSA=/app/apps/backend/node_modules/.bin/medusa

echo "[start] Running database migrations (includes the initial data seed)"
"$MEDUSA" db:migrate

if [ "${SEED_DEMO_BRANDS:-true}" = "true" ]; then
  echo "[start] Seeding demo brands and suits"
  "$MEDUSA" exec ./src/scripts/seed-brands.js
fi

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "[start] Ensuring admin user $ADMIN_EMAIL"
  "$MEDUSA" user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD" \
    || echo "[start] Admin user not created (it probably exists already)"
fi

if [ -n "$PUBLISHABLE_KEY_DIR" ]; then
  echo "[start] Exporting publishable keys for the storefronts"
  "$MEDUSA" exec ./src/scripts/export-publishable-keys.js
fi

echo "[start] Starting Medusa"
exec "$MEDUSA" start
