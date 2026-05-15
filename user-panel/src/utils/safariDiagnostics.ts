/**
 * Development-only Safari / WebKit regression checks.
 * Stripped from production builds via import.meta.env.DEV guards.
 */

const LOG_PREFIX = '[Nefol Safari diagnostics]'

/** Keys normally present on `window.__NEFOL_BOOT__` after a healthy boot (~3s). */
const EXPECTED_BOOT_KEYS_AFTER_MOUNT = [
  'htmlInlineAt',
  'bootstrapStartedAt',
  'safariHuntBatch',
  'reactCreateRootAt',
  'renderCalledAt',
  'mountedAt',
  'rootChildCount',
] as const

const MAX_HASHCHANGE_LISTENERS = 3
const ROOT_MOUNT_CHECK_MS = 3000

function warn(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    // eslint-disable-next-line no-console
    console.warn(`${LOG_PREFIX} ${message}`, detail)
  } else {
    // eslint-disable-next-line no-console
    console.warn(`${LOG_PREFIX} ${message}`)
  }
}

function getBootRecord(): Record<string, unknown> | null {
  try {
    const boot = (window as unknown as { __NEFOL_BOOT__?: unknown }).__NEFOL_BOOT__
    if (boot && typeof boot === 'object') {
      return boot as Record<string, unknown>
    }
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Chrome DevTools exposes `getEventListeners(target)` in the console only.
 * When injected / available, returns the number of `hashchange` handlers on `window`.
 */
function countHashChangeListeners(): number | null {
  const getListeners = (
    window as unknown as {
      getEventListeners?: (target: Window) => Record<string, unknown[] | undefined>
    }
  ).getEventListeners

  if (typeof getListeners !== 'function') {
    return null
  }

  try {
    const map = getListeners(window)
    const list = map?.hashchange
    return Array.isArray(list) ? list.length : 0
  } catch {
    return null
  }
}

function checkBootKeys(boot: Record<string, unknown> | null, label: string): void {
  if (!boot) {
    warn(`${label}: window.__NEFOL_BOOT__ is missing or not an object`)
    return
  }

  const missing = EXPECTED_BOOT_KEYS_AFTER_MOUNT.filter((key) => boot[key] === undefined)
  if (missing.length > 0) {
    warn(`${label}: __NEFOL_BOOT__ missing expected keys: ${missing.join(', ')}`, boot)
  }
}

function checkScrollToAccessible(): boolean {
  try {
    const top = window.scrollY ?? 0
    const left = window.scrollX ?? 0
    window.scrollTo({ top, left, behavior: 'auto' })
    return true
  } catch (e) {
    warn('window.scrollTo threw (Safari may reject scroll options)', e)
    return false
  }
}

function runImmediateChecks(): void {
  const hashCount = countHashChangeListeners()
  if (hashCount === null) {
    warn(
      'hashchange listener count unavailable (window.getEventListeners only exists in Chrome DevTools). ' +
        'In DevTools console run: getEventListeners(window).hashchange?.length'
    )
  } else if (hashCount > MAX_HASHCHANGE_LISTENERS) {
    warn(
      `Too many hashchange listeners on window: ${hashCount} (max ${MAX_HASHCHANGE_LISTENERS}). ` +
        'Duplicate hash routers cause Safari stack overflows — use useHashRouter only.'
    )
  } else {
    // eslint-disable-next-line no-console
    console.info(`${LOG_PREFIX} hashchange listeners: ${hashCount}`)
  }

  checkBootKeys(getBootRecord(), 'On load')

  /*
   * Context default values: cannot verify at runtime that createContext() uses plain
   * objects (not inline `{ refresh: () => {} }` defaults). Manually audit:
   *   - contexts/AuthContext.tsx
   *   - contexts/CartContext.tsx
   *   - contexts/WishlistContext.tsx
   *   - contexts/CreatorProgramBadgeContext.tsx
   *   - contexts/NefolSocialBanContext.tsx
   * Defaults must be stable module-level constants, not arrow functions created per import.
   */

  if (!checkScrollToAccessible()) {
    warn('window.scrollTo is not usable — scroll-on-route-change may fail on Safari')
  }
}

function runDelayedChecks(): void {
  const root = document.getElementById('root')
  const childCount = root?.children.length ?? 0
  if (childCount <= 0) {
    warn(
      `After ${ROOT_MOUNT_CHECK_MS}ms #root still has no children — app may not have mounted`,
      getBootRecord()
    )
  }

  checkBootKeys(getBootRecord(), `After ${ROOT_MOUNT_CHECK_MS}ms`)

  const hashCount = countHashChangeListeners()
  if (hashCount !== null && hashCount > MAX_HASHCHANGE_LISTENERS) {
    warn(
      `After ${ROOT_MOUNT_CHECK_MS}ms hashchange listeners: ${hashCount} (max ${MAX_HASHCHANGE_LISTENERS})`
    )
  }
}

/**
 * Run Safari-related development checks. No-op in production.
 * Call once from `bootstrapApp.tsx` after `root.render`.
 */
export function runSafariChecks(): void {
  if (!import.meta.env.DEV) return

  runImmediateChecks()

  window.setTimeout(() => {
    if (!import.meta.env.DEV) return
    runDelayedChecks()
  }, ROOT_MOUNT_CHECK_MS)
}
