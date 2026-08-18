# BodyFitness design contract

BodyFitness is a mobile fitness operating system: focused, high-signal, technical, and fast. The interface borrows interaction craft from 21st.dev and React Bits—not the visual language of a platform vendor.

## Product language

- Graphite canvas with solid, layered panels and fine neutral borders.
- Electric violet (`#7c5cff`) is the product accent.
- Rose communicates energy, acid green communicates protein and positive output, cyan communicates water and movement, amber communicates caution.
- Geometry is rounded but structured: 13–22px radii for controls and panels. Circles are reserved for inherently circular data or physical camera affordances.
- A subtle dot field gives the canvas depth. Decorative fog, ambient blobs, and ornamental gradients are prohibited.
- Typography is dense and editorial: large compressed page titles, monospaced kickers/indexes, tabular data, clear supporting copy.

## Interaction rules

1. Every target is at least 44px and has visible pressed feedback.
2. Motion explains selection, hierarchy, progress, or spatial continuity. Spring motion must remain interruptible and reduced-motion safe.
3. The limelight dock is the only persistent glass surface. Sheets and transient notices may also use blur; ordinary content panels remain solid.
4. Data color is semantic, never decorative. One element should rarely use more than one accent color.
5. Use progressive disclosure for exercise sets, AI assumptions, settings, and editing tools.
6. Dark, light, and system themes must remain functional. Camera capture always uses a dark photographic control surface.
7. Top-level pages follow the same hierarchy: system kicker, product title, primary module, numbered sections, then supporting actions.
8. Sample data must be visibly labeled and disappear as real data becomes available.

## Mobile layout

- The product has no desktop layout. It renders inside a centered 430px canvas.
- Screen inset: 16px. Panel gap: 12px. Bottom content clearance: 108px plus the safe area.
- The four-item dock remains visible on top-level pages and hides for the full-screen camera.
- Test at 390×844 and 430×932 with safe areas, both themes, and reduced motion.

## Component vocabulary

- `panel`: solid primary content surface.
- `data-tile`: compact nested metric surface.
- `icon-tile`: square semantic icon container.
- `status-chip`: compact uppercase system state.
- `primary-action`: violet high-emphasis action.
- `secondary-action`: neutral bordered action.
- `sheet-surface`: elevated modal workspace.

New UI must extend these primitives before introducing one-off visual treatments.
