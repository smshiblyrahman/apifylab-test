import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = await checkRateLimit("register", ip);
    if (!success) {
      return NextResponse.json(
        { error: { message: "Too many registration attempts. Try again later." } },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0];
      return NextResponse.json(
        { error: { message: firstError ?? "Invalid input", fields: fieldErrors } },
        { status: 422 }
      );
    }

    const { firstName, lastName, email, password } = parsed.data;

    // Check existing — generic message to avoid enumeration
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { message: "Unable to create account. Please try a different email." } },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { firstName, lastName, email, password: hashedPassword },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: { message: "Something went wrong. Please try again." } },
      { status: 500 }
    );
  }
}
