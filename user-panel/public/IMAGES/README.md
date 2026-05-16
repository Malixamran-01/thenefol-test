# Static images for the user panel

Large product photos and splash **videos** stay out of git (see repo root `.gitignore`).

## Shipped in git (deploy to Vercel)

- `essential/nefol-icon.svg` — favicon / header fallback (no spaces in URL)

## Full brand assets (local / CDN)

Copy your full `IMAGES` tree here for production, including:

- `NEFOL icon.png`, `NEFOL wide.png`
- `SS LOGO.mp4`, `SS LOGO TAB.mp4`, `SS LOGO PORTRAIT.mp4`
- Product `.webp` files

Or serve `/IMAGES/*` from your main site CDN and keep paths unchanged.
