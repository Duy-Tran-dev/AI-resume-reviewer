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

const resumeSectionSchema = z.object({
  heading: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
});

const improveResumeSchema = z.object({
  name: z.string().min(1),
  sections: z.array(resumeSectionSchema).min(1),
});

export type ImprovedResumeSection = z.infer<typeof resumeSectionSchema>;
export type ImprovedResume = z.infer<typeof improveResumeSchema>;

const IMPROVE_SYSTEM_PROMPT = `You are an expert resume writer helping a software engineering student improve their resume.

You will be given the original resume text and an analysis of its strengths, weaknesses, and suggested improvements as JSON. Rewrite the resume to address the weaknesses and suggestions as much as possible.

Rules:
- Reorganize, rewrite, and clarify existing content only.
- NEVER invent experience, projects, skills, achievements, or education that isn't already present in the original resume.
- Preserve every fact (companies, dates, technologies, metrics) from the original.
- Improve wording, structure, bullet points, and action verbs.
- Every section must have at least one bullet point.

Respond with ONLY a single JSON object (no markdown, no code fences, no commentary) matching exactly this shape:

{
  "name": <string, the candidate's name as it appears on the resume>,
  "sections": [
    {
      "heading": <string, e.g. "Education", "Projects", "Experience", "Skills">,
      "bullets": [<string, one rewritten line or bullet point>]
    }
  ]
}`;

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
