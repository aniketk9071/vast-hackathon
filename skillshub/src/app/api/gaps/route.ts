import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Ollama } from "ollama";

const ollama = new Ollama({ host: process.env.OLLAMA_HOST ?? "http://localhost:11434" });
const MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

// High-demand skills in the current tech market used for gap analysis
const MARKET_DEMAND: Record<string, { demand: "HIGH" | "MEDIUM" | "LOW"; category: string }> = {
  "TypeScript":          { demand: "HIGH",   category: "LANGUAGE" },
  "Python":              { demand: "HIGH",   category: "LANGUAGE" },
  "Go":                  { demand: "HIGH",   category: "LANGUAGE" },
  "Rust":                { demand: "MEDIUM", category: "LANGUAGE" },
  "React":               { demand: "HIGH",   category: "FRAMEWORK" },
  "Next.js":             { demand: "HIGH",   category: "FRAMEWORK" },
  "Vue.js":              { demand: "MEDIUM", category: "FRAMEWORK" },
  "FastAPI":             { demand: "HIGH",   category: "FRAMEWORK" },
  "NestJS":              { demand: "MEDIUM", category: "FRAMEWORK" },
  "Kubernetes":          { demand: "HIGH",   category: "PLATFORM" },
  "Docker":              { demand: "HIGH",   category: "PLATFORM" },
  "AWS":                 { demand: "HIGH",   category: "PLATFORM" },
  "Terraform":           { demand: "HIGH",   category: "PLATFORM" },
  "Machine Learning":    { demand: "HIGH",   category: "DOMAIN" },
  "LLM Integration":     { demand: "HIGH",   category: "DOMAIN" },
  "Data Engineering":    { demand: "HIGH",   category: "DOMAIN" },
  "Microservices":       { demand: "HIGH",   category: "DOMAIN" },
  "GraphQL":             { demand: "MEDIUM", category: "TOOL" },
  "Redis":               { demand: "MEDIUM", category: "TOOL" },
  "PostgreSQL":          { demand: "HIGH",   category: "TOOL" },
  "CI/CD":               { demand: "HIGH",   category: "DOMAIN" },
  "System Design":       { demand: "HIGH",   category: "DOMAIN" },
  "Security":            { demand: "HIGH",   category: "DOMAIN" },
};

function parseJsonSafe(raw: string): unknown {
  try { return JSON.parse(raw.trim()); } catch { /* continue */ }
  const stripped = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(stripped); } catch { /* continue */ }
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { /* continue */ } }
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all skill counts across approved profiles
  const skillCounts = await prisma.skill.groupBy({
    by: ["name", "category"],
    _count: { name: true },
    orderBy: { _count: { name: "desc" } },
  });

  const totalProfiles = await prisma.employeeProfile.count();

  // Build skill coverage map
  const coverageMap: Record<string, { count: number; category: string; pct: number }> = {};
  for (const row of skillCounts) {
    coverageMap[row.name] = {
      count: row._count.name,
      category: row.category,
      pct: totalProfiles > 0 ? Math.round((row._count.name / totalProfiles) * 100) : 0,
    };
  }

  // Compute gaps: market demand skills with low coverage
  const gaps: {
    skill: string;
    category: string;
    demand: "HIGH" | "MEDIUM" | "LOW";
    currentCount: number;
    currentPct: number;
    gapSeverity: "CRITICAL" | "MODERATE" | "MINOR";
  }[] = [];

  for (const [skill, meta] of Object.entries(MARKET_DEMAND)) {
    const coverage = coverageMap[skill];
    const count = coverage?.count ?? 0;
    const pct = coverage?.pct ?? 0;

    let gapSeverity: "CRITICAL" | "MODERATE" | "MINOR" = "MINOR";
    if (meta.demand === "HIGH" && pct < 20) gapSeverity = "CRITICAL";
    else if (meta.demand === "HIGH" && pct < 40) gapSeverity = "MODERATE";
    else if (meta.demand === "MEDIUM" && pct < 15) gapSeverity = "MODERATE";
    else gapSeverity = "MINOR";

    if (gapSeverity !== "MINOR") {
      gaps.push({ skill, category: meta.category, demand: meta.demand, currentCount: count, currentPct: pct, gapSeverity });
    }
  }

  gaps.sort((a, b) => {
    const sev = { CRITICAL: 0, MODERATE: 1, MINOR: 2 };
    return sev[a.gapSeverity] - sev[b.gapSeverity] || b.demand.localeCompare(a.demand);
  });

  // Top skills the company IS strong in (top 10 by coverage %)
  const strengths = skillCounts
    .slice(0, 10)
    .map((s) => ({ skill: s.name, category: s.category, count: s._count.name, pct: coverageMap[s.name]?.pct ?? 0 }));

  // Ask Ollama to provide strategic recommendations
  let aiRecommendations: string[] = [];
  try {
    const gapSummary = gaps.slice(0, 8).map((g) => `${g.skill} (${g.gapSeverity}, ${g.currentCount}/${totalProfiles} employees)`).join(", ");
    const strengthSummary = strengths.slice(0, 6).map((s) => `${s.skill} (${s.count} people)`).join(", ");

    const prompt = `You are a talent strategy advisor. Analyze this company's skill gaps and provide actionable hiring/training recommendations.

Company has ${totalProfiles} employees.
SKILL GAPS (skills in high market demand but low internal coverage): ${gapSummary}
CURRENT STRENGTHS: ${strengthSummary}

Return a JSON object with this exact structure:
{
  "recommendations": [
    "Recommendation 1 (specific and actionable)",
    "Recommendation 2",
    "Recommendation 3",
    "Recommendation 4"
  ],
  "strategicInsight": "One paragraph strategic insight about the company's talent positioning"
}

Return ONLY the JSON object, no other text.`;

    const response = await ollama.chat({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      options: { temperature: 0.3 },
    });

    const parsed = parseJsonSafe(response.message.content) as {
      recommendations?: string[];
      strategicInsight?: string;
    } | null;

    if (parsed?.recommendations && Array.isArray(parsed.recommendations)) {
      aiRecommendations = parsed.recommendations.slice(0, 5).filter((r) => typeof r === "string");
    }
    if (parsed?.strategicInsight) {
      aiRecommendations.unshift(`💡 ${parsed.strategicInsight}`);
    }
  } catch (err) {
    console.error("[gaps] AI recommendation failed:", err);
  }

  return NextResponse.json({
    totalProfiles,
    gaps: gaps.slice(0, 15),
    strengths,
    aiRecommendations,
    skillCoverage: coverageMap,
  });
}
