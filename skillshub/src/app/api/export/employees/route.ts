import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvEscape(val: string | null | undefined): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.employeeProfile.findMany({
    include: {
      user: { select: { name: true, email: true } },
      skills: { orderBy: [{ proficiency: "desc" }, { yearsExp: "desc" }] },
    },
    orderBy: { updatedAt: "desc" },
  });

  const headers = ["Name", "Email", "Department", "Location", "Years Experience", "Skill Count", "Top Skills", "Profile Updated"];
  const rows = profiles.map((p) => {
    const topSkills = p.skills.slice(0, 8).map((s) => s.name).join("; ");
    return [
      csvEscape(p.user.name),
      csvEscape(p.user.email),
      csvEscape(p.department),
      csvEscape(p.location),
      csvEscape(p.yearsTotal?.toString()),
      csvEscape(p.skills.length.toString()),
      csvEscape(topSkills),
      csvEscape(new Date(p.updatedAt).toLocaleDateString("en-US")),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="skillshub-employees-${date}.csv"`,
    },
  });
}
