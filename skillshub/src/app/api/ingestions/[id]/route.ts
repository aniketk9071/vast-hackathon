import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "HR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, notes } = await req.json();
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const ingestion = await prisma.profileIngestion.findUnique({ where: { id: params.id } });
  if (!ingestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  await prisma.profileIngestion.update({
    where: { id: params.id },
    data: { status: newStatus, reviewedById: session.user.id, reviewNotes: notes ?? null },
  });

  // Notify the employee
  const notifTitle = action === "approve" ? "Profile Approved!" : "Profile Rejected";
  const notifMsg = action === "approve"
    ? "Your resume profile has been approved and is now live in the employee directory."
    : `Your resume profile was rejected.${notes ? ` HR notes: ${notes}` : ""}`;
  await prisma.notification.create({
    data: { userId: ingestion.userId, title: notifTitle, message: notifMsg },
  });

  // Audit log
  await prisma.auditLog.create({
    data: { userId: session.user.id, action: `${newStatus}_PROFILE`, entity: "ProfileIngestion", entityId: ingestion.id, metadata: { targetUserId: ingestion.userId, notes } },
  });

  if (action === "approve" && ingestion.aiResponse) {
    const ai = ingestion.aiResponse as {
      bio?: string;
      department?: string;
      location?: string;
      yearsTotal?: number;
      skills?: { name: string; category: string; proficiency: string; yearsExp: number }[];
      projects?: { name: string; description?: string; techStack: string[]; role?: string; duration?: string }[];
    };

    await prisma.employeeProfile.deleteMany({ where: { userId: ingestion.userId } });

    await prisma.employeeProfile.create({
      data: {
        userId: ingestion.userId,
        bio: ai.bio ?? null,
        department: ai.department ?? null,
        location: ai.location ?? null,
        yearsTotal: ai.yearsTotal ?? null,
        skills: {
          create: (ai.skills ?? []).map((s) => ({
            name: s.name,
            category: normalizeCategory(s.category ?? ""),
            proficiency: normalizeProficiency(s.proficiency ?? ""),
            yearsExp: typeof s.yearsExp === "number" ? s.yearsExp : null,
          })),
        },
        projects: {
          create: (ai.projects ?? []).map((p) => ({
            name: p.name,
            description: p.description ?? null,
            techStack: p.techStack ?? [],
            role: p.role ?? null,
            duration: p.duration ?? null,
          })),
        },
      },
    });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
