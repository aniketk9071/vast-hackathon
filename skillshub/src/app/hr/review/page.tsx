"use client";

import { useEffect, useState } from "react";
import SkillBadge from "@/components/SkillBadge";

interface Ingestion {
  id: string;
  status: string;
  createdAt: string;
  reviewNotes: string | null;
  user: { id: string; name: string; email: string };
  aiResponse: {
    bio?: string;
    department?: string;
    location?: string;
    yearsTotal?: number;
    skills?: { name: string; category: string; proficiency: string; yearsExp: number }[];
    projects?: { name: string; description?: string; techStack: string[]; role?: string; duration?: string }[];
  } | null;
  hasResume?: boolean;
}

export default function ReviewPage() {
  const [ingestions, setIngestions] = useState<Ingestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");

  async function load() {
    const res = await fetch("/api/ingestions");
    const data = await res.json();
    setIngestions(data.ingestions ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAction(id: string, action: "approve" | "reject") {
    setProcessing(id);
    await fetch(`/api/ingestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes: notes[id] }),
    });
    await load();
    setProcessing(null);
  }

  const displayed = filter === "PENDING" ? ingestions.filter((i) => i.status === "PENDING") : ingestions;
  const pendingCount = ingestions.filter((i) => i.status === "PENDING").length;

  const statusStyle: Record<string, string> = {
    PENDING: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    APPROVED: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
    REJECTED: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Queue</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Review AI-extracted profiles before publishing to the directory</p>
        </div>
        <div className="flex gap-2">
          {(["PENDING", "ALL"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}>
              {f === "PENDING" ? `Pending (${pendingCount})` : "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500 dark:text-gray-400">No {filter === "PENDING" ? "pending" : ""} submissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((ing) => {
            const ai = ing.aiResponse;
            return (
              <div key={ing.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{ing.user.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{ing.user.email}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Submitted {new Date(ing.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href={`/api/resumes/${ing.user.id}/download`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      ⬇ Download Resume
                    </a>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[ing.status]}`}>{ing.status}</span>
                  </div>
                </div>

                {/* AI Extracted Data */}
                {ai && (
                  <div className="px-6 py-4">
                    <div className="grid sm:grid-cols-3 gap-4 mb-4 text-sm">
                      {ai.department && <div><span className="text-gray-400 dark:text-gray-500 text-xs">Department</span><p className="font-medium text-gray-900 dark:text-white">{ai.department}</p></div>}
                      {ai.location && <div><span className="text-gray-400 dark:text-gray-500 text-xs">Location</span><p className="font-medium text-gray-900 dark:text-white">{ai.location}</p></div>}
                      {ai.yearsTotal && <div><span className="text-gray-400 dark:text-gray-500 text-xs">Experience</span><p className="font-medium text-gray-900 dark:text-white">{ai.yearsTotal} years</p></div>}
                    </div>

                    {ai.bio && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">{ai.bio}</p>
                    )}

                    {ai.skills && ai.skills.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Extracted Skills ({ai.skills.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ai.skills.map((s) => (
                            <SkillBadge key={s.name} name={s.name} category={s.category} proficiency={s.proficiency} yearsExp={s.yearsExp} size="sm" />
                          ))}
                        </div>
                      </div>
                    )}

                    {ai.projects && ai.projects.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Projects ({ai.projects.length})</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {ai.projects.map((p) => (
                            <div key={p.name} className="text-sm border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                              <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                              {p.role && <p className="text-xs text-blue-600 dark:text-blue-400">{p.role}{p.duration ? ` · ${p.duration}` : ""}</p>}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.techStack.slice(0, 4).map((t) => (
                                  <span key={t} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded px-1.5 py-0.5">{t}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {ing.status === "PENDING" && (
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
                    <input
                      type="text" placeholder="Optional review notes..."
                      value={notes[ing.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [ing.id]: e.target.value }))}
                      className="flex-1 text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => handleAction(ing.id, "reject")} disabled={processing === ing.id}
                      className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                      Reject
                    </button>
                    <button onClick={() => handleAction(ing.id, "approve")} disabled={processing === ing.id}
                      className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                      {processing === ing.id ? "Processing..." : "Approve"}
                    </button>
                  </div>
                )}

                {ing.reviewNotes && (
                  <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">HR Notes: {ing.reviewNotes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
