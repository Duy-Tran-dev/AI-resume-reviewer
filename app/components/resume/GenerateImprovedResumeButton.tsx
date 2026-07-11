"use client";

import { useActionState } from "react";
import {
  generateImprovedResume,
  type GenerateImprovedResumeState,
} from "@/app/actions/resume";

const initialState: GenerateImprovedResumeState = { status: "idle" };

export function GenerateImprovedResumeButton({
  resumeId,
}: {
  resumeId: string;
}) {
  const action = generateImprovedResume.bind(null, resumeId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col items-center gap-2">
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors enabled:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:enabled:hover:bg-zinc-300"
      >
        {isPending ? "Generating..." : "Generate improved resume"}
      </button>
    </form>
  );
}
