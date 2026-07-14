# Buddy Script — Full Stack Social App

A social platform built for the Appifylab Full Stack Engineer selection task.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Original provided CSS (Bootstrap + custom) |
| Auth | Auth.js v5 (Credentials / JWT) |
| Database | PostgreSQL 17 + Prisma 6 |
| Image storage | Cloudinary |
| Rate limiting | Upstash Redis |
| Infra | Docker Compose (local dev) |

## Quick Start

### 1. Prerequisites
- Node.js ≥ 20
- Docker Desktop (for DB)

### 2. Start DB
```bash
docker compose up -d
```

### 3. Configure env
```bash
cp .env .env.local
# Fill in AUTH_SECRET, CLOUDINARY_*, UPSTASH_* values
# DATABASE_URL is pre-filled for local Docker
```

### 4. Run migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start dev server
```bash
npm run dev
```

App runs at **http://localhost:3000**

---

## Architecture Decisions

### Auth — JWT (not sessions)
Stateless JWT cookies via Auth.js v5. No server-side session store needed.

### Cursor pagination (not OFFSET)
Cursor-based pagination uses indexed createdAt comparisons — O(log n) at any scale.

### Private posts — query-level enforcement
Private posts excluded at WHERE clause: never fetched for unauthorized users.

### N+1 prevention
- Feed: one query for posts + _count + author.
- Liked-by-me: one batch query after fetching posts, mapped in memory.

### Authorization (not just authentication)
Every mutating endpoint re-verifies server-side. Private post interactions blocked at API level.

### Rate limiting
Upstash Redis sliding window. Fails open (allows request) if not configured.

### Error messages — no enumeration
Login failures: generic "Invalid credentials". Registration: generic "Unable to create account".

---

## ERD

```
User --< Post --< Comment (self-referential for replies)
     --< Comment
     --< Like (nullable-polymorphic: postId OR commentId)
```

Unique constraints on (userId, postId) and (userId, commentId) prevent double-liking.

---

## Deployment

| Service | Provider |
|---|---|
| App | Vercel |
| Database | Neon / Supabase / Railway |
| Redis | Upstash |
| Images | Cloudinary |
