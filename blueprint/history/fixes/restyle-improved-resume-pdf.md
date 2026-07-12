# Fix: Restyle the improved-resume PDF to match the sb2nov/resume classic layout

**Type:** Fix
**Status:** complete

## The problem

The current improved-resume PDF (`app/components/resume/ImprovedResumeDocument.tsx`)
uses a plain layout: bold name, uppercase section headings with a flat underline,
generic bullet list. The user wants it to visually match the well-known
[sb2nov/resume](https://github.com/sb2nov/resume) LaTeX template's classic, dense
format instead - structural/formatting reference only, no personal content or
code from that repo is reused (its actual example CV content is the author's own
data, not covered by the repo's MIT license; only the layout pattern is used
here, rebuilt from scratch in `@react-pdf/renderer`).

Target structure (from the reference template):

- Two-column header: name (bold, large) on the left; contact info (email,
  phone, location - whichever exist) right-aligned on the right
- Section headings: uppercase, left-aligned, with a horizontal rule beneath,
  tight spacing above/below
- Denser overall spacing between bullets and sections than the current version

## The fix

Steps 1-2 (done) covered the header and section-heading treatment but
explicitly scoped out per-entry structure. After comparing against the
reference template's actual preview image, that scope cut turned out to be
the single biggest visual element - the entry structure (title/subtitle/
location/dates per job or degree, bold-lead bullets, serif font, true small
caps) is what makes the template recognizable. Amending this fix to build it:

1. Extend `ImprovedResume`'s Zod schema in `app/lib/groq.ts` with an optional
   `contact` object *(done in Step 1)*.
2. Restyle the header/section headings *(done in Step 2)*.
3. **New:** redesign `sections` from a flat `{ heading, bullets: string[] }[]`
   into `{ heading, entries: { title?, subtitle?, location?, dates?, bullets:
   { lead?, text }[] }[] }[]` - each entry optionally has a title (bold,
   left) + location (right-aligned), a subtitle (italic, left) + dates
   (right-aligned), and bullets that can carry an optional bold lead-in word.
   An entry with no title/subtitle/location/dates renders as a plain bullet
   list (for sections like Skills that aren't really "entries"). Update the
   improve prompt accordingly - same never-fabricate rule extends to
   location/dates: omit, never invent.
4. **New:** rebuild `ImprovedResumeDocument.tsx` for the new shape: serif
   font (`Times-Roman`/`Times-Bold`/`Times-Italic`, matching the reference's
   classic LaTeX look more closely than Helvetica), two-row header (name +
   email on row 1, website/blank + phone on row 2, contact fields still
   optional), true small-caps section headings (rendered via a small-caps
   approximation - PDF's standard fonts don't have a real small-caps
   variant, so this uses slightly-reduced-size uppercase for the non-initial
   letters), per-entry title/location and subtitle/dates rows, hollow-circle
   bullets with bold lead-ins.
5. **New:** update `app/improved/[id]/page.tsx`'s on-page rendering to match
   the new entries structure (it currently assumes flat `section.bullets`
   and will break/type-error otherwise).

## Build steps

- [x] **Step 1 - Extract contact info** - add the optional `contact` field to the `ImprovedResume` Zod schema and the improve prompt in `app/lib/groq.ts`. *Done when:* a real `improveResume()` call against resume text containing an email/phone returns those fields populated; a call against text with no contact info returns `contact` fields omitted/undefined rather than fabricated.
- [x] **Step 2 - Restyle the PDF template** - rebuild `ImprovedResumeDocument.tsx` per the target structure above, reading the new `contact` field for the header. *Done when:* generating a real improved-resume PDF shows a two-column header (name left, present contact fields right-aligned), uppercase ruled section headings, and visibly tighter spacing than the previous version - verified by downloading and inspecting the actual PDF.
- [x] **Step 3 - Entry-based schema** - redesign `ImprovedResume.sections` to the entries shape described above in `app/lib/groq.ts`; rewrite the improve prompt to ask for per-entry title/subtitle/location/dates (extracted, never invented) and bullets with optional bold lead-ins. *Done when:* a real `improveResume()` call against a resume with clear job/education entries (with dates/locations) returns them correctly split into entries with those fields populated; a section with no clear per-entry structure (e.g. a flat skills list) returns a single entry with no title and just bullets.
- [x] **Step 4 - Rebuild the PDF template for entries** - rewrite `ImprovedResumeDocument.tsx`: serif font, two-row header, small-caps-style section headings, per-entry title+location / subtitle+dates rows, hollow bullets with bold lead-ins. *Done when:* a downloaded PDF, rendered to an image and inspected directly, shows the entry structure correctly - title/location on one row, subtitle/dates on the next, bullets beneath.
- [x] **Step 5 - Update the on-page display** - update `app/improved/[id]/page.tsx` to render the new entries structure (title/subtitle/location/dates, bullets) instead of the old flat bullet list. *Done when:* visiting `/improved/<id>` for a resume with entries shows the same structure on-screen (not just in the PDF); `npm run build` passes (confirms no leftover type errors from the shape change).
- [x] **Step 6 - Legacy-resume compatibility** (found during `/check`, not in the original spec) - `/check` against the real running app and the live database found that resumes generated before this fix (old `{ heading, bullets: string[] }` shape, no `entries`) crashed both `/improved/[id]` and `GET /api/resume/[id]/download` with `TypeError: Cannot read properties of undefined (reading 'map')` - a real crash a real user had already hit. Added `normalizeImprovedResume()` in `app/lib/groq.ts`, used by both call sites, converting legacy sections into a single untitled entry (bullets carried over as-is, nothing fabricated). *Done when:* all real stored resumes (legacy and new-format) return 200 on both routes with correct rendered output, and the fix does not regress the new-format entries case.

## Verify

- Call `improveResume()` with a sample resume that includes an email/phone and confirm `contact` is populated; try one with no contact info and confirm it's omitted, not invented. **Verified** against the real Groq API.
- Call it with a resume containing dated job/education entries and confirm they split into `entries` with title/subtitle/location/dates populated correctly; confirm nothing is fabricated for entries that lack a date or location in the source. **Verified** against the real Groq API.
- Generate a real improved resume through the app, download the PDF, render it to an image, and visually inspect it against the reference structure (not just extracted text). **Verified** - real PDF downloaded and visually inspected.
- Visit `/improved/<id>` on-screen and confirm the entries render correctly there too. **Verified** via the real rendered HTML.
- `npm run build` and `npm run lint` stay clean. **Verified.**
- All 8 real resumes stored in the database (both legacy and new-format) return 200 on `/improved/[id]` and the download route, with correct content, and no new server errors logged. **Verified** after Step 6.
