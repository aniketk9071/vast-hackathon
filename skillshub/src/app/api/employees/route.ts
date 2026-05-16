import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.employeeProfile.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      skills: { select: { id: true } },
      resume: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const employees = profiles.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: p.user.name,
    email: p.user.email,
    department: p.department,
    location: p.location,
    yearsTotal: p.yearsTotal,
    skillCount: p.skills.length,
    hasResume: p.resume !== null,
    github: p.github ?? null,
  }));

  return NextResponse.json({ employees });
}
