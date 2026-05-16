import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFileSync, existsSync } from "fs";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Employees can only download their own resume; HR can download any
  if (session.user.role === "EMPLOYEE" && session.user.id !== params.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resume = await prisma.resume.findUnique({ where: { userId: params.userId } });
  if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

  const uploadDir = process.env.UPLOAD_DIR ?? "/data/uploads/resumes";
  const filePath = path.join(uploadDir, resume.storedName);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found on server" }, { status: 404 });
  }

  const fileBuffer = readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": resume.mimeType,
      "Content-Disposition": `attachment; filename="${resume.originalName}"`,
      "Content-Length": String(fileBuffer.length),
    },
  });
}
