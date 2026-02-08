FROM node:20-alpine AS base
WORKDIR /app

# ── Install dependencies ───────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── Generate Prisma client ─────────────────────────────
FROM deps AS prisma
COPY prisma ./prisma
RUN npx prisma generate

# ── Build application ──────────────────────────────────
FROM prisma AS build
COPY . .
RUN npx nuxt build

# ── Production image ───────────────────────────────────
FROM base AS production

RUN npm install -g prisma

COPY --from=build /app/.output /app/.output
COPY --from=build /app/prisma /app/prisma
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/node_modules/@prisma /app/node_modules/@prisma

ENV NODE_ENV=production
ENV NUXT_PORT=3847
EXPOSE 3847

# Push schema to DB on startup, then run app
CMD sh -c "prisma db push --skip-generate && node .output/server/index.mjs"
