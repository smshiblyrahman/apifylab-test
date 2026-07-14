"use client";

import { useState } from "react";

interface LikeButtonProps {
  targetId: string;
  targetType: "post" | "comment";
  initialCount: number;
  initialLiked: boolean;
  onShowLikers?: () => void;
}

export default function LikeButton({
  targetId,
  targetType,
  initialCount,
  initialLiked,
  onShowLikers,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (loading) return;
    // Optimistic update
    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : count - 1;
    setLiked(newLiked);
    setCount(newCount);
    setLoading(true);

    try {
      const url =
        targetType === "post"
          ? `/api/posts/${targetId}/like`
          : `/api/comments/${targetId}/like`;

      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        // Revert on failure
        setLiked(!newLiked);
        setCount(count);
        return;
      }
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      setLiked(!newLiked);
      setCount(count);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="_feed_react_wrap d-inline-flex align-items-center gap-1">
      <button
        id={`like-btn-${targetType}-${targetId}`}
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className="_feed_react_link"
        aria-label={liked ? "Unlike" : "Like"}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          fill={liked ? "#1890FF" : "none"}
          viewBox="0 0 24 24"
        >
          <path
            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"
            stroke={liked ? "#1890FF" : "#666"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
            stroke={liked ? "#1890FF" : "#666"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {onShowLikers ? (
        <button
          type="button"
          onClick={onShowLikers}
          className="_feed_react_count"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13, color: "#666" }}
        >
          {count}
        </button>
      ) : (
        <span className="_feed_react_count" style={{ fontSize: 13, color: "#666" }}>{count}</span>
      )}
    </span>
  );
}
