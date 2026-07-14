# Fix: Website link renders under the name instead of in the top-right contact block

**Type:** Fix
**Status:** complete

## The problem

Reported: contact info in the improved resume "is not enough compared to the
uploaded version, and it also appears under student's name (not on the top
right corner)."

Diagnosed against the real production database (read-only queries, no
writes) using the most recent re-test of the "Truong Gia Bao" resume (id
`cmrkw06sw000004l7oiga6bt0`). Two separate things were going on:

1. **Not a bug - a hard data-availability limit.** Searched the resume's
   entire extracted text (3552 chars, not just the header) for any email
   pattern or contact-shaped link. Result: no email address anywhere in the
   document, and the only 4 markdown links present are `blog`, two GitHub
   project links, and a Google Drive reference - none are a personal
   email, GitHub profile, or LinkedIn profile. The header's `email`/`github`/
   `linkedin` icons have no underlying hyperlink annotation at all (unlike
   `blog`, which does, and which the earlier `parseHyperlinks` fix correctly
   recovers as `contact.website`). There was nothing left to extract for this
   resume; the source PDF simply never encodes those values as text or as a
   link destination anywhere. Out of scope - no code change can recover data
   that isn't in the source file.
2. **A real, fixable layout issue.** `ImprovedResumeDocument.tsx` (PDF) and
   `app/improved/[id]/page.tsx` (web preview) both rendered `contact.website`
   under the name (left side), separately from the `email`/`phone`/`location`
   block in the top-right corner. When a resume had only a `website` and none
   of the other three fields (as with this one), the top-right block was
   empty and the only visible contact info sat under the name - which read
   exactly like the report ("not top-right as expected").

## The fix

Moved `website` into the same top-right contact block as `email`/`phone`/
`location`, in both places it's rendered:

- `app/components/resume/ImprovedResumeDocument.tsx` - added `website` to the
  `contactRight` array instead of rendering it separately under the name;
  removed the now-unused `website` style.
- `app/improved/[id]/page.tsx` - same change to `contactLines`; removed the
  separate under-name website paragraph.

The name stands alone on the left in both renderers after this change.

**Must not break:** resumes with `email`/`phone`/`location` already showing
top-right (the common case) - `website` joins that same list, doesn't
replace it.

## Build steps

- [x] 1. Move `website` into `contactRight`/`contactLines` in both `ImprovedResumeDocument.tsx` and `app/improved/[id]/page.tsx`, removing the separate under-name rendering.

## Verify

- Ran the actual local dev server against the real database and downloaded
  real PDFs for both cases:
  - Website-only (`Truong Gia Bao`): the link now renders top-right, nothing
    under the name.
  - Email/phone/location, no website (`Dinh Nhat Duy Tran`): unchanged,
    still renders correctly top-right - confirmed no regression.
- `npx next build` succeeded.
