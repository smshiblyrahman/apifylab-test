import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// assertCanAccessPost — centralized auth helper
async function assertCanAccessPost(postId: string, userId: string | null) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, visibility: true, authorId: true },
  });
  if (!post) return null;
  if (post.visibility === "PRIVATE" && post.authorId !== userId) return null;
  return post;
}

// POST /api/posts/[id]/like  — toggle like
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
    const { id: postId } = await params;

    // Authorization: user must be able to see the post to like it
    const post = await assertCanAccessPost(postId, userId);
    if (!post) {
      return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    }

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    let liked: boolean;
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await prisma.like.create({ data: { userId, postId } });
      liked = true;
    }

    const count = await prisma.like.count({ where: { postId } });
    return NextResponse.json({ liked, count });
  } catch (error) {
    console.error("POST /api/posts/[id]/like error:", error);
    return NextResponse.json(
      { error: { message: "Failed to toggle like." } },
      { status: 500 }
    );
  }
}

// GET /api/posts/[id]/like — who liked (paginated)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 20;

    const session = await auth();
    const userId = session?.user?.id ?? null;

    const post = await assertCanAccessPost(postId, userId);
    if (!post) {
      return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    }

    const likes = await prisma.like.findMany({
      where: { postId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    let nextCursor: string | null = null;
    if (likes.length > limit) {
      nextCursor = likes.pop()!.id;
    }

    return NextResponse.json({ likes, nextCursor });
  } catch (error) {
    console.error("GET /api/posts/[id]/like error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch likes." } },
      { status: 500 }
    );
  }
}
