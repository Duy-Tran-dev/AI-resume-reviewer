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
  no accounts, no access tiers (see Non-goals).

## Features

1. **Resume upload** - user uploads a PDF resume on the home page; the server extracts and validates the text and stores it.
2. **AI resume analysis** *(headline)* - the resume text is sent to Groq/Llama, which evaluates ATS compatibility, structure, formatting, grammar, technical skills, projects, experience, bullet-point quality, and produces an overall score.
3. **Feedback report** - the Review Results page shows the score, strengths, weaknesses, missing sections, and prioritized improvements, each with a why-it-matters explanation.
4. **Resume regeneration & download** - the AI rewrites the resume into an improved version - reorganizing, rewriting, and clarifying only, never fabricating experience, projects, skills, achievements, or education - and the Improved Resume page lets the user download it.
5. **Deploy to Vercel** - error handling and UI polish, then deploy the MVP.

Target: analysis and feedback delivered within 15 seconds of upload.

## Data model

### Resume

- `id` (String, cuid/uuid) - primary key
- `originalText` (String) - text extracted from the uploaded PDF
- `aiScore` (Int) - overall resume score
- `strengths` (String[]) - list of identified strengths
- `weaknesses` (String[]) - list of identified weaknesses
- `suggestions` (String[]) - improvement suggestions
- `improvedResume` (String) - AI-generated improved resume text
- `createdAt` (DateTime) - upload timestamp

No `User` model - the MVP has no accounts (see Non-goals below).

> Lock this shape before building feature 2 (AI resume analysis) - it's the
> record every later feature reads and writes.
> Open question: the Feedback Report feature also calls for "missing sections"
> and a "high-priority" flag per improvement, and each recommendation needs its
> own explanation - the fields above don't distinguish those yet. Resolve
> whether `suggestions` becomes structured JSON (e.g. `{ text, priority, why }`)
> or gets split into more columns before `/feature 2`.

## Tech stack

- **Next.js** - frontend framework (App Router)
- **TypeScript** - language, strict mode
- **Tailwind CSS** - styling
- **Next.js Route Handlers** - backend API (e.g. `POST /api/review`: accept the PDF, extract text, validate, call Groq, parse the AI response, return structured feedback)
- **PostgreSQL** - database
- **Prisma ORM** - data access
- **Groq API (Llama model)** - resume analysis and regeneration
- **Vercel** - deployment

## Monetization

Not in v1. Non-goals explicitly exclude payments and subscription plans.

## UI/UX

- `/` (Home) - explains the app, lets the user upload a resume
- `/results` (Review Results) - resume score, ATS analysis, feedback, suggested improvements
- `/improved` (Improved Resume) - AI-generated improved resume, with download

> Route paths are inferred from the three pages described in the plans, not
> explicitly named there - adjust when `/feature` specs the pages.

## Open questions

> - Feedback report schema doesn't yet capture "missing sections," per-item
>   priority, or per-item explanations - see the Data model note above.
> - No stated retention policy for stored resumes. Non-goals exclude a
>   user-facing "resume history" feature, but the `Resume` table still persists
>   rows server-side - confirm whether that's fine for MVP or needs a TTL/cleanup.
