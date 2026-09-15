# BodyFitness design contract — editorial minimal

BodyFitness is a responsive web app. It reads like a well-set magazine spread about your body: near-white or near-black canvas, one typeface family, hairline borders, tabular numerals, and one accent colour used sparingly. It feels expensive through restraint and craft, never through effects.

## Non-negotiables

1. **Tokens only.** Colour comes from Tailwind classes backed by `globals.css` tokens: `bg-background`, `bg-card`, `bg-muted`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`, `text-faint-foreground`, `border-border`, `text-brand`, `bg-brand`, `text-success`, `text-warning`, `text-destructive`, `text-data-1…4`, `stroke-chart-grid`. Never `text-white/NN`, `bg-white/NN`, `#hex`, or `var(--legacy)`.
2. **One accent.** `brand` (violet) marks the active nav rule, the focus ring, the focused data series, and AI actions. Nothing else.
3. **Monochrome data.** Charts, bars and rings use the `data-1…4` ink ramp. Semantic state (`success`/`warning`/`destructive`) appears only on status text and icons.
4. **No blur, glow, gradients or drop shadows** on content. The dock and sheets may carry `shadow-[var(--shadow-sheet)]`; nothing else casts one. Depth is a 1px `border-border`.
5. **Type scale is fixed**: `text-xs` 11px · `sm` 12.5 · `base` 14 · `lg` 16 · `xl` 18 · `2xl` 22 · `3xl` 28 · `4xl` 36 · `5xl` 46 · `6xl` 64. Weights 400/500/600 only. Never `font-bold`, `font-black`, or arbitrary `text-[Npx]`.
6. **Radii**: `rounded-sm` 4 · `md` 6 · `lg` 8 · `xl` 12 · `2xl` 16. Never arbitrary. Pills (`rounded-full`) only for switch thumbs and progress tracks.
7. **Numbers are tabular**: every metric gets `number-font` (or `tabular-nums`), and its unit sits beside it in `text-subtle-foreground` at a smaller size.
8. **Empty states are honest**: when a value cannot be derived show `—` and a one-line hint. Sample data may only appear when there is no real data and must carry `<Badge>Sample data</Badge>`.

## Primitives (use these before writing markup)

| Import | Use |
|---|---|
| `Button` (`@/components/ui/button`) — variants `primary` `secondary` `ghost` `brand` `destructive` `outline`; sizes `sm` `md` `lg` `icon` `icon-sm` | every clickable action; `asChild` for `<Link>` |
| `Card` `CardHeader` `CardTitle` `CardDescription` `CardContent` `CardFooter` `DataTile` (`@/components/ui/card`) | all content surfaces |
| `Input` `Textarea` `Select` `Field` (`@/components/ui/input`) | forms; `Field` supplies the uppercase label |
| `Switch` (`@/components/ui/switch`) | every boolean toggle (Radix; emits role="switch") |
| `Badge` — `neutral` `brand` `success` `warning` `destructive` `outline` | chips, status, source labels |
| `SectionHeader` `Stat` `EmptyState` (`@/components/ui/section-header`) | numbered section heads, big numbers, empty states |
| `Sheet.Root/Content/Title/Description/Header/Footer` (`@/components/ui/sheet`) | all modals: drawer on mobile, dialog on desktop. Always render a `Sheet.Title` |
| `LargeTitle` (`@/components/large-title`) | page header: eyebrow, title, optional description and action |
| `T`, `fadeRise`, `fade`, `reduceable`, `usePrefersReducedMotion` (`@/lib/motion`) | all motion |

## Motion

`MotionConfig` supplies `T.base` (180 ms ease-out) globally, so most `motion.*` elements need no transition prop. Use `variants={fadeRise}` for entrances. Springs are not used. Anything animating a non-transform property (`width`, `height`, `backgroundColor`, SVG attributes, infinite loops) must wrap its transition in `reduceable(T.base, usePrefersReducedMotion())` and set `repeat: reduced ? 0 : Infinity`.

## Layout

`.page-shell` centres content at `max-w-[1200px]` with responsive padding and clears the floating dock at every breakpoint. Pages compose their own grids:

- `< md` single column, 16px gutters.
- `md` two columns where content pairs naturally (`grid gap-6 md:grid-cols-2`, or `md:grid-cols-[7fr_5fr]`).
- `lg` a sticky right rail is acceptable (`lg:sticky lg:top-8 lg:self-start`) for controls and summaries.
- `xl` up to three columns.

Every page opens with `<LargeTitle>` and orders its blocks with `<SectionHeader index="01" …>`. Section gap is `mt-10`. Card gap is `gap-4` (mobile) / `gap-6` (desktop).

## Migration table (legacy → token)

| legacy | token |
|---|---|
| `text-white/70 /65` | `text-foreground` |
| `text-white/58 … /45` | `text-muted-foreground` |
| `text-white/44 … /32` | `text-subtle-foreground` |
| `text-white/30 … /18` | `text-faint-foreground` |
| `bg-white/[0.0xx]` | `bg-muted` |
| `border-white/*` | `border-border` |
| `text-[var(--accent-strong)]`, `text-[var(--accent)]` | `text-brand` |
| `var(--success)` `var(--warning)` `var(--danger)` | `text-success` `text-warning` `text-destructive` |
| `var(--protein)` `var(--steps)` `var(--energy)` | `data-2` `data-3` `data-4` (or `brand` when focused) |
| `font-black`, `font-extrabold`, `font-bold` | `font-semibold` (or `font-medium`) |
| `text-[8px]…[10px]` | `text-xs` |
| `rounded-[13px]…[22px]` | `rounded-lg` / `rounded-xl` |
| `ios-field` | `<Input>` / `<Select>` |
| `primary-action` / `secondary-action` / `ghost-action` | `<Button variant=…>` |
| `panel` | `<Card>` |
| `Drawer.*` from vaul | `Sheet.*` |

## Accessibility

44px targets on touch (enforced by CSS on coarse pointers), visible `:focus-visible` ring everywhere, `aria-label` on every icon-only button, `role="switch"` via `<Switch>`, `aria-pressed` on segmented options, `aria-current="page"` on the active nav item, `Sheet.Title` on every modal. Camera and physique photo surfaces opt into dark chrome with `data-theme="dark"`.
