# Feature: Resume regeneration & download

**From build-plan:** feature 4
**Status:** complete

## Goal

Let the user generate an AI-improved version of their resume from the Review
Results page, view it on its own page, and download it - completing the MVP's
upload -> analyze -> view -> improve -> download flow.

## In scope

- Groq regeneration call (`improveResume` in `app/lib/groq.ts`): rewrites the
  resume using the original text plus the existing analysis (strengths,
  weaknesses, suggestions) as context, reorganizing/rewriting/clarifying only -
  never inventing experience, projects, skills, achievements, or education.
  Returns **structured** data (`name`, `sections: { heading, bullets }[]`),
  not a flat string, so it can be rendered with real styling.
- `/improved/[id]` page: displays the improved resume with real section
  headings and bullet lists, with a "not generated yet" fallback (linking
  back to results) and not-found handling
- Download via a Route Handler that generates and returns an actual **PDF**
  (via `@react-pdf/renderer`) built from the structured resume data -
  replacing the earlier `.txt`-only plan
- `generateImprovedResume` Server Action: calls `improveResume`, persists the
  structured result to `improvedResume` (now `Json`), redirects to
  `/improved/[id]`
- "Generate improved resume" button on `/results/[id]` (shown only when
  analysis succeeded); once generated, that spot shows a "View improved
  resume" link instead

## Out of scope

- Visually replicating the **original** uploaded resume's specific design -
  not feasible (the original PDF file itself was never stored, only its
  extracted text, and there's no reliable way to re-flow different-length
  text into an arbitrary original PDF's exact layout without breaking it).
  This feature produces a new, clean, consistently-styled PDF instead.
- Regenerating again after the first success (no version history; the results
  page just shows the link once generated - overwriting via a second
  generation isn't wired up)
- Auth or per-user scoping - no accounts in the MVP
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

- [x] **Step 1 - Groq regeneration module** - add `improveResume(originalText: string, context: { strengths: string[]; weaknesses: string[]; suggestions: Suggestion[] }): Promise<{ improvedResume: string }>` to `app/lib/groq.ts`, reusing the existing client/model/timeout pattern. System prompt: rewrite the resume addressing the given weaknesses/suggestions, preserving all truthful content, never fabricating anything not already present. Request JSON (`{ "improvedResume": "..." }`), validate with a Zod schema (`improvedResume: z.string().min(1)`), throw on bad JSON or failed validation. *Done when:* calling `improveResume()` with real resume text and analysis context returns a validated, non-empty improved resume string; a mocked malformed response causes it to throw.
- [x] **Step 2 - Improved Resume page + download route** - add `app/improved/[id]/page.tsx` (Server Component): fetch the `Resume` by id, `notFound()` if missing, show a "not generated yet" message with a link back to `/results/[id]` if `improvedResume` is `null`, otherwise render the text and a download link. Add `app/api/resume/[id]/download/route.ts` (`GET`): fetch the `Resume`, return 404 if missing or `improvedResume` is `null`, otherwise return the text as `text/plain` with `Content-Disposition: attachment; filename="improved-resume-<id>.txt"`. *Done when:* visiting `/improved/<id>` for a resume with `improvedResume` set (set directly via Neon for this step's test) shows the text and a working download link; visiting it for a resume with `improvedResume: null` shows the fallback message; visiting a bogus id 404s; hitting the download route directly returns the file with the correct headers, and 404s for a resume with no improved text yet.
- [x] **Step 3 - Generate Server Action** - add `generateImprovedResume(resumeId: string, prevState: GenerateImprovedResumeState, formData: FormData): Promise<GenerateImprovedResumeState>` to `app/actions/resume.ts` (`GenerateImprovedResumeState = { status: "idle" } | { status: "error"; message: string }`): fetch the resume, call `improveResume` with its `originalText`/`strengths`/`weaknesses`/`suggestions`, persist the result to `improvedResume`, then `redirect(\`/improved/${resumeId}\`)`; on any failure (not found, Groq error, DB error), return an error state instead of redirecting. *Done when:* invoking the action for a valid resume updates its `improvedResume` column and redirects to `/improved/<id>`; simulating a Groq failure (bad API key) returns an error state, leaves `improvedResume` null, and does not redirect.
- [x] **Step 4 - Wire the button into Results** - add a small client component `GenerateImprovedResumeButton` (`app/components/resume/GenerateImprovedResumeButton.tsx`) using `useActionState` with `generateImprovedResume.bind(null, resumeId)`, showing a pending state ("Generating...") and an inline error message on failure. In `app/results/[id]/page.tsx`, render this button when `improvedResume` is `null`, or a "View improved resume" link to `/improved/[id]` when it's already set. *Done when:* clicking "Generate improved resume" on a real results page navigates to `/improved/<id>` with the generated text visible; after that, reloading `/results/<id>` shows "View improved resume" instead of the button.

Amendment, requested after Step 4 landed: the download should be a real styled PDF,
not `.txt`. That requires the AI's output to be structured (headings + bullets)
rather than a flat string, so it can be rendered with actual styling instead of
guessed from text patterns. Three more steps:

- [x] **Step 5 - Structured improvement schema** - change `improveResume` in `app/lib/groq.ts` to return `{ name: string; sections: { heading: string; bullets: string[] }[] }` (Zod-validated), updating the prompt to request that shape while keeping the same never-fabricate rules. Change `Resume.improvedResume` from `String?` to `Json?` in `prisma/schema.prisma` and migrate (same non-interactive `migrate diff` + `migrate deploy` workaround as feature 2's `suggestions` change, since no real row currently has `improvedResume` set). Update `generateImprovedResume` in `app/actions/resume.ts` to persist the structured object as-is. *Done when:* `improveResume()` returns a validated `{ name, sections }` object for real input and throws on a malformed mock; `npx prisma migrate deploy` applies the column type change; generating an improved resume through the real UI persists a structured JSON value in Neon (verified by direct query).
- [x] **Step 6 - Styled Improved Resume page** - update `app/improved/[id]/page.tsx` to render the structured data: the name as a heading, each section with its heading and a real bullet list, replacing the flat `<pre>` dump. Keep the existing not-found and "not generated yet" handling. *Done when:* visiting `/improved/<id>` for a structured resume shows a real name heading and properly separated sections/bullets, not one text blob.
- [x] **Step 7 - PDF download** - add `@react-pdf/renderer`. Rewrite `app/api/resume/[id]/download/route.ts` to render the structured resume data into a simple, clean PDF document (name header, section headings, bullet points) and return it with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="improved-resume-<id>.pdf"`, replacing the `.txt` output. Return 404 for the same missing/ungenerated cases as before. *Done when:* hitting the download route for a generated resume returns a valid PDF file (opens correctly, shows the name/sections/bullets) with the correct headers; 404 cases still behave as before.

## Files / areas

- `app/lib/groq.ts` - modify (add `improveResume`, later restructured in Step 5)
- `app/improved/[id]/page.tsx` - new (restyled in Step 6)
- `app/api/resume/[id]/download/route.ts` - new (rewritten to PDF in Step 7)
- `app/actions/resume.ts` - modify (add `generateImprovedResume`)
- `app/components/resume/GenerateImprovedResumeButton.tsx` - new
- `app/results/[id]/page.tsx` - modify (render button or link)
- `prisma/schema.prisma` - modify in Step 5 (`improvedResume` becomes `Json?`)

## Data / contracts

`improvedResume` starts as `String?` (locked in feature 1) and is changed to
`Json?` in Step 5 to hold the structured shape:

```ts
type ImprovedResume = {
  name: string;
  sections: { heading: string; bullets: string[] }[];
};
```

No existing row has `improvedResume` set at the time of this change, so the
migration doesn't need to preserve any data.

## Testing

No test command is declared in `AGENTS.md` yet, so the test gate is off - verify
with the browser, direct DB/HTTP checks, and `npm run build`, not unit tests.

`improveResume`'s Zod validation is the same kind of in-scope pure logic as
`analyzeResume`'s from feature 2 - verify manually with a real call and a
mocked malformed response, same pattern used there.

Manual verification per step:

- Step 1: call `improveResume()` directly with sample text/context and confirm
  a real, non-empty result; feed it a stubbed bad JSON response and confirm it throws.
- Step 2: manually set `improvedResume` on a test row via Neon, visit
  `/improved/<id>` and confirm it renders; clear it and confirm the fallback;
  visit a bogus id and confirm 404; curl the download route and check headers
  plus body.
- Step 3: invoke the action against a real resume and confirm the DB row
  updates and a redirect occurs; break the Groq key temporarily and confirm
  the error path with no redirect and no DB change.
- Step 4: click through the real UI end to end - Results page button ->
  generating -> Improved Resume page -> reload Results and see the link
  instead of the button.

## Notes for the AI

- No `src/` directory - files live under root `app/` per `coding-standards.md`.
- `generateImprovedResume` follows the same bound-action + `useActionState`
  pattern as `ResumeUploadForm`/`uploadResume` - reuse that shape for
  consistency rather than inventing a new one.
- `redirect()` throws internally - call it outside any try/catch that would
  swallow it, same caution as in feature 3.
- The download Route Handler is the right tool here (not a Server Action) per
  `coding-standards.md`'s guidance to use API routes when specific headers are
  needed.
- No user scoping needed (no auth in the MVP).
