import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/comments/[id]/replies
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const replies = await prisma.comment.findMany({
      where: { parentId: commentId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        parentId: true,
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });

    let nextCursor: string | null = null;
    if (replies.length > limit) {
      nextCursor = replies.pop()!.id;
    }

    let likedIds: Set<string> = new Set();
    if (userId && replies.length > 0) {
      const ids = replies.map((r: any) => r.id);
      const myLikes = await prisma.like.findMany({
        where: { userId, commentId: { in: ids } },
        select: { commentId: true },
      });
      likedIds = new Set(myLikes.map((l) => l.commentId!));
    }

    const data = replies.map((r: any) => ({ ...r, likedByMe: likedIds.has(r.id) }));
    return NextResponse.json({ replies: data, nextCursor });
  } catch (error) {
    console.error("GET /api/comments/[id]/replies error:", error);
    return NextResponse.json({ error: { message: "Failed to load replies." } }, { status: 500 });
  }
}
