"use client";

import { useActionState, useId, useState } from "react";
import { uploadResume, type UploadResumeState } from "@/app/actions/resume";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const initialState: UploadResumeState = { status: "idle" };

function validatePdf(file: File): string | null {
  if (file.type !== "application/pdf") {
    return "Please upload a PDF file.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "File must be 5MB or smaller.";
  }
  return null;
}

export function ResumeUploadForm() {
  const inputId = useId();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    uploadResume,
    initialState,
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      setClientError(null);
      return;
    }

    const validationError = validatePdf(file);
    if (validationError) {
      setSelectedFile(null);
      setClientError(validationError);
      return;
    }

    setSelectedFile(file);
    setClientError(null);
  }

  const errorMessage =
    clientError ?? (state.status === "error" ? state.message : null);
  const fileSelectedMessage =
    selectedFile && !errorMessage && state.status === "idle"
      ? `${selectedFile.name} selected.`
      : null;

  return (
    <form
      action={formAction}
      className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Resume (PDF, up to 5MB)
        </label>
        <input
          id={inputId}
          name="resume"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={isPending}
          className="text-sm text-zinc-600 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 dark:text-zinc-400 dark:file:bg-zinc-100 dark:file:text-zinc-900 dark:hover:file:bg-zinc-300"
        />
        {errorMessage && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        )}
        {fileSelectedMessage && (
          <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
            {fileSelectedMessage}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={!selectedFile || isPending}
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors enabled:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:enabled:hover:bg-zinc-300"
      >
        {isPending ? "Reviewing..." : "Review my resume"}
      </button>
    </form>
  );
}
