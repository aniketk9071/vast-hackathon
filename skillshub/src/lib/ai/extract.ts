import { Ollama } from "ollama";

const ollama = new Ollama({ host: process.env.OLLAMA_HOST ?? "http://localhost:11434" });
const MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

export interface ExtractedSkill {
  name: string;
  category: "LANGUAGE" | "FRAMEWORK" | "PLATFORM" | "TOOL" | "DOMAIN";
  proficiency: "NOVICE" | "INTERMEDIATE" | "EXPERT";
  yearsExp: number;
}

export interface ExtractedProject {
  name: string;
  description: string;
  techStack: string[];
  role: string;
  duration: string;
}

export interface ExtractedProfile {
  bio: string;
  department: string;
  location: string;
  yearsTotal: number;
  skills: ExtractedSkill[];
  projects: ExtractedProject[];
}

function parseJsonResponse(raw: string): unknown {
  const cleaned = raw.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const stripped = cleaned
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      const objectMatch = stripped.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try { return JSON.parse(objectMatch[0]); } catch { /* continue */ }
      }
      return null;
    }
  }
}

export async function extractProfileFromResume(resumeText: string): Promise<ExtractedProfile> {
  const prompt = `You are a resume parser. Extract structured data from this resume.

Respond with a JSON object only. No explanation. No markdown. Start with { and end with }.

Format:
{"bio":"<summary>","department":"<dept>","location":"<city, country>","yearsTotal":<number>,"skills":[{"name":"<skill>","category":"<LANGUAGE|FRAMEWORK|PLATFORM|TOOL|DOMAIN>","proficiency":"<NOVICE|INTERMEDIATE|EXPERT>","yearsExp":<number>}],"projects":[{"name":"<name>","description":"<desc>","techStack":["<tech>"],"role":"<role>","duration":"<duration>"}]}

Rules:
- category must be one of: LANGUAGE, FRAMEWORK, PLATFORM, TOOL, DOMAIN
- proficiency: NOVICE=0-1yr, INTERMEDIATE=1-3yr, EXPERT=3+yr
- Infer related skills: Next.js -> add React; React -> add JavaScript; Kubernetes -> add Docker
- Extract ALL skills mentioned

Resume:
${resumeText.slice(0, 6000)}`;

  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    format: "json",
    options: { temperature: 0.1 },
  });

  const parsed = parseJsonResponse(response.message.content);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Model returned invalid profile structure");
  }

  return parsed as ExtractedProfile;
}
