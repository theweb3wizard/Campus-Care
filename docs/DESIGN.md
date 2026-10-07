# Campus Care DESIGN.md — durable visual decisions

Read this before generating any UI. These choices are final; do not re-decide per prompt.

## Palette (flat solids only, light theme)
- Primary teal `#0F766E` (actions, active), dark variant `#2DD4BF`
- Navy `#1E3A5F` (headings, footer), bg `#F7F9F8`, surface `#FFFFFF`, border `#E2E8F0`
- Gold `#9A7B2E` for 2px rules only. Emergency red `#991B1B` for emergency actions only.
- NEVER: gradients, glows, glassmorphism, backdrop-blur decoration, purple/cyan accents, colored left-border cards, dark mode marketing theme.

## Type
- Display: Archivo 700/800, tracking -0.02em (headlines only)
- Body/UI: Public Sans 400/500/600, base 16px, line-height 1.5-1.6
- Mono: IBM Plex Mono 500 for times/refs only (e.g. `A14 · 10:40`)
- NEVER: Inter/Space Grotesk/Geist hero, serif-italic accent word, badge pill above H1, all-caps labels/body, text under 16px for actions.

## Signature element
- The perforated appointment slip: white slip, dashed perforation edge, mono time, teal status word. Used anywhere time/place/status appears. Radius 12px, 1px navy/15 border.

## Layout
- Landing: left-docked editorial (never centered hero), one primitive per section (sticky split, result sheet tabs, snap carousel, solid banner, asymmetric editorial).
- App: one job per screen, one primary CTA, 44px targets, bottom nav max 5, emergency sticky always.
- NEVER: identical icon-topped card grids, stat banners, numbered step sequences, nested cards, hover-zoom images.

## Motion (transforms/opacity only, content visible by default)
- tap 120ms scale .97 · reveal 500ms once, max 2 per page · modal 220ms · notice 240ms · skeleton static/shimmer 1200ms · spinner 700ms linear
- NEVER: bounce/elastic, pulsing dots, marquees, staggered everything, shake-on-error, layout animation.
- Respect prefers-reduced-motion. Lenis smooth scroll everywhere except /emergency.

## Copy
- Plain verbs, sentence case, max 2 sentences, one action per state. No em-dashes, no seamless/world-class/effortless, no emoji.
- State copy lives in lib/states.ts. Do not invent new wording inline.
