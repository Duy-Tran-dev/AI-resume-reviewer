# Feature: Resume upload

**From build-plan:** feature 1
**Status:** complete

## Goal

Let a student upload a PDF resume from the home page. The server extracts and
validates the text and stores it, so later features (AI analysis, feedback
report, regeneration) have a persisted `Resume` record to work from.

## In scope

- Prisma + Neon Postgres connection and the full `Resume` schema/migration
- Home page (`/`) with a PDF upload form and client-side validation
- Server-side PDF text extraction
- Server-side validation that extraction produced usable text
- Persisting the resume to the database
- Success/error feedback on the upload form

## Out of scope

- AI analysis of the resume (feature 2)
- Feedback report / Review Results page (feature 3)
- Resume regeneration / download (feature 4)
- Navigating away from the home page after upload (features 2/3 add that)
- Auth or per-user scoping - the whole MVP has no accounts (project non-goal)
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

- [x] **Step 1 - Prisma + Neon setup** - add `prisma`/`@prisma/client`, create `prisma/schema.prisma` with the full `Resume` model (see Data / contracts below), point `DATABASE_URL` at your Neon connection string in `.env` (gitignored), add a Prisma Client singleton at `app/lib/prisma.ts`, and run the initial migration. *Done when:* `npx prisma migrate dev` completes and creates the `Resume` table in Neon; `npm run build` still succeeds.
- [x] **Step 2 - Upload form UI** - build a client component on `/` (`app/page.tsx` or `app/components/resume/ResumeUploadForm.tsx`) with a PDF file input and a submit button, with client-side validation: reject non-PDF files and files over 5MB with an inline error, and disable submit until a valid file is chosen. *Done when:* visiting `/` renders the form; picking a non-PDF or >5MB file shows an inline error and keeps submit disabled; picking a valid PDF enables submit.
- [x] **Step 3 - Extract, validate, persist, and wire it up** - add a Server Action (`app/actions/resume.ts`) that receives the uploaded PDF via `FormData`, extracts text with `pdf-parse`, validates the extracted text is non-empty, creates a `Resume` row (`originalText`, `createdAt`; AI-derived fields left empty), and wire the form's submit to it with inline success/error feedback. *Done when:* submitting a valid PDF creates a `Resume` row in Neon with `originalText` populated and shows a success message with the new `Resume` id; submitting a PDF with no extractable text (e.g. a scanned/image-only PDF) shows an inline error and creates no row; a simulated DB/server failure shows an inline error without crashing the page.

## Files / areas

- `prisma/schema.prisma` - new
- `app/lib/prisma.ts` - new, Prisma Client singleton
- `.env` - new, gitignored, `DATABASE_URL`
- `app/page.tsx` and/or `app/components/resume/ResumeUploadForm.tsx` - new
- `app/actions/resume.ts` - new, Server Action
- `package.json` - add `prisma`, `@prisma/client`, `pdf-parse`

## Data / contracts

Locking the full `Resume` schema now since features 2-4 all read/write it:

```prisma
model Resume {
  id             String   @id @default(cuid())
  originalText   String
  aiScore        Int?
  strengths      String[] @default([])
  weaknesses     String[] @default([])
  suggestions    String[] @default([])
  improvedResume String?
  createdAt      DateTime @default(now())
}
```

This feature only ever writes `id`, `originalText`, `createdAt`. The rest stay
null/empty until features 2 and 4 populate them.

> Open question carried from `project-overview.md`: the Feedback Report feature
> (feature 3) may need `suggestions` to become structured JSON (priority +
> explanation per item) instead of a flat string array, and may need a
> `missingSections` field. That's a feature 3 concern - don't block this step on
> it, but don't build UI against `suggestions` as flat strings elsewhere either.

## Testing

No test command is declared in `AGENTS.md` yet, so the test gate is off for this
project - verify with the browser and `npm run build`, not unit tests.

This feature does introduce real validation logic (file type/size check,
empty-extracted-text check) that would normally be exactly the kind of
in-scope logic the testing gate covers. If you want that covered by tests,
run `/tests` before or after this feature to add a runner; otherwise this
spec relies on manual verification per the Testing gate in
`coding-standards.md`.

Manual verification per step:

- Step 1: `npx prisma migrate dev` succeeds; inspect the Neon table in Prisma
  Studio or the Neon console to confirm the `Resume` table and its columns.
- Step 2: in the browser, try a `.docx` file, a >5MB PDF, and a valid small PDF;
  confirm the inline errors and the enable/disable behavior.
- Step 3: upload a real text-based PDF resume and confirm a row appears in Neon
  with `originalText` populated; try a scanned/image-only PDF and confirm the
  inline error instead of a row; temporarily break `DATABASE_URL` to confirm the
  error path doesn't crash the page.

## Notes for the AI

- No `src/` directory - files live under root `app/` per `coding-standards.md`
  (`app/actions/`, `app/lib/`, `app/components/`).
- Use a Server Action, not an API route, for the upload - it's a simple mutation
  with no progress-tracking requirement in the MVP (per `coding-standards.md`'s
  API-route criteria). Feature 2 will likely add a Route Handler for the Groq
  call; that's separate.
- Use the standard Next.js + Prisma dev singleton pattern in `app/lib/prisma.ts`
  to avoid exhausting connections on hot reload.
- The 5MB upload limit and the PDF text-extraction library (`pdf-parse`) aren't
  specified in the plans - reasonable defaults, adjust if you disagree.
- No user scoping needed anywhere in this feature (no auth in the MVP).
