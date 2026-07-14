"use client";

import { useState, useRef } from "react";

interface CreatePostFormProps {
  onPostCreated: (post: any) => void;
  userFirstName: string;
}

export default function CreatePostForm({ onPostCreated, userFirstName }: CreatePostFormProps) {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Only image files allowed.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!content.trim()) {
      setError("Post content cannot be empty.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          visibility,
          imageUrl: imagePreview ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Failed to post. Try again.");
        return;
      }
      onPostCreated(data.post);
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setVisibility("PUBLIC");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="_create_post_wrap">
      <div className="_create_post_box">
        <div className="_create_post_top">
          <div className="_create_post_input_wrap">
            <div className="_create_post_img">
              <img src="/assets/images/Avatar.png" alt="Avatar" />
            </div>
            <form onSubmit={handleSubmit} className="w-100">
              <textarea
                id="post-content-input"
                className="_create_post_input form-control"
                placeholder={`What's on your mind, ${userFirstName}?`}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setError("");
                }}
                rows={3}
                maxLength={5000}
                disabled={loading}
              />
              {imagePreview && (
                <div className="mt-2 position-relative" style={{ maxWidth: 300 }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: "100%", borderRadius: 8 }}
                  />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageFile(null); }}
                    className="btn btn-sm btn-danger position-absolute top-0 end-0"
                    style={{ margin: 4 }}
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              )}
              {error && (
                <p className="text-danger mt-1" style={{ fontSize: 13 }}>{error}</p>
              )}
              <div className="_create_post_bottom d-flex align-items-center gap-2 mt-2 flex-wrap">
                <button
                  type="button"
                  className="_create_post_bottom_link"
                  onClick={() => fileRef.current?.click()}
                  title="Add image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="#1890FF" strokeWidth="1.5"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="#1890FF"/>
                    <path d="M3 16l5-5 4 4 3-3 4 4" stroke="#1890FF" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>Photo</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="d-none"
                  onChange={handleImageChange}
                  aria-label="Upload image"
                />
                <select
                  id="post-visibility-select"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "PRIVATE")}
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                >
                  <option value="PUBLIC">🌍 Public</option>
                  <option value="PRIVATE">🔒 Private</option>
                </select>
                <button
                  type="submit"
                  id="post-submit-btn"
                  className="_btn1 ms-auto"
                  style={{ padding: "8px 20px", fontSize: 14 }}
                  disabled={loading || !content.trim()}
                >
                  {loading ? "Posting…" : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
