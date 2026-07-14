# Implementation Plan — Appifylab Full Stack Selection Task

Stack (latest, verified July 2026): Next.js 16.2.10 LTS (App Router, Turbopack) + React 19.2 + TypeScript 5.7 + PostgreSQL 17 + Prisma ORM 6.x (driver adapters) + Auth.js v5 (Credentials provider) + Tailwind CSS v4 + Node.js 22 LTS + Redis 7.4 + S3/Cloudinary + Docker.

---

## 1. Stack Choice & Why (version-pinned, w/ rationale)

| Layer | Version | Why |
|---|---|---|
| Next.js | **16.2.10 LTS** | current stable (16.x line), Turbopack default bundler, Cache Components, async request APIs, `proxy.ts` replaces old `middleware.ts` naming. Node 20+ required — we use 22. |
| React | **19.2** | ships w/ Next 16, Server Components stable, Actions API for forms. |
| Node.js | **22 LTS** | Next 16 hard-requires ≥20.9; 22 is current LTS, best perf + longest support window. |
| TypeScript | **5.7+** | strict mode, satisfies latest Next/Prisma type defs. |
| PostgreSQL | **17** | improved query planner, better JSON + partitioning perf — matters at "millions of posts" scale. |
| Prisma ORM | **6.x** (driver adapters, no Rust engine binary) | type-safe queries/migrations, `@prisma/adapter-pg` for direct pg driver = faster cold starts on serverless. |
| Auth | **Auth.js v5** (Credentials provider) — *Better Auth* noted as modern alt | Auth.js v5 = current major, native App Router support, edge-compatible JWT sessions, built-in CSRF. Better Auth is the emerging 2026 alternative (now under the same org as Auth.js) with simpler API/session mgmt — either is defensible; plan below uses Auth.js v5 since it has more mature Prisma docs. |
| Tailwind CSS | **v4** | CSS-first config (no `tailwind.config.js` needed), faster builds — used only to replicate provided design 1:1, not to redesign. |
| Redis | **7.4** | cache feed pages, like counts, rate-limit store. |
| Image storage | **S3 + CloudFront** (or Cloudinary) | never store blobs in Postgres. |
| Containerization | **Docker + docker-compose** | local dev parity, easy deploy. |

**Security note (from Next.js 16 May/June 2026 security releases):** stay current — Next.js shipped coordinated CVE patches in 2026 for middleware/proxy bypass, SSRF via WebSocket upgrades, and cache poisoning. Pin to `16.2.10` or later, enable Dependabot/renovate on `next`, `react`, `prisma`, `next-auth` to auto-catch future advisories.

---

## 2. Project Structure

```
/app
  /(auth)/login/page.tsx
  /(auth)/register/page.tsx
  /(protected)/feed/page.tsx
  /api/auth/[...nextauth]/route.ts
  /api/posts/route.ts            (GET list, POST create)
  /api/posts/[id]/like/route.ts
  /api/posts/[id]/comments/route.ts
  /api/comments/[id]/like/route.ts
  /api/comments/[id]/replies/route.ts
/components
  PostCard.tsx, CommentThread.tsx, LikeButton.tsx, CreatePostForm.tsx
/lib
  prisma.ts, auth.ts, s3.ts, redis.ts, validators.ts (zod)
/prisma
  schema.prisma
proxy.ts        (route protection — renamed from middleware.ts in Next.js 16)
```

> Next.js 16 renamed `middleware.ts` → `proxy.ts` for App Router auth/routing guards. Also: request APIs (`cookies()`, `headers()`, dynamic route `params`) are **async-only** now — every server component/route handler using them must `await`.

---

## 3. Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  firstName String
  lastName  String
  email     String   @unique
  password  String   // bcrypt hash
  createdAt DateTime @default(now())
  posts     Post[]
  comments  Comment[]
  likes     Like[]
}

model Post {
  id         String   @id @default(cuid())
  content    String
  imageUrl   String?
  visibility Visibility @default(PUBLIC)
  authorId   String
  author     User     @relation(fields: [authorId], references: [id])
  comments   Comment[]
  likes      Like[]
  createdAt  DateTime @default(now())

  @@index([createdAt])
  @@index([authorId])
  @@index([visibility, createdAt])
}

model Comment {
  id        String   @id @default(cuid())
  content   String
  postId    String
  post      Post     @relation(fields: [postId], references: [id])
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  parentId  String?  // self-relation = replies
  parent    Comment? @relation("Replies", fields: [parentId], references: [id])
  replies   Comment[] @relation("Replies")
  likes     Like[]
  createdAt DateTime @default(now())

  @@index([postId])
  @@index([parentId])
}

model Like {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  postId    String?
  commentId String?
  post      Post?    @relation(fields: [postId], references: [id])
  comment   Comment? @relation(fields: [commentId], references: [id])
  createdAt DateTime @default(now())

  @@unique([userId, postId])
  @@unique([userId, commentId])
  @@index([postId])
  @@index([commentId])
}

enum Visibility {
  PUBLIC
  PRIVATE
}
```

Key points:
- `Like` polymorphic via nullable postId/commentId (works for comments AND replies since replies are just Comments w/ parentId).
- Unique constraints prevent double-liking.
- Indexes on `createdAt`, `authorId`, `visibility` support feed pagination at scale.

---

## 4. Auth Flow

1. **Register**: `POST /api/register` → zod validate → bcrypt hash password (cost 12) → create User → auto sign-in.
2. **Login**: NextAuth Credentials provider → verify bcrypt → issue JWT (httpOnly, secure, sameSite=lax cookie).
3. **proxy.ts** (Next.js 16 route guard, replaces old middleware.ts): checks JWT on `/feed/*`, redirects to `/login` if absent/invalid. Watch for the 2026 CVE class (middleware/proxy authorization bypass via segment-prefetch + dynamic param injection) — always re-validate auth server-side in the route handler too, never trust proxy-layer check alone.
4. **Authorization**: every mutating API route re-checks `getServerSession()` server-side (never trust client).

---

## 5. Feed Page Logic

**Query (cursor pagination, not offset — scales to millions rows):**

```sql
SELECT * FROM Post
WHERE (visibility = 'PUBLIC' OR authorId = :currentUserId)
  AND createdAt < :cursor
ORDER BY createdAt DESC
LIMIT 20;
```

- Private posts filtered at query level (never sent to client if not owner) — security by query, not UI hiding.
- Include `_count.likes`, `likedByMe` (subquery/join on Like table), author info, top-level comments count.
- Comments/replies lazy-loaded on expand (`GET /api/posts/:id/comments?parentId=null` then per-reply fetch) to avoid N+1 payload bloat.

**Create Post:**
- `POST /api/posts` — multipart or presigned S3 URL upload → save `imageUrl` in DB.
- Validate content length, sanitize (prevent XSS — escape on render too, React does this by default; still sanitize server-side for stored data reused elsewhere).

**Like/Unlike:**
- Toggle endpoint: upsert/delete on `Like` table using unique constraint → idempotent.
- Return updated count optimistically on client (optimistic UI) then reconcile.

**Who liked (list):**
- `GET /api/posts/:id/likes` → paginated list of users, cached in Redis (invalidate on like/unlike).

---

## 6. Security Checklist

- Password hashing: bcrypt/argon2, never plaintext/reversible.
- JWT: httpOnly + secure + short expiry + refresh rotation.
- CSRF: NextAuth default protection + SameSite cookies.
- Input validation: zod schemas on every API route (both client and server side).
- Rate limiting: Redis-based limiter on login/register/post-create to stop brute force/spam.
- SQL injection: N/A (Prisma parameterizes queries).
- XSS: React auto-escapes; sanitize any HTML rendering (e.g. DOMPurify if rich text allowed).
- Authorization: server-side ownership checks before edit/delete (private post never returned to non-owner, even via direct API call).
- File upload: restrict mime-type/size, use presigned S3 URLs (never proxy raw file through server), scan/validate extension.
- HTTPS everywhere, HSTS header.
- Env secrets via `.env` + never committed, use secret manager in prod.
- **Dependency hygiene**: pin `next@16.2.10+`, enable Dependabot/Renovate — Next.js shipped multiple 2026 CVE patches (middleware/proxy bypass, SSRF via WebSocket upgrade, cache poisoning); staying current matters, not boilerplate advice.

---

## 7. Scaling for Millions of Posts/Reads

- **Cursor-based pagination** (not OFFSET — avoids full table scan at high offsets).
- **Composite indexes**: `(visibility, createdAt)`, `(authorId)`, `(postId)` on likes/comments.
- **Read replicas**: Postgres primary (writes) + replicas (reads) once traffic grows.
- **Redis caching**: hot feed pages, like counts, session lookups.
- **CDN** for images (S3 + CloudFront).
- **Denormalize counts** (likeCount, commentCount columns on Post, updated via trigger or app-level increment) to avoid COUNT(*) on every feed load.
- **Horizontal scaling**: stateless Next.js app servers behind load balancer (JWT = no server-side session store needed).
- **Partitioning** (future): partition Post table by createdAt month if truly at massive scale.
- **Next.js 16 Cache Components**: use explicit `"use cache"` on cacheable public-feed segments; keep private/personalized data (likedByMe, private posts) out of cached scope — cross-user cache leakage was exactly the 2026 cache-poisoning CVE class, treat cache boundaries as security, not just perf.

---

## 8. Build Order (Step-by-Step in Antigravity IDE)

1. **Scaffold**: `npx create-next-app@latest --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` (pulls Next 16.2.10, React 19.2, Tailwind v4, Turbopack default). Verify `node -v` ≥ 22 first (Next 16 refuses Node <20.9).
2. **DB setup**: docker-compose w/ Postgres 17 + Redis 7.4 → `npm i prisma @prisma/adapter-pg pg` → `npx prisma init` → write schema above → `npx prisma migrate dev`. Use Prisma 6 driver adapters (`@prisma/adapter-pg`) — no Rust engine binary, faster cold start if deployed serverless.
3. **Auth**: install `next-auth@5` (Auth.js v5), `@auth/prisma-adapter`, `bcryptjs`, `zod` → central `auth.ts` exporting `{ handlers, auth, signIn, signOut }` → wire `app/api/auth/[...nextauth]/route.ts` → Credentials provider (email+password) → register API route → login/register pages (reuse provided HTML/CSS, convert to JSX, keep exact design).
4. **proxy.ts**: protect `/feed`, re-verify session server-side in each route handler too (defense in depth vs proxy-bypass CVEs).
5. **Feed page skeleton**: convert provided Feed HTML/CSS to React components (PostCard, layout) — keep design 1:1.
6. **Post CRUD**: create post API (+ S3 presigned upload) → list API w/ cursor pagination → render in feed.
7. **Likes**: Like model + toggle API + LikeButton component + "who liked" modal.
8. **Comments/Replies**: nested comment API + recursive CommentThread component + like on comments/replies.
9. **Private/Public toggle**: add visibility select on create-post form, enforce in query layer.
10. **Polish**: loading states, optimistic UI, error boundaries, empty states.
11. **Testing**: unit tests (API routes, auth logic), basic E2E (Playwright) for login→post→like→comment flow.
12. **Dockerize**: Dockerfile + docker-compose for full stack.
13. **Deploy**: Vercel (app) + Supabase/Railway/Neon (Postgres) + Upstash (Redis) + S3 or Cloudinary.
14. **Docs**: README with architecture decisions, ERD, setup instructions.
15. **Record walkthrough video** → upload unlisted YouTube.

---

## 9. Examiner Feedback — Fixes Applied (from prior rejection)

Prior submission got rejected for 8 common issues. Each addressed explicitly below — treat this section as mandatory, not optional.

**1. Frontend + backend validation both required**
- Every form (register, login, create-post, comment) gets zod schema validated **twice**: client-side (instant UX feedback) AND server-side inside the API route/Server Action, using the *same* zod schema (share via `/lib/validators.ts`) so rules never drift.
- Never trust client. Direct `curl`/Postman calls to any endpoint must be rejected same as UI-blocked input.

**2. Clear frontend error messages**
- Every API response returns structured errors: `{ error: { field?: string, message: string } }`.
- Map to inline field errors (e.g. "Password must be 8+ characters") — never a raw stack trace or generic "Something went wrong" with no context.
- Toast/banner for network/server errors ("Couldn't post — try again").

**3. No account-enumeration in error messages**
- Login failure (wrong email OR wrong password) → always exactly `"Invalid credentials"`. Never `"Email not found"` / `"Wrong password"`.
- Registration with existing email → generic `"Unable to create account"` (optionally send a "someone tried registering your email" notice via email instead of exposing it in the API response — out of scope but note it in docs as a future improvement).
- Apply same principle to password-reset-style flows if ever added.

**4. Rate limiting enforced server-side**
- Use Redis (`@upstash/ratelimit` or custom sliding-window counter) on:
  - Login: max 5 attempts / 15 min per IP+email combo → 429 + generic message.
  - Register: max 3 / hour per IP.
  - Post/comment creation: max N / minute per user.
- Enforced inside the API route handler itself, keyed by authenticated user ID (not just IP, not just a frontend disabled-button) — frontend throttling is UX only, never the actual control.

**5. Pagination / lazy loading everywhere — no full-table loads**
- Feed: cursor-based pagination (already in plan §5), 20 posts/page, infinite scroll or "load more".
- Comments: load top-level comments paginated (e.g. 10 at a time) per post, **not** fetched with the post.
- Replies: loaded on-demand only when a comment thread is expanded (`GET /api/comments/:id/replies?cursor=...`), never nested-included in the initial post/comment payload.
- Likes list ("who liked"): paginated modal, not full list dumped inline.

**6. Authorization, not just authentication, on every protected action**
- Authentication = "are you logged in" (session/JWT valid).
- Authorization = "are you allowed to do *this specific* action" — must be checked separately, every time:
  - Edit/delete post → `post.authorId === session.user.id`, else 403.
  - View private post → `post.authorId === session.user.id`, else 404 (not 403 — don't reveal existence).
  - Like/unlike, comment → must be authenticated, but also re-check the target post is visible to that user (public, or private+owned) before allowing interaction — otherwise a logged-in user could like/comment on someone else's private post via direct API call even though it's hidden from their feed.
  - Delete comment/reply → author of comment OR (optionally) post owner — decide and enforce consistently, document the rule.
- Centralize this in a helper, e.g. `assertCanAccessPost(postId, userId)`, reused across every route touching that post — avoid re-implementing the check ad hoc per endpoint (source of the original gap).

**7. Eliminate duplicate API calls**
- Root causes to fix: `useEffect` firing twice without dependency guards, event handlers not debounced (double-click submit), no request de-duplication.
- Fixes:
  - Disable submit buttons immediately on click until response resolves (prevent double-submit).
  - Use SWR or React Query for data fetching — built-in request dedupication, caching, and revalidation instead of manual `useEffect` + `fetch`.
  - Guard `useEffect` calls with proper dependency arrays; in Strict Mode (dev double-invoke), ensure effects are idempotent or use an abort controller.
  - For likes: optimistic UI update + single in-flight request lock (disable button until toggle API call resolves) so rapid clicks don't fire N requests.

**8. No database queries inside loops (N+1 problem)**
- Never do `posts.map(post => await prisma.like.count({ where: { postId: post.id }}))`.
- Instead:
  - Use Prisma's `include`/`select` with relations to fetch posts + like counts + author + comment counts in **one query** (e.g. `_count: { select: { likes: true, comments: true } }`).
  - Batch "likedByMe" lookups: one query `Like.findMany({ where: { userId, postId: { in: postIds }}})` after fetching the page of posts, then map in memory — not per-post query.
  - Same rule for comments→replies and comments→likes: batch-fetch by `postId IN (...)` / `commentId IN (...)`, never per-item queries inside `.map()`/`.forEach()`.
  - Add Prisma query logging in dev (`log: ['query']`) and manually audit for repeated near-identical queries before submission — this is the exact bug class that got flagged, so verify it's gone, don't just assume.

---

## 10. Deliverables Mapping

| Requirement | How satisfied |
|---|---|
| GitHub repo | push full code, clean commit history |
| Video walkthrough | record register→login→post→like→comment→reply→private/public demo |
| Live deploy | Vercel + managed Postgres/Redis |
| Documentation | README.md: stack rationale, ERD, setup steps, security notes (this file expands that) |

---

## 11. Time-Permitting Improvements

- Infinite scroll w/ intersection observer.
- Image optimization (`next/image`, resize on upload via Lambda/sharp).
- WebSocket/SSE for real-time like/comment updates.
- Soft-delete instead of hard delete (audit trail).
- Full-text search on posts (Postgres `tsvector` or Meilisearch).
