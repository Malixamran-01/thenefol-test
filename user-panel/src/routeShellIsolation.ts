/**
 * Safari / hash-router isolation — **only one flag should be `true` per deploy** (first match wins in code).
 *
 * 1. `ROUTE_SHELL_ISOLATION` — Providers + `"Hello"`, **no** `AppContent`, **no** `BlogNavListener`.
 * 2. `APPCONTENT_STUB` — Full providers + placeholder **instead of** `<AppContent />` (no hooks/hash shell).
 * 3. `APPCONTENT_CHROME_ONLY` — Real `AppContent` (hash listener + chrome) but **all** `<RouterView />` replaced by a stub.
 * 4. `APPCONTENT_ROUTER_ONLY` — **Only** `<RouterView />` (minimal wrapper); no header/footer/splash chrome.
 *
 * Interpretation:
 * - (1) or (2) works, (3) crashes → problem in **RouterView** or lazy pages.
 * - (3) works, (4) crashes → problem in **chrome / layout / modals** around the main column.
 * - (1) works, (2) crashes → problem in **provider stack** or **BlogNavListener** (unlikely if (1) skipped BlogNav).
 */

export const ROUTE_SHELL_ISOLATION = false

/** Providers mount; `AppContent` does not (slot = stub). `BlogNavListener` still mounts. */
export const APPCONTENT_STUB = false

/** Full `AppContent` except every `RouterView` is a stub div. */
export const APPCONTENT_CHROME_ONLY = false

/** Minimal shell: only `RouterView` (+ Suspense). Checked before chrome-only in `AppContent`. */
export const APPCONTENT_ROUTER_ONLY = true
