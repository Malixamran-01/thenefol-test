import { configureStore } from '@reduxjs/toolkit'
import type { UnknownAction } from '@reduxjs/toolkit'
import { blogSlice } from './blogSlice'
import { followSlice } from './followSlice'

const blogReducer = blogSlice.reducer
const followReducer = followSlice.reducer

export const store = configureStore({
  reducer: {
    blog: blogReducer,
    follow: followReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

/** Dev / `?debugRedux=1` — throws when >50 dispatches land within 100ms (Safari loop diagnosis). */
export function attachReduxDispatchLoopGuard(target: typeof store): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (!import.meta.env.DEV && params.get('debugRedux') !== '1') return

  let dispatchCount = 0
  let dispatchTimer: ReturnType<typeof setTimeout>
  const originalDispatch = target.dispatch.bind(target)

  target.dispatch = ((action: UnknownAction) => {
    dispatchCount += 1
    clearTimeout(dispatchTimer)
    dispatchTimer = setTimeout(() => {
      dispatchCount = 0
    }, 100)
    if (dispatchCount > 50) {
      // eslint-disable-next-line no-console
      console.error('Infinite dispatch loop detected. Last action:', action)
      throw new Error('Infinite dispatch loop — Redux guard triggered')
    }
    return originalDispatch(action)
  }) as typeof target.dispatch
}

if (typeof window !== 'undefined') {
  const run =
    typeof queueMicrotask === 'function'
      ? queueMicrotask
      : (fn: () => void) => {
          void Promise.resolve().then(fn)
        }
  run(() => attachReduxDispatchLoopGuard(store))
}
