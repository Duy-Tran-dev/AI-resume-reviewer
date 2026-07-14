import Groq from "groq-sdk";
import { z } from "zod";

const MODEL = "llama-3.3-70b-versatile";
const MAX_RESUME_CHARS = 12_000;
const REQUEST_TIMEOUT_MS = 20_000;

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const suggestionSchema = z.object({
  text: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  why: z.string().min(1),
});

const resumeAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingSections: z.array(z.string()),
  suggestions: z.array(suggestionSchema),
});

export type Suggestion = z.infer<typeof suggestionSchema>;
export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;

const SYSTEM_PROMPT = `You are an expert technical recruiter and Applicant Tracking System (ATS) evaluating resumes for software engineering internships and entry-level roles.

Analyze the resume text the user provides across these dimensions: ATS compatibility, resume structure, formatting, grammar, technical skills section, projects section, work experience, bullet point quality, action verbs, quantifiable achievements, readability, and professionalism.

Respond with ONLY a single JSON object (no markdown, no code fences, no commentary) matching exactly this shape:

{
  "score": <integer 0-100, overall resume quality>,
  "strengths": [<string, specific things the resume does well>],
  "weaknesses": [<string, specific problems with the resume>],
  "missingSections": [<string, standard resume sections that are absent, e.g. "Projects", "Skills">],
  "suggestions": [
    {
      "text": <string, a specific actionable improvement>,
      "priority": "high" | "medium" | "low",
      "why": <string, why this improvement matters>
    }
  ]
}

Base every observation strictly on the resume text provided. Never invent experience, projects, skills, or achievements that aren't there.`;

type ChatMessage = { role: "system" | "user"; content: string };

async function callGroqJson(messages: ChatMessage[]): Promise<unknown> {
  const completion = await client.chat.completions.create(
    {
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
    },
    { timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 },
  );

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("Groq response had no content");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Groq response was not valid JSON");
  }
}

export async function analyzeResume(
  resumeText: string,
): Promise<ResumeAnalysis> {
  const truncatedText = resumeText.slice(0, MAX_RESUME_CHARS);

  const parsedJson = await callGroqJson([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: truncatedText },
  ]);

  const result = resumeAnalysisSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(
      `Groq response failed validation: ${result.error.message}`,
    );
  }

  return result.data;
}

// Models often send "" for a field they mean to omit, instead of leaving the
// key out entirely - normalize both to undefined rather than rejecting them.
const optionalString = () =>
  z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const entryBulletSchema = z.object({
  lead: optionalString(),
  text: z.string().min(1),
});

const resumeEntrySchema = z.object({
  title: optionalString(),
  subtitle: optionalString(),
  location: optionalString(),
  dates: optionalString(),
  bullets: z.array(entryBulletSchema).default([]),
});

const resumeSectionSchema = z.object({
  heading: z.string().min(1),
  entries: z.array(resumeEntrySchema).min(1),
});

const contactSchema = z.object({
  email: optionalString(),
  phone: optionalString(),
  location: optionalString(),
  website: optionalString(),
});

const improveResumeSchema = z.object({
  name: z.string().min(1),
  contact: contactSchema.optional(),
  sections: z.array(resumeSectionSchema).min(1),
});

export type ImprovedResumeBullet = z.infer<typeof entryBulletSchema>;
export type ImprovedResumeEntry = z.infer<typeof resumeEntrySchema>;
export type ImprovedResumeSection = z.infer<typeof resumeSectionSchema>;
export type ImprovedResumeContact = z.infer<typeof contactSchema>;
export type ImprovedResume = z.infer<typeof improveResumeSchema>;

type LegacyImprovedResumeSection = { heading: string; bullets: string[] };

// Converts pre-entries resumes (`{ heading, bullets: string[] }`) into the current shape.
export function normalizeImprovedResume(raw: unknown): ImprovedResume {
  const data = raw as {
    name: string;
    contact?: ImprovedResumeContact;
    sections: Array<ImprovedResumeSection | LegacyImprovedResumeSection>;
  };

  return {
    name: data.name,
    contact: data.contact,
    sections: data.sections.map((section) =>
      "entries" in section
        ? section
        : {
            heading: section.heading,
            entries: [
              {
                title: undefined,
                subtitle: undefined,
                location: undefined,
                dates: undefined,
                bullets: section.bullets.map((text) => ({
                  lead: undefined,
                  text,
                })),
              },
            ],
          },
    ),
  };
}

const IMPROVE_SYSTEM_PROMPT = `You are an expert resume writer helping a software engineering student improve their resume.

You will be given the original resume text and an analysis of its strengths, weaknesses, and suggested improvements as JSON. Rewrite the resume to address the weaknesses and suggestions as much as possible.

Rules:
- Reorganize, rewrite, and clarify existing content only.
- NEVER invent experience, projects, skills, achievements, or education that isn't already present in the original resume.
- Preserve every fact (companies, dates, technologies, metrics) from the original.
- Improve wording, structure, bullet points, and action verbs.
- Bullets are optional per entry - a simple entry like a degree with no elaboration (just title/subtitle/location/dates) can have an empty bullets list. Don't invent bullets to fill it.
- Extract email, phone, location, and website ONLY if they literally appear in the original resume text. Omit any field that isn't present - never invent a placeholder value. Same rule for each entry's location and dates: omit if not stated, never invent.
- Contact info may appear as a Markdown link, "[label](url)", where the visible label is meaningless (an icon glyph the PDF extractor couldn't read) but the url is real. Treat the url as the actual value: for email, strip a leading "mailto:"; for website/GitHub/LinkedIn-style links, use the url as-is. Still only extract what's literally present this way - never invent a url.
- A section like "Experience" or "Education" usually has multiple entries (one per job or degree) - split them out individually, each with its own title (company or school name), subtitle (role or degree), location, and dates when present in the source.
- A section like "Skills" or "Projects" without distinct dated entries is fine as a single entry with no title/subtitle/location/dates and just bullets.
- Where a bullet describes a distinct named thing (a project name, a specific system), put that name in "lead" and the description in "text". Otherwise omit "lead" and put the whole bullet in "text".

Respond with ONLY a single JSON object (no markdown, no code fences, no commentary) matching exactly this shape:

{
  "name": <string, the candidate's name as it appears on the resume>,
  "contact": {
    "email": <string, omit this field entirely if no email is present>,
    "phone": <string, omit this field entirely if no phone number is present>,
    "location": <string, omit this field entirely if no city/location is present>,
    "website": <string, omit this field entirely if no personal site/portfolio URL is present>
  },
  "sections": [
    {
      "heading": <string, e.g. "Education", "Projects", "Experience", "Skills">,
      "entries": [
        {
          "title": <string, e.g. company or school name - omit if this section has no distinct entries>,
          "subtitle": <string, e.g. role or degree - omit if not applicable>,
          "location": <string, omit if not present in the source>,
          "dates": <string, e.g. "Jan 2024 - Present" - omit if not present in the source>,
          "bullets": [
            { "lead": <string, optional bold lead-in term>, "text": <string, the rewritten bullet text> }
          ]
        }
      ]
    }
  ]
}

Omit the "contact" object entirely if none of email, phone, location, or website are present.`;

export async function improveResume(
  originalText: string,
  context: {
    strengths: string[];
    weaknesses: string[];
    suggestions: Suggestion[];
  },
): Promise<ImprovedResume> {
  const truncatedText = originalText.slice(0, MAX_RESUME_CHARS);
  const userContent = JSON.stringify({
    originalResume: truncatedText,
    analysis: context,
  });

  const parsedJson = await callGroqJson([
    { role: "system", content: IMPROVE_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ]);

  const result = improveResumeSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(
      `Groq response failed validation: ${result.error.message}`,
    );
  }

  return result.data;
}
