/**
 * Safari binary: **`true`** = mount real provider tree but **no** `AppContent`, **no** `RouterView`,
 * **no** `BlogNavListener` (hash route bus stays idle).
 *
 * Set to `true` for **one** deploy; if Safari works → isolate inside `AppContent` / `RouterView` /
 * `NEFOL_HASH_ROUTE_CHANGE` listeners next.
 */
export const ROUTE_SHELL_ISOLATION = true
