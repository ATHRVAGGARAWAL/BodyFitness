# BodyFitness

BodyFitness is a local-first fitness platform with a Next.js PWA, Expo iOS/Android apps, and a Fastify/Postgres cloud API. Personal tracking works without an account; Clerk sign-in unlocks sync, native step uploads, and a private Friends & Family Circle.

## Product surface

- Five-tab web and native dock: Home, Workout, Scan, Progress, Profile
- Apple Health steps on iOS and Health Connect steps on Android
- Manual step overrides that replace—not add to—the device total
- Mutual Circle invitations by exact handle, QR code, or expiring link
- Per-connection sharing with achievements and goal progress enabled by default
- No public profiles, contact upload, messaging, leaderboards, location sharing, meal details, weight, or physique photos in the social feed
- Offline Zustand caches with idempotent cloud sync and revision conflicts
- AI meal-photo analysis through the Next.js route when an OpenAI key is configured

## Repository layout

```text
apps/api       Fastify 5, Drizzle, Railway Postgres
apps/mobile    Expo SDK 57, Expo Router, Clerk, HealthKit, Health Connect
packages/core  Shared calculations, achievements, source precedence, tokens
packages/contracts  Shared Zod REST and sync contracts
src            Next.js 16 PWA
```

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
pnpm dev:api
pnpm dev:mobile
```

The API uses an in-memory repository outside production when `DATABASE_URL` is absent. For Postgres development, create the database and run:

```bash
pnpm --filter @bodyfitness/api db:migrate
```

Native health modules do not run in Expo Go. Use an EAS development build or `expo run:ios` / `expo run:android`.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:api
```

Deployment, Clerk, EAS, HealthKit, Health Connect, and release-gate details are in [docs/deployment.md](docs/deployment.md).
