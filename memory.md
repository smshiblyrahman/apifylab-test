# Memory — Appifylab Full Stack Selection Task

Last updated: 2026-07-11 15:04 BST+6

## What was built

**Project location:** `Selection Task for Full Stack Engineer at Appifylab/buddyscript/`

**Files created:**
- `prisma/schema.prisma` — User, Post, Comment, Like, Visibility enum (Prisma 7)
- `prisma.config.ts` — minimal Prisma 7 config pointing at schema
- `src/lib/prisma.ts` — PrismaClient singleton w/ PrismaPg adapter
- `src/lib/auth.ts` — Auth.js v5 Credentials provider, JWT strategy
- `src/lib/validators.ts` — Zod schemas: register, login, createPost, createComment
- `src/lib/ratelimit.ts` — Upstash rate limiter w/ graceful dev fallback
- `src/lib/cloudinary.ts` — Cloudinary upload helper
- `src/proxy.ts` — Route protection (renamed from middleware.ts per Next.js 16)
- `src/app/layout.tsx` — Root layout with original CSS/fonts loaded from /public/assets
- `src/app/page.tsx` — Root redirect to /feed or /login
- `src/app/login/page.tsx` — Login page (exact original design as JSX)
- `src/app/register/page.tsx` — Register page (firstName, lastName, email, password, confirm)
- `src/app/feed/page.tsx` — Feed page (server component, session-protected)
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js handler
- `src/app/api/register/route.ts` — Registration API (rate limited, generic errors)
- `src/app/api/posts/route.ts` — Posts GET (cursor pagination) + POST (create)
- `src/app/api/posts/[id]/like/route.ts` — Like toggle + who-liked list
- `src/app/api/posts/[id]/comments/route.ts` — Comments GET + POST
- `src/app/api/comments/[id]/replies/route.ts` — Replies GET
- `src/app/api/comments/[id]/like/route.ts` — Comment like toggle
- `src/components/CreatePostForm.tsx` — Post creation with image upload + visibility
- `src/components/LikeButton.tsx` — Optimistic like button (posts + comments)
- `src/components/CommentThread.tsx` — Recursive comment/reply threads
- `src/components/PostCard.tsx` — Full post card with comments + who-liked modal
- `src/components/FeedClient.tsx` — Client feed with cursor pagination
- `docker-compose.yml` — PostgreSQL 17 + Redis 7.4
- `README.md` — Architecture decisions + setup instructions
- `.env` — env vars template

**Assets:** Copied original `assets/` → `public/assets/` (CSS, images, fonts, JS).

## Decisions made

- **Prisma 7** (not 6) — installed via npm, requires `prisma.config.ts` + no `url` in `datasource`. 
- **next-auth@5.0.0-beta.31** — latest beta (v5 stable not yet released).
- **proxy.ts** (not middleware.ts) — Next.js 16 renamed convention.
- **Prisma adapter**: `@prisma/adapter-pg` used in both `prisma.ts` and migrate config.
- **globals.css**: stripped Tailwind base — original design CSS served from `/public/assets/css/`.
- **TypeScript passes clean** (`npx tsc --noEmit` — 0 errors).
- **Dev server boots** at `http://localhost:3000`.

## Problems solved

- Prisma 7 validation error: `url` not allowed in schema `datasource` — moved to `prisma.config.ts`.
- `next-auth@5` not found — used `next-auth@5.0.0-beta.31`.
- Prisma init refused (folder existed) — skipped `prisma init`, wrote schema directly.
- `Visibility` type: string literals not assignable — imported `Visibility` enum from `@prisma/client`.
- `earlyAccess`/`migrate` not in `PrismaConfig` type — simplified `prisma.config.ts` to minimal form.

## Current state

- All source files written ✅
- TypeScript clean ✅  
- Prisma client generated ✅
- Dev server boots at localhost:3000 ✅
- **DB Migrated** ✅ (Postgres mapped to port 5433 to avoid host conflicts)
- `proxy.ts` renamed ✅ (was `middleware.ts`)
- **Not yet tested in browser** — need Cloudinary env vars to test full flow

## Next session starts with

1. Add Cloudinary and Upstash credentials to `.env` (user action needed).
2. Start dev server: `npm run dev` (if not running).
3. Test register → login → create post → like → comment → reply flow in browser.
4. Fix any runtime bugs surfaced.
5. Deploy to Vercel + Neon + Upstash + Cloudinary.

## Open questions

- Cloudinary account needed for image uploads — user to provide credentials.
- Upstash Redis needed for rate limiting (optional in dev — falls back gracefully).
- Auth.js v5 beta may have quirks — test full auth flow carefully.
- Next.js 16 `proxy.ts` convention — verify route protection works correctly.
