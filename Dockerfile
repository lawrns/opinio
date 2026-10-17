FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# DATABASE_URL must be supplied at build time (no committed default):
#   docker build --build-arg DATABASE_URL=... .
# It is used only by `pnpm build` and is not persisted with ENV.
ARG DATABASE_URL
RUN if [ -z "$DATABASE_URL" ]; then echo "ERROR: DATABASE_URL build arg is required (docker build --build-arg DATABASE_URL=...)" >&2; exit 1; fi \
  && DATABASE_URL="$DATABASE_URL" pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
