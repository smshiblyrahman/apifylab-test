"use client";

import { useState } from "react";
import LikeButton from "./LikeButton";
import CommentThread from "./CommentThread";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    imageUrl: string | null;
    visibility: "PUBLIC" | "PRIVATE";
    createdAt: string;
    author: { id: string; firstName: string; lastName: string };
    _count: { likes: number; comments: number };
    likedByMe: boolean;
  };
  currentUserId: string | null;
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

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentCursor, setCommentCursor] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(post._count.comments);
  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<any[]>([]);
  const [likerLoading, setLikerLoading] = useState(false);

  async function loadComments() {
    if (commentLoading) return;
    setCommentLoading(true);
    try {
      const url = new URL(`/api/posts/${post.id}/comments`, window.location.origin);
      if (commentCursor) url.searchParams.set("cursor", commentCursor);
      const res = await fetch(url.toString());
      const data = await res.json();
      setComments((prev) => [...prev, ...(data.comments ?? [])]);
      setCommentCursor(data.nextCursor);
    } finally {
      setCommentLoading(false);
    }
  }

  async function toggleComments() {
    if (!showComments && comments.length === 0) {
      await loadComments();
    }
    setShowComments((v) => !v);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (postingComment || !newComment.trim()) return;
    setPostingComment(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommentError(data.error?.message ?? "Failed to post comment.");
        return;
      }
      setComments((prev) => [...prev, { ...data.comment, likedByMe: false }]);
      setCommentCount((n) => n + 1);
      setNewComment("");
      setShowComments(true);
    } finally {
      setPostingComment(false);
    }
  }

  async function loadLikers() {
    if (likerLoading) return;
    setLikerLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`);
      const data = await res.json();
      setLikers(data.likes ?? []);
    } finally {
      setLikerLoading(false);
    }
  }

  async function handleShowLikers() {
    setShowLikers(true);
    await loadLikers();
  }

  return (
    <div className="_feed_post_wrap">
      <div className="_feed_post_box">
        {/* Header */}
        <div className="_feed_post_top">
          <div className="_feed_post_profile">
            <div className="_feed_post_profile_img">
              <img src="/assets/images/Avatar.png" alt="avatar" />
            </div>
            <div className="_feed_post_profile_txt">
              <h4 className="_feed_post_profile_name" style={{ fontSize: 14 }}>
                {post.author.firstName} {post.author.lastName}
              </h4>
              <p className="_feed_post_profile_time" style={{ fontSize: 12 }}>
                {timeAgo(post.createdAt)}
                {" · "}
                {post.visibility === "PRIVATE" ? (
                  <span title="Private">🔒</span>
                ) : (
                  <span title="Public">🌍</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="_feed_post_content">
          <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{post.content}</p>
          {post.imageUrl && (
            <div className="_feed_post_img mt-2">
              <img
                src={post.imageUrl}
                alt="Post image"
                style={{ borderRadius: 8, maxHeight: 500, objectFit: "cover", width: "100%" }}
              />
            </div>
          )}
        </div>

        {/* Reaction bar */}
        <div className="_feed_post_react_wrap d-flex align-items-center gap-3 mt-2">
          <LikeButton
            targetId={post.id}
            targetType="post"
            initialCount={post._count.likes}
            initialLiked={post.likedByMe}
            onShowLikers={handleShowLikers}
          />
          <button
            id={`comment-toggle-${post.id}`}
            type="button"
            onClick={toggleComments}
            className="_feed_react_link d-flex align-items-center gap-1"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#666" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {commentCount}
          </button>
        </div>

        {/* Comment input */}
        {currentUserId && (
          <form onSubmit={submitComment} className="d-flex gap-2 mt-2">
            <input
              id={`comment-input-${post.id}`}
              type="text"
              className="form-control form-control-sm"
              placeholder="Write a comment…"
              value={newComment}
              onChange={(e) => { setNewComment(e.target.value); setCommentError(""); }}
              disabled={postingComment}
              maxLength={2000}
            />
            <button
              type="submit"
              className="_btn1"
              style={{ whiteSpace: "nowrap", fontSize: 12, padding: "4px 12px" }}
              disabled={postingComment || !newComment.trim()}
            >
              {postingComment ? "…" : "Send"}
            </button>
          </form>
        )}
        {commentError && <p style={{ fontSize: 12, color: "red" }}>{commentError}</p>}

        {/* Comments list */}
        {showComments && (
          <div className="_comment_list mt-2">
            {comments.map((c) => (
              <CommentThread
                key={c.id}
                comment={c}
                postId={post.id}
                currentUserId={currentUserId}
              />
            ))}
            {commentCursor && (
              <button
                type="button"
                onClick={loadComments}
                disabled={commentLoading}
                style={{ fontSize: 12, color: "#1890FF", background: "none", border: "none", cursor: "pointer" }}
              >
                {commentLoading ? "Loading…" : "Load more comments"}
              </button>
            )}
            {commentLoading && comments.length === 0 && (
              <p style={{ fontSize: 12, color: "#aaa" }}>Loading comments…</p>
            )}
          </div>
        )}
      </div>

      {/* Who liked modal */}
      {showLikers && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowLikers(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Who liked this post"
        >
          <div
            className="modal-dialog modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontSize: 15 }}>Liked by</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowLikers(false)}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                {likerLoading ? (
                  <p>Loading…</p>
                ) : likers.length === 0 ? (
                  <p style={{ fontSize: 13 }}>No likes yet.</p>
                ) : (
                  <ul className="list-unstyled">
                    {likers.map((l: any) => (
                      <li key={l.id} style={{ fontSize: 13, padding: "4px 0" }}>
                        {l.user.firstName} {l.user.lastName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
