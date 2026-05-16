import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/Navbar";

const hrLinks = [
  { href: "/hr", label: "Dashboard" },
  { href: "/hr/github", label: "GitHub" },
  { href: "/hr/search", label: "Search" },
  { href: "/hr/team-builder", label: "Team Builder" },
  { href: "/hr/employees", label: "Employees" },
  { href: "/hr/bulk-import", label: "Bulk Import" },
  { href: "/hr/analytics", label: "Analytics" },
  { href: "/hr/gaps", label: "Skill Gaps" },
  { href: "/hr/review", label: "Review Queue" },
];

export default async function HRLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar links={hrLinks} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
