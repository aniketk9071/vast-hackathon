export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SkillBadge from "@/components/SkillBadge";
import Link from "next/link";

const statusConfig: Record<string, { label: string; color: string; desc: string }> = {
  PENDING: { label: "Pending Review", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", desc: "Your profile is awaiting HR approval." },
  APPROVED: { label: "Approved", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800", desc: "Your profile is live in the employee directory." },
  REJECTED: { label: "Rejected", color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800", desc: "Your submission was rejected. You can upload a new resume." },
};

export default async function EmployeeProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [profile, latestIngestion, user] = await Promise.all([
    prisma.employeeProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        skills: { orderBy: [{ proficiency: "desc" }, { yearsExp: "desc" }] },
        projects: true,
        resume: true,
      },
    }),
    prisma.profileIngestion.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
  ]);

  const ingestionStatus = latestIngestion?.status;
  const initials = (user?.name ?? "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Your skills and experience visible to HR</p>
        </div>
        <Link href="/employee/profile/edit"
          className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Edit Profile
        </Link>
      </div>

      {ingestionStatus && (
        <div className={`rounded-xl border px-5 py-4 mb-6 ${statusConfig[ingestionStatus].color}`}>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{statusConfig[ingestionStatus].label}</span>
            <span className="text-sm">{statusConfig[ingestionStatus].desc}</span>
          </div>
          {latestIngestion?.reviewNotes && (
            <p className="text-sm mt-1 opacity-80">HR Notes: {latestIngestion.reviewNotes}</p>
          )}
        </div>
      )}

      {!profile ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No profile yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Upload your resume to create your skills profile</p>
          <Link href="/employee/upload" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Upload Resume
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email}</p>
              </div>
            </div>

            {profile.bio && <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">{profile.bio}</p>}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {[
                { label: "Department", value: profile.department },
                { label: "Location", value: profile.location },
                { label: "Experience", value: profile.yearsTotal ? `${profile.yearsTotal} years` : null },
                { label: "Current Company", value: profile.currentCompany },
                { label: "Notice Period", value: profile.noticePeriod },
                { label: "Phone", value: profile.phone },
              ].filter((f) => f.value).map((f) => (
                <div key={f.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                  <span className="text-gray-400 dark:text-gray-500 text-xs block">{f.label}</span>
                  <p className="font-medium text-gray-900 dark:text-white">{f.value}</p>
                </div>
              ))}
            </div>

            {profile.education && (
              <div className="mt-4">
                <span className="text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wide">Education</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{profile.education}</p>
              </div>
            )}
          </div>

          {/* Resume Download */}
          {profile.resume && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Uploaded Resume</h3>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{profile.resume.originalName}</p>
                    <p className="text-xs text-gray-400">
                      {(profile.resume.fileSize / 1024).toFixed(1)} KB · Uploaded {new Date(profile.resume.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <a href={`/api/resumes/${session.user.id}/download`}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Download
                </a>
              </div>
            </div>
          )}

          {/* Skills */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Skills ({profile.skills.length})</h3>
              <Link href="/employee/upload" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Update resume →</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <SkillBadge key={s.id} name={s.name} category={s.category} proficiency={s.proficiency} yearsExp={s.yearsExp} />
              ))}
            </div>
          </div>

          {/* Projects */}
          {profile.projects.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Projects ({profile.projects.length})</h3>
              <div className="space-y-4">
                {profile.projects.map((p) => (
                  <div key={p.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{p.name}</h4>
                        {p.role && <p className="text-sm text-blue-600 dark:text-blue-400">{p.role}</p>}
                      </div>
                      {p.duration && <span className="text-xs text-gray-400">{p.duration}</span>}
                    </div>
                    {p.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{p.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.techStack.map((t) => (
                        <span key={t} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
