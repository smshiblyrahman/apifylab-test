import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/comments/[id]/like — toggle like on comment or reply
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }
    const userId = session.user.id;
    const { id: commentId } = await params;

    // Verify comment exists and user can access its post
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        post: { select: { visibility: true, authorId: true } },
      },
    });
    if (!comment) {
      return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    }
    if (
      comment.post.visibility === "PRIVATE" &&
      comment.post.authorId !== userId
    ) {
      return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    }

    const existing = await prisma.like.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    let liked: boolean;
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await prisma.like.create({ data: { userId, commentId } });
      liked = true;
    }

    const count = await prisma.like.count({ where: { commentId } });
    return NextResponse.json({ liked, count });
  } catch (error) {
    console.error("POST /api/comments/[id]/like error:", error);
    return NextResponse.json(
      { error: { message: "Failed to toggle like." } },
      { status: 500 }
    );
  }
}
