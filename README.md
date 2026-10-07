# Video demo ESG – Reach Truck Route Optimization

Remotion project (1920×1080, 30 fps) for the DTLA warehouse route-optimization video.

## Setup

```bash
npm install
```

## Commands

| Command | Purpose |
|---|---|
| `npm run studio` | Open Remotion Studio (local preview) |
| `npx remotion render <CompositionId> out/<name>.mp4` | Render a composition to MP4 |
| `npx remotion still <CompositionId> out/<name>.png --frame=<n>` | Render a single frame |
| `npm run typecheck` | TypeScript check |

## Structure

- `src/Root.tsx` – registers compositions
- `src/theme.ts` – colors, video size, font loading
- `src/scenes/` – one file per scene
- `public/fonts/` – Be Vietnam Pro (latin + vietnamese), bundled so renders work offline

`remotion.config.ts` points Remotion at the preinstalled Chromium headless shell when it exists (cloud sessions cannot download one); on a normal machine Remotion downloads its own.
