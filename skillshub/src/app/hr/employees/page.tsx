"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Profile {
  id: string;
  name: string;
  email: string;
  department: string | null;
  location: string | null;
  yearsTotal: number | null;
  skillCount: number;
  userId: string;
  hasResume: boolean;
}

export default function EmployeesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const PAGE_SIZE = 9;

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => { setProfiles(d.employees ?? []); setLoading(false); });
  }, []);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.department ?? "").toLowerCase().includes(q) || (p.location ?? "").toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function onSearch(v: string) { setSearch(v); setPage(1); }

  async function deleteEmployee(id: string, name: string) {
    if (!confirm(`Delete ${name}? This will permanently remove their account, profile, and all skills.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? "Delete failed"); return; }
      setProfiles((prev: Profile[]) => prev.filter((p: Profile) => p.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Directory</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{filtered.length} profiles found</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text" value={search} onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name, department, location..."
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />
          <a href="/api/export/employees"
            className="flex-shrink-0 px-4 py-2.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap">
            ⬇ Export CSV
          </a>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500 dark:text-gray-400">{search ? "No employees match your search." : "No employee profiles yet."}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((p) => (
              <Link key={p.id} href={`/hr/employees/${p.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all block">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-400 truncate">{p.email}</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  {p.department && <p>🏢 {p.department}</p>}
                  {p.location && <p>📍 {p.location}</p>}
                  {p.yearsTotal && <p>⏱ {p.yearsTotal} years experience</p>}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {p.skillCount} skills
                  </span>
                  <div className="flex items-center gap-3">
                    {p.hasResume && (
                      <a href={`/api/resumes/${p.userId}/download`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        ⬇ Resume
                      </a>
                    )}
                    <button
                      onClick={(e: React.MouseEvent) => { e.preventDefault(); deleteEmployee(p.id, p.name); }}
                      disabled={deleting === p.id}
                      className="text-xs text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Delete employee"
                    >
                      {deleting === p.id ? "…" : "🗑"}
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${n === page ? "bg-blue-600 text-white" : "border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
