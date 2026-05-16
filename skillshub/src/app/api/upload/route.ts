import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractProfileFromResume } from "@/lib/ai/extract";
import { inferSkills } from "@/lib/ai/infer";
import pdfParse from "pdf-parse";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const VALID_CATEGORIES = ["LANGUAGE", "FRAMEWORK", "PLATFORM", "TOOL", "DOMAIN"] as const;
const VALID_PROFICIENCIES = ["NOVICE", "INTERMEDIATE", "EXPERT"] as const;
type SkillCategory = typeof VALID_CATEGORIES[number];
type SkillProficiency = typeof VALID_PROFICIENCIES[number];

function normalizeCategory(raw: string): SkillCategory {
  const upper = (raw ?? "").toUpperCase().trim();
  if ((VALID_CATEGORIES as readonly string[]).includes(upper)) return upper as SkillCategory;
  if (/lang|script|python|sql|bash/.test(upper)) return "LANGUAGE";
  if (/frame|library|react|vue|angular|next|express|django|spring/.test(upper)) return "FRAMEWORK";
  if (/cloud|devops|aws|gcp|azure|infra|platform|k8s|kube|docker|ci.?cd/.test(upper)) return "PLATFORM";
  if (/tool|git|jira|figma|postman|monitor|observ/.test(upper)) return "TOOL";
  if (/front|back|full|data|mobile|web|database|db|domain/.test(upper)) return "DOMAIN";
  return "TOOL";
}

function normalizeProficiency(raw: string): SkillProficiency {
  const upper = (raw ?? "").toUpperCase().trim();
  if ((VALID_PROFICIENCIES as readonly string[]).includes(upper)) return upper as SkillProficiency;
  if (/expert|senior|advanced|lead|principal/.test(upper)) return "EXPERT";
  if (/inter|mid|moderate/.test(upper)) return "INTERMEDIATE";
  return "NOVICE";
}

function saveFileToDisk(buffer: Buffer, userId: string, mimeType: string): { storedName: string; filePath: string } {
  const ext = mimeType === "application/pdf" ? ".pdf" : ".docx";
  const storedName = `${userId}-${Date.now()}${ext}`;
  const uploadDir = process.env.UPLOAD_DIR ?? "/data/uploads/resumes";
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, storedName);
  writeFileSync(filePath, buffer);
  return { storedName, filePath };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF and DOCX files are allowed" }, { status: 400 });
    }
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File size must be under 10 MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const rawText = parsed.text.trim();

    if (!rawText || rawText.length < 50) {
      return NextResponse.json({ error: "Could not extract text from PDF. Please ensure the PDF contains selectable text." }, { status: 400 });
    }

    const aiResponse = await extractProfileFromResume(rawText);
    console.log(`[upload] AI extracted: yearsTotal=${aiResponse.yearsTotal}, skills=${aiResponse.skills?.length ?? 0}, projects=${aiResponse.projects?.length ?? 0}`);

    // Run skill inference engine on extracted skills
    const explicitSkills = (aiResponse.skills ?? []).map((s: { name: string; proficiency: string; yearsExp?: number }) => ({
      name: s.name,
      proficiency: normalizeProficiency(s.proficiency),
      yearsExp: typeof s.yearsExp === "number" ? s.yearsExp : null,
    }));
    const inferred = inferSkills(explicitSkills).filter((inf) => inf.confidence >= 70);
    console.log(`[upload] Skill inference: +${inferred.length} inferred skills from ${explicitSkills.length} explicit skills`);

    const { storedName, filePath } = saveFileToDisk(buffer, session.user.id, file.type);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      await tx.profileIngestion.create({
        data: {
          userId: session.user.id,
          rawText,
          aiResponse: JSON.parse(JSON.stringify(aiResponse)),
          status: "PENDING",
        },
      });

      await tx.employeeProfile.deleteMany({ where: { userId: session.user.id } });

      const allSkills = [
        ...(aiResponse.skills ?? []).map((s: { name: string; category: string; proficiency: string; yearsExp?: number }) => ({
          name: s.name,
          category: normalizeCategory(s.category),
          proficiency: normalizeProficiency(s.proficiency),
          yearsExp: typeof s.yearsExp === "number" ? s.yearsExp : null,
        })),
        ...inferred.map((inf) => ({
          name: inf.name,
          category: inf.category as SkillCategory,
          proficiency: inf.proficiency as SkillProficiency,
          yearsExp: null,
        })),
      ];

      const profile = await tx.employeeProfile.create({
        data: {
          userId: session.user.id,
          bio: aiResponse.bio ?? null,
          department: aiResponse.department ?? null,
          location: aiResponse.location ?? null,
          yearsTotal: typeof aiResponse.yearsTotal === "number" ? aiResponse.yearsTotal : null,
          skills: {
            create: allSkills,
          },
          projects: {
            create: (aiResponse.projects ?? []).map((p: { name: string; description?: string; techStack?: string[]; role?: string; duration?: string }) => ({
              name: p.name,
              description: p.description ?? null,
              techStack: Array.isArray(p.techStack) ? p.techStack : [],
              role: p.role ?? null,
              duration: p.duration ?? null,
            })),
          },
        },
      });

      // Upsert the Resume file metadata record
      await tx.resume.upsert({
        where: { userId: session.user.id },
        update: {
          profileId: profile.id,
          originalName: file.name,
          storedName,
          filePath,
          fileSize: file.size,
          mimeType: file.type,
        },
        create: {
          userId: session.user.id,
          profileId: profile.id,
          originalName: file.name,
          storedName,
          filePath,
          fileSize: file.size,
          mimeType: file.type,
        },
      });

      await tx.auditLog.create({
        data: { userId: session.user.id, action: "UPLOAD_RESUME", entity: "Resume", metadata: { fileName: file.name, fileSize: file.size } },
      });
    });

    console.log(`[upload] profile + resume saved for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      skillCount: (aiResponse.skills?.length ?? 0) + inferred.length,
      inferredSkillCount: inferred.length,
      projectCount: aiResponse.projects?.length ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload] error:", message);
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed") || message.includes("connect")) {
      return NextResponse.json({ error: "Cannot connect to Ollama. Make sure Ollama is running on your machine." }, { status: 503 });
    }
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
