# AI Resume Reviewer - Project Overview

> AI-powered web app that reviews software engineering students' resumes like a technical recruiter and ATS would, then generates an improved version.

## Problem

University CS/SE/IT students don't know what recruiters or ATS systems expect,
write weak project descriptions, fail to quantify achievements, and get little
or no professional feedback before applying - so qualified students get
rejected before the interview stage.

## Users

- **CS / Software Engineering / IT students** applying for internships or
  entry-level software engineering roles. Single anonymous session per visit -
  no accounts, no login, no access tiers (see Non-goals).

## Features

1. **Resume upload** - user uploads a PDF resume on the home page; the server extracts and validates the text and stores it.
2. **AI resume analysis** *(headline)* - the resume text is sent to Groq/Llama, which evaluates ATS compatibility, structure, formatting, grammar, technical skills, projects, experience, bullet-point quality, and produces an overall score.
3. **Feedback report** - the Review Results page shows the score, strengths, weaknesses, missing sections, and prioritized improvements, each with a why-it-matters explanation.
4. **Resume regeneration & download** - the AI rewrites the resume into an improved version - reorganizing, rewriting, and clarifying only, never fabricating experience, projects, skills, achievements, or education - and the Improved Resume page lets the user download it as a PDF.
5. **Deploy to Vercel** - error handling and UI polish, then deploy the MVP.

Target: analysis and feedback delivered within 15 seconds of upload.

## Data model

### Resume

Implemented in `prisma/schema.prisma`; this is now the concrete, locked shape.

- `id` (String, cuid) - primary key
- `originalText` (String) - text extracted from the uploaded PDF
- `aiScore` (Int, nullable) - overall resume score; null until analysis completes
- `strengths` (String[]) - identified strengths
- `weaknesses` (String[]) - identified weaknesses
- `missingSections` (String[]) - standard resume sections the upload is missing
- `suggestions` (Json) - array of `Suggestion` (see below); default `[]`
- `improvedResume` (Json, nullable) - `ImprovedResume` (see below); null until regenerated
- `createdAt` (DateTime) - upload timestamp

No `User` model - the MVP has no accounts (see Non-goals).

**`Suggestion`** (Zod-validated in `app/lib/groq.ts`):
`{ text: string, priority: "high" | "medium" | "low", why: string }`

**`ImprovedResume`** (Zod-validated in `app/lib/groq.ts`, rendered by
`ImprovedResumeDocument.tsx` and `app/improved/[id]/page.tsx`):

```
{
  name: string,
  contact?: { email?, phone?, location?, website? },
  sections: {
    heading: string,
    entries: {
      title?, subtitle?, location?, dates?,
      bullets: { lead?: string, text: string }[]
    }[]
  }[]
}
```

Contact and per-entry fields (location, dates, subtitle) are extracted only when
present in the source resume - never fabricated, matching the never-invent rule
for the whole regeneration feature.

## Tech stack

- **Next.js 16** (App Router) - frontend framework and Server Actions
- **TypeScript** - language, strict mode
- **Tailwind CSS v4** - styling, CSS-first config
- **Server Actions** (`app/actions/`) - primary mutation path (upload, regenerate); one Route Handler (`GET /api/resume/[id]/download`) for the binary PDF response a Server Action can't return
- **PostgreSQL** + **Prisma 7** (`@prisma/adapter-pg` driver adapter) - persistence; client generated to `app/generated/prisma`
- **Groq API** (Llama 3.3 70B) - resume analysis and regeneration; responses are Zod-validated before use
- **@react-pdf/renderer** - generates the downloadable improved-resume PDF
- **pdf-parse** - extracts text from uploaded PDF resumes
- **Vercel** - deployment (project linked; `npm run build` runs `prisma migrate deploy` before `next build`)

## Monetization

Not in v1. Non-goals explicitly exclude payments and subscription plans.

## UI/UX

- `/` (Home) - explains the app, lets the user upload a resume
- `/results/[id]` (Review Results) - resume score, ATS analysis, feedback, suggested improvements
- `/improved/[id]` (Improved Resume) - AI-generated improved resume, entry-structured, with PDF download

## Open questions

> - No stated retention policy for stored resumes. Non-goals exclude a
>   user-facing "resume history" feature, but the `Resume` table still persists
>   rows server-side indefinitely - confirm whether that's fine for MVP or needs
>   a TTL/cleanup job.
> - Build-plan item 5 ("Deploy to Vercel") is checked and a Vercel project is
>   linked, but there's an active, unmerged fix branch
>   (`fix/restyle-improved-resume-pdf`) still doing UI polish on the improved-
>   resume PDF. Confirm whether a production deploy has actually happened, or
>   whether that's still pending until current polish work lands.
