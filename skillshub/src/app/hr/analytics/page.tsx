export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

const CATEGORY_COLORS: Record<string, string> = {
  LANGUAGE: "bg-purple-500",
  FRAMEWORK: "bg-blue-500",
  PLATFORM: "bg-green-500",
  TOOL: "bg-orange-500",
  DOMAIN: "bg-pink-500",
};

const CATEGORY_LIGHT: Record<string, string> = {
  LANGUAGE: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  FRAMEWORK: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  PLATFORM: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  TOOL: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  DOMAIN: "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
};

const PROFICIENCY_CONFIG: Record<string, { bar: string; badge: string; label: string }> = {
  EXPERT:       { bar: "bg-green-500",  badge: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",  label: "Expert" },
  INTERMEDIATE: { bar: "bg-blue-500",   badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",      label: "Intermediate" },
  NOVICE:       { bar: "bg-amber-400",  badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",  label: "Novice" },
};

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
    </div>
  );
}

export default async function AnalyticsPage() {
  const [
    totalProfiles,
    skillsByCategory,
    skillsByProficiency,
    topSkills,
    deptGroups,
    experienceGroups,
  ] = await Promise.all([
    prisma.employeeProfile.count(),
    prisma.skill.groupBy({ by: ["category"], _count: { name: true }, orderBy: { _count: { name: "desc" } } }),
    prisma.skill.groupBy({ by: ["proficiency"], _count: { name: true } }),
    prisma.skill.groupBy({ by: ["name"], _count: { name: true }, orderBy: { _count: { name: "desc" } }, take: 20 }),
    prisma.employeeProfile.groupBy({ by: ["department"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 8 }),
    prisma.employeeProfile.groupBy({ by: ["yearsTotal"], _count: { id: true } }),
  ]);

  const totalSkills = skillsByCategory.reduce((s, c) => s + c._count.name, 0);
  const totalDepts = deptGroups.filter((d) => d.department).length;

  const expBuckets = [
    { label: "0–2 yrs",  count: 0 },
    { label: "3–5 yrs",  count: 0 },
    { label: "6–9 yrs",  count: 0 },
    { label: "10+ yrs",  count: 0 },
  ];
  let totalYears = 0, profilesWithYears = 0;
  for (const g of experienceGroups) {
    const y = g.yearsTotal ?? 0;
    totalYears += y * g._count.id;
    profilesWithYears += g._count.id;
    if (y <= 2) expBuckets[0].count += g._count.id;
    else if (y <= 5) expBuckets[1].count += g._count.id;
    else if (y <= 9) expBuckets[2].count += g._count.id;
    else expBuckets[3].count += g._count.id;
  }
  const avgExp = profilesWithYears > 0 ? Math.round(totalYears / profilesWithYears) : 0;

  const maxCatCount = Math.max(...skillsByCategory.map((c) => c._count.name), 1);
  const maxSkillCount = Math.max(...topSkills.map((s) => s._count.name), 1);
  const maxDeptCount = Math.max(...deptGroups.map((d) => d._count.id), 1);
  const maxExpCount = Math.max(...expBuckets.map((b) => b.count), 1);
  const totalProficiency = skillsByProficiency.reduce((s, p) => s + p._count.name, 0) || 1;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Skills Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Organisation-wide talent intelligence</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Profiles",   value: totalProfiles, sub: "employee profiles", color: "blue" },
          { label: "Skills Indexed",   value: totalSkills,   sub: "across all profiles", color: "purple" },
          { label: "Departments",      value: totalDepts,    sub: "active departments", color: "green" },
          { label: "Avg Experience",   value: `${avgExp} yr`, sub: "median years exp", color: "amber" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${
            s.color === "blue"   ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300" :
            s.color === "purple" ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300" :
            s.color === "green"  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300" :
                                   "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
          }`}>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm font-semibold mt-0.5">{s.label}</div>
            <div className="text-xs opacity-70 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Skills by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Skills by Category</h2>
          <div className="space-y-3">
            {skillsByCategory.map((c) => (
              <div key={c.category} className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded w-24 text-center flex-shrink-0 ${CATEGORY_LIGHT[c.category] ?? "bg-gray-100 text-gray-700"}`}>
                  {c.category}
                </span>
                <Bar pct={(c._count.name / maxCatCount) * 100} color={CATEGORY_COLORS[c.category] ?? "bg-gray-400"} />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-8 text-right">{c._count.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Proficiency Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Proficiency Breakdown</h2>
          <div className="space-y-4">
            {(["EXPERT", "INTERMEDIATE", "NOVICE"] as const).map((level) => {
              const found = skillsByProficiency.find((p) => p.proficiency === level);
              const count = found?._count.name ?? 0;
              const pct = Math.round((count / totalProficiency) * 100);
              const cfg = PROFICIENCY_CONFIG[level];
              return (
                <div key={level}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{count} skills <span className="text-gray-400">({pct}%)</span></span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Experience distribution */}
          <h2 className="font-semibold text-gray-900 dark:text-white mt-6 mb-5">Experience Distribution</h2>
          <div className="space-y-3">
            {expBuckets.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">{b.label}</span>
                <Bar pct={(b.count / maxExpCount) * 100} color="bg-indigo-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-6 text-right">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top 20 Skills */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Top 20 Skills</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {topSkills.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 dark:text-gray-300 w-20 truncate flex-shrink-0">{s.name}</span>
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(s._count.name / maxSkillCount) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-4 text-right">{s._count.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employees by Department */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Headcount by Department</h2>
          <div className="space-y-3">
            {deptGroups.filter((d) => d.department).map((d) => (
              <div key={d.department} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 dark:text-gray-400 w-36 truncate flex-shrink-0">{d.department}</span>
                <Bar pct={(d._count.id / maxDeptCount) * 100} color="bg-indigo-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-4 text-right">{d._count.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
