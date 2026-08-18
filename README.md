# BodyFitness

A local-first, installable body recomposition and fitness tracker designed to feel like a native iOS app on mobile.

## Features

- Apple Fitness-inspired calorie, protein, and step rings
- Water, creatine, habits, Flex Day, and adaptive nutrition tracking
- AI-assisted Indian hostel mess food analysis with editable macros
- Customizable five-day PPLUL workout plan with voice set logging
- Persistent rest timers, estimated 1RM tracking, and PR detection
- Twelve-week progress charts and an on-device physique gallery
- Offline-capable PWA with local Zustand and IndexedDB persistence

## Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `OPENAI_API_KEY` in `.env.local` to enable food-image and voice-set analysis. Manual nutrition and workout logging remain available without it.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The interface is intentionally mobile-only and capped at a 430px application canvas.
