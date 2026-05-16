// Skill inference: given explicit skills, infer implied skills with confidence scores

export interface InferredSkill {
  name: string;
  category: "LANGUAGE" | "FRAMEWORK" | "PLATFORM" | "TOOL" | "DOMAIN";
  proficiency: "NOVICE" | "INTERMEDIATE" | "EXPERT";
  confidence: number; // 0-100
  inferredFrom: string;
}

type Category = "LANGUAGE" | "FRAMEWORK" | "PLATFORM" | "TOOL" | "DOMAIN";
type Proficiency = "NOVICE" | "INTERMEDIATE" | "EXPERT";

interface InferenceRule {
  implies: string;
  category: Category;
  confidence: number;
  proficiencyMap?: Record<Proficiency, Proficiency>;
}

// If you know skill X, you likely also know these skills
const INFERENCE_RULES: Record<string, InferenceRule[]> = {
  "Next.js": [
    { implies: "React", category: "FRAMEWORK", confidence: 95 },
    { implies: "TypeScript", category: "LANGUAGE", confidence: 75 },
    { implies: "JavaScript", category: "LANGUAGE", confidence: 90 },
    { implies: "Node.js", category: "PLATFORM", confidence: 70 },
  ],
  "Nuxt.js": [
    { implies: "Vue.js", category: "FRAMEWORK", confidence: 95 },
    { implies: "JavaScript", category: "LANGUAGE", confidence: 90 },
  ],
  "Gatsby": [
    { implies: "React", category: "FRAMEWORK", confidence: 95 },
    { implies: "GraphQL", category: "TOOL", confidence: 70 },
    { implies: "JavaScript", category: "LANGUAGE", confidence: 90 },
  ],
  "React": [
    { implies: "JavaScript", category: "LANGUAGE", confidence: 95 },
    { implies: "HTML", category: "LANGUAGE", confidence: 85 },
    { implies: "CSS", category: "LANGUAGE", confidence: 80 },
  ],
  "Vue.js": [
    { implies: "JavaScript", category: "LANGUAGE", confidence: 95 },
    { implies: "HTML", category: "LANGUAGE", confidence: 85 },
    { implies: "CSS", category: "LANGUAGE", confidence: 80 },
  ],
  "Angular": [
    { implies: "TypeScript", category: "LANGUAGE", confidence: 95 },
    { implies: "JavaScript", category: "LANGUAGE", confidence: 85 },
    { implies: "HTML", category: "LANGUAGE", confidence: 80 },
  ],
  "TypeScript": [
    { implies: "JavaScript", category: "LANGUAGE", confidence: 98 },
  ],
  "Django": [
    { implies: "Python", category: "LANGUAGE", confidence: 98 },
    { implies: "SQL", category: "LANGUAGE", confidence: 75 },
  ],
  "Flask": [
    { implies: "Python", category: "LANGUAGE", confidence: 98 },
    { implies: "REST API", category: "DOMAIN", confidence: 70 },
  ],
  "FastAPI": [
    { implies: "Python", category: "LANGUAGE", confidence: 98 },
    { implies: "REST API", category: "DOMAIN", confidence: 80 },
    { implies: "Pydantic", category: "FRAMEWORK", confidence: 85 },
  ],
  "Spring Boot": [
    { implies: "Java", category: "LANGUAGE", confidence: 98 },
    { implies: "Spring Framework", category: "FRAMEWORK", confidence: 90 },
    { implies: "Maven", category: "TOOL", confidence: 70 },
  ],
  "Rails": [
    { implies: "Ruby", category: "LANGUAGE", confidence: 98 },
    { implies: "SQL", category: "LANGUAGE", confidence: 75 },
  ],
  "Laravel": [
    { implies: "PHP", category: "LANGUAGE", confidence: 98 },
    { implies: "SQL", category: "LANGUAGE", confidence: 75 },
  ],
  "Express.js": [
    { implies: "Node.js", category: "PLATFORM", confidence: 98 },
    { implies: "JavaScript", category: "LANGUAGE", confidence: 95 },
    { implies: "REST API", category: "DOMAIN", confidence: 75 },
  ],
  "NestJS": [
    { implies: "Node.js", category: "PLATFORM", confidence: 95 },
    { implies: "TypeScript", category: "LANGUAGE", confidence: 90 },
  ],
  "Redux": [
    { implies: "React", category: "FRAMEWORK", confidence: 85 },
    { implies: "JavaScript", category: "LANGUAGE", confidence: 90 },
  ],
  "TensorFlow": [
    { implies: "Python", category: "LANGUAGE", confidence: 90 },
    { implies: "Machine Learning", category: "DOMAIN", confidence: 85 },
    { implies: "NumPy", category: "TOOL", confidence: 75 },
  ],
  "PyTorch": [
    { implies: "Python", category: "LANGUAGE", confidence: 90 },
    { implies: "Machine Learning", category: "DOMAIN", confidence: 85 },
    { implies: "NumPy", category: "TOOL", confidence: 75 },
  ],
  "scikit-learn": [
    { implies: "Python", category: "LANGUAGE", confidence: 90 },
    { implies: "Machine Learning", category: "DOMAIN", confidence: 80 },
    { implies: "pandas", category: "TOOL", confidence: 70 },
  ],
  "pandas": [
    { implies: "Python", category: "LANGUAGE", confidence: 95 },
    { implies: "Data Analysis", category: "DOMAIN", confidence: 80 },
  ],
  "Kubernetes": [
    { implies: "Docker", category: "PLATFORM", confidence: 90 },
    { implies: "DevOps", category: "DOMAIN", confidence: 80 },
    { implies: "Linux", category: "PLATFORM", confidence: 75 },
  ],
  "Docker": [
    { implies: "Linux", category: "PLATFORM", confidence: 70 },
    { implies: "DevOps", category: "DOMAIN", confidence: 65 },
  ],
  "Terraform": [
    { implies: "Infrastructure as Code", category: "DOMAIN", confidence: 90 },
    { implies: "DevOps", category: "DOMAIN", confidence: 75 },
  ],
  "AWS Lambda": [
    { implies: "AWS", category: "PLATFORM", confidence: 95 },
    { implies: "Serverless", category: "DOMAIN", confidence: 85 },
  ],
  "GraphQL": [
    { implies: "REST API", category: "DOMAIN", confidence: 65 },
    { implies: "API Design", category: "DOMAIN", confidence: 75 },
  ],
  "PostgreSQL": [
    { implies: "SQL", category: "LANGUAGE", confidence: 90 },
    { implies: "Database Design", category: "DOMAIN", confidence: 75 },
  ],
  "MySQL": [
    { implies: "SQL", category: "LANGUAGE", confidence: 90 },
    { implies: "Database Design", category: "DOMAIN", confidence: 70 },
  ],
  "MongoDB": [
    { implies: "NoSQL", category: "DOMAIN", confidence: 85 },
    { implies: "Database Design", category: "DOMAIN", confidence: 65 },
  ],
  "Redis": [
    { implies: "Caching", category: "DOMAIN", confidence: 80 },
    { implies: "Database Design", category: "DOMAIN", confidence: 60 },
  ],
  "React Native": [
    { implies: "React", category: "FRAMEWORK", confidence: 85 },
    { implies: "JavaScript", category: "LANGUAGE", confidence: 90 },
    { implies: "Mobile Development", category: "DOMAIN", confidence: 90 },
  ],
  "Flutter": [
    { implies: "Dart", category: "LANGUAGE", confidence: 95 },
    { implies: "Mobile Development", category: "DOMAIN", confidence: 90 },
  ],
  "Tailwind CSS": [
    { implies: "CSS", category: "LANGUAGE", confidence: 85 },
    { implies: "HTML", category: "LANGUAGE", confidence: 80 },
  ],
};

// Normalize skill name for lookup (case-insensitive, remove trailing spaces)
function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase();
}

// Build a lookup index from normalized name → canonical name
const RULE_INDEX: Record<string, string> = {};
for (const canonical of Object.keys(INFERENCE_RULES)) {
  RULE_INDEX[normalizeSkillName(canonical)] = canonical;
}

export function inferSkills(
  explicitSkills: { name: string; proficiency: Proficiency; yearsExp: number | null }[]
): InferredSkill[] {
  const explicitNames = new Set(explicitSkills.map((s) => normalizeSkillName(s.name)));
  const inferred = new Map<string, InferredSkill>();

  for (const skill of explicitSkills) {
    const canonical = RULE_INDEX[normalizeSkillName(skill.name)];
    if (!canonical) continue;

    const rules = INFERENCE_RULES[canonical];
    for (const rule of rules) {
      const impliedNorm = normalizeSkillName(rule.implies);
      // Skip if already explicitly listed
      if (explicitNames.has(impliedNorm)) continue;

      // Take the highest confidence if multiple rules imply the same skill
      const existing = inferred.get(impliedNorm);
      if (existing && existing.confidence >= rule.confidence) continue;

      // Inferred proficiency is one level below the source skill's proficiency
      let proficiency: Proficiency = "NOVICE";
      if (skill.proficiency === "EXPERT") proficiency = "INTERMEDIATE";
      else if (skill.proficiency === "INTERMEDIATE") proficiency = "NOVICE";
      else proficiency = "NOVICE";

      // Override with explicit map if provided
      if (rule.proficiencyMap) {
        proficiency = rule.proficiencyMap[skill.proficiency] ?? proficiency;
      }

      inferred.set(impliedNorm, {
        name: rule.implies,
        category: rule.category,
        proficiency,
        confidence: rule.confidence,
        inferredFrom: skill.name,
      });
    }
  }

  // Return sorted by confidence descending
  return Array.from(inferred.values()).sort((a, b) => b.confidence - a.confidence);
}
