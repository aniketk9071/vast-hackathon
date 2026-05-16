"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface LanguageSkill {
  name: string; category: string;
  proficiency: "EXPERT" | "INTERMEDIATE" | "NOVICE";
  pct: number; repoCount: number; color: string;
}
interface TopicSkill { name: string; category: string; source: string; }
interface Commit     { sha: string; message: string; author: string; date: string; }
interface RepoCard {
  name: string; description: string | null; url: string;
  language: string | null; stars: number; updatedAt: string;
  topics: string[]; color: string;
}
interface GHUser {
  login: string; name: string | null; bio: string | null;
  publicRepos: number; followers: number;
  location: string | null; company: string | null;
}
interface ResumeSkill { name: string; category: string; proficiency: string; yearsExp?: number | null; }
interface AIInsight {
  matchScore: number; insights: string[];
  skillsToAdd: string[]; possiblyOutdated: string[]; recommendation: string;
}
interface UserData {
  ghUser: GHUser;
  languageSkills: LanguageSkill[]; topicSkills: TopicSkill[];
  topRepos: RepoCard[]; totalReposAnalyzed: number;
  resumeSkills: ResumeSkill[]; employeeName: string | null;
  employeeProfile: { department: string | null; location: string | null; yearsTotal: number | null; bio: string | null } | null;
  newSkills: (LanguageSkill | TopicSkill)[];
  possiblyOutdated: string[];
  aiInsight: AIInsight | null;
  aiSummary: string | null;
}
interface RepoDetail {
  repoInfo: {
    name: string; fullName: string; description: string | null;
    stars: number; forks: number; openIssues: number;
    language: string | null; topics: string[];
    updatedAt: string; pushedAt: string;
  };
  languageSkills: LanguageSkill[]; topicSkills: TopicSkill[];
  recentCommits: Commit[]; totalCommitsShown: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const GH_PATH = "M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z";

function timeAgo(iso: string) {
  const m = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (m < 1) return "this month";
  if (m < 12) return `${Math.round(m)}mo ago`;
  return `${Math.round(m / 12)}yr ago`;
}

function initials(s: string) {
  return s.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

/* Parse a pasted GitHub URL or plain input into { username, repoPath? } */
function parseGHInput(raw: string): { username: string; repoPath: string | null } {
  const s = raw.trim();
  const m = s.match(/github\.com\/([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?/);
  if (m && m[1]) {
    const skip = ["repositories", "stars", "projects", "followers", "following", "issues", "pulls"];
    const repo = m[2] && !skip.includes(m[2]) ? m[2] : null;
    return { username: m[1], repoPath: repo ? `${m[1]}/${repo}` : null };
  }
  // plain "user/repo" without domain
  if (s.includes("/") && !s.startsWith("http")) {
    const [u, r] = s.split("/");
    if (u && r) return { username: u, repoPath: s };
  }
  return { username: s, repoPath: null };
}

/* ─── Proficiency badge ──────────────────────────────────────────────────────── */
function ProfBadge({ level }: { level: "EXPERT" | "INTERMEDIATE" | "NOVICE" }) {
  const bg = level === "EXPERT" ? "#22c55e" : level === "INTERMEDIATE" ? "#3b82f6" : "#f59e0b";
  return (
    <span style={{ background: bg, minWidth: 148, textAlign: "center" }}
      className="text-white text-xs font-bold tracking-wide rounded-full px-4 py-2 flex-shrink-0 inline-block">
      {level}
    </span>
  );
}

/* ─── Language bar (skills view) ─────────────────────────────────────────────── */
function LangBar({ s }: { s: LanguageSkill }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-shrink-0" style={{ width: 108 }}>{s.name}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 16, background: "#e5e7eb" }}>
        <div style={{ width: `${Math.min(s.pct, 100)}%`, height: "100%", background: s.color, borderRadius: 9999 }} />
      </div>
      <span className="text-sm font-bold flex-shrink-0 tabular-nums text-gray-700 dark:text-gray-200" style={{ width: 44, textAlign: "right" }}>{s.pct}%</span>
      <ProfBadge level={s.proficiency} />
    </div>
  );
}

/* ─── Language bar (resume view — compact) ───────────────────────────────────── */
function ResumeLangBar({ s }: { s: LanguageSkill }) {
  const col = s.proficiency === "EXPERT" ? "#22c55e" : s.proficiency === "INTERMEDIATE" ? "#3b82f6" : "#f59e0b";
  return (
    <div className="flex items-center gap-3">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
      <span className="text-sm text-gray-800 flex-shrink-0" style={{ width: 110 }}>{s.name}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 8, background: "#f3f4f6" }}>
        <div style={{ width: `${Math.min(s.pct, 100)}%`, height: "100%", background: s.color, borderRadius: 9999 }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500" style={{ width: 36, textAlign: "right" }}>{s.pct}%</span>
      <span className="text-xs font-bold flex-shrink-0" style={{ color: col, width: 88 }}>{s.proficiency}</span>
    </div>
  );
}

/* ─── Stacked colour bar ─────────────────────────────────────────────────────── */
function ColourBar({ skills }: { skills: LanguageSkill[] }) {
  const total = skills.slice(0, 8).reduce((a, s) => a + s.pct, 0) || 1;
  return (
    <div className="flex h-3 rounded-full overflow-hidden mt-4">
      {skills.slice(0, 8).map(s => (
        <div key={s.name} style={{ width: `${(s.pct / total) * 100}%`, background: s.color }} title={`${s.name} ${s.pct}%`} />
      ))}
    </div>
  );
}

/* ─── Loader ─────────────────────────────────────────────────────────────────── */
function Loader({ text }: { text: string }) {
  return (
    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
      <div className="flex gap-2 justify-center mb-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-3 w-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{text}</p>
    </div>
  );
}

/* ─── AI Insight panel ───────────────────────────────────────────────────────── */
function AIInsightPanel({ insight, name }: { insight: AIInsight; name: string }) {
  const ringColor = insight.matchScore >= 70 ? "#22c55e" : insight.matchScore >= 40 ? "#f59e0b" : "#ef4444";
  const textColor = insight.matchScore >= 70 ? "text-green-600" : insight.matchScore >= 40 ? "text-amber-600" : "text-red-600";
  return (
    <div className="bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border border-violet-200 dark:border-violet-700 rounded-2xl p-5 mb-5">
      <div className="flex items-start gap-5">
        <div className="w-20 h-20 rounded-full flex-shrink-0 flex flex-col items-center justify-center" style={{ border: `4px solid ${ringColor}` }}>
          <span className={`text-2xl font-black ${textColor}`}>{insight.matchScore}</span>
          <span className="text-xs text-gray-400 font-medium -mt-0.5">match</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white mb-2">🤖 AI Skills Analysis — {name}</p>
          <ul className="space-y-1 mb-3">
            {insight.insights.map((ins, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                <span className="text-violet-500 flex-shrink-0">•</span>{ins}
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400 italic border-t border-violet-200 dark:border-violet-700 pt-2">{insight.recommendation}</p>
        </div>
      </div>
      {(insight.skillsToAdd.length > 0 || insight.possiblyOutdated.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-violet-200 dark:border-violet-700">
          {insight.skillsToAdd.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 mb-2">⚡ Add to resume</p>
              <div className="flex flex-wrap gap-1.5">
                {insight.skillsToAdd.map(s => <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-green-500 text-white font-semibold">{s}</span>)}
              </div>
            </div>
          )}
          {insight.possiblyOutdated.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-2">⚠️ Possibly outdated</p>
              <div className="flex flex-wrap gap-1.5">
                {insight.possiblyOutdated.map(s => <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-amber-400 text-white font-semibold">{s}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   RESUME VIEW — formats GitHub data exactly like a professional resume
══════════════════════════════════════════════════════════════════════════════ */
function ResumeView({ profile, onBack }: { profile: UserData; onBack?: () => void }) {
  const byCategory = profile.topicSkills.reduce<Record<string, string[]>>((acc, s) => {
    const key = s.category === "FRAMEWORK" ? "Frameworks" : s.category === "PLATFORM" ? "Platforms" : "Tools";
    (acc[key] = acc[key] ?? []).push(s.name);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0">
      {/* ── Header bar ── */}
      <div className="bg-gray-900 text-white px-8 py-7">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-xl select-none flex-shrink-0">
              {initials(profile.ghUser.name ?? profile.ghUser.login)}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wide">{(profile.ghUser.name ?? profile.ghUser.login).toUpperCase()}</h1>
              <p className="text-blue-300 font-mono text-sm mt-0.5">github.com/{profile.ghUser.login}</p>
              <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-gray-300">
                {profile.ghUser.location && <span>📍 {profile.ghUser.location}</span>}
                {profile.ghUser.company  && <span>🏢 {profile.ghUser.company}</span>}
                <span>🗂 {profile.ghUser.publicRepos} repos · {profile.ghUser.followers} followers</span>
              </div>
            </div>
          </div>
          {onBack && (
            <button onClick={onBack} className="text-xs text-gray-400 hover:text-white border border-gray-600 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
              ← Skills view
            </button>
          )}
        </div>
        {/* AI-generated summary */}
        {profile.aiSummary && (
          <p className="mt-4 text-sm text-gray-300 leading-relaxed border-t border-gray-700 pt-4">{profile.aiSummary}</p>
        )}
      </div>

      <div className="px-8 py-6 space-y-7">

        {/* ── Technical Skills ── */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 border-b border-gray-200 pb-2 mb-4">Technical Skills</h2>

          {profile.languageSkills.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Languages</p>
              <div className="space-y-2.5 max-w-2xl">
                {profile.languageSkills.map(s => <ResumeLangBar key={s.name} s={s} />)}
              </div>
              <ColourBar skills={profile.languageSkills} />
            </div>
          )}

          {Object.keys(byCategory).length > 0 && (
            <div className="grid sm:grid-cols-3 gap-4">
              {Object.entries(byCategory).map(([cat, skills]) => (
                <div key={cat}>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => (
                      <span key={s} className="text-xs px-2.5 py-1 border border-gray-200 rounded-full text-gray-700 bg-gray-50">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Resume skill comparison (when employee linked) ── */}
        {profile.resumeSkills.length > 0 && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 border-b border-gray-200 pb-2 mb-4">Resume vs GitHub Comparison</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-green-600 mb-2">✅ Confirmed on GitHub</p>
                <div className="flex flex-col gap-1">
                  {profile.resumeSkills.filter(s =>
                    profile.languageSkills.some(l => l.name.toLowerCase() === s.name.toLowerCase()) ||
                    profile.topicSkills.some(t => t.name.toLowerCase() === s.name.toLowerCase())
                  ).map(s => (
                    <div key={s.name} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      {s.name} <span className="text-xs text-gray-400">({s.proficiency})</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">⚠️ Not seen on GitHub</p>
                <div className="flex flex-col gap-1">
                  {profile.possiblyOutdated.map(n => (
                    <div key={n} className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {profile.newSkills.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-xs font-bold uppercase tracking-wider text-green-700 mb-2">⚡ Skills to add to resume</p>
                <div className="flex flex-wrap gap-2">
                  {profile.newSkills.map(s => (
                    <span key={s.name} className="text-xs px-3 py-1 rounded-full bg-green-500 text-white font-semibold">{s.name}</span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Projects ── */}
        {profile.topRepos.length > 0 && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 border-b border-gray-200 pb-2 mb-4">Projects &amp; Repositories</h2>
            <div className="space-y-4">
              {profile.topRepos.map(r => (
                <div key={r.name} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-base">{r.name}</h3>
                      {r.stars > 0 && <span className="text-xs font-semibold text-amber-500">⭐ {r.stars}</span>}
                      {r.language && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold text-white" style={{ background: r.color }}>{r.language}</span>
                      )}
                      {r.topics.slice(0, 3).map(t => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500">#{t}</span>
                      ))}
                    </div>
                    {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">Updated {timeAgo(r.updatedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── GitHub Activity ── */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 border-b border-gray-200 pb-2 mb-4">GitHub Activity</h2>
          <div className="flex gap-10">
            {[
              { val: profile.ghUser.publicRepos, label: "Public Repos" },
              { val: profile.ghUser.followers,   label: "Followers"    },
              { val: profile.totalReposAnalyzed, label: "Repos Analysed" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black text-gray-900">{val}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

/* ── Repo Resume View ────────────────────────────────────────────────────────── */
function RepoResumeView({ repo, profile, onBack }: { repo: RepoDetail; profile: UserData | null; onBack: () => void }) {
  const resumeSet = new Set((profile?.resumeSkills ?? []).map(s => s.name.toLowerCase()));
  const allSkillNames = [...repo.languageSkills.map(s => s.name), ...repo.topicSkills.map(s => s.name)];
  const confirmed = allSkillNames.filter(n => resumeSet.has(n.toLowerCase()));
  const missing   = allSkillNames.filter(n => !resumeSet.has(n.toLowerCase()));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 text-white px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-gray-300"><path d={GH_PATH} /></svg>
              <h1 className="text-xl font-black tracking-wide">{repo.repoInfo.fullName.toUpperCase()}</h1>
            </div>
            {repo.repoInfo.description && <p className="text-gray-300 text-sm">{repo.repoInfo.description}</p>}
            <div className="flex gap-4 mt-2 text-sm text-gray-400">
              <span>⭐ {repo.repoInfo.stars.toLocaleString()} stars</span>
              <span>🍴 {repo.repoInfo.forks.toLocaleString()} forks</span>
              <span>🐛 {repo.repoInfo.openIssues} issues</span>
              <span>Updated {timeAgo(repo.repoInfo.updatedAt)}</span>
            </div>
          </div>
          <button onClick={onBack} className="text-xs text-gray-400 hover:text-white border border-gray-600 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
            ← Skills view
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-7">

        {/* Language Skills */}
        {repo.languageSkills.length > 0 ? (
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 border-b border-gray-200 pb-2 mb-4">Languages Used</h2>
            <div className="space-y-2.5 max-w-2xl">
              {repo.languageSkills.map(s => <ResumeLangBar key={s.name} s={s} />)}
            </div>
            <ColourBar skills={repo.languageSkills} />
          </section>
        ) : (
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 border-b border-gray-200 pb-2 mb-4">Languages Used</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <div>
                <p className="font-semibold text-amber-800 mb-1">No source code detected in this repository</p>
                <p className="text-sm text-amber-700 mb-3">
                  This repo appears to contain only README or uploaded files — GitHub reports no programming language bytes, so skills cannot be inferred.
                </p>
                <p className="text-sm text-amber-700 font-medium">
                  💡 Try searching the <strong>user profile</strong> instead (e.g. <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">{repo.repoInfo.fullName.split("/")[0]}</code>) to see skills aggregated across all repositories.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Framework skills */}
        {repo.topicSkills.length > 0 && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 border-b border-gray-200 pb-2 mb-4">Frameworks &amp; Tools</h2>
            <div className="flex flex-wrap gap-2">
              {repo.topicSkills.map(s => (
                <span key={s.name} className="text-sm px-3 py-1.5 border border-gray-200 rounded-full text-gray-700 bg-gray-50 font-medium">{s.name}</span>
              ))}
            </div>
          </section>
        )}

        {/* Resume comparison */}
        {profile && (confirmed.length > 0 || missing.length > 0) && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 border-b border-gray-200 pb-2 mb-4">Resume Skill Match</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {confirmed.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700 mb-2">✅ Already in resume</p>
                  <div className="flex flex-wrap gap-2">
                    {confirmed.map(n => <span key={n} className="text-xs px-3 py-1 rounded-full bg-green-500 text-white font-semibold">{n}</span>)}
                  </div>
                </div>
              )}
              {missing.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">⚡ Not in resume — add these</p>
                  <div className="flex flex-wrap gap-2">
                    {missing.map(n => <span key={n} className="text-xs px-3 py-1 rounded-full bg-amber-500 text-white font-semibold">{n}</span>)}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Recent commits */}
        {repo.recentCommits.length > 0 && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 border-b border-gray-200 pb-2 mb-4">
              Recent Contributions <span className="normal-case font-normal text-gray-400">({repo.totalCommitsShown} commits)</span>
            </h2>
            <div className="space-y-2">
              {repo.recentCommits.map(c => (
                <div key={c.sha} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <code className="text-xs font-mono bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 flex-shrink-0 w-14 text-center mt-0.5">{c.sha}</code>
                  <p className="flex-1 text-sm text-gray-800 truncate">{c.message}</p>
                  <div className="text-right flex-shrink-0 min-w-[90px]">
                    <p className="text-xs font-medium text-gray-600">{c.author}</p>
                    <p className="text-xs text-gray-400">{timeAgo(c.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════════════════════════ */
function GitHubPageInner() {
  const sp = useSearchParams();

  const [inputRaw,   setInputRaw]   = useState(sp.get("username") ?? "");
  const [employeeId] = useState(sp.get("employeeId") ?? "");
  const [viewMode,   setViewMode]   = useState<"skills" | "resume">("skills");

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [profile,  setProfile]  = useState<UserData | null>(null);

  const [selRepo,     setSelRepo]     = useState<string | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError,   setRepoError]   = useState("");
  const [repoDetail,  setRepoDetail]  = useState<RepoDetail | null>(null);

  useEffect(() => {
    const u = sp.get("username");
    const r = sp.get("repo");
    if (u) doAnalyse(u);
    else if (r) doFetchRepo(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* When the user types/pastes, normalise to username (or user/repo) */
  function handleInputChange(raw: string) {
    const { username, repoPath } = parseGHInput(raw);
    setInputRaw(repoPath ?? username);
  }

  /* Analyse button — detects whether input is a profile or a specific repo */
  async function doAnalyse(override?: string) {
    const raw = override ?? inputRaw;
    const { username, repoPath } = parseGHInput(raw);
    if (repoPath) {
      setInputRaw(repoPath);
      await doFetchRepo(repoPath);
    } else {
      setInputRaw(username);
      await doFetchProfile(username);
    }
  }

  async function doFetchProfile(u: string) {
    if (!u.trim()) return;
    setLoading(true); setError(""); setProfile(null);
    setSelRepo(null); setRepoDetail(null); setViewMode("skills");
    try {
      const p = new URLSearchParams({ username: u.trim() });
      if (employeeId) p.set("employeeId", employeeId);
      const res  = await fetch(`/api/github?${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "GitHub API error");
      setProfile(json as UserData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  async function doFetchRepo(fullName: string) {
    setSelRepo(fullName);
    setRepoLoading(true); setRepoError(""); setRepoDetail(null); setViewMode("skills");
    try {
      const p = new URLSearchParams({ repo: fullName });
      if (employeeId) p.set("employeeId", employeeId);
      const res  = await fetch(`/api/github?${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "GitHub API error");
      setRepoDetail(json as RepoDetail);
    } catch (e) {
      setRepoError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setRepoLoading(false); }
  }

  /* ── Shared search bar ─────────────────────────────────────────────────────── */
  const searchBar = (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-5">
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-xl px-3 bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-gray-400 flex-shrink-0"><path d={GH_PATH} /></svg>
          <span className="text-gray-400 text-sm font-mono flex-shrink-0">github.com/</span>
          <input
            value={inputRaw}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doAnalyse()}
            placeholder="username  or  paste full GitHub URL"
            className="flex-1 py-2.5 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none"
          />
        </div>
        <button onClick={() => doAnalyse()} disabled={loading || !inputRaw.trim()}
          className="px-6 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-40 text-white dark:text-gray-900 font-semibold rounded-xl transition-colors text-sm flex-shrink-0">
          {loading ? "Fetching…" : "Analyse"}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2 ml-1">Paste a full URL like https://github.com/user or https://github.com/user/repo</p>
    </div>
  );

  /* ── View toggle ────────────────────────────────────────────────────────────── */
  function ViewToggle() {
    return (
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit mb-5">
        {(["skills", "resume"] as const).map(m => (
          <button key={m} onClick={() => setViewMode(m)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all capitalize ${
              viewMode === m
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}>
            {m === "skills" ? "📊 Skills View" : "📄 Resume View"}
          </button>
        ))}
      </div>
    );
  }

  /* ── REPO DETAIL ───────────────────────────────────────────────────────────── */
  if (selRepo) {
    return (
      <div>
        <div className="mb-5 flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current text-gray-900 dark:text-white"><path d={GH_PATH} /></svg>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GitHub Skill Analysis</h1>
        </div>

        {searchBar}

        <button onClick={() => { setSelRepo(null); setRepoDetail(null); }}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-5">
          ← Back to {profile ? `@${profile.ghUser.login} profile` : "search"}
        </button>

        {repoLoading && <Loader text={`Analysing ${selRepo}…`} />}
        {repoError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-2xl px-4 py-3 text-sm mb-4">{repoError}</div>}

        {repoDetail && !repoLoading && (
          <>
            <ViewToggle />

            {viewMode === "resume" ? (
              <RepoResumeView repo={repoDetail} profile={profile} onBack={() => setViewMode("skills")} />
            ) : (
              <div className="space-y-5">
                {/* Skills view — repo header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{repoDetail.repoInfo.fullName}</h2>
                      {repoDetail.repoInfo.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{repoDetail.repoInfo.description}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {repoDetail.repoInfo.topics.map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">#{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                      {[
                        { icon: "⭐", val: repoDetail.repoInfo.stars.toLocaleString(), label: "stars", bg: "bg-amber-50", fg: "text-amber-600" },
                        { icon: "🍴", val: repoDetail.repoInfo.forks.toLocaleString(), label: "forks", bg: "bg-gray-50 dark:bg-gray-700/50", fg: "text-gray-700 dark:text-gray-300" },
                        { icon: "🐛", val: String(repoDetail.repoInfo.openIssues), label: "issues", bg: "bg-red-50", fg: "text-red-600" },
                      ].map(({ icon, val, label, bg, fg }) => (
                        <div key={label} className={`flex flex-col items-center ${bg} dark:bg-gray-700/30 rounded-xl px-4 py-2`}>
                          <span className={`font-bold ${fg}`}>{icon} {val}</span>
                          <span className="text-xs text-gray-400">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                    Updated {timeAgo(repoDetail.repoInfo.updatedAt)} · Pushed {timeAgo(repoDetail.repoInfo.pushedAt)}
                    {repoDetail.repoInfo.language && <> · Primary: <strong className="text-gray-600 dark:text-gray-300">{repoDetail.repoInfo.language}</strong></>}
                  </p>
                </div>

                {/* Language breakdown */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-5">Language Breakdown</h3>
                  {repoDetail.languageSkills.length > 0 ? (
                    <div className="space-y-4">
                      {repoDetail.languageSkills.map(s => <LangBar key={s.name} s={s} />)}
                      <ColourBar skills={repoDetail.languageSkills} />
                    </div>
                  ) : <p className="text-sm text-gray-500">No language data.</p>}
                </div>

                {/* Skill match */}
                {profile && (() => {
                  const resumeSet = new Set(profile.resumeSkills.map(s => s.name.toLowerCase()));
                  const all = [...repoDetail.languageSkills.map(s => s.name), ...repoDetail.topicSkills.map(s => s.name)];
                  const yes = all.filter(n => resumeSet.has(n.toLowerCase()));
                  const no  = all.filter(n => !resumeSet.has(n.toLowerCase()));
                  if (!yes.length && !no.length) return null;
                  return (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {yes.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl p-5">
                          <p className="font-semibold text-green-800 dark:text-green-200 mb-3">✅ Already in resume</p>
                          <div className="flex flex-wrap gap-2">{yes.map(n => <span key={n} className="bg-green-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">{n}</span>)}</div>
                        </div>
                      )}
                      {no.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5">
                          <p className="font-semibold text-amber-800 dark:text-amber-200 mb-3">⚡ Not in resume</p>
                          <div className="flex flex-wrap gap-2">{no.map(n => <span key={n} className="bg-amber-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">{n}</span>)}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Commits */}
                {repoDetail.recentCommits.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Commits <span className="text-xs font-normal text-gray-400">({repoDetail.totalCommitsShown})</span></h3>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {repoDetail.recentCommits.map(c => (
                        <div key={c.sha} className="flex items-start gap-3 py-3">
                          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-500 rounded px-1.5 py-0.5 flex-shrink-0 w-16 text-center mt-0.5">{c.sha}</code>
                          <p className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">{c.message}</p>
                          <div className="text-right flex-shrink-0 min-w-[100px]">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{c.author}</p>
                            <p className="text-xs text-gray-400">{timeAgo(c.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {employeeId && <Link href={`/hr/employees/${employeeId}`} className="block text-center text-sm text-gray-500 hover:text-blue-600 py-3">← Back to employee profile</Link>}
          </>
        )}
      </div>
    );
  }

  /* ── PROFILE VIEW ──────────────────────────────────────────────────────────── */
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current text-gray-900 dark:text-white"><path d={GH_PATH} /></svg>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GitHub Skill Analysis</h1>
      </div>

      {searchBar}

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-2xl px-4 py-3 mb-5 text-sm">{error}</div>}
      {loading && <Loader text={`Fetching GitHub data & generating AI summary…`} />}

      {profile && !loading && (
        <div>
          {/* AI insight (employee-linked only) */}
          {profile.aiInsight && (
            <AIInsightPanel insight={profile.aiInsight} name={profile.employeeName ?? profile.ghUser.name ?? profile.ghUser.login} />
          )}

          <ViewToggle />

          {/* ── RESUME VIEW ──────────────────────────────────────────────── */}
          {viewMode === "resume" ? (
            <ResumeView profile={profile} onBack={() => setViewMode("skills")} />
          ) : (

            /* ── SKILLS VIEW ─────────────────────────────────────────────── */
            <div className="space-y-5">
              {/* Main card: left profile + right language breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex gap-8 items-start">

                  {/* LEFT — fixed 270px */}
                  <div className="flex-shrink-0" style={{ width: 270 }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl select-none flex-shrink-0">
                        {initials(profile.ghUser.name ?? profile.ghUser.login)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-base truncate">{profile.ghUser.name ?? profile.ghUser.login}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">@{profile.ghUser.login}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">{profile.ghUser.publicRepos}</span> repos
                      <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{profile.ghUser.followers}</span> followers
                    </p>
                    {profile.ghUser.location && <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">📍 {profile.ghUser.location}</p>}
                    {profile.ghUser.company  && <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">🏢 {profile.ghUser.company}</p>}
                    {profile.ghUser.bio      && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">{profile.ghUser.bio}</p>}
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-3">{profile.totalReposAnalyzed} repos analysed</p>

                    {/* Resume skills */}
                    {profile.resumeSkills.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          📄 Resume Skills
                          {profile.employeeProfile?.department && <span className="ml-1 normal-case font-normal text-gray-400">· {profile.employeeProfile.department}</span>}
                        </p>
                        <div className="space-y-1 max-h-52 overflow-y-auto">
                          {profile.resumeSkills.map(s => {
                            const onGH = profile.languageSkills.some(l => l.name.toLowerCase() === s.name.toLowerCase())
                              || profile.topicSkills.some(t => t.name.toLowerCase() === s.name.toLowerCase());
                            return (
                              <div key={s.name} className="flex items-center gap-1.5">
                                <span className="text-xs flex-shrink-0">{onGH ? "✅" : "⚠️"}</span>
                                <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 truncate">{s.name}</span>
                                <span className={`text-xs flex-shrink-0 font-medium ${s.proficiency === "EXPERT" ? "text-green-600" : s.proficiency === "INTERMEDIATE" ? "text-blue-600" : "text-amber-600"}`}>
                                  {s.proficiency.slice(0, 3)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Skills not in resume */}
                    {profile.newSkills.length > 0 && (
                      <div className="mt-4 border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-1.5">
                          <span>⚡</span> Skills not in resume
                        </p>
                        <div className="flex flex-col gap-2">
                          {profile.newSkills.map(s => (
                            <span key={s.name} className="block text-center text-sm font-semibold py-2 rounded-lg bg-green-500 text-white w-full">{s.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT — flex-1: Language Breakdown */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-5">Language Breakdown</h3>
                    {profile.languageSkills.length > 0 ? (
                      <div className="space-y-4">
                        {profile.languageSkills.map(s => <LangBar key={s.name} s={s} />)}
                        <ColourBar skills={profile.languageSkills} />
                      </div>
                    ) : <p className="text-sm text-gray-500">No language data.</p>}

                    {profile.topicSkills.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Framework & Tool Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.topicSkills.map(s => (
                            <span key={s.name} className="text-xs px-3 py-1 rounded-full font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">{s.name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.possiblyOutdated?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">⚠️ In resume but no GitHub activity</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.possiblyOutdated.map(n => (
                            <span key={n} className="text-xs px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">{n}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Repo grid */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Top Repositories <span className="text-xs font-normal text-gray-400">— click a card for deep analysis</span>
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {profile.topRepos.map(r => {
                    const full = `${profile.ghUser.login}/${r.name}`;
                    return (
                      <button key={r.name} onClick={() => doFetchRepo(full)}
                        className="text-left border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-gray-50 dark:bg-gray-700/30 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-md transition-all group">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2">{r.name}</p>
                        {r.stars > 0 && <p className="text-sm font-bold text-amber-500 mb-2">⭐ {r.stars}</p>}
                        {r.language && <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: r.color }}>{r.language}</span>}
                        {r.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-2">{r.description}</p>}
                        <p className="text-xs text-gray-400 mt-2">{timeAgo(r.updatedAt)}</p>
                        <p className="text-xs text-blue-500 font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Analyse →</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {employeeId && <Link href={`/hr/employees/${employeeId}`} className="block text-center text-sm text-gray-500 hover:text-blue-600 py-2">← Back to employee profile</Link>}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!profile && !loading && !error && (
        <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <svg viewBox="0 0 24 24" className="w-14 h-14 mx-auto mb-4 fill-current text-gray-300 dark:text-gray-600"><path d={GH_PATH} /></svg>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-lg">Analyse a GitHub Profile</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Enter a username, paste a full profile URL like <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">github.com/aniketk9071</span>, or paste a repo URL like <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">github.com/user/repo</span> to get a resume-style analysis.
          </p>
        </div>
      )}
    </div>
  );
}

export default function GitHubPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500 p-8">Loading…</div>}>
      <GitHubPageInner />
    </Suspense>
  );
}
