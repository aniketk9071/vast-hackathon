export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HRDashboard() {
  const [totalEmployees, totalPending, totalApproved, totalRejected, totalSkills, recentIngestions] = await Promise.all([
    prisma.user.count({ where: { role: "EMPLOYEE" } }),
    prisma.profileIngestion.count({ where: { status: "PENDING" } }),
    prisma.profileIngestion.count({ where: { status: "APPROVED" } }),
    prisma.profileIngestion.count({ where: { status: "REJECTED" } }),
    prisma.skill.count(),
    prisma.profileIngestion.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const approvedToday = await prisma.profileIngestion.count({
    where: { status: "APPROVED", updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  });

  const topSkills = await prisma.skill.groupBy({
    by: ["name"],
    _count: { name: true },
    orderBy: { _count: { name: "desc" } },
    take: 8,
  });

  const stats = [
    { label: "Total Employees", value: totalEmployees, sub: "registered accounts", href: "/hr/employees", color: "blue" },
    { label: "Pending Reviews", value: totalPending, sub: "awaiting action", href: "/hr/review", color: "amber" },
    { label: "Approved Profiles", value: totalApproved, sub: `${approvedToday} approved today`, href: "/hr/employees", color: "green" },
    { label: "Rejected", value: totalRejected, sub: "total rejected", href: "/hr/review", color: "red" },
    { label: "Skills Indexed", value: totalSkills, sub: "across all profiles", href: "/hr/employees", color: "purple" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    green: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  };

  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    APPROVED: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
    REJECTED: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HR Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Resume Management Portal — Skills Intelligence Platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}
            className={`rounded-xl border p-4 flex flex-col gap-1 hover:shadow-sm transition-shadow ${colorMap[s.color]}`}>
            <span className="text-3xl font-bold">{s.value}</span>
            <span className="text-sm font-semibold">{s.label}</span>
            <span className="text-xs opacity-70">{s.sub}</span>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          {recentIngestions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {recentIngestions.map((i) => (
                <div key={i.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{i.user.name}</p>
                    <p className="text-xs text-gray-400">{i.user.email} · {new Date(i.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[i.status]}`}>{i.status}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/hr/review" className="mt-4 block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View all submissions →
          </Link>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Top Skills */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Top Skills</h2>
            <div className="space-y-2">
              {topSkills.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
                      <span className="text-gray-400">{s._count.name}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.round((s._count.name / (topSkills[0]?._count.name ?? 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: "/hr/search", label: "Semantic Search", desc: "NL query over all profiles", icon: "🔍" },
                { href: "/hr/review", label: `Review Queue (${totalPending})`, desc: "Approve or reject submissions", icon: "📋" },
                { href: "/hr/employees", label: "Employee Directory", desc: `${totalApproved} approved profiles`, icon: "👥" },
              ].map((a) => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-600 transition-colors">
                  <span className="text-xl">{a.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{a.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{a.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
