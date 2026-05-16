import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totalEmployees,
    totalPending,
    totalApproved,
    totalRejected,
    totalSkills,
    recentIngestions,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "EMPLOYEE" } }),
    prisma.profileIngestion.count({ where: { status: "PENDING" } }),
    prisma.profileIngestion.count({ where: { status: "APPROVED" } }),
    prisma.profileIngestion.count({ where: { status: "REJECTED" } }),
    prisma.skill.count(),
    prisma.profileIngestion.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const approvedToday = await prisma.profileIngestion.count({
    where: {
      status: "APPROVED",
      updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
  });

  const topSkills = await prisma.skill.groupBy({
    by: ["name"],
    _count: { name: true },
    orderBy: { _count: { name: "desc" } },
    take: 8,
  });

  return NextResponse.json({
    totalEmployees,
    totalPending,
    totalApproved,
    totalRejected,
    totalSkills,
    approvedToday,
    topSkills: topSkills.map((s) => ({ name: s.name, count: s._count.name })),
    recentActivity: recentIngestions,
  });
}
