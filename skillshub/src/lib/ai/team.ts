import { Ollama } from "ollama";

const ollama = new Ollama({ host: process.env.OLLAMA_HOST ?? "http://localhost:11434" });
const MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

export interface TeamMember {
  employeeId: string;
  name: string;
  role: string;       // e.g. "Tech Lead", "Backend Engineer"
  reasoning: string;  // why this person was chosen
  skills: { name: string; proficiency: string; yearsExp: number | null; category: string }[];
}

export interface TeamResult {
  members: TeamMember[];
  teamSummary: string;         // 2-3 sentence overall assessment
  skillsCovered: string[];     // unique skills the team collectively has
}

export interface ProfileForTeam {
  id: string;
  name: string;
  department: string | null;
  yearsTotal: number | null;
  bio: string | null;
  skills: { name: string; proficiency: string; yearsExp: number | null; category: string }[];
  projects: { name: string; techStack: string[] }[];
}

type RawSelected = { idx: number; role: string; reason: string };

function extractByRegex(text: string): RawSelected[] {
  const results: RawSelected[] = [];
  const re = /"idx"\s*:\s*(\d+)[^}]*?"role"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"reason"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m = re.exec(text);
  while (m !== null) {
    results.push({ idx: parseInt(m[1]), role: m[2], reason: m[3] });
    m = re.exec(text);
  }
  // Also try role then reason in reverse field order
  if (results.length === 0) {
    const re2 = /"idx"\s*:\s*(\d+)[^}]*?"reason"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"role"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let m2 = re2.exec(text);
    while (m2 !== null) {
      results.push({ idx: parseInt(m2[1]), role: m2[3], reason: m2[2] });
      m2 = re2.exec(text);
    }
  }
  return results;
}

function parseJsonArray(raw: string): unknown[] {
  const cleaned = raw.trim()
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  const idxCount = (cleaned.match(/"idx"\s*:/g) ?? []).length;
  if (idxCount > 1) {
    const regexResults = extractByRegex(cleaned);
    if (regexResults.length > 0) return regexResults;
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "object" && parsed !== null) {
      for (const key of ["members", "team", "results", "candidates", "selected"]) {
        if (Array.isArray((parsed as Record<string, unknown>)[key])) {
          return (parsed as Record<string, unknown>)[key] as unknown[];
        }
      }
      if ("idx" in parsed || "role" in parsed) return [parsed];
    }
  } catch { /* continue */ }

  const arrayMatch = cleaned.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* continue */ }
  }

  const regexResults = extractByRegex(cleaned);
  if (regexResults.length > 0) return regexResults;

  const objectMatches = Array.from(cleaned.matchAll(/\{[^{}]*\}/g));
  const items: unknown[] = [];
  for (const m of objectMatches) {
    try { items.push(JSON.parse(m[0])); } catch { /* skip */ }
  }
  return items;
}

export async function buildOptimalTeam(
  requirements: string,
  teamSize: number,
  profiles: ProfileForTeam[]
): Promise<TeamResult> {
  if (profiles.length === 0) {
    return { members: [], teamSummary: "No employee profiles available.", skillsCovered: [] };
  }

  const profilesText = profiles
    .map((p, i) => {
      const skillsText = p.skills
        .map((s) => (s.yearsExp != null ? `${s.name}(${s.yearsExp}yr)` : s.name))
        .join(", ");
      return (
        `${i}. ${p.name} | ${p.department ?? "N/A"} | ${p.yearsTotal ?? "?"}yr | Skills: ${skillsText}`
      );
    })
    .join("\n");

  const prompt = `You are a CTO building an optimal team for a project. Select exactly ${teamSize} DIFFERENT candidates from the list below who together best fulfil the requirements. Assign each a distinct role (e.g. "Tech Lead", "Backend Engineer", "Frontend Engineer", "DevOps Engineer", "Data Engineer", "QA Engineer", "Full-Stack Engineer").

Requirements: "${requirements}"

Employees:
${profilesText}

Rules:
- Select exactly ${teamSize} different employees (different idx values)
- Each member must have a unique role
- Choose people whose skills complement each other
- Respond with ONLY a JSON array, no extra text:
[{"idx":0,"role":"Tech Lead","reason":"brief explanation"},{"idx":1,"role":"Backend Engineer","reason":"brief explanation"}]`;

  let response;
  try {
    response = await ollama.chat({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      format: "json",
      options: { temperature: 0.2 },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed") || message.includes("connect")) {
      throw new Error(
        `Cannot connect to Ollama at ${process.env.OLLAMA_HOST ?? "http://localhost:11434"}. Make sure Ollama is running.`
      );
    }
    throw err;
  }

  const rawContent = response.message.content;
  console.log("[team-builder] raw model response:", rawContent.slice(0, 600));

  const rawItems = parseJsonArray(rawContent) as Array<{
    idx: unknown;
    role?: unknown;
    reason?: unknown;
    reasoning?: unknown;
  }>;

  console.log(`[team-builder] parsed ${rawItems.length} raw items from AI`);

  // Deduplicate by idx, preserving order
  const seenIdx = new Set<number>();
  const selected: RawSelected[] = [];

  for (const item of rawItems) {
    const idx = typeof item.idx === "number" ? item.idx : parseInt(String(item.idx ?? ""));
    if (isNaN(idx) || idx < 0 || idx >= profiles.length) continue;
    if (seenIdx.has(idx)) continue;
    seenIdx.add(idx);
    selected.push({
      idx,
      role: String(item.role ?? "Team Member"),
      reason: String(item.reason ?? item.reasoning ?? "Selected by AI"),
    });
    if (selected.length >= teamSize) break;
  }

  // Fill remaining slots if AI returned fewer than teamSize
  if (selected.length < teamSize) {
    const sortedByExp = [...profiles]
      .map((p, i) => ({ i, yearsTotal: p.yearsTotal ?? 0 }))
      .sort((a, b) => b.yearsTotal - a.yearsTotal);

    const fallbackRoles = ["Engineer", "Specialist", "Contributor", "Developer", "Analyst"];
    let fallbackRoleIdx = 0;

    for (const { i } of sortedByExp) {
      if (selected.length >= teamSize) break;
      if (seenIdx.has(i)) continue;
      seenIdx.add(i);
      selected.push({
        idx: i,
        role: fallbackRoles[fallbackRoleIdx++ % fallbackRoles.length],
        reason: "Added to meet team size requirement based on years of experience.",
      });
    }
  }

  // Build TeamMember list
  const members: TeamMember[] = selected.map(({ idx, role, reason }) => {
    const p = profiles[idx];
    return {
      employeeId: p.id,
      name: p.name,
      role,
      reasoning: reason,
      skills: p.skills,
    };
  });

  // Deduplicated skills covered by the full team
  const skillsCovered = Array.from(
    new Set(
      members.flatMap((m) =>
        m.skills
          .slice(0, 5)
          .map((s) => s.name)
      )
    )
  );

  // Build team summary from members
  const roleList = members.map((m) => `${m.name} (${m.role})`).join(", ");
  const teamSummary =
    `The selected team consists of ${members.length} members: ${roleList}. ` +
    `Together they cover ${skillsCovered.length} distinct skills relevant to the requirements. ` +
    `This combination provides a balanced mix of expertise to successfully deliver the project.`;

  return { members, teamSummary, skillsCovered };
}
