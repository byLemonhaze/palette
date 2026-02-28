# Palette Engine

Generative color palette engine. Seeded, lockable, themeable. Built by Lemonhaze.

---

## What It Is

Palette Engine is a browser-based tool for generating and exploring color palettes with full deterministic control. Every palette is reproducible from a compact seed string. Colors can be locked across generations, themes can be curated or custom-built, and the full state of any palette session is exportable as a single shareable string.

---

## How the Engine Works

The core generation pipeline lives in `lib/palette.ts`.

**PRNG** — [Mulberry32](https://gist.github.com/tommyettinger/46a874533244883189143505d203312c), a fast 32-bit PRNG seeded from a single integer. All randomness in a generation pass derives from this seed, making every output perfectly deterministic.

**Theme pools** — Each named theme (e.g. "Edo", "KK", "Horizon") defines a curated set of anchor colors. On each generation, the engine samples from the theme pool, applies HSL perturbations, and interpolates toward target hue ranges defined by the theme.

**Lock system** — Locked colors are pinned as `HslColor` values before generation begins. The PRNG still runs, but locked slots return their fixed HSL color, holding position while unlocked slots regenerate freely.

**Iteration** — The `deriveIterationSeed` function hashes the current seed using Knuth multiplicative hashing, producing a nearby deterministic seed. Iteration explores adjacent regions of color space without jumping to a fully random position.

---

## The Master Seed

Every palette state is encoded as a `PLT1.…` string — the Master Seed.

```
PLT1.eyJ2IjoxLCJzZWVkIjo4NTQ3MDIsInRoZW1lSWQiOiJlZG8iLCJzZWxlY3RlZFRoZW1lSWQiOiJhdXRvIiwibG9ja3MiOltmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV0sInBhbGV0dGUiOlt7ImhleCI6IiNFOEQ5QjQiLCJoc2wiOnsiaCI6NDIsInMiOjU5LCJsIjo4MH19XX0
```

The payload is a base64url-encoded JSON object containing:
- `v: 1` — schema version
- `seed` — the generation seed integer
- `themeId` — the theme that was active when generated
- `selectedThemeId` — the user's theme selector state
- `locks` — boolean array for the 5 swatch slots
- `palette` — full hex + HSL data for each color

This encodes the complete palette state — not just colors, but the generative context needed to reproduce or continue from that point.

---

## The Sketch Preview

The art scene (`lib/sketch-preview.ts`) is a canvas-based generative renderer that produces painterly, textured image studies from the active palette.

The pipeline per mini artwork:
1. **Geo background** — fills with a base color, applies directional strokes and pigment flow simulation using fluid dynamics (noise-driven offscreen feedback)
2. **MT blocks** — noise-offset block displacement (mosaic transfer), adding texture heterogeneity
3. **Swirl pass** — scan-line grid displacement for fragmentation artifacts
4. **Fine ink** — edge-weighted darkening pass simulating wear
5. **Filter 2** — canvas/weave texture overlay at thread-grid granularity
6. **Vignette** — radial gradient darkening toward edges

Each mini artwork uses a rotated variant of the active palette and a seed derived from `deriveIterationSeed`, ensuring all 4 studies are visually distinct but tonally cohesive.

---

## Features

- **Generate** — fully random new seed, respects locked slots
- **Iterate** — deterministic next seed via Knuth hash
- **Lock** — pin individual colors across generations
- **Variant Lab** — 12 nearby palette variants from the same seed
- **Master Seed** — copy/paste full palette state
- **Custom Themes** — save and use your own color pools
- **Studio Showcase** — see the palette as UI (frontend, commerce, mobile, art)
- **Analytics** — hue spread, saturation energy, lightness depth, contrast matrix
- **Favorites** — save up to 10 palettes to localStorage
- **Export CSS** — download as CSS custom properties

---

## Local Dev

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`.

```bash
npm run build
```

Zero TypeScript errors required. The build is static (`○ /`).

---

## Stack

- **Next.js 15** (App Router, static export)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** (stagger entrance animations)
- **Syne** — display/UI font
- **Fragment Mono** — monospace/data font
