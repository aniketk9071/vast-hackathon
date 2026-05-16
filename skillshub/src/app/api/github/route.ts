import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Ollama } from "ollama";

const ollama = new Ollama({ host: process.env.OLLAMA_HOST ?? "http://localhost:11434" });
const MODEL  = process.env.OLLAMA_MODEL ?? "llama3.2";

interface AIInsight {
  matchScore: number;
  insights: string[];
  skillsToAdd: string[];
  possiblyOutdated: string[];
  recommendation: string;
}

function parseJsonSafe(raw: string): unknown {
  try { return JSON.parse(raw.trim()); } catch { /* */ }
  const s = raw.trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim();
  try { return JSON.parse(s); } catch { /* */ }
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* */ } }
  return null;
}

async function generateInsight(
  employeeName: string,
  department: string | null,
  yearsTotal: number | null,
  resumeSkills: { name: string; proficiency: string }[],
  githubLangs: { name: string; pct: number; proficiency: string }[],
  githubTopics: { name: string }[],
  newSkillNames: string[],
  possiblyOutdatedNames: string[],
): Promise<AIInsight | null> {
  const resumeList  = resumeSkills.length  ? resumeSkills.map(s => `- ${s.name} (${s.proficiency})`).join("\n") : "None listed";
  const langList    = githubLangs.length   ? githubLangs.map(s => `- ${s.name}: ${s.pct}% (${s.proficiency})`).join("\n") : "None detected";
  const topicList   = githubTopics.length  ? githubTopics.map(s => s.name).join(", ") : "None";

  const prompt = `You are a technical HR assistant. Analyze the skill gap between resume and GitHub activity.

Employee: ${employeeName}${department ? `, Dept: ${department}` : ""}${yearsTotal ? `, ${yearsTotal} years exp` : ""}

RESUME skills:
${resumeList}

GITHUB code analysis (from actual repositories):
Languages:
${langList}
Frameworks/Tools found: ${topicList}

Skills on GitHub NOT in resume (opportunities to add): ${newSkillNames.join(", ") || "None"}
Resume skills NOT visible on GitHub (may be outdated): ${possiblyOutdatedNames.join(", ") || "None"}

Respond with JSON only. No explanation. Start with { end with }.
{"matchScore":<integer 0-100 representing how well GitHub activity matches resume>,"insights":["<2-3 concise factual observations>"],"skillsToAdd":["<skill names to add to resume>"],"possiblyOutdated":["<resume skills not seen on GitHub>"],"recommendation":"<1-2 actionable sentences for HR manager>"}`;

  try {
    const res = await ollama.chat({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      format: "json",
      options: { temperature: 0.1, num_predict: 600 },
    });
    const parsed = parseJsonSafe(res.message.content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as AIInsight;
  } catch {
    return null;
  }
}

async function generateSummary(
  login: string, name: string | null, bio: string | null,
  langs: { name: string; pct: number; proficiency: string }[],
  topics: { name: string }[],
  repoCount: number,
): Promise<string | null> {
  const top = langs.slice(0, 3).map(l => `${l.name} (${l.proficiency.toLowerCase()})`).join(", ");
  const fw  = topics.slice(0, 4).map(t => t.name).join(", ");
  const prompt = `Write a 2-sentence professional developer profile for an HR resume summary.
Developer: ${name ?? login}, GitHub: @${login}
${bio ? `Bio: ${bio}` : ""}
Top skills: ${top}${fw ? `\nFrameworks: ${fw}` : ""}
Public repos analysed: ${repoCount}
Write in third person. Be concise and professional. Plain text only, no markdown.`;
  try {
    const res = await ollama.chat({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      options: { temperature: 0.3, num_predict: 120 },
    });
    return res.message.content.trim();
  } catch { return null; }
}

// Language → skill metadata
const LANG_TO_SKILL: Record<string, { category: "LANGUAGE" | "FRAMEWORK" | "PLATFORM" | "TOOL" | "DOMAIN"; display: string }> = {
  JavaScript:   { category: "LANGUAGE", display: "JavaScript" },
  TypeScript:   { category: "LANGUAGE", display: "TypeScript" },
  Python:       { category: "LANGUAGE", display: "Python" },
  Go:           { category: "LANGUAGE", display: "Go" },
  Rust:         { category: "LANGUAGE", display: "Rust" },
  Java:         { category: "LANGUAGE", display: "Java" },
  "C#":         { category: "LANGUAGE", display: "C#" },
  Ruby:         { category: "LANGUAGE", display: "Ruby" },
  PHP:          { category: "LANGUAGE", display: "PHP" },
  Swift:        { category: "LANGUAGE", display: "Swift" },
  Kotlin:       { category: "LANGUAGE", display: "Kotlin" },
  Dart:         { category: "LANGUAGE", display: "Dart" },
  "C++":        { category: "LANGUAGE", display: "C++" },
  C:            { category: "LANGUAGE", display: "C" },
  Scala:        { category: "LANGUAGE", display: "Scala" },
  Elixir:       { category: "LANGUAGE", display: "Elixir" },
  Haskell:      { category: "LANGUAGE", display: "Haskell" },
  R:            { category: "LANGUAGE", display: "R" },
  Lua:          { category: "LANGUAGE", display: "Lua" },
  HTML:         { category: "LANGUAGE", display: "HTML" },
  CSS:          { category: "LANGUAGE", display: "CSS" },
  SCSS:         { category: "TOOL",     display: "SCSS" },
  Shell:        { category: "TOOL",     display: "Shell/Bash" },
  Dockerfile:   { category: "PLATFORM", display: "Docker" },
  HCL:          { category: "PLATFORM", display: "Terraform" },
};

// GitHub language colors (subset of linguist palette)
const LANG_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python:     "#3572A5",
  Go:         "#00ADD8",
  Rust:       "#dea584",
  Java:       "#b07219",
  "C#":       "#178600",
  Ruby:       "#701516",
  PHP:        "#4F5D95",
  Swift:      "#F05138",
  Kotlin:     "#A97BFF",
  Dart:       "#00B4AB",
  "C++":      "#f34b7d",
  C:          "#555555",
  Scala:      "#c22d40",
  Elixir:     "#6e4a7e",
  HTML:       "#e34c26",
  CSS:        "#563d7c",
  SCSS:       "#c6538c",
  Shell:      "#89e051",
  Dockerfile: "#384d54",
  HCL:        "#844FBA",
  R:          "#198ce7",
};

// Repo topic → additional skill
const TOPIC_TO_SKILL: Record<string, { name: string; category: "LANGUAGE" | "FRAMEWORK" | "PLATFORM" | "TOOL" | "DOMAIN" }> = {
  react:              { name: "React",          category: "FRAMEWORK" },
  reactjs:            { name: "React",          category: "FRAMEWORK" },
  "react-native":     { name: "React Native",   category: "FRAMEWORK" },
  nextjs:             { name: "Next.js",         category: "FRAMEWORK" },
  "next-js":          { name: "Next.js",         category: "FRAMEWORK" },
  vuejs:              { name: "Vue.js",          category: "FRAMEWORK" },
  vue:                { name: "Vue.js",          category: "FRAMEWORK" },
  nuxtjs:             { name: "Nuxt.js",         category: "FRAMEWORK" },
  angular:            { name: "Angular",         category: "FRAMEWORK" },
  django:             { name: "Django",          category: "FRAMEWORK" },
  flask:              { name: "Flask",           category: "FRAMEWORK" },
  fastapi:            { name: "FastAPI",         category: "FRAMEWORK" },
  "spring-boot":      { name: "Spring Boot",    category: "FRAMEWORK" },
  nestjs:             { name: "NestJS",          category: "FRAMEWORK" },
  expressjs:          { name: "Express.js",      category: "FRAMEWORK" },
  express:            { name: "Express.js",      category: "FRAMEWORK" },
  flutter:            { name: "Flutter",         category: "FRAMEWORK" },
  tensorflow:         { name: "TensorFlow",      category: "FRAMEWORK" },
  pytorch:            { name: "PyTorch",         category: "FRAMEWORK" },
  "scikit-learn":     { name: "scikit-learn",    category: "FRAMEWORK" },
  docker:             { name: "Docker",          category: "PLATFORM" },
  kubernetes:         { name: "Kubernetes",      category: "PLATFORM" },
  k8s:                { name: "Kubernetes",      category: "PLATFORM" },
  aws:                { name: "AWS",             category: "PLATFORM" },
  "amazon-web-services": { name: "AWS",          category: "PLATFORM" },
  gcp:                { name: "GCP",             category: "PLATFORM" },
  azure:              { name: "Azure",           category: "PLATFORM" },
  terraform:          { name: "Terraform",       category: "PLATFORM" },
  graphql:            { name: "GraphQL",         category: "TOOL" },
  postgresql:         { name: "PostgreSQL",      category: "TOOL" },
  postgres:           { name: "PostgreSQL",      category: "TOOL" },
  mongodb:            { name: "MongoDB",         category: "TOOL" },
  redis:              { name: "Redis",           category: "TOOL" },
  "machine-learning": { name: "Machine Learning", category: "DOMAIN" },
  "deep-learning":    { name: "Deep Learning",  category: "DOMAIN" },
  ml:                 { name: "Machine Learning", category: "DOMAIN" },
  microservices:      { name: "Microservices",  category: "DOMAIN" },
  "rest-api":         { name: "REST API",        category: "DOMAIN" },
  blockchain:         { name: "Blockchain",      category: "DOMAIN" },
  "data-science":     { name: "Data Science",   category: "DOMAIN" },
  "tailwindcss":      { name: "Tailwind CSS",   category: "TOOL" },
  tailwind:           { name: "Tailwind CSS",   category: "TOOL" },
};

function recencyWeight(updatedAt: string): number {
  const months = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (months <= 3)  return 1.0;
  if (months <= 6)  return 0.85;
  if (months <= 12) return 0.65;
  if (months <= 24) return 0.4;
  return 0.2;
}

function bytesToProficiency(pct: number): "EXPERT" | "INTERMEDIATE" | "NOVICE" {
  if (pct >= 40) return "EXPERT";
  if (pct >= 15) return "INTERMEDIATE";
  return "NOVICE";
}

interface GHRepo {
  name: string;
  description: string | null;
  html_url: string;
  updated_at: string;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  fork: boolean;
  size: number;
}

interface GHUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  html_url: string;
  location: string | null;
  company: string | null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const username = searchParams.get("username")?.trim();
  const repo = searchParams.get("repo")?.trim();       // "owner/repo" for single-repo mode
  const employeeId = searchParams.get("employeeId")?.trim();

  if (!username && !repo) return NextResponse.json({ error: "username or repo is required" }, { status: 400 });

  const ghHeaders: HeadersInit = {
    "User-Agent": "SkillsHub/1.0",
    "Accept": "application/vnd.github+json",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) (ghHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  // ── Single-repo mode ──────────────────────────────────────────────────────
  if (repo) {
    const [owner, repoName] = repo.split("/");
    if (!owner || !repoName) return NextResponse.json({ error: "repo must be in owner/repo format" }, { status: 400 });

    const [repoRes, langsRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`, { headers: ghHeaders }),
      fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/languages`, { headers: ghHeaders }),
      fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/commits?per_page=20`, { headers: ghHeaders }),
    ]);

    if (repoRes.status === 404) return NextResponse.json({ error: `Repository "${repo}" not found` }, { status: 404 });
    if (repoRes.status === 403 || repoRes.status === 429) {
      return NextResponse.json({ error: "GitHub API rate limit exceeded. Add a GITHUB_TOKEN env variable." }, { status: 429 });
    }
    if (!repoRes.ok) return NextResponse.json({ error: "GitHub API error" }, { status: 502 });

    const repoData = await repoRes.json();
    const langs: Record<string, number> = langsRes.ok ? await langsRes.json() : {};
    const commits: { sha: string; commit: { message: string; author: { date: string; name: string } } }[] =
      commitsRes.ok ? await commitsRes.json() : [];

    const totalBytes = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
    const languageSkills = Object.entries(langs)
      .filter(([lang]) => LANG_TO_SKILL[lang])
      .sort(([, a], [, b]) => b - a)
      .map(([lang, bytes]) => {
        const pct = Math.round((bytes / totalBytes) * 1000) / 10;
        return {
          name: LANG_TO_SKILL[lang].display,
          category: LANG_TO_SKILL[lang].category,
          proficiency: bytesToProficiency(pct),
          pct,
          repoCount: 1,
          color: LANG_COLORS[lang] ?? "#888888",
        };
      });

    const topics: string[] = repoData.topics ?? [];
    const topicSkills: { name: string; category: string; source: string }[] = [];
    const seenTopics = new Set(languageSkills.map((s) => s.name.toLowerCase()));
    for (const topic of topics) {
      const mapped = TOPIC_TO_SKILL[topic.toLowerCase()];
      if (!mapped || seenTopics.has(mapped.name.toLowerCase())) continue;
      seenTopics.add(mapped.name.toLowerCase());
      topicSkills.push({ name: mapped.name, category: mapped.category, source: topic });
    }

    const recentCommits = commits.slice(0, 10).map((c) => ({
      sha:     c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0].slice(0, 100),
      author:  c.commit.author.name,
      date:    c.commit.author.date,
    }));

    return NextResponse.json({
      mode: "repo",
      repoInfo: {
        name:        repoData.name,
        fullName:    repoData.full_name,
        description: repoData.description,
        url:         repoData.html_url,
        stars:       repoData.stargazers_count,
        forks:       repoData.forks_count,
        watchers:    repoData.watchers_count,
        language:    repoData.language,
        topics,
        updatedAt:   repoData.updated_at,
        pushedAt:    repoData.pushed_at,
        openIssues:  repoData.open_issues_count,
        visibility:  repoData.visibility,
        defaultBranch: repoData.default_branch,
      },
      languageSkills,
      topicSkills,
      recentCommits,
      totalCommitsShown: recentCommits.length,
    });
  }
  // ── End single-repo mode ──────────────────────────────────────────────────

  // username is guaranteed non-empty here (line 158 returned early if both were missing, and repo mode returned above)
  if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });

  // --- fetch GitHub user ---
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers: ghHeaders });
  if (userRes.status === 404) return NextResponse.json({ error: `GitHub user "${username}" not found` }, { status: 404 });
  if (userRes.status === 403 || userRes.status === 429) {
    return NextResponse.json({ error: "GitHub API rate limit exceeded. Add a GITHUB_TOKEN env variable to increase the limit." }, { status: 429 });
  }
  if (!userRes.ok) return NextResponse.json({ error: "GitHub API error" }, { status: 502 });

  const ghUser: GHUser = await userRes.json();

  // --- fetch repos (owned, not forked, sorted by recently updated) ---
  const reposRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30&type=owner`,
    { headers: ghHeaders }
  );
  if (!reposRes.ok) return NextResponse.json({ error: "Could not fetch repositories" }, { status: 502 });
  const allRepos: GHRepo[] = await reposRes.json();

  const ownRepos = allRepos.filter((r) => !r.fork).slice(0, 20);

  // --- fetch languages for each repo concurrently ---
  const langFetches = await Promise.allSettled(
    ownRepos.map(async (repo) => {
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/languages`,
        { headers: ghHeaders }
      );
      const langs: Record<string, number> = res.ok ? await res.json() : {};
      return { repo, langs };
    })
  );

  // --- aggregate language bytes with recency weighting ---
  const weightedBytes: Record<string, number> = {};
  const rawBytes: Record<string, number> = {};
  const langRepoCount: Record<string, number> = {};
  const topicSet = new Set<string>();
  let totalWeightedBytes = 0;

  for (const result of langFetches) {
    if (result.status !== "fulfilled") continue;
    const { repo, langs } = result.value;
    const w = recencyWeight(repo.updated_at);

    // Collect topics
    for (const t of repo.topics ?? []) topicSet.add(t.toLowerCase());

    for (const [lang, bytes] of Object.entries(langs)) {
      if (!LANG_TO_SKILL[lang]) continue; // skip unmapped languages
      weightedBytes[lang] = (weightedBytes[lang] ?? 0) + bytes * w;
      rawBytes[lang] = (rawBytes[lang] ?? 0) + bytes;
      langRepoCount[lang] = (langRepoCount[lang] ?? 0) + 1;
      totalWeightedBytes += bytes * w;
    }
  }

  // --- build language skills (only languages with ≥1% of total weighted bytes) ---
  const minPct = 1;
  const languageSkills = Object.entries(weightedBytes)
    .map(([lang, wb]) => {
      const pct = totalWeightedBytes > 0 ? (wb / totalWeightedBytes) * 100 : 0;
      return { lang, pct, rawBytes: rawBytes[lang] ?? 0, repoCount: langRepoCount[lang] ?? 0 };
    })
    .filter((l) => l.pct >= minPct)
    .sort((a, b) => b.pct - a.pct)
    .map(({ lang, pct, repoCount }) => ({
      name: LANG_TO_SKILL[lang].display,
      category: LANG_TO_SKILL[lang].category,
      proficiency: bytesToProficiency(pct),
      pct: Math.round(pct * 10) / 10,
      repoCount,
      color: LANG_COLORS[lang] ?? "#888888",
    }));

  // --- infer framework/platform/tool skills from topics ---
  const topicSkills: { name: string; category: string; source: string }[] = [];
  const seen = new Set(languageSkills.map((s) => s.name.toLowerCase()));

  for (const topic of Array.from(topicSet)) {
    const mapped = TOPIC_TO_SKILL[topic];
    if (!mapped) continue;
    const key = mapped.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topicSkills.push({ name: mapped.name, category: mapped.category, source: topic });
  }

  // --- top repos for display ---
  const topRepos = ownRepos
    .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6)
    .map((r) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
      updatedAt: r.updated_at,
      topics: (r.topics ?? []).slice(0, 4),
      color: r.language ? (LANG_COLORS[r.language] ?? "#888888") : "#888888",
    }));

  // --- load employee profile for comparison (optional) ---
  let resumeSkills: { name: string; category: string; proficiency: string; yearsExp?: number | null }[] = [];
  let employeeName: string | null = null;
  let employeeProfile: {
    department: string | null; location: string | null;
    yearsTotal: number | null; bio: string | null;
  } | null = null;

  if (employeeId) {
    const dbProfile = await prisma.employeeProfile.findUnique({
      where: { id: employeeId },
      include: { user: { select: { name: true } }, skills: true },
    });
    if (dbProfile) {
      resumeSkills = dbProfile.skills.map((s) => ({
        name: s.name, category: s.category, proficiency: s.proficiency, yearsExp: s.yearsExp,
      }));
      employeeName = dbProfile.user.name;
      employeeProfile = {
        department: dbProfile.department,
        location:   dbProfile.location,
        yearsTotal: dbProfile.yearsTotal,
        bio:        dbProfile.bio,
      };
    }
  }

  // --- compute gap: skills from GitHub not in resume ---
  const resumeSkillNames = new Set(resumeSkills.map((s) => s.name.toLowerCase()));
  const githubNames      = new Set([
    ...languageSkills.map((s) => s.name.toLowerCase()),
    ...topicSkills.map((s) => s.name.toLowerCase()),
  ]);
  const newSkills = [
    ...languageSkills.filter((s) => !resumeSkillNames.has(s.name.toLowerCase())),
    ...topicSkills.filter((s) => !resumeSkillNames.has(s.name.toLowerCase())),
  ];
  const possiblyOutdated = resumeSkills
    .filter((s) => !githubNames.has(s.name.toLowerCase()))
    .map((s) => s.name);

  // --- AI insight (only when an employee is linked) ---
  let aiInsight: AIInsight | null = null;
  if (employeeId && resumeSkills.length > 0) {
    aiInsight = await generateInsight(
      employeeName ?? username,
      employeeProfile?.department ?? null,
      employeeProfile?.yearsTotal ?? null,
      resumeSkills,
      languageSkills,
      topicSkills,
      newSkills.map((s) => s.name),
      possiblyOutdated,
    );
  }

  // --- AI professional summary (always generated) ---
  const aiSummary = await generateSummary(
    ghUser.login, ghUser.name, ghUser.bio,
    languageSkills, topicSkills, ownRepos.length,
  );

  return NextResponse.json({
    ghUser: {
      login: ghUser.login,
      name: ghUser.name,
      avatarUrl: ghUser.avatar_url,
      bio: ghUser.bio,
      publicRepos: ghUser.public_repos,
      followers: ghUser.followers,
      profileUrl: ghUser.html_url,
      location: ghUser.location,
      company: ghUser.company,
    },
    languageSkills,
    topicSkills,
    topRepos,
    totalReposAnalyzed: ownRepos.length,
    resumeSkills,
    employeeName,
    employeeProfile,
    newSkills,
    possiblyOutdated,
    aiInsight,
    aiSummary,
  });
}
