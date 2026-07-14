# Fix: Contact info missing from improved resume when the source PDF uses icon-only links

**Type:** Fix
**Status:** complete

## The problem

For some uploaded resumes, the improved resume (web preview and PDF) had no
contact block at all in the top-right corner - not wrong, just absent.

Diagnosed against the real production database (read-only queries, no
writes): of 10 recent uploads, most extract contact info fine (email/phone/
location show up correctly, confirmed by downloading and reading the actual
generated PDF). One upload ("Truong Gia Bao", id
`cmrg3g1i5000004lbqhy0gadn`) reproduced the bug. Its extracted `originalText`
started:

```
Truong Gia Bao
# email § github ï linkedin blog
```

The resume's header used icon fonts (email/GitHub/LinkedIn glyphs) as
clickable hyperlinks instead of visible text - `pdf-parse`'s default
`getText()` only extracts visible glyphs, so the icons decoded to garbage
symbols (`#`, `§`, `ï`) and the actual email address / GitHub URL / LinkedIn
URL - which only existed as the link *destination*, never as visible text -
never appeared anywhere in the extracted text at all.

Given that, `app/lib/groq.ts`'s "never invent, only extract what's literally
in the text" rule was doing exactly what it should - there was nothing to
extract. This was a text-extraction gap, not an AI mistake or a rendering bug
(`ImprovedResumeDocument.tsx` and the `/improved/[id]` page both render
contact info correctly whenever it's present in the data - verified against a
working resume's actual downloaded PDF).

## The fix

`pdf-parse` (already a dependency, already used in `app/actions/resume.ts`)
supports exactly this case: `getText({ parseHyperlinks: true })` detects
hyperlink annotations and formats them inline as Markdown links
(`[visible text](url)`) - even when the visible text is icon-glyph garbage,
the real `mailto:`/`https://` destination is now present in the extracted
text as the `(url)` part.

- In `app/actions/resume.ts`, added `parseHyperlinks: true` to the existing
  `parser.getText({ pageJoiner: "" })` call.
- In `app/lib/groq.ts`'s `IMPROVE_SYSTEM_PROMPT`, added a rule: contact info
  may appear as a Markdown link `[label](url)` where the visible label is
  meaningless (an icon glyph) but the URL is real - extract the email from a
  `mailto:` URL (strip the scheme) and use `https://` URLs directly for
  website/GitHub/LinkedIn-style links. Still only extract what's literally
  present; still never invent.

**Must not break:** existing resumes that already extract contact info as
plain text (the common case) - `parseHyperlinks` only adds link destinations
alongside existing text, it doesn't change how plain text is extracted.

Note: this fix only changes extraction for *new* uploads. Resumes already
stored before this fix keep their old `originalText`/`improvedResume` and
won't retroactively pick up contact info - a fresh re-upload is required to
see the fix take effect.

## Build steps

- [x] 1. Add `parseHyperlinks: true` to the upload's `getText()` call, and update `IMPROVE_SYSTEM_PROMPT` with the Markdown-link extraction rule.

## Verify

- Synthetic PDF test (react-pdf `<Link src="mailto:...">` wrapping placeholder
  glyph text): without the flag, extraction was just the glyph text; with it,
  extraction became `[glyph](mailto:...)` - the real email became recoverable.
- Regression check: a plain-text-only resume (no links) extracted
  byte-identical with and without the flag - confirmed no impact on the
  common case.
- `npx next build` succeeded.
