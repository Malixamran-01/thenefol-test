import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { pushToBackStack, setProgrammaticBack, isBlogRoute } from '../store/blogSlice'
import { store } from '../store'

function parseHashFromUrl(url: string): string {
  try {
    const idx = url.indexOf('#')
    if (idx === -1) return ''
    return url.slice(idx) || ''
  } catch {
    return ''
  }
}

export function BlogNavListener() {
  const dispatch = useDispatch()

  useEffect(() => {
    const handleHashChange = (e: HashChangeEvent) => {
      const oldHash = parseHashFromUrl(String(e.oldURL))
      const newHash = parseHashFromUrl(String(e.newURL)) || window.location.hash || ''

      if (store.getState().blog.isProgrammaticBack) {
        dispatch(setProgrammaticBack(false))
        return
      }

      if (isBlogRoute(newHash) && oldHash && oldHash.startsWith('#/')) {
        // Never push the blog request/edit form onto the back-stack —
        // pressing "back" from the form should always go somewhere meaningful,
        // not loop back into the editor.
        const oldPath = oldHash.replace('#', '').toLowerCase().split('?')[0]
        if (oldPath !== '/user/blog/request') {
          dispatch(pushToBackStack(oldHash))
        }
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [dispatch])

  return null
}
