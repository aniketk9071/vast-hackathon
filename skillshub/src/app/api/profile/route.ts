import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.employeeProfile.findUnique({
    where: { userId: session.user.id },
    include: { skills: true, projects: true, resume: true },
  });

  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone, currentCompany, noticePeriod, location, department, education, linkedIn } = await req.json();

  if (name?.trim()) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
    });
  }

  const profile = await prisma.employeeProfile.upsert({
    where: { userId: session.user.id },
    update: {
      phone: phone ?? undefined,
      currentCompany: currentCompany ?? undefined,
      noticePeriod: noticePeriod ?? undefined,
      location: location ?? undefined,
      department: department ?? undefined,
      education: education ?? undefined,
      linkedIn: linkedIn ?? undefined,
    },
    create: {
      userId: session.user.id,
      phone,
      currentCompany,
      noticePeriod,
      location,
      department,
      education,
      linkedIn,
    },
  });

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "UPDATE_PROFILE", entity: "EmployeeProfile", entityId: profile.id },
  });

  return NextResponse.json({ success: true, profile });
}
