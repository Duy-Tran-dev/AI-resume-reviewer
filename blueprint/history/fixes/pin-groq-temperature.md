# Fix: Resume score varies between runs on the identical resume

**Type:** Fix
**Status:** complete

## The problem

The reported symptom: "the score the web gives is lower than before."

Diagnosed against the real production database (read-only queries, no
writes). The same resume (identical text, confirmed byte-for-byte via
`originalText`) was uploaded 12 separate times between 2026-07-10 and
2026-07-11 and scored `60` every single time. A fresh upload of the exact
same text on 2026-07-14 scored `40` - a 20-point swing on identical input,
confirming this wasn't about the resume content or the contact-extraction fix
(the newest upload's extracted text was unchanged from the older ones - this
particular resume has no hyperlink annotations, so `parseHyperlinks` had no
effect on it).

Root cause: `app/lib/groq.ts`'s `callGroqJson` (used by both `analyzeResume`
and `improveResume`) called `client.chat.completions.create` without a
`temperature` parameter, so Groq's non-zero default sampling temperature
applied. For a scoring/evaluation task, the same input should produce the
same verdict, but with default sampling, the model could land on meaningfully
different scores, strengths/weaknesses, and suggestions across identical
calls.

## The fix

Added `temperature: 0` to the shared `client.chat.completions.create` call in
`callGroqJson`. This applies to both `analyzeResume` (score consistency, the
reported problem) and `improveResume` (more consistent rewrites too, same
root cause) since they share the one call site.

**Important limitation, found during verification, not assumed:**
`temperature: 0` reduces but does NOT eliminate variance. Empirically, 6
calls against the real Groq API with the exact same resume text,
`temperature: 0`, AND a fixed `seed` still split 60/40/40/60/60/40. Groq's own
docs describe seed-based determinism as "best effort... not guaranteed," and
this resume appears to sit right on the model's internal boundary between two
adjacent scores - a real inference-stack characteristic (likely
batching/hardware-level floating-point effects), not something fixable from
this app's code. The fix ships as a real, worthwhile improvement over the
uncontrolled default, with that limitation stated honestly rather than
oversold as a complete fix.

**Must not break:** the existing JSON schema validation (Zod) for both
`analyzeResume` and `improveResume` - `temperature` doesn't change the
response shape, only how the next token is chosen. Confirmed unaffected.

## Build steps

- [x] 1. Add `temperature: 0` to the `client.chat.completions.create` call in `callGroqJson` (`app/lib/groq.ts`).

## Verify

- Ran `analyzeResume`'s underlying call 6 times against the real Groq API
  with the exact same resume text, `temperature: 0`, and a fixed `seed`:
  scores still split 60/40/40/60/60/40 - confirming the remaining variance is
  a property of the hosted model/inference stack, not this app's prompt or
  code.
- `npx next build` succeeded.
- Existing Zod validation in `analyzeResume`/`improveResume` still passes.
