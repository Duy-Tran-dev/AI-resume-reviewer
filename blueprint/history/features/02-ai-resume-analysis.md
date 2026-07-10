# Feature: AI resume analysis

**From build-plan:** feature 2
**Status:** complete

## Goal

After a resume is uploaded, send its text to Groq (Llama) for analysis from the
perspective of a technical recruiter and an ATS, and persist a structured result
(score, strengths, weaknesses, missing sections, prioritized suggestions with
why-it-matters explanations) onto its `Resume` row - so feature 3's Review
Results page has real data to display.

## In scope

- Groq API integration (`app/lib/groq.ts`): prompt design, request, and a
  validated, typed result shape
- Extending the `Resume` schema for `missingSections` and structured
  `suggestions` (score/strengths/weaknesses fields already exist from feature 1)
- Triggering analysis automatically right after upload (chained into the
  existing `uploadResume` Server Action - no new button or page)
- Persisting analysis results to the `Resume` row
- Graceful handling of AI failure/timeout (upload still succeeds; analysis
  fields stay empty; error logged server-side)

## Out of scope

- Review Results page / any UI displaying strengths, weaknesses, missing
  sections, or suggestions (feature 3)
- Resume regeneration / `improvedResume` (feature 4)
- Retrying a failed analysis (no UI exists yet to trigger a retry from -
  feature 3 can add that when it builds the results page)
- Navigating away from the home page (feature 3, per feature 1's notes)
- Deployment (feature 5)

## Build loop

Build one step at a time, never the whole feature at once.

1. Plan mode lays out the step before any code.
2. The AI implements just that step.
3. It shows the diff (not full files); you read it and understand it.
4. You approve, then choose whether to commit a checkpoint or roll straight on.
   Checkpoints are optional; `/complete` makes the real feature-level commit at the end.

Never accept a step you haven't read. If a diff is too big to review, the step was too big, so split it.

## Build steps

- [x] **Step 1 - Extend the Resume schema** - add `missingSections String[] @default([])`, change `suggestions` from `String[]` to `Json` (structured `{ text, priority, why }[]`), and run the migration. *Done when:* `npx prisma migrate dev` applies cleanly against Neon (the `suggestions` column becomes `jsonb`); `npm run build` still succeeds.
- [x] **Step 2 - Groq analysis module** - add `groq-sdk` and `zod`, add `GROQ_API_KEY` to `.env`, and create `app/lib/groq.ts` exporting `analyzeResume(resumeText: string): Promise<ResumeAnalysis>`. It builds a system prompt covering ATS compatibility, structure, formatting, grammar, technical skills, projects, experience, bullet-point quality, action verbs, quantifiable achievements, readability, and professionalism; calls Groq's chat completions (model `llama-3.3-70b-versatile`, JSON response mode) with a bounded timeout; parses and validates the response against a Zod schema (`score: number`, `strengths: string[]`, `weaknesses: string[]`, `missingSections: string[]`, `suggestions: { text, priority: "high"|"medium"|"low", why }[]`); throws on any failure (bad JSON, failed validation, timeout, API error) rather than returning a partial/guessed result. *Done when:* calling `analyzeResume()` with real resume text returns a validated `ResumeAnalysis` object; a mocked malformed response (invalid JSON, or valid JSON missing required fields) causes it to throw rather than return something unvalidated.
- [x] **Step 3 - Wire analysis into upload** - in `app/actions/resume.ts`, after the `Resume` row is created, call `analyzeResume(text)`; on success, update the row with `aiScore`, `strengths`, `weaknesses`, `missingSections`, `suggestions`; on failure, log the error server-side and leave those fields empty - the upload itself still reports success to the user (`uploadResume`'s return shape is unchanged from feature 1). *Done when:* uploading a valid resume produces a `Resume` row with all AI fields populated, verified by querying Neon directly; with a deliberately broken `GROQ_API_KEY`, the upload still succeeds (row created, `originalText` populated) while the AI fields stay empty and an error is logged, with no crash.

## Files / areas

- `prisma/schema.prisma` - modify (`missingSections`, `suggestions` type change)
- `app/lib/groq.ts` - new
- `app/actions/resume.ts` - modify (call `analyzeResume` after persisting)
- `.env` - add `GROQ_API_KEY`
- `package.json` - add `groq-sdk`, `zod`

## Data / contracts

Extending the `Resume` schema locked in feature 1:

```prisma
model Resume {
  id              String   @id @default(cuid())
  originalText    String
  aiScore         Int?
  strengths       String[] @default([])
  weaknesses      String[] @default([])
  missingSections String[] @default([])
  suggestions     Json     @default("[]")
  improvedResume  String?
  createdAt       DateTime @default(now())
}
```

`suggestions` stores `Suggestion[]`, exported from `app/lib/groq.ts` for reuse
by feature 3 (display) and feature 4 (regeneration) rather than redefined there:

```ts
type Suggestion = {
  text: string;
  priority: "high" | "medium" | "low";
  why: string;
};

type ResumeAnalysis = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingSections: string[];
  suggestions: Suggestion[];
};
```

The `suggestions` column has no existing data worth preserving (only test rows
have ever been created and deleted), so the migration can freely change its
type without a data-preserving cast.

## Testing

No test command is declared in `AGENTS.md` yet, so the test gate is off - verify
with direct DB queries and `npm run build`, not unit tests.

The Zod validation logic in `app/lib/groq.ts` (parsing and validating the AI's
JSON response) is exactly the kind of pure, in-scope logic the testing gate
covers - a validator with real edge cases (malformed JSON, missing fields, wrong
types). If you want that covered by tests, run `/tests` before or after this
feature; otherwise this spec relies on manual verification (real call plus a
mocked bad response) per the Testing gate in `coding-standards.md`.

Manual verification per step:

- Step 1: `npx prisma migrate dev` succeeds; inspect the `Resume` table schema
  in Neon/Prisma Studio to confirm `missingSections` and the `jsonb`
  `suggestions` column.
- Step 2: call `analyzeResume()` with a real resume text sample and confirm a
  valid, fully-populated result; call it with a stubbed/mocked malformed
  response and confirm it throws instead of returning something unvalidated.
- Step 3: upload a real resume and query Neon directly to confirm `aiScore`,
  `strengths`, `weaknesses`, `missingSections`, and `suggestions` are all
  populated; temporarily break `GROQ_API_KEY`, upload again, and confirm the
  row is still created with `originalText` populated, AI fields stay empty, the
  page doesn't crash, and an error is logged server-side.

## Notes for the AI

- You'll need the user's Groq API key before Steps 2-3 can be exercised for
  real - ask for it the same way the Neon connection string was requested in
  feature 1.
- Analysis is chained synchronously into `uploadResume`, not a separate
  route/button - the existing "Reviewing..." pending state on the submit
  button already reads correctly for this longer wait, so no UI change is
  needed. If Groq latency ever becomes a UX problem, moving this to a
  background job is a future improvement, not in scope here.
- Truncate `originalText` defensively before sending it to Groq (e.g. ~12,000
  characters) to stay well within model context limits for pathologically long
  extracted text.
- Bound the Groq call with a timeout (e.g. 20s) via `AbortController`; treat a
  timeout the same as any other analysis failure.
- No `src/` directory - `app/lib/groq.ts` per `coding-standards.md`.
- No user scoping needed (no auth in the MVP).
