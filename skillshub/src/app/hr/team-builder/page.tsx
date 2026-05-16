"use client";

import { useState } from "react";
import Link from "next/link";

interface Skill {
  name: string;
  proficiency: string;
  yearsExp: number | null;
  category: string;
}

interface TeamMember {
  employeeId: string;
  name: string;
  role: string;
  reasoning: string;
  skills: Skill[];
}

interface TeamResult {
  members: TeamMember[];
  teamSummary: string;
  skillsCovered: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  LANGUAGE: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200",
  FRAMEWORK: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200",
  PLATFORM: "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200",
  TOOL: "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200",
  DOMAIN: "bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200",
};

const EXAMPLES = [
  "Full-stack React/Node.js e-commerce platform with payment integration",
  "ML pipeline for fraud detection using Python and TensorFlow",
  "Mobile app with Flutter and Firebase real-time backend",
  "Kubernetes-based microservices platform with CI/CD and observability",
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function TeamBuilderPage() {
  const [requirements, setRequirements] = useState("");
  const [teamSize, setTeamSize] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TeamResult | null>(null);

  async function handleBuild() {
    if (!requirements.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/team-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements, teamSize }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Team Builder failed");
      setResult(data.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🏗️</span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Team Builder</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 ml-12">
          Describe your project and AI will assemble the optimal team from your talent pool
        </p>
      </div>

      {/* Input card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <textarea
          rows={4}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="Describe the project, required skills, tech stack, timeline, and any specific needs..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
        />

        {/* Team size + action */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Team size:</span>
            <div className="flex gap-1">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setTeamSize(n)}
                  className={`h-8 w-8 rounded-lg text-sm font-semibold transition-colors ${
                    teamSize === n
                      ? "bg-blue-600 text-white"
                      : "border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleBuild}
            disabled={loading || !requirements.trim()}
            className="ml-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors text-sm"
          >
            {loading ? "Building team..." : "✨ Build Team with AI"}
          </button>
        </div>

        {/* Example chips */}
        <div className="mt-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setRequirements(ex)}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 text-gray-600 dark:text-gray-300 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">AI is assembling your dream team...</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Team Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">💡</span>
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Team Assessment</p>
                <p className="text-sm text-blue-800 dark:text-blue-300">{result.teamSummary}</p>
              </div>
            </div>
          </div>

          {/* Skills Covered */}
          {result.skillsCovered.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                Collective Skills Coverage ({result.skillsCovered.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {result.skillsCovered.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Team member cards */}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              Selected Team ({result.members.length} members)
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {result.members.map((member, i) => (
                <div
                  key={member.employeeId}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
                >
                  {/* Avatar + name */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative flex-shrink-0">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                        {initials(member.name)}
                      </div>
                      <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold border-2 border-white dark:border-gray-800">
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{member.name}</p>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{member.role}</p>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    {member.reasoning}
                  </p>

                  {/* Top skills */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {member.skills.slice(0, 5).map((s) => (
                      <span
                        key={s.name}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[s.category] ?? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/hr/employees/${member.employeeId}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    View full profile →
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Footer action */}
          <div className="text-center pt-2">
            <Link
              href="/hr/search"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Looking for something more specific? Try Semantic Search →
            </Link>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-5xl mb-4">🏗️</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Build Your Dream Team</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Describe your project requirements above and AI will pick the optimal team from your talent pool
          </p>
        </div>
      )}
    </div>
  );
}
