"use client";

import { useEffect, useState } from "react";

interface Gap {
  skill: string;
  category: string;
  demand: "HIGH" | "MEDIUM" | "LOW";
  currentCount: number;
  currentPct: number;
  gapSeverity: "CRITICAL" | "MODERATE" | "MINOR";
}

interface Strength {
  skill: string;
  category: string;
  count: number;
  pct: number;
}

interface GapsData {
  totalProfiles: number;
  gaps: Gap[];
  strengths: Strength[];
  aiRecommendations: string[];
}

const SEV_CONFIG = {
  CRITICAL: {
    label: "Critical Gap",
    bar: "bg-red-500",
    badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    icon: "🔴",
  },
  MODERATE: {
    label: "Moderate Gap",
    bar: "bg-amber-500",
    badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: "🟡",
  },
  MINOR: {
    label: "Minor Gap",
    bar: "bg-blue-400",
    badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: "🔵",
  },
};

const CAT_COLORS: Record<string, string> = {
  LANGUAGE:  "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  FRAMEWORK: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  PLATFORM:  "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  TOOL:      "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  DOMAIN:    "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
};

export default function GapsPage() {
  const [data, setData] = useState<GapsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/gaps")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load gap analysis."); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 w-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Analysing skill gaps with AI...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const criticalGaps = data.gaps.filter((g) => g.gapSeverity === "CRITICAL");
  const moderateGaps = data.gaps.filter((g) => g.gapSeverity === "MODERATE");

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🎯</span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Skill Gap Analysis</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 ml-12">
          Skills in high market demand that your organisation is light on — with AI-powered hiring recommendations
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Profiles", value: data.totalProfiles, color: "blue", icon: "👥" },
          { label: "Critical Gaps", value: criticalGaps.length, color: "red", icon: "🔴" },
          { label: "Moderate Gaps", value: moderateGaps.length, color: "amber", icon: "🟡" },
          { label: "Strengths", value: data.strengths.length, color: "green", icon: "💪" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${
            s.color === "blue"  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300" :
            s.color === "red"   ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300" :
            s.color === "amber" ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300" :
                                  "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
          }`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm font-semibold mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Skill Gaps */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Skill Gaps by Severity</h2>
          {data.gaps.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No significant skill gaps detected. Great coverage!</p>
          ) : (
            <div className="space-y-3">
              {data.gaps.map((g) => {
                const cfg = SEV_CONFIG[g.gapSeverity];
                return (
                  <div key={g.skill} className="flex items-center gap-3">
                    <span className="text-sm flex-shrink-0 w-4">{cfg.icon}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-28 truncate flex-shrink-0">{g.skill}</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cfg.bar}`}
                        style={{ width: `${Math.max(g.currentPct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right flex-shrink-0">
                      {g.currentPct}%
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${CAT_COLORS[g.category] ?? "bg-gray-100 text-gray-700"}`}>
                      {g.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
            {(["CRITICAL", "MODERATE"] as const).map((sev) => (
              <div key={sev} className="flex items-center gap-1.5">
                <span className="text-xs">{SEV_CONFIG[sev].icon}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{SEV_CONFIG[sev].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Current Strengths</h2>
          <div className="space-y-3">
            {data.strengths.map((s) => (
              <div key={s.skill} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 dark:text-gray-400 w-28 truncate flex-shrink-0">{s.skill}</span>
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.max(s.pct, 2)}%` }} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right flex-shrink-0">
                  {s.count} people ({s.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {data.aiRecommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">🤖</span>
            <h2 className="font-semibold text-gray-900 dark:text-white">AI Strategic Recommendations</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium ml-1">
              Llama 3.2
            </span>
          </div>
          <div className="space-y-3">
            {data.aiRecommendations.map((rec, i) => (
              <div key={i} className={`rounded-lg p-4 ${
                i === 0
                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                  : "bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              }`}>
                <p className="text-sm leading-relaxed">{i > 0 && <span className="font-semibold mr-1">{i}.</span>}{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
