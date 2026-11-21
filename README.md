# LifeOS

A mobile-first personal life-management app: tasks, movies, daily life, fitness, food, money, reports and settings in one place. Built for Vardhan Chintapalli (Kukatpally, Telangana) with ₹ as the default currency.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts · TanStack Query + Zustand · Prisma + PostgreSQL · NextAuth (email/password + optional Google) · Framer Motion · dnd-kit · jsPDF

> **Status:** the source was written and syntax/import-checked, but it has **not been installed, built or run** yet (the authoring sandbox had no network access). Expect to fix a few small type errors on the first `npm run typecheck`.

## Quick start

```bash
cd lifeos
cp .env.example .env            # then set NEXTAUTH_SECRET (openssl rand -base64 32)
docker compose up -d            # local PostgreSQL (or point DATABASE_URL at Supabase/Neon)
npm install
npx prisma db push              # create tables
npm run db:seed                 # demo account + 30 days of data
npm run dev                     # http://localhost:3000
```

Demo login after seeding: `vardhan@lifeos.app` / `lifeos1234`.
A brand-new account goes through onboarding and can opt in to demo data on the last step.

### Google login (optional)
Create OAuth credentials in Google Cloud Console (redirect URI `{NEXTAUTH_URL}/api/auth/callback/google`), then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `NEXT_PUBLIC_GOOGLE_ENABLED=true`.

### Deploy
Vercel + Supabase/Neon works as-is: set the four env vars, run `prisma db push` (or `prisma migrate deploy`) against the production DB, deploy. `build` runs `prisma generate`.

## How it works

- **One snapshot, instant updates.** `GET /api/snapshot` returns all of the user's data. Every score, streak, chart and alert is computed client-side from that cache (`src/lib/scores.ts`), and every mutation patches the cache optimistically (rolling back on error) before the server confirms, so the dashboard changes the moment you tick or add something.
- **Generic CRUD.** `/api/[resource]` and `/api/[resource]/[id]` serve tasks, movies, habits, workouts, body entries, meals, transactions, budgets and savings goals with Zod validation. Every query is scoped by `userId`.
- **Special endpoints:** `/api/dailylog` (upsert per day), `/api/habitlog` (toggle), `/api/profile` (+ `/password`, delete account), `/api/export` (CSV), `/api/demo` (load/clear data), `/api/register`.
- **Days are strings** (`YYYY-MM-DD`, `HH:mm`) so "today" means the same thing regardless of server time zone. Weeks run Monday–Sunday; weekly/monthly views roll over automatically and history is kept (the snapshot loads the last 400 days of logs).
- **Recurring items:** completing a recurring task creates the next occurrence; weekly/monthly transactions are materialised on load.

## Scoring rules (all in `src/lib/scores.ts`)

| Score | Rule |
|---|---|
| Food discipline (0–100) | Starts at 70. −15 outside food, −15 junk, −12 sugary food (−8 hidden sugar), −8 late-night meal, −10 if >115% of calorie goal; cheat meals cost −4 within the weekly allowance, −14 beyond it. + home food (+5), healthy (+8), good foods like fruit/dal/curd/eggs (+3 each, max 9), protein up to +10, water up to +8. |
| Streaks | No outside food / no sugar / no junk: consecutive clean days up to today. Home-cooked and habits: consecutive days (today may still be pending). Workouts allow one rest day. |
| Life score | Weighted blend of whatever is logged that day: tasks 20, habits 20, sleep 15, food 15, workout 12, mood/energy 10, water 8. Missing categories are ignored, not penalised. |
| Money discipline | Spend vs. how far through the month you are, capped by budget bands (70/90/100%), plus a savings-rate bonus. |
| Heatmap | ≥70 good · 45–69 average · <45 bad. |

## Project layout

```
prisma/            schema.prisma, seed.ts
src/app/(app)/     Home, tasks, movies, life, fitness, food, money, reports, profile, onboarding
src/app/api/       route handlers
src/components/    ui.tsx (design system), forms.tsx, charts.tsx, quick-add.tsx, app-shell.tsx, timers.tsx
src/lib/           scores, insights, notifications, hooks, store, validators, demo, export, dates
```

## Notes and known limits

- The spec's `users.password` is stored as a bcrypt hash (`passwordHash`). Reports are computed live; the `Report` table exists for caching/history but isn't written yet.
- Task "attachments" are links (no file storage is wired up). Poster images are URLs.
- Browser push reminders fire only while a LifeOS tab is open; true background push would need a service worker and a push provider.
- Rate limiting is in-memory per server instance; use Redis/Upstash if you scale out.
- PDF export uses "Rs" instead of ₹ because jsPDF's built-in fonts lack the rupee glyph.
- No automated tests are included yet.
