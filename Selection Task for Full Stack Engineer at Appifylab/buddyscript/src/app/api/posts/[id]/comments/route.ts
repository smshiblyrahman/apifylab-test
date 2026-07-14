import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createCommentSchema } from "@/lib/validators";

// GET /api/posts/[id]/comments?cursor=&limit=
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);
    const session = await auth();
    const userId = session?.user?.id ?? null;

    // Check post visibility
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { visibility: true, authorId: true },
    });
    if (!post) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    if (post.visibility === "PRIVATE" && post.authorId !== userId) {
      return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    }

    // Top-level comments only (parentId = null)
    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });

    let nextCursor: string | null = null;
    if (comments.length > limit) {
      nextCursor = comments.pop()!.id;
    }

    // Batch liked-by-me lookup
    let likedCommentIds: Set<string> = new Set();
    if (userId && comments.length > 0) {
      const commentIds = comments.map((c) => c.id);
      const myLikes = await prisma.like.findMany({
        where: { userId, commentId: { in: commentIds } },
        select: { commentId: true },
      });
      likedCommentIds = new Set(myLikes.map((l) => l.commentId!));
    }

    const data = comments.map((c) => ({
      ...c,
      likedByMe: likedCommentIds.has(c.id),
    }));

    return NextResponse.json({ comments: data, nextCursor });
  } catch (error) {
    console.error("GET /api/posts/[id]/comments error:", error);
    return NextResponse.json({ error: { message: "Failed to load comments." } }, { status: 500 });
  }
}

// POST /api/posts/[id]/comments
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

    const body = await req.json();
    const parsed = createCommentSchema.safeParse({ ...body, postId });
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      return NextResponse.json(
        { error: { message: firstError ?? "Invalid input" } },
        { status: 422 }
      );
    }

    // Authorization: can user see this post?
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { visibility: true, authorId: true },
    });
    if (!post) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    if (post.visibility === "PRIVATE" && post.authorId !== userId) {
      return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    }

    const { content, parentId } = parsed.data;

    const comment = await prisma.comment.create({
      data: { content, postId, authorId: userId, parentId: parentId ?? null },
      select: {
        id: true,
        content: true,
        createdAt: true,
        parentId: true,
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts/[id]/comments error:", error);
    return NextResponse.json({ error: { message: "Failed to post comment." } }, { status: 500 });
  }
}
