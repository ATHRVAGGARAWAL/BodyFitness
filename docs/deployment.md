# Deployment and native release

## Vercel PWA

Deploy the repository root. Configure `OPENAI_API_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_API_BASE_URL`. Add the production Vercel origin to the API `ALLOWED_ORIGINS` list and to Clerk’s allowed origins/redirects.

The service worker uses versioned precaches and waits for explicit activation. Verify fresh install, Add to Home Screen, offline launch, and the in-app update/reload prompt before each release.

## Railway API and Postgres

Create a Railway Postgres service and deploy the repository with `apps/api/railway.toml`. Required variables:

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `WEB_APP_URL`, for generated invitation links
- `ALLOWED_ORIGINS`, a comma-separated web-origin allowlist

Railway runs Drizzle migrations before deploy and checks `/health`. The production server refuses to start without `DATABASE_URL`.

Use a dedicated database role. The migration enables row-level security on user, step, summary, achievement, connection, sharing, invitation, device, and report tables; the API also performs explicit connection checks and immediate revocation.

## Clerk

Enable Apple, Google, and email-link authentication. Configure:

- Web production and preview origins
- Native scheme `bodyfitness://`
- Redirect path `bodyfitness://auth`
- Apple service/app identifiers and Google OAuth credentials

Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for the PWA, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` for EAS builds, and `CLERK_SECRET_KEY` only on Railway.

## Expo and EAS

From `apps/mobile`, run `eas init` so EAS replaces `REPLACE_WITH_EAS_PROJECT_ID` in `app.json`. Set build variables for `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`, and `EXPO_PUBLIC_WEB_URL`.

```bash
pnpm --filter @bodyfitness/mobile prebuild
eas build --profile development --platform all
eas build --profile preview --platform android
eas build --profile production --platform all
```

Test Clerk deep links and private invite links on physical devices. Background health refresh is best effort: both operating systems choose execution windows, so the UI must never claim continuous real-time tracking.

## Apple Health

The Expo config enables the HealthKit entitlement and supplies a read-purpose string. In App Store Connect:

- Confirm the App ID has HealthKit enabled.
- Explain that only step count is read.
- Confirm health data is used for the user’s fitness tracking and opt-in Circle summaries, never advertising.
- Test denied and revoked access, locked-device/protected-data behavior, timezone changes, and background limitations on a physical iPhone.

## Android Health Connect

The Android build targets SDK 36, supports Android 8+, and declares read-only Steps access. Health Connect may require installation/update on Android 8–13 and is part of the framework on Android 14+.

Before Google Play release, complete the Health apps declaration in Play Console for `READ_STEPS`, publish the matching privacy-policy disclosures, and allow time for approval/whitelist propagation. Test missing/outdated Health Connect, denied/revoked permission, duplicate data origins, timezone changes, and background restrictions on physical devices.

## Privacy and release gate

- Keep every account private and every connection mutual.
- Birth date is private and only enforces age 13+.
- Users aged 13–17 receive the same controls without guardian features.
- Blocking/removal must revoke access immediately.
- Physique photos stay device-local.
- Account deletion must remove cloud profile, connections, steps, logs, achievements, and registered devices.

Public release is blocked until counsel/product owners complete global youth-privacy, health-data, retention/deletion, abuse-reporting, App Store, and Google Play compliance review. This review is a release gate, not a guardian-control feature.
