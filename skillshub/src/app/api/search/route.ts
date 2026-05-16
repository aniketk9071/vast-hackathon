import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { semanticSearchProfiles } from "@/lib/ai/search";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query } = await req.json();
  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const profiles = await prisma.employeeProfile.findMany({
    include: {
      user: { select: { name: true } },
      skills: true,
      projects: true,
    },
  });

  console.log(`[search] query="${query}" profiles_in_db=${profiles.length}`);

  if (profiles.length === 0) {
    return NextResponse.json({
      results: [],
      debug: "No employee profiles found in database. Run db:seed to add demo data.",
    });
  }

  const profilesForSearch = profiles.map((p) => ({
    id: p.id,
    name: p.user.name,
    department: p.department,
    location: p.location,
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
      description: pr.description,
      techStack: pr.techStack,
      role: pr.role,
    })),
  }));

  try {
    const ranked = await semanticSearchProfiles(query, profilesForSearch);
    console.log(`[search] model returned ${ranked.length} results`);

    const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
    const results = ranked.map((r) => {
      const p = profileMap[r.employeeId];
      return {
        ...r,
        profile: p
          ? { department: p.department, location: p.location, yearsTotal: p.yearsTotal, bio: p.bio, skills: p.skills }
          : null,
      };
    });

    const debug = {
      totalProfiles: profiles.length,
      resultsReturned: results.length,
      scores: results.map((r) => ({ name: r.name, score: r.matchScore })),
    };
    console.log("[search] debug:", JSON.stringify(debug));
    return NextResponse.json({ results, debug });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[search] error:", message);

    if (message.includes("ECONNREFUSED") || message.includes("fetch failed") || message.includes("connect")) {
      return NextResponse.json(
        { error: `Cannot connect to Ollama at ${process.env.OLLAMA_HOST ?? "http://localhost:11434"}. Make sure Ollama is running.` },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: `AI search failed: ${message}` }, { status: 500 });
  }
}
