# BodyFitness

An AI-configured nutrition and training web app. Describe or photograph a meal and get itemised, arithmetic-checked macros. Let the coach configure calorie, protein, carbohydrate, fat, fibre, water and step targets from your profile and goal, with plain-language reasoning. Get a weekly adherence review with the smallest change that will move the needle. Everything is local-first: the app works fully without an account, and sign-in adds cloud sync and a private Circle.

## Stack

| Layer | Technology |
|---|---|
| Web app | Next.js 16 (App Router, webpack), React 19, Tailwind v4, shadcn-style primitives, Geist |
| AI | Azure AI Foundry · Responses API · `gpt-5.6-sol` with strict JSON schema output, reasoning effort per task, deterministic nutrition guard |
| State | Zustand (persisted, versioned migrations), IndexedDB for photos |
| Cloud (optional) | Clerk auth · Fastify 5 + Drizzle + Postgres on Railway (`apps/api`) |
| Mobile (parked) | Expo app in `apps/mobile`, not part of the web release |

## AI engine

All model traffic goes through `src/lib/ai/server.ts`, which wraps the OpenAI SDK pointed at Azure AI Foundry's OpenAI-compatible endpoint. No proxy is required in production.

| Route | Purpose | Effort |
|---|---|---|
| `POST /api/ai/food` | Meal analysis from a photo, a text description, or both. Returns items with portions, grams, macros, fibre, per-item confidence, warnings and a protein tip. | `AI_EFFORT_ANALYSIS` |
| `POST /api/ai/plan` | Configures daily targets. Server computes the Mifflin/Katch baseline, the model tunes it inside a safety envelope, the guard enforces `kcal ≈ 4P + 4C + 9F`. | `AI_EFFORT_ANALYSIS` |
| `POST /api/ai/coach` | Weekly review: adherence score, wins, risks, adjustments, next actions, optional target suggestion. | `AI_EFFORT_COACH` |
| `POST /api/ai/voice-set` | Transcribes a spoken set and extracts kg/reps. | `AI_EFFORT_FAST` |
| `GET /api/health` | Liveness + which model/provider is configured (no secrets). | — |

Every route validates input with Zod, is rate-limited per client, returns `{ error, code }` on failure, and never trusts the model's arithmetic: `src/lib/ai/nutrition-guard.ts` re-sums itemised totals, reconciles calories against macros, and clamps plans to evidence-based bounds. Prompts live in `src/lib/ai/prompts.ts`.

### Environment

```bash
AI_API_KEY=…                                # or AZURE_OPENAI_API_KEY / OPENAI_API_KEY
AZURE_AI_RESOURCE=satvikxs-8248-resource    # → https://<resource>.services.ai.azure.com/openai/v1
AI_MODEL=gpt-5.6-sol
AI_SERVICE_TIER=priority                    # optional
AI_EFFORT_FAST=low  AI_EFFORT_ANALYSIS=medium  AI_EFFORT_COACH=high
```

To use OpenAI directly instead, set `AI_BASE_URL=https://api.openai.com/v1` and an OpenAI key. See `.env.example` for everything else.

## Local development

```bash
corepack enable pnpm
pnpm install
cp .env.example .env.local     # add AI_API_KEY
pnpm dev                       # http://localhost:3000
```

## Verification

```bash
pnpm verify        # lint + typecheck + tests + production build (web only)
pnpm test          # all workspaces
```

## Deployment

The web app deploys to Vercel from the repository root (`vercel.json` scopes the install to the web workspace). The optional cloud API deploys to Railway from `apps/api`. Step-by-step instructions, required variables and the release checklist are in [docs/deployment.md](docs/deployment.md).

## Repository layout

```text
src/app            routes: /, /workout, /nutrition, /progress, /profile, /api/*
src/components     ui/ primitives · ai/ (plan configurator, coach card) · feature folders
src/lib/ai         config · schemas · prompts · nutrition guard · server wrapper · client
src/lib            store, calculations, training metrics, cloud sync
packages/contracts shared Zod contracts for cloud sync
packages/core      shared calculations
apps/api           Fastify + Drizzle cloud API (Railway)
apps/mobile        Expo app (parked)
```
