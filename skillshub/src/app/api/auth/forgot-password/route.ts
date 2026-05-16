import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const email = String(body.email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });

  // Always return success to avoid user enumeration
  if (!user) return NextResponse.json({ success: true, demo: false });

  const token = crypto.randomBytes(4).toString("hex").toUpperCase(); // 8-char code, easy to type
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  // In production this would send an email. For the demo we return the token directly.
  return NextResponse.json({ success: true, demo: true, token, name: user.name });
}
