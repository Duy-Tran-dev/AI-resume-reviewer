# Fix: Show a confirmation when a file is selected

**Type:** Fix
**Status:** complete

## The problem

In `app/components/resume/ResumeUploadForm.tsx`, picking a valid PDF currently
gives no feedback at all - the file input just goes from empty to filled, with
no message. Only an *invalid* selection shows anything (the inline error). The
user wants a lightweight local confirmation the moment a valid file is picked,
distinct from the "Resume uploaded (id: ...)" message that already appears
after clicking "Review my resume" and the server finishes processing.

## The fix

Confirmed flow (matches today's actual behavior, no change to the submission
model):

1. User picks a file -> client-side validation runs (unchanged) -> on success,
   show a new local confirmation, e.g. "resume.pdf selected." No server call
   happens here.
2. User clicks "Review my resume" -> unchanged: the Server Action
   (`app/actions/resume.ts`) extracts the text, validates it, persists the
   `Resume` row, and the existing "Resume uploaded (id: ...)" success message
   replaces the local confirmation.

In `ResumeUploadForm.tsx`: add a `selectedFileName` (or reuse `selectedFile`)
based local message rendered next to the file input, shown only when a file is
currently selected and there's no error. It should disappear once the server
response comes back (the existing success/error message takes over at that
point).

## Build steps

- [x] **Step 1 - Local file-selected confirmation** - in `ResumeUploadForm.tsx`, render a message such as `"{file.name} selected."` right under the file input whenever `selectedFile` is set and there's no client error and no server state yet. *Done when:* picking a valid PDF immediately shows "<filename> selected." with no server round-trip (network tab shows nothing new); picking an invalid file still only shows the existing inline error, no selection confirmation; after clicking "Review my resume" and the action completes, the local confirmation is replaced by the existing "Resume uploaded (id: ...)" or error message.

## Verify

- Pick a valid PDF: "<filename> selected." appears immediately, before clicking anything.
- Pick a non-PDF or >5MB file: only the existing inline error shows, no selection confirmation.
- Click "Review my resume" after a valid pick: the local confirmation is replaced by "Resume uploaded (id: ...)" once the upload completes.
- `npm run build` still passes.
