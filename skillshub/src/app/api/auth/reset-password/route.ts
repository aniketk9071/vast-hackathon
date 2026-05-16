import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.token || !body?.password) {
    return NextResponse.json({ error: "Email, token, and new password are required" }, { status: 400 });
  }

  const email = String(body.email).trim().toLowerCase();
  const token = String(body.token).trim().toUpperCase();
  const password = String(body.password);

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, resetToken: true, resetTokenExpiry: true },
  });

  if (!user || !user.resetToken || !user.resetTokenExpiry) {
    return NextResponse.json({ error: "Invalid or expired reset code" }, { status: 400 });
  }

  if (user.resetToken !== token) {
    return NextResponse.json({ error: "Invalid reset code" }, { status: 400 });
  }

  if (user.resetTokenExpiry < new Date()) {
    return NextResponse.json({ error: "Reset code has expired. Please request a new one." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetToken: null, resetTokenExpiry: null },
  });

  return NextResponse.json({ success: true });
}
