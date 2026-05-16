/**
 * Safari “maximum call stack” hunt — **no VITE_*, no .env**.
 *
 * Between Vercel deploys, change **only** `SAFARI_HUNT_DISABLE_BATCH` (one value at a time).
 * `0` = nothing disabled (normal app).
 *
 * | Batch | What is skipped |
 * |------:|-----------------|
 * | **1** | Light-mode chrome: `enforceLightChrome` + `window` `load` + `document` `visibilitychange` |
 * | **2** | AOS: dynamic import of `aos` + its CSS + `AOS.init` |
 * | **3** | Meta Pixel: dynamic `initMetaPixel()` |
 * | **4** | Service worker: `load` → `getRegistrations` → `unregister` |
 * | **5** | Post-render probe: `queueMicrotask` + double `requestAnimationFrame` after first paint |
 * | **6** | `<BlogNavListener />` (not rendered) |
 * | **7** | Global `./styles.css` (not imported) — expect ugly UI; diagnostic only |
 *
 * If disabling batch **N** fixes Safari, the bug is in that batch; then split that batch in code
 * or binary-search inside it on follow-up deploys.
 */
export const SAFARI_HUNT_DISABLE_BATCH: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 = 0
