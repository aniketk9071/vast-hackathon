"use client";

import { useState } from "react";
import ProfileCard from "@/components/ProfileCard";

interface SearchResult {
  employeeId: string;
  name: string;
  matchScore: number;
  matchReason: string;
  strengths: string[];
  gaps: string[];
  profile: {
    department: string | null;
    location: string | null;
    yearsTotal: number | null;
    bio: string | null;
    skills: { name: string; category: string; proficiency: string; yearsExp: number | null }[];
  };
}

const EXAMPLE_QUERIES = [
  "Senior React developer with AWS experience and fintech background",
  "Machine learning engineer who knows Python and TensorFlow",
  "DevOps engineer with Kubernetes and Terraform expertise",
  "Mobile developer experienced in Flutter and Firebase",
];

interface DebugInfo {
  totalProfiles: number;
  resultsReturned: number;
  scores: { name: string; score: number }[];
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  async function handleSearch(q?: string) {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError("");
    setDebug(null);
    setSearched(false);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results);
      if (data.debug) setDebug(data.debug);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Semantic Search</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Describe what you&apos;re looking for in plain English — AI will rank the best matches</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. Senior React developer with AWS experience in fintech..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
          >
            {loading ? "Searching..." : "Search with AI"}
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); handleSearch(q); }}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 text-gray-600 dark:text-gray-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      {loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>AI is analyzing all employee profiles...</span>
          </div>
        </div>
      )}

      {searched && !loading && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {results.length} {results.length === 1 ? "match" : "matches"} found
            </h2>
            <div className="flex items-center gap-3">
              {results.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> ≥80 strong</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> 60–79 good</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> &lt;60 partial</span>
                </div>
              )}
              {debug && (
                <button onClick={() => setShowDebug((v: boolean) => !v)}
                  className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {showDebug ? "Hide" : "Debug"}
                </button>
              )}
            </div>
          </div>

          {showDebug && debug && (
            <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-xs font-mono">
              <p className="text-gray-500 dark:text-gray-400 mb-2 font-sans font-medium text-xs uppercase tracking-wide">
                Search Debug — {debug.totalProfiles} profiles scanned, {debug.resultsReturned} returned
              </p>
              <div className="space-y-1">
                {debug.scores.map((s: { name: string; score: number }) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-32 text-gray-700 dark:text-gray-300 truncate">{s.name}</div>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.score >= 80 ? "bg-green-500" : s.score >= 60 ? "bg-blue-500" : "bg-amber-400"}`}
                        style={{ width: `${s.score}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-gray-600 dark:text-gray-300">{s.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">No strong matches found for this query. Try rephrasing.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={r.employeeId} className="relative">
                  <div className="absolute -left-3 top-5 h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300">
                    {i + 1}
                  </div>
                  <ProfileCard
                    id={r.employeeId}
                    name={r.name}
                    department={r.profile?.department}
                    location={r.profile?.location}
                    yearsTotal={r.profile?.yearsTotal}
                    bio={r.profile?.bio}
                    skills={r.profile?.skills ?? []}
                    matchScore={r.matchScore}
                    matchReason={r.matchReason}
                    strengths={r.strengths}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">Enter a search query above to find matching employees</p>
        </div>
      )}
    </div>
  );
}
