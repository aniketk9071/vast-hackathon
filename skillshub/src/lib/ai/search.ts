import { Ollama } from "ollama";

const ollama = new Ollama({ host: process.env.OLLAMA_HOST ?? "http://localhost:11434" });
const MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

export interface SearchCandidate {
  employeeId: string;
  name: string;
  matchScore: number;
  matchReason: string;
  strengths: string[];
  gaps: string[];
}

export interface ProfileForSearch {
  id: string;
  name: string;
  department: string | null;
  location: string | null;
  yearsTotal: number | null;
  bio: string | null;
  skills: { name: string; proficiency: string; yearsExp: number | null; category: string }[];
  projects: { name: string; description: string | null; techStack: string[]; role: string | null }[];
}

type RawExtracted = { idx: number; score: number; reason: string };

// Stop-words we ignore when building keyword filters
const STOP_WORDS = new Set([
  "and", "the", "with", "for", "who", "has", "have", "in", "at", "on", "a",
  "an", "is", "are", "of", "to", "from", "years", "year", "yrs", "yr",
  "experience", "exp", "expertise", "background", "knowledge", "skills",
  "skilled", "proficient", "senior", "junior", "mid", "plus", "minimum", "min",
]);

/**
 * Extract skill-like keywords from a free-text query.
 * Returns tokens that are likely technology / domain names.
 */
function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

/**
 * Parse a year requirement from the query, e.g. "2 years", "3+ years", "minimum 4 years".
 * Returns the number if found, else null.
 */
function parseRequiredYears(query: string): number | null {
  const m = query.match(/(\d+)\s*\+?\s*(?:years?|yrs?)/i);
  return m ? parseInt(m[1]) : null;
}

/**
 * Pre-filter profiles by keyword match so the AI only sees relevant candidates.
 * If no profiles match the keywords, fall back to the full list.
 */
function preFilter(profiles: ProfileForSearch[], keywords: string[]): ProfileForSearch[] {
  if (keywords.length === 0) return profiles;

  const matched = profiles.filter((p) => {
    const haystack = [
      ...p.skills.map((s) => s.name.toLowerCase()),
      ...p.projects.flatMap((pr) => pr.techStack.map((t) => t.toLowerCase())),
      (p.department ?? "").toLowerCase(),
      (p.bio ?? "").toLowerCase(),
    ].join(" ");

    return keywords.some((kw) => haystack.includes(kw));
  });

  return matched.length > 0 ? matched : profiles;
}

function extractByRegex(text: string): RawExtracted[] {
  const results: RawExtracted[] = [];
  const re = /"idx"\s*:\s*(\d+)[^}]*?"score"\s*:\s*(\d+)[^}]*?"reason"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m = re.exec(text);
  while (m !== null) {
    results.push({ idx: parseInt(m[1]), score: parseInt(m[2]), reason: m[3] });
    m = re.exec(text);
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
      for (const key of ["results", "matches", "candidates", "rankings"]) {
        if (Array.isArray((parsed as Record<string, unknown>)[key])) {
          return (parsed as Record<string, unknown>)[key] as unknown[];
        }
      }
      if ("idx" in parsed || "matchScore" in parsed) return [parsed];
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

export async function semanticSearchProfiles(
  query: string,
  profiles: ProfileForSearch[]
): Promise<SearchCandidate[]> {
  if (profiles.length === 0) return [];

  const keywords = extractKeywords(query);
  const requiredYears = parseRequiredYears(query);

  // Step 1: code-level pre-filter — only send relevant profiles to the AI
  const candidates = preFilter(profiles, keywords);

  console.log(
    `[search] query="${query}" keywords=[${keywords.join(",")}] requiredYears=${requiredYears} ` +
    `total_profiles=${profiles.length} pre_filtered=${candidates.length}`
  );

  // Step 2: build profile text — show skill name + yearsExp so AI can apply year filtering
  const profilesText = candidates
    .map((p, i) => {
      const skillsText = p.skills
        .map((s) => (s.yearsExp != null ? `${s.name}(${s.yearsExp}yr)` : s.name))
        .join(", ");
      const topProjects = p.projects.slice(0, 2).map((pr) => pr.name).join(", ");
      const bio = p.bio ? ` | Bio: ${p.bio.slice(0, 80)}` : "";
      return (
        `${i}. ${p.name} | ${p.department ?? "N/A"} | ${p.yearsTotal ?? "?"}yr total exp` +
        ` | Skills: ${skillsText}` +
        (topProjects ? ` | Projects: ${topProjects}` : "") +
        bio
      );
    })
    .join("\n");

  const yearInstruction = requiredYears
    ? `IMPORTANT: Only include employees who have at least ${requiredYears} years of experience with the relevant skill. Check the skill year values in parentheses.`
    : "";

  const prompt = `You are a strict technical recruiter. Find employees who genuinely match this requirement.

Requirement: "${query}"
${yearInstruction}

Employees:
${profilesText}

Rules:
- Only include employees who actually have the skills mentioned in the requirement
- Score 80-100: strong match (has the skill with required years)
- Score 50-79: partial match (has the skill but fewer years, or related skills)
- Score 0-49: weak/no match — DO NOT include these
- Minimum score to include: 40
- Sort by score descending
- Max ${Math.min(candidates.length, 10)} results

Respond with ONLY a JSON array:
[{"idx":0,"score":90,"reason":"brief explanation"},{"idx":1,"score":72,"reason":"brief explanation"}]`;

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    format: "json",
    options: { temperature: 0 },
  });

  const rawContent = response.message.content;
  console.log("[search] raw model response:", rawContent.slice(0, 600));

  const rawItems = parseJsonArray(rawContent) as Array<{
    idx: unknown;
    score?: unknown;
    matchScore?: unknown;
    reason?: unknown;
    matchReason?: unknown;
  }>;

  console.log(`[search] parsed ${rawItems.length} raw items from AI`);

  const scored = rawItems
    .map((item) => {
      const idx = typeof item.idx === "number" ? item.idx : parseInt(String(item.idx ?? ""));
      const score = Number(item.score ?? item.matchScore ?? 0);
      const reason = String(item.reason ?? item.matchReason ?? "");
      const profile = candidates[idx];

      if (!profile || isNaN(idx)) {
        const byName = candidates.find(
          (p) => p.name.toLowerCase().includes(String(item.idx ?? "").toLowerCase())
        );
        if (!byName) return null;
        return {
          employeeId: byName.id,
          name: byName.name,
          matchScore: score,
          matchReason: reason,
          strengths: byName.skills.filter((s) => s.proficiency === "EXPERT").slice(0, 3).map((s) => s.name),
          gaps: [] as string[],
        };
      }

      return {
        employeeId: profile.id,
        name: profile.name,
        matchScore: score,
        matchReason: reason,
        strengths: profile.skills.filter((s) => s.proficiency === "EXPERT").slice(0, 3).map((s) => s.name),
        gaps: [],
      };
    })
    .filter((r): r is SearchCandidate => r !== null && r.matchScore >= 40);

  // Step 3: post-filter by year requirement — drop anyone whose skill yearsExp is below threshold
  const finalResults = requiredYears
    ? scored.filter((r) => {
        const profile = candidates.find((p) => p.id === r.employeeId);
        if (!profile) return false;
        const relevantSkill = profile.skills.find((s) =>
          keywords.some((kw) => s.name.toLowerCase().includes(kw))
        );
        // If the skill exists with yearsExp data, enforce the threshold
        if (relevantSkill?.yearsExp != null) {
          const passes = relevantSkill.yearsExp >= requiredYears;
          console.log(
            `[search] year-filter ${r.name}: skill="${relevantSkill.name}" ` +
            `yearsExp=${relevantSkill.yearsExp} required=${requiredYears} → ${passes ? "PASS" : "DROP"}`
          );
          return passes;
        }
        return true;
      })
    : scored;

  console.log(
    `[search] final results: ${finalResults.length} — ` +
    finalResults.map((r) => `${r.name}(${r.matchScore})`).join(", ")
  );

  return finalResults;
}
