/**
 * Safari isolation: intentionally **inert** (no listeners, no SW, no sessionStorage writes).
 *
 * The previous version ran before `bootstrapApp` and attached global `error` / `unhandledrejection`
 * handlers plus an early `serviceWorker.unregister()` sweep — useful for debugging, but a prime
 * suspect for WebKit edge cases. Restore selectively from git history if you need that again.
 */
export {}
