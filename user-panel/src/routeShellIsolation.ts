/**
 * Safari / hash-router isolation — **only one of the `APPCONTENT_*` / `ROUTE_*` group should be `true`**
 * per deploy (first match wins in `App` / `AppContent`).
 *
 * 1. `ROUTE_SHELL_ISOLATION` — Providers + `"Hello"`, **no** `AppContent`, **no** `BlogNavListener`.
 * 2. `APPCONTENT_STUB` — Full providers + placeholder **instead of** `<AppContent />`.
 * 3. `APPCONTENT_CHROME_ONLY` — Real `AppContent` but **all** `<RouterView />` → stub.
 * 4. `APPCONTENT_ROUTER_ONLY` — **Only** `<RouterView />` (minimal wrapper).
 *
 * **Creator / Collab (narrow):** `CREATOR_PROGRAM_ROUTES_STUB` can be `true` **together with normal app**
 * (all flags above `false`). Replaces only creator-program-related routes inside `RouterView` with a
 * placeholder; `BlogLayout` wrapper kept where production uses it.
 *
 * **`ROUTER_VIEW_DASHBOARD_HARD_STOP` / `ROUTER_VIEW_SKIP_DASHBOARD_TRACK_SCROLL`:** Safari bisect for
 * `#/user/blog/dashboard` — see `RouterViewEntry` in `App.tsx`.
 */

export const ROUTE_SHELL_ISOLATION = false

/** Providers mount; `AppContent` does not (slot = stub). */
export const APPCONTENT_STUB = false

/** Full `AppContent` except every `RouterView` is a stub div. */
export const APPCONTENT_CHROME_ONLY = false

/** Minimal shell: only `RouterView` (+ Suspense). */
export const APPCONTENT_ROUTER_ONLY = false

/**
 * When `true`: `/user/blog/dashboard`, `/user/collab`, `/user/affiliate-partner`, `/user/referral-history`
 * render a stub (still inside `BlogLayout` where applicable). Use to confirm Safari crash is in that subtree.
 */
export const CREATOR_PROGRAM_ROUTES_STUB = false

/**
 * **`/user/blog/dashboard` only:** render **no** `BlogLayout`, **no** `ErrorBoundary` — see also
 * `CREATOR_DASHBOARD_ULTRA_MINIMAL` (no `CreatorDashboard` / no lazy chunk at all).
 */
export const CREATOR_DASHBOARD_SKIP_BLOG_LAYOUT = false

/**
 * With `CREATOR_DASHBOARD_SKIP_BLOG_LAYOUT`: do **not** mount `<CreatorDashboard />` (no lazy chunk, no
 * `CreatorDashboard.tsx` load). Static div only. If Safari is **stable** here but crashes with lazy off
 * → problem is in the dashboard **entry** chunk or `Suspense`+lazy; if still crashes → problem is outside
 * that subtree (RouterView body, hash/socket, etc.).
 */
export const CREATOR_DASHBOARD_ULTRA_MINIMAL = false

/**
 * **Inside real routes** (use with `CREATOR_PROGRAM_ROUTES_STUB = false`): skip loading
 * `CreatorDashboardImpl.tsx` entirely — the thin `CreatorDashboard.tsx` entry returns a static div only.
 * (`App.tsx` lazy-loads that entry so the heavy dashboard graph is not parsed on initial bundle load.)
 */
export const CREATOR_DASHBOARD_IMPL_STUB = false

/**
 * **Hook-free bypass:** when `true`, `RouterViewEntry` returns a static div for `#/user/blog/dashboard`
 * and **`RouterView` never mounts** (no ban gate, scroll effect, or `trackPageView` on that URL).
 */
export const ROUTER_VIEW_DASHBOARD_HARD_STOP = true

/**
 * When `true`: `RouterView` skips **scroll-to-top** + **`trackPageView`** effects **only** on
 * `/user/blog/dashboard` (RouterView still mounts). Use if hard stop proves stable above RouterView
 * but full RouterView still overflows on that path.
 */
export const ROUTER_VIEW_SKIP_DASHBOARD_TRACK_SCROLL = true

/** Same for `Collab.tsx` body (error boundary still wraps the stub). */
export const COLLAB_PAGE_IMPL_STUB = false
