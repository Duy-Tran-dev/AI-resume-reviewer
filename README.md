# AI Resume Reviewer

AI-powered resume reviewer for software engineering students, built to give
the same scrutiny a technical recruiter and an ATS would - then rewrite the
resume to fix what it finds.

**Live demo:** [myapp-three-rose.vercel.app](https://myapp-three-rose.vercel.app)

## The problem

Most CS, software engineering, and IT students don't know what recruiters or
ATS systems actually look for. Project descriptions stay vague, achievements
go unquantified, and there's rarely real feedback before an application goes
out - so qualified students get filtered out before they ever reach an
interview.

## What it does

1. **Resume upload** - upload a PDF resume; the server extracts and validates the text.
2. **AI resume analysis** - Groq's Llama model scores the resume across ATS compatibility, structure, formatting, grammar, technical skills, projects, experience, and bullet-point quality.
3. **Feedback report** - a full breakdown: overall score, strengths, weaknesses, missing sections, and prioritized improvements, each with a why-it-matters explanation.
4. **Resume regeneration & download** - the AI rewrites the resume: reorganizing, clarifying, and strengthening wording, never fabricating experience, projects, skills, or achievements. The result renders into a downloadable PDF.

No accounts, no login. Upload, review, download - all in a single anonymous
session.

## Tech stack

- **Next.js 16** (App Router) and **TypeScript**, strict mode
- **Tailwind CSS v4**
- **PostgreSQL** with **Prisma 7** (`@prisma/adapter-pg` driver adapter)
- **Groq API** (Llama 3.3 70B) for analysis and rewriting, responses validated with **Zod**
- **@react-pdf/renderer** for the downloadable PDF, **pdf-parse** for reading uploads
- **Vercel** for deployment

## Credits

- The improved-resume PDF's layout is styled after the classic
  [sb2nov/resume](https://github.com/sb2nov/resume) template (structure only,
  rebuilt from scratch in `@react-pdf/renderer`).
- Built with [AI Blueprint](https://github.com/bradtraversy/ai-blueprint) by
  Brad Traversy, an agentic development workflow for coding with AI while
  staying the architect of the project.

## License

[MIT](./LICENSE)
