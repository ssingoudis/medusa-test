# Medusa backend + admin dashboard (production build).
# Build context is the repository root.
FROM node:22-slim

RUN npm install -g pnpm@12.9.1

WORKDIR /app

# Install dependencies first so this layer is cached between code changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY apps/storefront/package.json apps/storefront/
RUN pnpm install --frozen-lockfile --filter "@dtc/backend..."

COPY apps/backend apps/backend
RUN cd apps/backend && pnpm exec medusa build

COPY deploy/backend-start.sh /usr/local/bin/backend-start
RUN chmod +x /usr/local/bin/backend-start

ENV NODE_ENV=production
# The compiled app lives in .medusa/server; packages resolve from
# apps/backend/node_modules one level up.
WORKDIR /app/apps/backend/.medusa/server
EXPOSE 9000

CMD ["backend-start"]
