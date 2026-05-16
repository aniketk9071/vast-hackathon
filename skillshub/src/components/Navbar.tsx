"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";

interface NavLink { href: string; label: string }
interface Props { links: NavLink[] }

export default function Navbar({ links }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-lg">SkillsHub</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link key={link.href} href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                             : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
            <div className="text-right hidden sm:block ml-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{session?.user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.role}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
              {session?.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
