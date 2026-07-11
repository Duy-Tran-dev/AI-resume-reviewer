import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import type { ImprovedResume } from "@/app/lib/groq";

export default async function ImprovedResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resume = await prisma.resume.findUnique({ where: { id } });

  if (!resume) {
    notFound();
  }

  if (!resume.improvedResume) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Not generated yet
        </h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          You haven&apos;t generated an improved version of this resume yet.
        </p>
        <Link
          href={`/results/${id}`}
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
        >
          Back to results
        </Link>
      </div>
    );
  }

  const improved = resume.improvedResume as unknown as ImprovedResume;

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Improved Resume
          </h1>
          <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-500">
            This is a freshly formatted version, not a copy of your original
            file&apos;s design. We can only reliably verify that the rewritten
            content is accurate, not reproduce your original file&apos;s exact
            layout, so we use a clean, consistent format instead.
          </p>
          <a
            href={`/api/resume/${id}/download`}
            download
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Download PDF
          </a>
        </div>
        <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {improved.name}
          </h2>
          {improved.sections.map((section, index) => (
            <div key={index} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {section.heading}
              </h3>
              <ul className="flex flex-col gap-1 text-sm text-zinc-800 dark:text-zinc-200">
                {section.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex} className="flex gap-2">
                    <span aria-hidden="true">-</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
