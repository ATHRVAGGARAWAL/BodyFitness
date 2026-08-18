# BodyFitness design contract

This document is the visual source of truth for BodyFitness. New UI should follow these rules before adding one-off styling.

## Reference guidance

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- Apple Fitness and Apple Health App Store screenshots are visual references only. Their artwork and screenshots are not bundled in this project.

## Product direction

BodyFitness is 80% Apple Health and 20% Apple Fitness: calm information hierarchy with bright, semantic fitness data.

## Non-negotiable rules

1. Both appearances use Apple semantic colors rather than inversion hacks. Dark uses `#000000` with `#1C1C1E` surfaces; light uses grouped `#F2F2F7` with white surfaces. Camera mode always remains dark.
2. Glass is reserved for navigation, sheets, transient controls, and overlays. Never use glass for ordinary content cards.
3. No decorative gradients, colored fog, ambient orbs, or arbitrary glow effects. Data fills may use transparent solid color, and the water level may animate as liquid.
4. Color has one meaning per context: red for calories/activity, lime for protein, cyan for steps/water, green for completion/PR, yellow for caution, and purple for intelligence.
5. Put the most important information first. Use progressive disclosure for details and settings.
6. Use the system font stack. Default body text is at least 17px where practical; supporting labels never go below 11px unless they are nonessential annotations.
7. Every interactive target is at least 44px. Controls must look different from content.
8. Use 16px screen margins, 12px card gaps, 20–24px card radii, and 0.5px separators.
9. Motion must communicate state or spatial continuity, remain interruptible, and respect reduced-motion preferences. Avoid animation on frequently repeated interactions unless it provides feedback.
10. The tab bar remains visible across top-level views, always shows all four labels, uses the edge-aligned iOS tab-bar structure, and is hidden only for temporary full-screen camera or modal experiences.
11. The profile avatar is the top-right entry to personal data, appearance, targets, rest settings, and local-data controls. Light, dark, and system appearance choices must persist.

## Dashboard hierarchy

1. Large title and date
2. Activity rings and current values
3. One contextual next action
4. Daily essentials and mess habits
5. Nutrition highlight
6. Today’s meal log

Before changing the rest of the product, new visual patterns must first prove themselves on the Dashboard and pass mobile visual review.
