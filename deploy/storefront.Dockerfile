# Next.js storefront. One image serves every brand; the brand is chosen at
# container start through environment variables (see storefront-start.sh).
# Build context is the repository root.
FROM node:22-slim

RUN npm install -g pnpm@12.9.1

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY apps/storefront/package.json apps/storefront/
RUN pnpm install --frozen-lockfile --filter "@dtc/storefront..."

COPY apps/storefront apps/storefront

COPY deploy/storefront-start.sh /usr/local/bin/storefront-start
RUN chmod +x /usr/local/bin/storefront-start && date +%s > /app/.image-id

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/storefront
EXPOSE 8000

CMD ["storefront-start"]
