# Deployment

## 1. Vercel — web app

1. Import the repository. Framework preset: Next.js. Root directory: repository root. `vercel.json` already sets the install command to `pnpm install --filter bodyfitness... --frozen-lockfile`, so the Expo and API workspaces are not installed.
2. Node 22+ (the `engines` field enforces it). Vercel uses corepack for `pnpm@11.19.0` from `packageManager`.
3. Environment variables (Production + Preview):

   | Variable | Value |
   |---|---|
   | `AI_API_KEY` | Azure AI Foundry key for the `satvikxs-8248-resource` resource |
   | `AZURE_AI_RESOURCE` | `satvikxs-8248-resource` |
   | `AI_MODEL` | `gpt-5.6-sol` |
   | `AI_SERVICE_TIER` | `priority` (optional; Codex calls this "fast") |
   | `AI_EFFORT_ANALYSIS` / `AI_EFFORT_COACH` / `AI_EFFORT_FAST` | `medium` / `high` / `low` (optional) |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | only if enabling accounts |
   | `NEXT_PUBLIC_API_BASE_URL` | Railway API URL, only if enabling cloud sync |

4. **Accounts and saved data**: set `DATABASE_URL` to any hosted Postgres (Railway Postgres, Neon, Supabase). Tables are created automatically on first use (`app_users`, `app_sessions`, `app_state`). Without it the app runs device-only and `/login` explains that accounts are off.
5. AI routes export `maxDuration = 60`; keep the project on Fluid Compute so long reasoning calls are not cut off.
6. After the first deploy, open `/api/health` — it must report `ai.configured: true` with the expected model and provider.
7. Add the production origin to Azure AI Foundry's allowed origins only if you enable browser-side calls (the app does not; all calls are server-side).

The local Codex proxy on `:8777` is **not** needed: it only patches a Codex CLI quirk. The app calls `https://<resource>.services.ai.azure.com/openai/v1` directly with a Bearer key.

## 2. Railway — cloud API (optional)

Deploy `apps/api` with `apps/api/railway.toml` (Nixpacks; migrations run pre-deploy; healthcheck `/health`). Variables: `DATABASE_URL`, `CLERK_SECRET_KEY`, `WEB_APP_URL` (the Vercel origin), `ALLOWED_ORIGINS` (comma-separated, include Vercel production and preview origins). Point the web app at it with `NEXT_PUBLIC_API_BASE_URL`.

The API does not call the model; AI stays inside the Next.js server so one key and one rate limiter govern it.

## 3. Clerk (optional)

Enable Apple, Google and email-link sign-in. Register the Vercel production and preview origins and, if the mobile app is revived, the `bodyfitness://auth` redirect.

## 4. Release checklist

- `pnpm verify` green locally.
- `/api/health` returns the intended model in production.
- Log a meal by text, by photo, run "Configure with AI" from Profile, and "Run review" from Home on the production URL.
- Theme flash: set `localStorage["bodyfitness-store"]` to `{"state":{"themePreference":"light"}}`, hard reload, no dark flash; repeat with `"dark"`.
- Check 390, 768, 1024 and 1280 px widths, both themes, and reduced motion.
- Installed PWA rotates on tablets (`orientation: any`) and safe-area insets still apply.

## 5. Privacy and compliance

Accounts are private, connections mutual, birth date only enforces 13+, physique photos stay on device, and account deletion removes cloud profile, connections, steps, logs, achievements and devices. Meal photos are sent to the model for analysis and are not stored server-side. Public release still requires the youth-privacy, health-data, retention/deletion, abuse-reporting and store compliance review noted by product owners.
