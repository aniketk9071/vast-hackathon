import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/Navbar";

const employeeLinks = [
  { href: "/employee", label: "My Profile" },
  { href: "/employee/upload", label: "Upload Resume" },
  { href: "/employee/profile/edit", label: "Edit Profile" },
];

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "EMPLOYEE") redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar links={employeeLinks} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
