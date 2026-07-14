"use server";

import { redirect } from "next/navigation";
import { getPath } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import { prisma } from "@/app/lib/prisma";
import {
  analyzeResume,
  improveResume,
  type Suggestion,
  type ImprovedResume,
} from "@/app/lib/groq";

PDFParse.setWorker(getPath());

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type UploadResumeState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function uploadResume(
  _prevState: UploadResumeState,
  formData: FormData,
): Promise<UploadResumeState> {
  const file = formData.get("resume");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Please choose a PDF file to upload." };
  }

  if (file.type !== "application/pdf") {
    return { status: "error", message: "Please upload a PDF file." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { status: "error", message: "File must be 5MB or smaller." };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });

  let text: string;
  try {
    const result = await parser.getText({
      pageJoiner: "",
      parseHyperlinks: true,
    });
    // Icon-font glyphs (contact icons, bullet markers) can decode to
    // non-printable control characters, including the null byte, which
    // Postgres's text type can never store. Strip them; they're never
    // legitimate resume content.
    text = result.text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  } catch (err) {
    console.error("PDF parse failed", err);
    return {
      status: "error",
      message: "We couldn't read that PDF. Please try a different file.",
    };
  } finally {
    await parser.destroy();
  }

  if (!text) {
    return {
      status: "error",
      message:
        "We couldn't find any text in that PDF. Make sure it isn't a scanned image.",
    };
  }

  let resume;
  try {
    resume = await prisma.resume.create({
      data: { originalText: text },
    });
  } catch (err) {
    console.error("Resume save failed", err);
    return {
      status: "error",
      message: "Something went wrong saving your resume. Please try again.",
    };
  }

  try {
    const analysis = await analyzeResume(text);
    await prisma.resume.update({
      where: { id: resume.id },
      data: {
        aiScore: analysis.score,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        missingSections: analysis.missingSections,
        suggestions: analysis.suggestions,
      },
    });
  } catch (err) {
    console.error("Resume analysis failed", err);
  }

  redirect(`/results/${resume.id}`);
}

export type GenerateImprovedResumeState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function generateImprovedResume(
  resumeId: string,
  _prevState: GenerateImprovedResumeState,
  _formData: FormData,
): Promise<GenerateImprovedResumeState> {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });

  if (!resume) {
    return { status: "error", message: "Resume not found." };
  }

  let improved: ImprovedResume;
  try {
    improved = await improveResume(resume.originalText, {
      strengths: resume.strengths,
      weaknesses: resume.weaknesses,
      suggestions: resume.suggestions as Suggestion[],
    });
  } catch (err) {
    console.error("Resume regeneration failed", err);
    return {
      status: "error",
      message: "We couldn't generate an improved resume. Please try again.",
    };
  }

  try {
    await prisma.resume.update({
      where: { id: resumeId },
      data: { improvedResume: improved as object },
    });
  } catch {
    return {
      status: "error",
      message:
        "Something went wrong saving the improved resume. Please try again.",
    };
  }

  redirect(`/improved/${resumeId}`);
}
