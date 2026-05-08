import { useEffect, useState } from 'react'
import { authorAPI } from '../services/authorAPI'

export type UsernameAvailabilityState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'too_short'
  | 'too_long'
  | 'invalid_format'
  | 'error'

export function useAuthorUsernameAvailability(username: string, enabled: boolean) {
  const [state, setState] = useState<UsernameAvailabilityState>('idle')

  useEffect(() => {
    if (!enabled) {
      setState('idle')
      return
    }

    const handle = username.trim()

    if (handle.length === 0) {
      setState('idle')
      return
    }
    if (handle.length < 3) {
      setState('too_short')
      return
    }
    if (handle.length > 30) {
      setState('too_long')
      return
    }
    if (!/^[a-z0-9_]+$/.test(handle)) {
      setState('invalid_format')
      return
    }

    const ac = new AbortController()
    const t = window.setTimeout(() => {
      ;(async () => {
        setState('checking')
        try {
          const r = await authorAPI.checkUsernameAvailability(handle, ac.signal)
          if (ac.signal.aborted) return
          if (r.available) {
            setState('available')
          } else {
            switch (r.reason) {
              case 'taken':
                setState('taken')
                break
              case 'too_short':
                setState('too_short')
                break
              case 'too_long':
                setState('too_long')
                break
              case 'invalid_format':
                setState('invalid_format')
                break
              default:
                setState('taken')
            }
          }
        } catch (err: unknown) {
          if (ac.signal.aborted || (err as { name?: string })?.name === 'AbortError') return
          setState('error')
        }
      })()
    }, 400)

    return () => {
      ac.abort()
      window.clearTimeout(t)
    }
  }, [username, enabled])

  return state
}

export function usernameAvailabilityMessage(state: UsernameAvailabilityState): string {
  switch (state) {
    case 'idle':
      return ''
    case 'checking':
      return 'Checking availability…'
    case 'available':
      return 'This username is available.'
    case 'taken':
      return 'This username is taken. Try another.'
    case 'too_short':
      return 'Use at least 3 characters.'
    case 'too_long':
      return 'Use at most 30 characters.'
    case 'invalid_format':
      return 'Use only lowercase letters, numbers, and underscores.'
    case 'error':
      return 'Could not verify availability. Try again.'
    default:
      return ''
  }
}

/** Step 1 / edit-profile: username passes format rules and API says available */
export function isUsernameReadyForSubmit(state: UsernameAvailabilityState, username: string): boolean {
  const h = username.trim()
  if (h.length < 3 || h.length > 30) return false
  if (!/^[a-z0-9_]+$/.test(h)) return false
  return state === 'available'
}
