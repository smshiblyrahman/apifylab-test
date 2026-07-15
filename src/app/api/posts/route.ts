import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createPostSchema } from "@/lib/validators";
import { uploadImage } from "@/lib/cloudinary";
import { checkRateLimit } from "@/lib/ratelimit";
import { Visibility } from "@prisma/client";

// GET /api/posts?cursor=<id>&limit=20
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const userId = session?.user?.id ?? null;

    const posts = await prisma.post.findMany({
      take: limit + 1, // fetch one extra to know if more exist
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: {
        OR: [
          { visibility: Visibility.PUBLIC },
          ...(userId ? [{ visibility: Visibility.PRIVATE, authorId: userId }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        visibility: true,
        createdAt: true,
        author: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    let likedPostIds: Set<string> = new Set();
    if (userId && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const myLikes = await prisma.like.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      });
      likedPostIds = new Set(myLikes.map((l) => l.postId!));
    }

    let nextCursor: string | null = null;
    if (posts.length > limit) {
      const next = posts.pop();
      nextCursor = next!.id;
    }

    const data = posts.map((p) => ({
      ...p,
      likedByMe: likedPostIds.has(p.id),
    }));

    return NextResponse.json({ posts: data, nextCursor });
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json(
      { error: { message: "Failed to load posts." } },
      { status: 500 }
    );
  }
}

// POST /api/posts
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }
    const userId = session.user.id;

    // Rate limit
    const { success } = await checkRateLimit("post", userId);
    if (!success) {
      return NextResponse.json(
        { error: { message: "Posting too fast. Slow down." } },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0];
      return NextResponse.json(
        { error: { message: firstError ?? "Invalid input", fields: fieldErrors } },
        { status: 422 }
      );
    }

    const { content, visibility, imageUrl } = parsed.data;

    // Upload image if data URI
    let finalImageUrl: string | null = null;
    if (imageUrl && imageUrl.startsWith("data:")) {
      finalImageUrl = await uploadImage(imageUrl);
    } else if (imageUrl) {
      finalImageUrl = imageUrl;
    }

    const post = await prisma.post.create({
      data: {
        content,
        visibility,
        imageUrl: finalImageUrl,
        authorId: userId,
      },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        visibility: true,
        createdAt: true,
        author: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create post." } },
      { status: 500 }
    );
  }
}
