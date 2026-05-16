import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractProfileFromResume } from "@/lib/ai/extract";
import { inferSkills } from "@/lib/ai/infer";
import pdfParse from "pdf-parse";
import bcrypt from "bcryptjs";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const VALID_CATEGORIES = ["LANGUAGE", "FRAMEWORK", "PLATFORM", "TOOL", "DOMAIN"] as const;
const VALID_PROFICIENCIES = ["NOVICE", "INTERMEDIATE", "EXPERT"] as const;
type SkillCategory = typeof VALID_CATEGORIES[number];
type SkillProficiency = typeof VALID_PROFICIENCIES[number];

const MAX_PDF_BATCH = 20;

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

function slugEmail(name: string, index: number): string {
  const slug = name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
  return `${slug || `employee${index}`}@imported.local`;
}

function saveFile(buffer: Buffer, userId: string): { storedName: string; filePath: string } {
  const storedName = `${userId}-${Date.now()}.pdf`;
  const uploadDir = process.env.UPLOAD_DIR ?? "/data/uploads/resumes";
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, storedName);
  writeFileSync(filePath, buffer);
  return { storedName, filePath };
}

// --- CSV parser (no external dep) ---
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCSVRow(lines[0]).map((h) => h.toLowerCase().trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? "").trim(); });
    if (row["name"] || row["email"]) rows.push(row);
  }
  return rows;
}

function splitCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// skills field format: "React:EXPERT:4;Node.js:INTERMEDIATE:2;JavaScript:EXPERT:5"
function parseSkillsField(raw: string): { name: string; category: SkillCategory; proficiency: SkillProficiency; yearsExp: number | null }[] {
  if (!raw) return [];
  return raw.split(";").map((part) => {
    const [name, prof, yrs] = part.split(":").map((s) => s.trim());
    if (!name) return null;
    return {
      name,
      category: normalizeCategory(name),
      proficiency: normalizeProficiency(prof ?? ""),
      yearsExp: yrs ? parseFloat(yrs) || null : null,
    };
  }).filter(Boolean) as { name: string; category: SkillCategory; proficiency: SkillProficiency; yearsExp: number | null }[];
}

// --- upsert user + profile ---
async function upsertUserAndProfile(
  name: string,
  email: string,
  profileData: {
    bio?: string | null;
    department?: string | null;
    location?: string | null;
    yearsTotal?: number | null;
    skills: { name: string; category: SkillCategory; proficiency: SkillProficiency; yearsExp: number | null }[];
    projects?: { name: string; description?: string | null; techStack: string[]; role?: string | null; duration?: string | null }[];
  },
  resumeData?: { buffer: Buffer; originalName: string; fileSize: number }
): Promise<{ userId: string; profileId: string; created: boolean }> {
  const tempPassword = await bcrypt.hash("SkillsHub@Import2025", 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.$transaction(async (tx: any) => {
    let user = await tx.user.findUnique({ where: { email } });
    const created = !user;

    if (!user) {
      user = await tx.user.create({
        data: { email, name, password: tempPassword, role: "EMPLOYEE" },
      });
    } else {
      await tx.user.update({ where: { id: user.id }, data: { name } });
    }

    await tx.employeeProfile.deleteMany({ where: { userId: user.id } });

    const profile = await tx.employeeProfile.create({
      data: {
        userId: user.id,
        bio: profileData.bio ?? null,
        department: profileData.department ?? null,
        location: profileData.location ?? null,
        yearsTotal: typeof profileData.yearsTotal === "number" ? profileData.yearsTotal : null,
        skills: { create: profileData.skills },
        projects: { create: (profileData.projects ?? []) },
      },
    });

    if (resumeData) {
      const { storedName, filePath } = saveFile(resumeData.buffer, user.id);
      await tx.resume.upsert({
        where: { userId: user.id },
        update: { profileId: profile.id, originalName: resumeData.originalName, storedName, filePath, fileSize: resumeData.fileSize, mimeType: "application/pdf" },
        create: { userId: user.id, profileId: profile.id, originalName: resumeData.originalName, storedName, filePath, fileSize: resumeData.fileSize, mimeType: "application/pdf" },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "BULK_IMPORT",
        entity: "EmployeeProfile",
        entityId: profile.id,
        metadata: { importedBy: "HR", skillCount: profileData.skills.length },
      },
    });

    return { userId: user.id, profileId: profile.id, created };
  });
}

// SSE helper
function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const formData = await req.formData();
  const mode = formData.get("mode") as string | null; // "pdf" | "csv"

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(sseEvent(data)));
      }

      try {
        if (mode === "csv") {
          const csvFile = formData.get("csv") as File | null;
          if (!csvFile) { send({ type: "error", message: "No CSV file provided" }); controller.close(); return; }

          const text = await csvFile.text();
          const rows = parseCSV(text);
          if (rows.length === 0) { send({ type: "error", message: "CSV has no valid rows (check headers: name, email, department, location, yearsTotal, skills)" }); controller.close(); return; }

          const total = rows.length;
          send({ type: "total", total, mode: "csv" });

          let success = 0, failed = 0;
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const name = row["name"] || `Employee ${i + 1}`;
            const email = row["email"] || slugEmail(name, i);
            send({ type: "start", index: i, total, file: name, email });

            try {
              const skills = parseSkillsField(row["skills"] ?? "");
              const yearsTotal = row["yearstotal"] ? parseInt(row["yearstotal"]) || null : null;

              const { created } = await upsertUserAndProfile(name, email, {
                department: row["department"] || null,
                location: row["location"] || null,
                yearsTotal,
                skills,
                projects: [],
              });

              success++;
              send({ type: "done", index: i, total, file: name, email, skillCount: skills.length, inferredCount: 0, created });
            } catch (err) {
              failed++;
              send({ type: "error", index: i, total, file: name, message: err instanceof Error ? err.message : "Unknown error" });
            }
          }

          send({ type: "complete", total, success, failed, mode: "csv" });

        } else {
          // PDF batch mode
          const files = formData.getAll("resumes") as File[];
          if (files.length === 0) { send({ type: "error", message: "No PDF files provided" }); controller.close(); return; }

          const pdfs = files.filter((f) => f.type === "application/pdf").slice(0, MAX_PDF_BATCH);
          const total = pdfs.length;
          send({ type: "total", total, mode: "pdf" });

          let success = 0, failed = 0;
          for (let i = 0; i < pdfs.length; i++) {
            const file = pdfs[i];
            send({ type: "start", index: i, total, file: file.name });

            try {
              const buffer = Buffer.from(await file.arrayBuffer());
              let rawText = "";
              try {
                const parsed = await pdfParse(buffer);
                rawText = parsed.text.trim();
              } catch {
                throw new Error("Could not read PDF text");
              }

              if (rawText.length < 50) throw new Error("PDF has no readable text (scanned image?)");

              const aiResponse = await extractProfileFromResume(rawText);
              const name = aiResponse.bio?.split("\n")[0]?.trim() ||
                file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");

              // Try to extract email from raw text
              const emailMatch = rawText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
              const email = emailMatch?.[0]?.toLowerCase() ?? slugEmail(name, i);

              const explicitSkills = (aiResponse.skills ?? []).map((s: { name: string; proficiency: string; yearsExp?: number }) => ({
                name: s.name,
                proficiency: normalizeProficiency(s.proficiency),
                yearsExp: typeof s.yearsExp === "number" ? s.yearsExp : null,
              }));
              const inferred = inferSkills(explicitSkills).filter((inf) => inf.confidence >= 70);

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

              const projects = (aiResponse.projects ?? []).map((p: { name: string; description?: string; techStack?: string[]; role?: string; duration?: string }) => ({
                name: p.name,
                description: p.description ?? null,
                techStack: Array.isArray(p.techStack) ? p.techStack : [],
                role: p.role ?? null,
                duration: p.duration ?? null,
              }));

              const { created } = await upsertUserAndProfile(name, email, {
                bio: aiResponse.bio ?? null,
                department: aiResponse.department ?? null,
                location: aiResponse.location ?? null,
                yearsTotal: typeof aiResponse.yearsTotal === "number" ? aiResponse.yearsTotal : null,
                skills: allSkills,
                projects,
              }, { buffer, originalName: file.name, fileSize: file.size });

              success++;
              send({
                type: "done", index: i, total,
                file: file.name, name, email,
                skillCount: allSkills.length,
                inferredCount: inferred.length,
                projectCount: projects.length,
                created,
              });
            } catch (err) {
              failed++;
              const msg = err instanceof Error ? err.message : "Unknown error";
              console.error(`[bulk-import] ${file.name} failed:`, msg);
              send({ type: "error", index: i, total, file: file.name, message: msg });
            }
          }

          send({ type: "complete", total, success, failed, mode: "pdf" });
        }
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Unexpected error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
