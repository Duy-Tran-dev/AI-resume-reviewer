import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/app/lib/prisma";
import { normalizeImprovedResume } from "@/app/lib/groq";
import { ImprovedResumeDocument } from "@/app/components/resume/ImprovedResumeDocument";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resume = await prisma.resume.findUnique({ where: { id } });

  if (!resume || !resume.improvedResume) {
    return new NextResponse("Not found", { status: 404 });
  }

  const improved = normalizeImprovedResume(resume.improvedResume);
  const buffer = await renderToBuffer(
    <ImprovedResumeDocument resume={improved} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="improved-resume-${id}.pdf"`,
    },
  });
}
