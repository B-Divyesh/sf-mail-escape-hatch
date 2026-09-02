# Mail Escape Hatch — visual thesis

## Direction

The product uses **night-market neon signage** as a wayfinding system, not as decoration. A mail archive can feel like a dark maze of folders. Here, strong illuminated labels mark the safe path from source file to verified archive. The interface stays dark and quiet while cyan route lines, amber checks, and coral warnings expose state.

This is a deliberately single-mode desktop utility. The dark field is painted explicitly and reduces glare during long archive reviews.

## Tokens

- `--ink-0: #070b12` — page background, like wet asphalt after dark.
- `--ink-1: #0d1420` — working surface.
- `--ink-2: #152131` — raised controls and table bands.
- `--paper: #f4f7f0` — primary text (contrast 18:1 on ink-0).
- `--muted: #aebdca` — secondary text (contrast 8.6:1 on ink-0).
- `--cyan: #48e6db` — primary route and focus (contrast 13.4:1 on ink-0).
- `--cyan-ink: #032523` — text on cyan.
- `--amber: #ffd166` — verified state and counts.
- `--coral: #ff766b` — warnings and failures.
- `--green: #74e39a` — completed checks.
- `--line: #304154` — dividers and inactive outlines.

Spacing follows an 8 px base: 4, 8, 12, 16, 24, 32, 48, 64, and 96. Corners are clipped like metal sign housings: 2–10 px, never pill-shaped except status lights.

## Type

- Display and navigation: `Arial Narrow`, `Roboto Condensed`, system sans-serif. Uppercase is reserved for small signs and statuses.
- Body and controls: `Inter`, `Segoe UI`, system sans-serif. No remote font request is made.
- Archive counts and hashes: `SFMono-Regular`, `Cascadia Code`, `Liberation Mono`, monospace. Tabular figures make comparisons stable.

The product uses system-installed faces to keep the binary small and the reader bundle durable.

## Layout and interaction grammar

The landing screen is an asymmetric two-column storefront: copy and the first action occupy the narrow left column; an illuminated archive cutaway occupies the right. Product screens use a vertical source rail, a central verification ledger, and a right-side export receipt on wide screens. At 390 px, those regions become a single ordered column and secondary explanation is shortened.

Controls have visible metal edges and a two-pixel cyan focus outline. Progress moves along a thin cyan route line. A completed stage snaps into amber, like a sign switching on. Warnings use both a coral diamond and text; no state relies on color alone.

## Motion

One signature motion is used: verification stages illuminate in source order with a 180 ms opacity and transform change. Hover movement is limited to 2 px. Nothing loops. With `prefers-reduced-motion: reduce`, stages appear instantly, smooth scrolling is disabled, and transforms are removed.

## Original asset plan

The hero is a generated editorial cutaway of stacked mail trays under small neon signs. It explains the product’s function: messages and attachments pass through a visible checksum gate into an open portable archive. It contains no interface text, logos, brands, or people. App icons and status marks are hand-authored SVG with simple geometric strokes.

### Prompt sheet

- Subject: an open archival case with visible paper messages, attachment clips, and checksum tags moving through a verification gate.
- World: narrow night-market alley workshop, orderly rather than crowded.
- Materials: blackened steel, translucent acrylic trays, folded paper, glass tubes.
- Light: cyan edge light, warm amber verified glow, small coral warning accent.
- Lens/composition: wide 3:2 editorial still life, eye-level, main object to the right, clean dark negative space to the left.
- Palette words: wet asphalt, electric cyan, paper ivory, amber lamp, coral seal.
- Negative list: no people, no brands, no logos, no readable text, no watermark, no envelopes flying, no purple gradient, no generic laptop mockup.

Final generation prompt: “Use case: stylized-concept. Asset type: landing-page hero for a local email archive desktop app. Scene: an orderly night-market repair booth after rain. Subject: a blackened-steel archival case opened in cutaway, with ivory paper messages and small attachment clips passing through a precise glass checksum gate into labeled-but-unreadable storage trays. Style: tactile editorial miniature, physically plausible, fine paper and metal texture. Composition: wide 3:2, eye level, hero object on the right with calm dark negative space on the left. Lighting: cyan glass-tube edge light, warm amber verified glow, one small coral warning accent. Palette: wet asphalt, electric cyan, paper ivory, amber lamp, coral seal. No people, brands, logos, readable text, watermark, purple gradient, floating envelopes, or laptop.”

## Provenance

The hero artwork is generated specifically for Mail Escape Hatch using the factory Azure image deployment (`factory-image`) on 2026-09-02. The prompt is recorded above and beside the source asset. The generated work is original to this product. WebP and social crops are derived locally from that source.
