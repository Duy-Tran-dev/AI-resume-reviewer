"use server";

import { redirect } from "next/navigation";
import { getPath } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import { prisma } from "@/app/lib/prisma";
import { analyzeResume } from "@/app/lib/groq";

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
    const result = await parser.getText({ pageJoiner: "" });
    text = result.text.trim();
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
  } catch {
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
