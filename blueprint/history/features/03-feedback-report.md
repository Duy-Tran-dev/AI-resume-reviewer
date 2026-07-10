# Feature: Feedback report

**From build-plan:** feature 3
**Status:** complete

## Goal

Show the AI analysis from feature 2 on a real page: the score, strengths,
weaknesses, missing sections, and prioritized suggestions with why-it-matters
explanations. Replace the placeholder "Resume uploaded" message with an actual
redirect there, completing the upload -> analyze -> view flow.

## In scope

- `/results/[id]` page (Server Component): fetches the `Resume` by id directly
  with Prisma and displays the analysis
- Not-found handling for an invalid/missing resume id
- "Analysis not available" state when `aiScore` is `null` (analysis failed or
  is still the pre-feature-2 shape)
- Suggestions sorted by priority (high -> medium -> low), each showing its
  text and why-it-matters explanation
- Redirecting to `/results/[id]` after a successful upload, replacing the
  inline "Resume uploaded (id: ...)" message
- Removing the now-dead "success" state/UI from the upload form once redirect
  makes it unreachable

## Out of scope

- Resume regeneration, the `/improved` page, or any download (feature 4)
- A "retry analysis" action (no entry point for it yet; a later feature can add one)
- Deployment (feature 5)
- Auth or per-user scoping - no accounts in the MVP
- Any visual/design system work beyond matching the existing pages' look

## Build loop

Build one step at a time, never the whole feature at once.

1. Plan mode lays out the step before any code.
2. The AI implements just that step.
3. It shows the diff (not full files); you read it and understand it.
4. You approve, then choose whether to commit a checkpoint or roll straight on.
   Checkpoints are optional; `/complete` makes the real feature-level commit at the end.

Never accept a step you haven't read. If a diff is too big to review, the step was too big, so split it.

## Build steps

- [x] **Step 1 - Review Results page** - add `app/results/[id]/page.tsx` (Server Component): fetch the `Resume` by `id` with Prisma; call `notFound()` (from `next/navigation`) if no row exists; if `aiScore` is `null`, render an "analysis not available" message instead of the report; otherwise render the score, `strengths`, `weaknesses`, `missingSections`, and `suggestions` (cast to the `Suggestion[]` type from `app/lib/groq.ts`, sorted high -> medium -> low priority via a small `sortSuggestionsByPriority` helper), each suggestion showing its text and `why`. *Done when:* visiting `/results/<real-id>` for an analyzed resume shows all five pieces of data correctly (verified against what's in Neon for that row); visiting `/results/<bogus-id>` renders Next's not-found page; visiting `/results/<id>` for a resume with `aiScore: null` shows the "analysis not available" message instead of a broken/empty report.
- [x] **Step 2 - Redirect after upload** - in `app/actions/resume.ts`, call `redirect(\`/results/${resume.id}\`)` (from `next/navigation`) after the resume row is created and analysis has been attempted (redirect fires whether analysis succeeded or failed - only a DB failure on the initial create still returns the existing error state). Simplify `UploadResumeState` to drop the now-unreachable `"success"` variant, and remove the corresponding success message and dead branches from `ResumeUploadForm.tsx`. *Done when:* submitting a valid resume navigates the browser to `/results/<new-id>` and shows the report from Step 1; submitting an invalid file or hitting a simulated DB failure still stays on `/` and shows the existing inline error, with no redirect.

## Files / areas

- `app/results/[id]/page.tsx` - new
- `app/actions/resume.ts` - modify (redirect on success, drop `"success"` state variant)
- `app/components/resume/ResumeUploadForm.tsx` - modify (remove dead success UI)

## Data / contracts

Read-only against the `Resume` shape locked in features 1-2. No schema changes.
`suggestions` is stored as `Json`; the results page casts it to the `Suggestion[]`
type already exported from `app/lib/groq.ts` rather than redefining the shape.

## Testing

No test command is declared in `AGENTS.md` yet, so the test gate is off - verify
with the browser and `npm run build`, not unit tests.

The one bit of pure logic here is `sortSuggestionsByPriority` (sorting an array
by a fixed priority order) - a small, in-scope-for-testing candidate per
`coding-standards.md` if a runner existed. Since none is configured, verify it
manually: an analysis with mixed-priority suggestions should render high-priority
ones first.

Manual verification per step:

- Step 1: upload a resume (or reuse an existing `Resume` row's id from Neon),
  visit `/results/<id>` directly in the browser, and compare what's shown
  against the row's actual columns; visit a made-up id and confirm the 404;
  find or create a row with `aiScore: null` and confirm the fallback message.
- Step 2: submit a valid resume from `/` and confirm the browser lands on
  `/results/<id>` with the report visible; submit an invalid file and confirm
  it stays on `/` with the inline error, no navigation.

## Notes for the AI

- No `src/` directory - `app/results/[id]/page.tsx` per `coding-standards.md`.
- Server component fetches directly with Prisma (per `coding-standards.md`) -
  no client-side fetch needed for this page.
- No user scoping needed (no auth in the MVP) - any visitor with a valid id can
  view that resume's results, consistent with the rest of the MVP having no
  accounts.
- `redirect()` from `next/navigation` throws internally to perform the
  navigation - call it as the last thing in the success path of `uploadResume`,
  not inside a try/catch that would swallow it.
