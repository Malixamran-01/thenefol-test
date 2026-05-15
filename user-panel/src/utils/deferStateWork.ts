/**
 * Run work after the current browser event / microtask chain (hashchange, custom events).
 * Avoids synchronous setState cascades on Safari WebKit during route transitions.
 */
const runMicrotask =
  typeof queueMicrotask === 'function'
    ? queueMicrotask.bind(globalThis)
    : (fn: () => void) => {
        void Promise.resolve().then(fn)
      }

export function deferStateWork(work: () => void): void {
  runMicrotask(work)
}
