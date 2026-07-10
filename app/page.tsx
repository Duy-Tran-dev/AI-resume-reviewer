import { ResumeUploadForm } from "@/app/components/resume/ResumeUploadForm";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-zinc-50 px-6 py-24 font-sans dark:bg-black">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          AI Resume Reviewer
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Upload your resume and get feedback from the perspective of a
          technical recruiter and an ATS - what&apos;s working, what&apos;s
          not, and why.
        </p>
      </div>
      <ResumeUploadForm />
    </div>
  );
}
