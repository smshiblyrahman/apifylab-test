"use client";

import { useState } from "react";
import LikeButton from "./LikeButton";

interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  author: CommentAuthor;
  _count: { likes: number; replies: number };
  likedByMe: boolean;
}

interface CommentThreadProps {
  comment: CommentData;
  postId: string;
  currentUserId: string | null;
  depth?: number;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CommentThread({
  comment,
  postId,
  currentUserId,
  depth = 0,
}: CommentThreadProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<CommentData[]>([]);
  const [replyCursor, setReplyCursor] = useState<string | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyError, setReplyError] = useState("");
  const [postingReply, setPostingReply] = useState(false);
  const [replyCount, setReplyCount] = useState(comment._count.replies);

  async function loadReplies() {
    if (replyLoading) return;
    setReplyLoading(true);
    try {
      const url = new URL(`/api/comments/${comment.id}/replies`, window.location.origin);
      if (replyCursor) url.searchParams.set("cursor", replyCursor);
      const res = await fetch(url.toString());
      const data = await res.json();
      setReplies((prev) => [...prev, ...(data.replies ?? [])]);
      setReplyCursor(data.nextCursor);
    } finally {
      setReplyLoading(false);
    }
  }

  async function toggleReplies() {
    if (!showReplies && replies.length === 0) {
      await loadReplies();
    }
    setShowReplies((v) => !v);
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (postingReply || !replyContent.trim()) return;
    setPostingReply(true);
    setReplyError("");
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim(), parentId: comment.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReplyError(data.error?.message ?? "Failed to post reply.");
        return;
      }
      setReplies((prev) => [
        ...prev,
        { ...data.comment, likedByMe: false },
      ]);
      setReplyCount((n) => n + 1);
      setReplyContent("");
      setShowReplyForm(false);
      setShowReplies(true);
    } finally {
      setPostingReply(false);
    }
  }

  const indent = depth > 0 ? { marginLeft: Math.min(depth * 20, 60) } : {};

  return (
    <div className="_comment_item" style={indent}>
      <div className="_comment_img">
        <img src="/assets/images/Avatar.png" alt="avatar" />
      </div>
      <div className="_comment_txt_wrap w-100">
        <div className="_comment_txt_box">
          <p className="_comment_author" style={{ fontWeight: 600, fontSize: 13 }}>
            {comment.author.firstName} {comment.author.lastName}
          </p>
          <p className="_comment_txt" style={{ fontSize: 13 }}>
            {comment.content}
          </p>
        </div>
        <div className="_comment_actions d-flex align-items-center gap-3 mt-1">
          <LikeButton
            targetId={comment.id}
            targetType="comment"
            initialCount={comment._count.likes}
            initialLiked={comment.likedByMe}
          />
          {depth === 0 && (
            <button
              type="button"
              onClick={() => setShowReplyForm((v) => !v)}
              className="_feed_react_link"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#666" }}
            >
              Reply
            </button>
          )}
          {replyCount > 0 && depth === 0 && (
            <button
              type="button"
              onClick={toggleReplies}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#1890FF" }}
            >
              {showReplies ? "Hide" : `View ${replyCount} repl${replyCount === 1 ? "y" : "ies"}`}
            </button>
          )}
          <span style={{ fontSize: 11, color: "#aaa" }}>{timeAgo(comment.createdAt)}</span>
        </div>

        {showReplyForm && (
          <form onSubmit={submitReply} className="d-flex gap-2 mt-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Write a reply…"
              value={replyContent}
              onChange={(e) => { setReplyContent(e.target.value); setReplyError(""); }}
              disabled={postingReply}
              maxLength={2000}
              autoFocus
            />
            <button
              type="submit"
              className="_btn1"
              style={{ whiteSpace: "nowrap", fontSize: 12, padding: "4px 12px" }}
              disabled={postingReply || !replyContent.trim()}
            >
              {postingReply ? "…" : "Reply"}
            </button>
          </form>
        )}
        {replyError && <p style={{ fontSize: 12, color: "red" }}>{replyError}</p>}

        {showReplies && replies.map((r) => (
          <CommentThread
            key={r.id}
            comment={r}
            postId={postId}
            currentUserId={currentUserId}
            depth={depth + 1}
          />
        ))}
        {showReplies && replyCursor && (
          <button
            type="button"
            onClick={loadReplies}
            disabled={replyLoading}
            style={{ fontSize: 12, color: "#1890FF", background: "none", border: "none", cursor: "pointer" }}
          >
            {replyLoading ? "Loading…" : "Load more replies"}
          </button>
        )}
      </div>
    </div>
  );
}
