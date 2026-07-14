"use client";

import { useState, useEffect, useCallback } from "react";
import PostCard from "@/components/PostCard";
import CreatePostForm from "@/components/CreatePostForm";

interface FeedClientProps {
  userId: string;
  userFirstName: string;
  userFullName: string;
}

export default function FeedClient({ userId, userFirstName, userFullName }: FeedClientProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const loadPosts = useCallback(async (currentCursor: string | null = null, reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const url = new URL("/api/posts", window.location.origin);
      if (currentCursor) url.searchParams.set("cursor", currentCursor);
      const res = await fetch(url.toString());
      const data = await res.json();
      const newPosts = data.posts ?? [];
      setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
      setCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [loading]);

  useEffect(() => {
    loadPosts(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePostCreated(post: any) {
    setPosts((prev) => [{ ...post, likedByMe: false }, ...prev]);
  }

  return (
    <>
      {/* Create post box */}
      <div className="_feed_create_post_wrap">
        <CreatePostForm onPostCreated={handlePostCreated} userFirstName={userFirstName} />
      </div>

      {/* Feed posts */}
      <div className="_feed_posts_wrap">
        {!initialLoaded && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading…</span>
            </div>
          </div>
        )}

        {initialLoaded && posts.length === 0 && (
          <div className="_feed_post_wrap">
            <div className="_feed_post_box text-center py-4">
              <p style={{ color: "#aaa" }}>No posts yet. Be the first to post!</p>
            </div>
          </div>
        )}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={userId} />
        ))}

        {hasMore && (
          <div className="text-center py-3">
            <button
              id="load-more-posts-btn"
              type="button"
              onClick={() => loadPosts(cursor)}
              disabled={loading}
              className="_btn1"
              style={{ padding: "8px 24px" }}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
