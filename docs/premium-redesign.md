# Premium redesign (Done)

Decided by 4-role debate + web research (16 slop patterns, 67-point catalog). Rules locked in docs/DESIGN.md.

## What changed
- Type: Archivo display + Public Sans body + IBM Plex Mono slips (Inter gone from headlines)
- Landing rewrite: left-docked hero "Clinic care without the long queue", CSS queue-slip signature visual, sticky-split visits, tabbed lab sheet, snap doctors rail, solid teal emergency banner, editorial pregnancy quote, navy footer
- Motion: `motion` + `lenis` (smooth scroll except /emergency), tokens (tap/reveal/modal/notice/skeleton/spinner), Reveal ×1, skeletons on all list fallbacks, spinner buttons, focus-moved login errors, cancel confirm dialog
- States: lib/states.ts + StateBlock wired to notifications/reports; full copy table for the rest
- Slop gate: zero gradient/pulse/glow/glass classes in app + components

## Verify
- lint pass, build pass (22 routes), slop grep clean, dev server 200s on /, /book, /login, /signup
- Hydration warnings in dev log are the visitor's browser extension, not app code
