"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type Mode = "pdf" | "csv";

interface FileResult {
  file: string;
  name?: string;
  email?: string;
  status: "pending" | "processing" | "done" | "error";
  skillCount?: number;
  inferredCount?: number;
  projectCount?: number;
  created?: boolean;
  error?: string;
}

interface Summary {
  total: number;
  success: number;
  failed: number;
  mode: Mode;
}

const CSV_TEMPLATE = [
  "name,email,department,location,yearsTotal,skills",
  "Jane Smith,jane@company.com,Engineering,San Francisco,6,\"React:EXPERT:4;TypeScript:EXPERT:5;Node.js:INTERMEDIATE:3\"",
  "Bob Johnson,bob@company.com,Design,New York,4,\"Figma:EXPERT:4;CSS:INTERMEDIATE:3;UX Research:INTERMEDIATE:2\"",
  "Alice Wong,alice@company.com,Data Science,Remote,8,\"Python:EXPERT:7;Machine Learning:EXPERT:5;pandas:EXPERT:6;SQL:INTERMEDIATE:4\"",
].join("\n");

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "skillshub-bulk-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkImportPage() {
  const [mode, setMode] = useState<Mode>("pdf");
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<FileResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  function handlePdfDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    setPdfFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...files.filter((f) => !existing.has(f.name))].slice(0, 20);
    });
  }

  function handlePdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type === "application/pdf");
    setPdfFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...files.filter((f) => !existing.has(f.name))].slice(0, 20);
    });
  }

  function removeFile(name: string) {
    setPdfFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function reset() {
    setPdfFiles([]);
    setCsvFile(null);
    setResults([]);
    setSummary(null);
  }

  async function startImport() {
    if (running) return;
    if (mode === "pdf" && pdfFiles.length === 0) return;
    if (mode === "csv" && !csvFile) return;

    setRunning(true);
    setSummary(null);

    // Initialise result rows
    const initial: FileResult[] =
      mode === "pdf"
        ? pdfFiles.map((f) => ({ file: f.name, status: "pending" }))
        : [{ file: csvFile!.name, status: "pending" }];
    setResults(initial);

    const formData = new FormData();
    formData.append("mode", mode);
    if (mode === "pdf") {
      pdfFiles.forEach((f) => formData.append("resumes", f));
    } else {
      formData.append("csv", csvFile!);
    }

    try {
      const res = await fetch("/api/bulk-import", { method: "POST", body: formData });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Import failed" }));
        setResults([{ file: "import", status: "error", error: err.error }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            handleEvent(evt);
          } catch { /* malformed event */ }
        }
      }
    } catch (err) {
      setResults([{ file: "import", status: "error", error: err instanceof Error ? err.message : "Network error" }]);
    } finally {
      setRunning(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEvent(evt: any) {
    if (evt.type === "total") {
      if (evt.mode === "csv") {
        // CSV: expand results to one row per employee row
        setResults(
          Array.from({ length: evt.total }, (_, i) => ({ file: `Row ${i + 1}`, status: "pending" as const }))
        );
      }
    } else if (evt.type === "start") {
      setResults((prev) => {
        const next = [...prev];
        if (next[evt.index]) {
          next[evt.index] = { ...next[evt.index], file: evt.file, name: evt.name, email: evt.email, status: "processing" };
        }
        return next;
      });
    } else if (evt.type === "done") {
      setResults((prev) => {
        const next = [...prev];
        if (next[evt.index]) {
          next[evt.index] = {
            file: evt.file,
            name: evt.name,
            email: evt.email,
            status: "done",
            skillCount: evt.skillCount,
            inferredCount: evt.inferredCount,
            projectCount: evt.projectCount,
            created: evt.created,
          };
        }
        return next;
      });
    } else if (evt.type === "error") {
      if (typeof evt.index === "number") {
        setResults((prev) => {
          const next = [...prev];
          if (next[evt.index]) {
            next[evt.index] = { ...next[evt.index], file: evt.file ?? next[evt.index].file, status: "error", error: evt.message };
          }
          return next;
        });
      }
    } else if (evt.type === "complete") {
      setSummary({ total: evt.total, success: evt.success, failed: evt.failed, mode: evt.mode });
    }
  }

  const done = !!summary;
  const totalFiles = mode === "pdf" ? pdfFiles.length : csvFile ? 1 : 0;
  const successCount = results.filter((r) => r.status === "done").length;
  const progress = results.length > 0 ? Math.round((results.filter((r) => r.status !== "pending").length / results.length) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">📦</span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Import</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 ml-12 text-sm">
          Upload multiple resumes or a CSV to create employee profiles in batch — processed with Llama 3.2 in real time
        </p>
      </div>

      {!running && !done && (
        <>
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-6 border border-gray-200 dark:border-gray-700">
            {(["pdf", "csv"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); reset(); }}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === m
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {m === "pdf" ? "📄 PDF Batch" : "📊 CSV Import"}
              </button>
            ))}
          </div>

          {mode === "pdf" ? (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDrop={handlePdfDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => pdfRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-12 text-center cursor-pointer transition-colors bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10"
              >
                <input ref={pdfRef} type="file" accept=".pdf" multiple className="hidden" onChange={handlePdfSelect} />
                <div className="text-5xl mb-3">📄</div>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Drop PDF resumes here</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">or click to browse — up to 20 files, max 10 MB each</p>
              </div>

              {/* File list */}
              {pdfFiles.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{pdfFiles.length} file{pdfFiles.length !== 1 ? "s" : ""} selected</span>
                    <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                    {pdfFiles.map((f) => (
                      <li key={f.name} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-lg">📄</span>
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{f.name}</span>
                        <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                        <button onClick={() => removeFile(f.name)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none ml-1">×</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={startImport}
                disabled={pdfFiles.length === 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                ✨ Process {pdfFiles.length > 0 ? `${pdfFiles.length} Resume${pdfFiles.length !== 1 ? "s" : ""}` : "Resumes"} with AI
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* CSV instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-semibold mb-2">CSV Format</p>
                    <p className="font-mono text-xs bg-blue-100 dark:bg-blue-900/40 rounded p-2 mb-2 overflow-x-auto whitespace-nowrap">
                      name,email,department,location,yearsTotal,skills
                    </p>
                    <p className="mb-1">Skills column format: <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">SkillName:PROFICIENCY:years;NextSkill:PROFICIENCY:years</code></p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Proficiency: NOVICE | INTERMEDIATE | EXPERT</p>
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="mt-3 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  ⬇ Download Template CSV
                </button>
              </div>

              {/* CSV drop zone */}
              <div
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith(".csv")) setCsvFile(f); }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => csvRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  csvFile
                    ? "border-green-400 bg-green-50 dark:bg-green-900/10"
                    : "border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                }`}
              >
                <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
                <div className="text-4xl mb-3">{csvFile ? "✅" : "📊"}</div>
                {csvFile ? (
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">{csvFile.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{(csvFile.size / 1024).toFixed(1)} KB · click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">Drop your CSV here</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">or click to browse</p>
                  </div>
                )}
              </div>

              <button
                onClick={startImport}
                disabled={!csvFile}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                📊 Import from CSV
              </button>
            </div>
          )}
        </>
      )}

      {/* Progress view */}
      {(running || done) && (
        <div className="space-y-6">
          {/* Progress bar */}
          {running && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Processing {results.filter((r) => r.status !== "pending").length} / {results.length}
                </span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Summary card (shown when done) */}
          {summary && (
            <div className={`rounded-xl border p-5 ${
              summary.failed === 0
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{summary.failed === 0 ? "🎉" : "⚠️"}</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Import {summary.failed === 0 ? "Complete" : "Finished with errors"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {summary.success} succeeded · {summary.failed} failed · {summary.total} total
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <Link
                  href="/hr/employees"
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View Employees →
                </Link>
                <button
                  onClick={() => { reset(); setRunning(false); }}
                  className="text-sm px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Import More
                </button>
              </div>
            </div>
          )}

          {/* Per-file results */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {mode === "pdf" ? "Resume Processing Log" : "CSV Row Processing Log"}
              </span>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[480px] overflow-y-auto">
              {results.map((r, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  {/* Status icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {r.status === "pending"    && <span className="text-gray-300 dark:text-gray-600 text-lg">○</span>}
                    {r.status === "processing" && (
                      <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mt-0.5" />
                    )}
                    {r.status === "done"       && <span className="text-green-500 text-lg">✓</span>}
                    {r.status === "error"      && <span className="text-red-500 text-lg">✗</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.name ?? r.file}</span>
                      {r.created === true  && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">new user</span>}
                      {r.created === false && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">updated</span>}
                    </div>
                    {r.email && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{r.email}</p>
                    )}
                    {r.status === "done" && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {r.skillCount} skills{r.inferredCount ? ` (+${r.inferredCount} inferred)` : ""}
                        {r.projectCount ? ` · ${r.projectCount} projects` : ""}
                      </p>
                    )}
                    {r.status === "error" && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{r.error}</p>
                    )}
                    {r.status === "processing" && (
                      <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
                        {mode === "pdf" ? "Extracting skills with AI..." : "Importing..."}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-xs text-gray-400 mt-0.5">
                    {i + 1}/{results.length}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Info box — only show when not running */}
      {!running && !done && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">How bulk import works</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: "📄", title: "PDF batch", desc: "Drop up to 20 resumes. Llama 3.2 extracts name, email, skills, and projects from each one automatically." },
              { icon: "📊", title: "CSV import", desc: "Provide structured data directly. Use the template to fill in skills per employee and import in one click." },
              { icon: "👤", title: "Auto user creation", desc: "New employee accounts are created automatically. Existing accounts are updated. Temp password: SkillsHub@Import2025" },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
