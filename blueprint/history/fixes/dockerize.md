# Fix: Dockerize the project

**Type:** Fix
**Status:** complete

## The problem

The app only ran via `npm run dev` / Vercel - there was no way to build or run
it as a container, and no local Postgres story beyond a blank `DATABASE_URL`
in `.env`. Docker support was needed for local dev parity and for deploying
outside Vercel.

Relevant facts from `coding-standards.md` / the real config:

- Next.js 16 (App Router), standalone output not yet enabled.
- **Prisma 7 with the `@prisma/adapter-pg` driver adapter** - the runtime
  client talks to Postgres over the `pg` driver directly, not the Rust query
  engine binary, so there's no `binaryTargets`/musl compatibility problem for
  the app itself. The `prisma` CLI (`migrate deploy`) still ships its own
  schema-engine binary, so the base image's libc matters for that command -
  using a Debian-based Node image (glibc) avoids Alpine/musl engine-binary
  mismatches and is the simpler, safer default here over `node:*-alpine`.
- `npm run build` = `prisma migrate deploy && next build`. Running a real
  migration during the *image build* is wrong - there's no reachable database
  in a `docker build` context, and baking migrations into the image is an
  anti-pattern. The image build runs `next build` only; `prisma migrate
  deploy` runs at **container startup**, against whatever `DATABASE_URL` the
  container is actually given.
- Required env vars at runtime: `DATABASE_URL`, `GROQ_API_KEY`.
  `VERCEL_OIDC_TOKEN` in `.env.local` is Vercel-only, not needed in Docker.
- No `.nvmrc`/engines field pins a Node version; used current LTS (Node 22).
- `/app/generated/prisma` (custom Prisma client output path) is gitignored and
  must be regenerated during the image build, not copied in.

## The fix

- Added `output: "standalone"` to `next.config.ts` for a self-contained
  `.next/standalone` server bundle.
- Added a multi-stage `Dockerfile` (`deps` -> `builder` -> `runner`) on
  `node:22-bookworm-slim`. The runner keeps the full `node_modules` (for the
  Prisma CLI's `migrate deploy`) alongside the standalone server in its own
  `./server` subfolder (so its pruned node_modules doesn't merge with the full
  one), and runs as a non-root user.
- Added `docker-entrypoint.sh`: runs `prisma migrate deploy`, then execs the
  standalone server. Migration failure stops the container before it serves
  traffic.
- Added `.dockerignore` mirroring `.gitignore`, plus `.git`, `blueprint/`, and
  docs, so secrets and the build context stay out of the image.
- Added `docker-compose.yml` (app + Postgres) for local dev, with the app's
  `DATABASE_URL` pointed at the compose Postgres (never the real Neon URL in
  `.env`) and `GROQ_API_KEY` read from `.env` via Compose's automatic
  substitution.
- Updated the Commands section of `AGENTS.md` with the new Docker/Compose
  commands.

**Two real bugs found and fixed while proving this:**

1. The `builder` stage copies the host source tree, which excludes the
   gitignored generated Prisma client - so the client generated in `deps`
   never made it into `builder`. Fixed by re-running `prisma generate` in
   `builder` after the source copy.
2. `app/lib/groq.ts` instantiates the Groq SDK client at module load, which
   Next.js evaluates during build-time page-data collection for
   `/improved/[id]` - this crashed with no `GROQ_API_KEY` present at build
   time. Fixed with a placeholder `ENV` scoped to the `builder` stage only
   (never copied into `runner`, never a real secret).

**Must not break:** the existing Vercel deploy path and local `npm run dev` -
both unchanged; Docker is an additional way to run the app, not a replacement.

## Build steps

- [x] 1. Enable standalone output - add `output: "standalone"` to `next.config.ts`.
- [x] 2. Add `Dockerfile` and `.dockerignore` (deps -> builder -> runner stages, non-root user, Node 22 Debian-slim base).
- [x] 3. Add the startup entrypoint that runs `prisma migrate deploy` then starts the standalone server.
- [x] 4. Add `docker-compose.yml` (app + postgres) for local dev.
- [x] 5. Update `AGENTS.md` Commands section with the Docker/Compose commands.

## Verify

- `docker build -t my-app .` succeeded.
- Ran the built image against a throwaway local Postgres container (not the
  real Neon database): all 3 existing migrations applied cleanly on first
  boot, server started, `curl localhost:3000/` returned `HTTP 200`.
- `docker compose up --build` served the app; user manually confirmed
  upload -> analysis -> download works end-to-end against the containerized
  Postgres.
- Plain `next build` (no Docker) still succeeds locally, confirming
  `npm run dev` and the existing Vercel build path are unaffected.
