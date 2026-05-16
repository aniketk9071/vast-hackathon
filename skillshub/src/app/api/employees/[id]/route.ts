import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employee = await prisma.employeeProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true } },
      skills: true,
      projects: true,
    },
  });

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ employee });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.employeeProfile.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const {
    name, email, bio, department, location, yearsTotal,
    linkedIn, phone, currentCompany, noticePeriod, education,
    github, githubRepo, skills,
  } = body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(async (tx: any) => {
    if (name || email) {
      await tx.user.update({
        where: { id: profile.userId },
        data: {
          ...(name  ? { name:  String(name).trim()  } : {}),
          ...(email ? { email: String(email).trim().toLowerCase() } : {}),
        },
      });
    }

    await tx.employeeProfile.update({
      where: { id: params.id },
      data: {
        bio:            bio            != null ? String(bio).trim()            || null : undefined,
        department:     department     != null ? String(department).trim()     || null : undefined,
        location:       location       != null ? String(location).trim()       || null : undefined,
        yearsTotal:     yearsTotal     != null ? (parseInt(yearsTotal) || null) : undefined,
        linkedIn:       linkedIn       != null ? String(linkedIn).trim()       || null : undefined,
        phone:          phone          != null ? String(phone).trim()          || null : undefined,
        currentCompany: currentCompany != null ? String(currentCompany).trim() || null : undefined,
        noticePeriod:   noticePeriod   != null ? String(noticePeriod).trim()   || null : undefined,
        education:      education      != null ? String(education).trim()      || null : undefined,
        github:         github         != null ? String(github).trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "") || null : undefined,
        githubRepo:     githubRepo     != null ? String(githubRepo).trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "") || null : undefined,
      },
    });

    if (Array.isArray(skills)) {
      await tx.skill.deleteMany({ where: { profileId: params.id } });
      if (skills.length > 0) {
        await tx.skill.createMany({
          data: skills.map((s: { name: string; category: string; proficiency: string; yearsExp?: number | null }) => ({
            profileId: params.id,
            name: String(s.name).trim(),
            category: s.category,
            proficiency: s.proficiency,
            yearsExp: s.yearsExp != null ? Number(s.yearsExp) : null,
          })),
        });
      }
    }
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.employeeProfile.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // AuditLog has no onDelete cascade, remove it first then delete the user
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { userId: profile.userId } }),
    prisma.user.delete({ where: { id: profile.userId } }),
  ]);

  return NextResponse.json({ success: true });
}
