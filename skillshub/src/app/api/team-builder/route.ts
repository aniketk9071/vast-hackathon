import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildOptimalTeam, ProfileForTeam } from "@/lib/ai/team";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const requirements: string = body.requirements ?? "";
  if (!requirements.trim()) {
    return NextResponse.json({ error: "requirements must be a non-empty string" }, { status: 400 });
  }

  const rawTeamSize = body.teamSize;
  let teamSize: number;
  if (rawTeamSize === undefined || rawTeamSize === null) {
    teamSize = 3;
  } else {
    teamSize = Number(rawTeamSize);
    if (!Number.isInteger(teamSize) || teamSize < 2 || teamSize > 6) {
      return NextResponse.json({ error: "teamSize must be an integer between 2 and 6" }, { status: 400 });
    }
  }

  const profiles = await prisma.employeeProfile.findMany({
    include: {
      user: { select: { name: true } },
      skills: true,
      projects: true,
    },
  });

  console.log(
    `[team-builder] requirements="${requirements}" teamSize=${teamSize} profiles=${profiles.length}`
  );

  if (profiles.length === 0) {
    return NextResponse.json({
      team: { members: [], teamSummary: "No employee profiles found in database.", skillsCovered: [] },
      debug: "No employee profiles found in database. Run db:seed to add demo data.",
    });
  }

  const profilesForTeam: ProfileForTeam[] = profiles.map((p) => ({
    id: p.id,
    name: p.user.name,
    department: p.department,
    yearsTotal: p.yearsTotal,
    bio: p.bio,
    skills: p.skills.map((s) => ({
      name: s.name,
      proficiency: s.proficiency,
      yearsExp: s.yearsExp,
      category: s.category,
    })),
    projects: p.projects.map((pr) => ({
      name: pr.name,
      techStack: pr.techStack,
    })),
  }));

  try {
    const team = await buildOptimalTeam(requirements, teamSize, profilesForTeam);
    return NextResponse.json({ team });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[team-builder] error:", message);

    if (message.includes("ECONNREFUSED") || message.includes("fetch failed") || message.includes("connect")) {
      return NextResponse.json(
        {
          error: `Cannot connect to Ollama at ${process.env.OLLAMA_HOST ?? "http://localhost:11434"}. Make sure Ollama is running.`,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: `Team builder failed: ${message}` }, { status: 500 });
  }
}
