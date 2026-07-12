# Fix: Generate the Prisma client on install so Vercel builds succeed

**Type:** Fix
**Status:** complete

## The problem

After merging the PDF-restyle fix, the live Vercel deployment still showed the
old resume format even though `localhost:3000` showed the new one correctly.
The triggered production deploy had actually failed: Turbopack couldn't
resolve `@/app/generated/prisma/client` during `next build`. That directory is
correctly gitignored as generated code, but nothing in the build pipeline ever
ran `prisma generate` on a fresh checkout - it only worked locally because the
client had been generated once, previously, and never deleted from disk.

## The fix

Added `"postinstall": "prisma generate"` to `package.json`, so the client is
regenerated every time `npm install` runs - on Vercel and on any fresh clone.

## Build steps

- [x] **Step 1 - Add postinstall generation** - add `postinstall: prisma generate` to `package.json`. *Done when:* with `app/generated/prisma` removed, `npm install` regenerates it and `npm run build` succeeds end to end (verified locally).

## Verify

- Removed `app/generated/prisma` locally, ran `npm install`, confirmed the client regenerated automatically via the new `postinstall` script.
- Ran `npm run build` (full script, including `prisma migrate deploy`) and `npm run lint` afterward - both clean.
