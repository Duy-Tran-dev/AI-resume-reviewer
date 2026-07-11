# Feature: Deploy to Vercel

**From build-plan:** feature 5
**Status:** complete. Live at https://myapp-three-rose.vercel.app

## Goal

Ship the MVP: a short error-handling/polish pass, then a real, working
deployment on Vercel with a GitHub-connected pipeline (per your choice), with
production environment variables and database migrations wired correctly.

## In scope

- Fix the leftover create-next-app page metadata (title/description)
- Add an `error.tsx` boundary so unhandled errors (e.g. a database outage)
  show a friendly message instead of a raw stack trace/crash screen
- Wire `prisma migrate deploy` into the production build command, per
  `coding-standards.md`'s existing rule that deployments must run migrations
  before the app starts
- Confirm/obtain a **pooled** Neon connection string for the deployed
  environment (see note below - this is a real correctness issue, not
  routine polish)
- Push this repo to GitHub (you create the repo + credentials; I add the
  remote and push once you give the go-ahead)
- Connect the GitHub repo to a new Vercel project, set production environment
  variables (`DATABASE_URL`, `GROQ_API_KEY`), and trigger the first deploy
- Verify the live deployment works end to end (upload -> analyze -> results
  -> improve -> download) against the real production URL

## Out of scope

- A custom domain (Vercel's default `*.vercel.app` URL is fine for the MVP)
- CI checks (lint/build) gating merges - not asked for, not in the plan
- Any further UI redesign beyond the metadata fix and error boundary -
  "polish" here means production-readiness, not a visual refresh
- Auth or per-user scoping (still an explicit MVP non-goal)

## Build loop

Build one step at a time, never the whole feature at once.

1. Plan mode lays out the step before any code.
2. The AI implements just that step.
3. It shows the diff (not full files); you read it and understand it.
4. You approve, then choose whether to commit a checkpoint or roll straight on.
   Checkpoints are optional; `/complete` makes the real feature-level commit at the end.

Never accept a step you haven't read. If a diff is too big to review, the step was too big, so split it.

Steps 5-8 involve real external actions (pushing code, creating cloud
resources, setting production secrets) - I'll stop and confirm with you
before each one, not just build through them.

## Build steps

- [x] **Step 1 - Fix metadata** - update `app/layout.tsx`'s `metadata` (title/description) to describe the actual app instead of the create-next-app default. *Done when:* the browser tab title reads something real when running the app; `npm run build` passes.
- [x] **Step 2 - Error boundary** - add `app/error.tsx` (client component, per Next's convention) showing a friendly "something went wrong" message with a retry button, instead of the default dev/prod error screen. *Done when:* a deliberately-thrown error in a page (temporary test, reverted after) renders the custom boundary instead of crashing; `npm run build` passes.
- [x] **Step 3 - Production build command + pooled connection string** - update `package.json`'s `build` script to run `prisma migrate deploy` before `next build`. Get a **pooled** Neon connection string (hostname includes `-pooler`) for use as the production `DATABASE_URL` - the current local `.env` uses the direct (non-pooled) connection, which risks exhausting Neon's connection limit under Vercel's concurrent serverless invocations. *Done when:* `npm run build` locally still succeeds with the updated script (migrate deploy no-ops since already applied); you've confirmed the pooled connection string is ready to paste into Vercel's env vars in Step 6.
- [x] **Step 4 - Local production smoke test** - run `npm run build && npm start` (real production mode, not `npm run dev`) and click through the full flow (upload -> results -> generate -> improved -> download) against that locally-running production build. Every check so far in this project used the dev server; production mode has already diverged from dev once before (feature 2's PDF-parsing worker needed dedicated config). Catching a production-only bug here is far cheaper than catching it after a live deploy. *Done when:* the full flow works against the local production build with no errors in the terminal.
- [x] **Step 5 - Push to GitHub** - you create an empty GitHub repo and confirm git can authenticate; give me the remote URL. I add it as `origin` and push `master`. *Done when:* the repo on GitHub shows the current commit history.
- [x] **Step 6 - Create the Vercel project** - connect the pushed GitHub repo to a new Vercel project (via `npx vercel link` or the Vercel dashboard - whichever authenticates more smoothly; `vercel login` needs your browser). *Done when:* the project exists in your Vercel account and is linked to the GitHub repo.
- [x] **Step 7 - Set production env vars and deploy** - set `DATABASE_URL` (the pooled string from Step 3) and `GROQ_API_KEY` as Vercel production environment variables, then trigger the first deploy (either via the GitHub push itself, once connected, or `npx vercel --prod`). *Done when:* the deploy succeeds and the live URL loads the home page.
- [x] **Step 8 - Verify the live app** - on the real deployed URL: upload a resume, confirm it redirects to a populated results page, generate an improved resume, confirm the PDF downloads correctly. *Done when:* the full flow works against production, not just localhost.

## Files / areas

- `app/layout.tsx` - modify (metadata)
- `app/error.tsx` - new
- `package.json` - modify (`build` script)
- No application source changes beyond Steps 1-3; Steps 4-8 are verification/infrastructure/deployment actions, not code

## Data / contracts

No schema changes. Same `Resume` model, same Neon database - production and
local dev point at the same Neon project unless you decide otherwise (not
raised as a requirement anywhere in the plans, so out of scope to build a
separate prod database).

## Testing

No test command is declared in `AGENTS.md`. Steps 1-3 verify via `npm run
build` and manual browser checks (per `coding-standards.md`'s Browser
Verification section - no code to unit-test here, it's config and a static
error page). Step 8 is the real acceptance check: the full user flow against
the live production URL, not simulated.

## Notes for the AI

- Never commit `.env` or paste raw secret values into files that get
  committed - production secrets go into Vercel's env var store (dashboard or
  `vercel env add`), the same way local secrets only ever lived in the
  gitignored `.env`.
- Steps 5 (push) and 7 (setting production secrets, deploying) are
  hard-to-reverse or externally-visible actions - confirm explicitly before
  each, per this project's standing rule on risky actions. A completed step
  earlier in this feature is not blanket approval for a later one.
- `vercel login` requires interactive browser auth I cannot complete for you
  - I can run the command and relay the link/prompt, but you complete the
    login yourself.
- If GitHub push authentication turns out not to be set up when we reach
  Step 5, stop and say so rather than guessing at credentials.
