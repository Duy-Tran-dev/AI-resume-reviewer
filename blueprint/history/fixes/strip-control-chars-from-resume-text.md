# Fix: Upload fails to save when the PDF's extracted text contains a null byte

**Type:** Fix
**Status:** complete

## The problem

Reported: uploading a resume ("ChristianTorresResume.pdf", an enhancv.com
template) showed "Something went wrong saving your resume. Please try
again."

Reproduced directly: ran the file through the exact same extraction call
`app/actions/resume.ts` uses (`parser.getText({ pageJoiner: "", parseHyperlinks:
true })`), then attempted the same database insert. The extracted text
contained 3 literal null bytes and the insert failed with:

```
invalid byte sequence for encoding "UTF8": 0x00
```

PostgreSQL's `text` type categorically rejects the null byte - it's the one
byte value Postgres can never store, regardless of encoding. `prisma.resume
.create` threw this error, which the upload action's `catch { ... }` block
around it swallowed into the generic "Something went wrong saving your
resume" message.

Root cause of the null bytes themselves: this resume's `CONTACTS` section
uses icon-font glyphs (phone/email/link/location icons) the same way the
"Truong Gia Bao" resume did - `pdf-parse`'s text extraction decodes an icon
glyph to whatever codepoint the PDF's font encoding maps it to. Usually
that's garbage-but-printable (`#`, `§`, `ï`, as seen before); for this
resume's icons, it happened to be the null codepoint, which is not just
meaningless but actively fatal to the save step.

Separately, `resume.ts`'s catch block around `prisma.resume.create` had no
`console.error`, unlike the other catches in the same file - that's why this
took a manual reproduction to diagnose instead of a log line.

## The fix

- In `app/actions/resume.ts`, strip the null byte and other non-printable C0
  control characters (excluding tab, newline, carriage return) from the
  extracted text before the `!text` check and the database insert.
- Added `console.error("Resume save failed", err)` to the catch block around
  `prisma.resume.create`, matching the logging convention already used by
  the other two catches in this file.

**Must not break:** normal resumes with plain text or printable icon-glyph
garbage (the common case) - confirmed unaffected.

## Build steps

- [x] 1. Strip null/control characters from extracted text in `app/actions/resume.ts`, and add the missing `console.error` to the save catch block.

## Verify

- Re-ran the exact reproduction script against `ChristianTorresResume.pdf`:
  confirmed the sanitized text has zero null bytes and the database insert
  succeeds.
- Extended verification: tested 3 more real resumes the user provided
  (`MichaelMartinezResume.pdf`, `JosephWhiteResume.pdf`,
  `AlexanderTaylorResume.pdf` - all the same `enhancv.com` template family).
  All 4 had null bytes in raw extraction (3-5 each) and all 4 saved
  successfully with the fix.
- Spot-checked a known-good resume's extracted text is byte-identical before
  and after the sanitization.
- `npx next build` succeeded.
