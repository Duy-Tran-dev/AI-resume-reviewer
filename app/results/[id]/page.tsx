import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import type { Suggestion } from "@/app/lib/groq";

const PRIORITY_ORDER: Record<Suggestion["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function sortSuggestionsByPriority(suggestions: Suggestion[]): Suggestion[] {
  return [...suggestions].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resume = await prisma.resume.findUnique({ where: { id } });

  if (!resume) {
    notFound();
  }

  if (resume.aiScore === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Analysis not available
        </h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          We couldn&apos;t analyze this resume. Try uploading it again.
        </p>
      </div>
    );
  }

  const suggestions = sortSuggestionsByPriority(
    resume.suggestions as Suggestion[],
  );

  return (
    <div className="flex flex-1 flex-col items-center gap-10 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Your Resume Score
          </h1>
          <p className="text-5xl font-bold text-zinc-900 dark:text-zinc-50">
            {resume.aiScore}
            <span className="text-xl font-normal text-zinc-500 dark:text-zinc-400">
              /100
            </span>
          </p>
        </div>

        <Section title="Strengths">
          <BulletList items={resume.strengths} />
        </Section>

        <Section title="Weaknesses">
          <BulletList items={resume.weaknesses} />
        </Section>

        <Section title="Missing sections">
          <BulletList items={resume.missingSections} />
        </Section>

        <Section title="Suggestions">
          <ul className="flex flex-col gap-4">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={suggestion.priority} />
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {suggestion.text}
                  </p>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {suggestion.why}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">None noted.</p>
    );
  }
  return (
    <ul className="flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <span aria-hidden="true">-</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PriorityBadge({ priority }: { priority: Suggestion["priority"] }) {
  const styles: Record<Suggestion["priority"], string> = {
    high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    medium:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}
