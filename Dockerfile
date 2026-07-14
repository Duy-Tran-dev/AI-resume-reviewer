# syntax=docker/dockerfile:1

# ---- deps: install dependencies (postinstall runs `prisma generate`) ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# ---- builder: compile the Next.js app ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# The Groq SDK client is instantiated at module load, which Next.js evaluates
# during build-time page-data collection - it just needs a non-empty value
# here, never a real one. The runner stage doesn't inherit this; the real key
# is supplied at container runtime.
ENV GROQ_API_KEY=docker-build-placeholder
RUN npx next build

# ---- runner: minimal runtime image ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOME=/app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Full node_modules (from deps), needed only to run the Prisma CLI's
# `migrate deploy` at container startup. The app itself never touches this at
# request time - it talks to Postgres through the @prisma/adapter-pg driver
# adapter via the standalone bundle below, so serving traffic needs no
# Prisma query-engine binary. A consistent glibc base (Debian, not Alpine)
# across every stage keeps the schema-engine binary the CLI does need
# working, with no musl binaryTargets fiddling.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json

# Standalone Next.js server, kept in its own folder so its self-contained,
# pruned node_modules doesn't merge with the full one above.
COPY --from=builder /app/.next/standalone ./server
COPY --from=builder /app/public ./server/public
COPY --from=builder /app/.next/static ./server/.next/static

COPY docker-entrypoint.sh ./docker-entrypoint.sh
# Strip any CRLF line endings regardless of how this file was checked out -
# a CRLF shebang line ("#!/bin/sh\r") fails with a confusing "no such file or
# directory" instead of a clear syntax error, so this is worth guarding
# unconditionally rather than trusting .gitattributes alone.
RUN sed -i 's/\r$//' ./docker-entrypoint.sh \
  && chmod +x ./docker-entrypoint.sh \
  && chown -R nextjs:nodejs /app

USER nextjs

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
