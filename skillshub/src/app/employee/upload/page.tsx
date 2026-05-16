"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type UploadState = "idle" | "uploading" | "extracting" | "done" | "error";

export default function UploadPage() {
  const [state, setState] = useState<UploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setState("uploading");

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setState("extracting");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setState("done");
      const inferNote = data.inferredSkillCount > 0 ? ` (+${data.inferredSkillCount} inferred)` : "";
      setMessage(`Successfully extracted ${data.skillCount} skills${inferNote} and ${data.projectCount} projects!`);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  }

  const stateMessages: Record<UploadState, string> = {
    idle: "",
    uploading: "Uploading your PDF...",
    extracting: "Llama 3.2 is analyzing your resume — extracting skills, projects, experience, and inferring related skills...",
    done: message,
    error: message,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Resume</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">AI will extract your skills, projects, and experience from your PDF</p>
      </div>

      {state === "done" ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Profile Submitted!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-2">{message}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Your profile is now awaiting HR review. You&apos;ll be able to see it in your profile once approved.</p>
          <div className="flex justify-center gap-3">
            <Link href="/employee" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              View My Profile
            </Link>
            <button
              onClick={() => { setState("idle"); setFile(null); }}
              className="px-5 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Upload Another
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                file
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              }`}
            >
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <div className="text-4xl mb-3">{file ? "📄" : "⬆️"}</div>
              {file ? (
                <>
                  <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-700 dark:text-gray-200">Drop your PDF resume here</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">or click to browse</p>
                </>
              )}
            </div>

            {/* Status */}
            {state !== "idle" && (
              <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                state === "error"
                  ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                  : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              }`}>
                {state === "extracting" && (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {stateMessages[state]}
                  </div>
                )}
                {state !== "extracting" && stateMessages[state]}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || state === "uploading" || state === "extracting"}
              className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors"
            >
              {state === "extracting" || state === "uploading" ? "Processing..." : "Upload & Extract with AI"}
            </button>
          </div>

          {/* How it works */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">How it works</h3>
            <div className="space-y-3">
              {[
                { step: "1", label: "Upload PDF", desc: "Upload your resume in PDF format" },
                { step: "2", label: "AI Extraction", desc: "AI reads and extracts skills, projects, and experience" },
                { step: "3", label: "HR Review", desc: "An HR team member reviews the extracted data" },
                { step: "4", label: "Profile Live", desc: "Once approved, your profile appears in the employee directory" },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
