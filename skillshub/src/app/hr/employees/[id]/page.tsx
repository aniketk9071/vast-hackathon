export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import SkillBadge from "@/components/SkillBadge";

const categoryOrder = ["LANGUAGE", "FRAMEWORK", "PLATFORM", "TOOL", "DOMAIN"];

export default async function EmployeeProfilePage({ params }: { params: { id: string } }) {
  const profile = await prisma.employeeProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true } },
      skills: { orderBy: [{ proficiency: "desc" }, { yearsExp: "desc" }] },
      projects: true,
    },
  });

  if (!profile) notFound();

  const skillsByCategory = categoryOrder.reduce(
    (acc, cat) => {
      const catSkills = profile.skills.filter((s) => s.category === cat);
      if (catSkills.length > 0) acc[cat] = catSkills;
      return acc;
    },
    {} as Record<string, typeof profile.skills>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/hr/employees" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1">
          ← Back to Directory
        </Link>
        <Link
          href={`/hr/employees/${profile.id}/edit`}
          className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
        >
          ✏️ Edit
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column — Profile */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            {/* GitHub links */}
            <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700 space-y-2">
              {(() => {
                const ghParams = new URLSearchParams({ employeeId: profile.id });
                if (profile.github) ghParams.set("username", profile.github);
                if (profile.githubRepo) ghParams.set("repo", profile.githubRepo);
                return (
                  <Link
                    href={`/hr/github?${ghParams}`}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span className="group-hover:underline">Analyse GitHub Skills</span>
                    <span className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors">→</span>
                  </Link>
                );
              })()}
              {profile.github && (
                <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <span>@{profile.github}</span>
                  {profile.githubRepo && <span className="text-gray-300 dark:text-gray-600">·</span>}
                  {profile.githubRepo && (
                    <a href={`https://github.com/${profile.githubRepo}`} target="_blank" rel="noopener noreferrer"
                      className="hover:underline">
                      {profile.githubRepo}
                    </a>
                  )}
                </a>
              )}
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                {profile.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{profile.user.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile.user.email}</p>
              </div>
            </div>

            {profile.bio && <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{profile.bio}</p>}

            <div className="space-y-2 text-sm">
              {profile.department && (
                <div className="flex gap-2">
                  <span className="text-gray-400 dark:text-gray-500 w-24 flex-shrink-0">Department</span>
                  <span className="text-gray-700 dark:text-gray-200 font-medium">{profile.department}</span>
                </div>
              )}
              {profile.location && (
                <div className="flex gap-2">
                  <span className="text-gray-400 dark:text-gray-500 w-24 flex-shrink-0">Location</span>
                  <span className="text-gray-700 dark:text-gray-200">{profile.location}</span>
                </div>
              )}
              {profile.yearsTotal && (
                <div className="flex gap-2">
                  <span className="text-gray-400 dark:text-gray-500 w-24 flex-shrink-0">Experience</span>
                  <span className="text-gray-700 dark:text-gray-200">{profile.yearsTotal} years</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-gray-400 dark:text-gray-500 w-24 flex-shrink-0">Skills</span>
                <span className="text-gray-700 dark:text-gray-200">{profile.skills.length} indexed</span>
              </div>
            </div>
          </div>

          {/* Proficiency Legend */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Proficiency Legend</p>
            <div className="space-y-1.5">
              {[["EXPERT", "bg-green-500", "3+ years"], ["INTERMEDIATE", "bg-blue-400", "1–3 years"], ["NOVICE", "bg-yellow-400", "0–1 year"]].map(([level, dot, range]) => (
                <div key={level} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  {level} — {range}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Skills & Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Skills by Category */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Skills</h2>
            <div className="space-y-4">
              {Object.entries(skillsByCategory).map(([cat, skills]) => (
                <div key={cat}>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <SkillBadge key={s.id} name={s.name} category={s.category} proficiency={s.proficiency} yearsExp={s.yearsExp} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          {profile.projects.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Projects</h2>
              <div className="space-y-4">
                {profile.projects.map((p) => (
                  <div key={p.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{p.name}</h3>
                        {p.role && <p className="text-sm text-blue-600 dark:text-blue-400">{p.role}</p>}
                      </div>
                      {p.duration && <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{p.duration}</span>}
                    </div>
                    {p.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{p.description}</p>}
                    {p.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {p.techStack.map((t) => (
                          <span key={t} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-2 py-0.5">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
