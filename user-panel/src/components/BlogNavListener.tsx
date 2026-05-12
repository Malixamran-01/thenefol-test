import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { pushToBackStack, setProgrammaticBack, isBlogRoute } from '../store/blogSlice'
import { store } from '../store'
import { NEFOL_HASH_ROUTE_CHANGE, type NefolHashRouteDetail } from '../utils/hashRouteEvents'

export function BlogNavListener() {
  const dispatch = useDispatch()

  useEffect(() => {
    const handleRouteChange = (ev: Event) => {
      const ce = ev as CustomEvent<NefolHashRouteDetail>
      const oldHash = ce.detail?.oldHash ?? ''
      const newHash = (ce.detail?.hash ?? window.location.hash) || '#/user/'

      if (store.getState().blog.isProgrammaticBack) {
        dispatch(setProgrammaticBack(false))
        return
      }

      if (isBlogRoute(newHash) && oldHash && oldHash.startsWith('#/')) {
        const oldPath = oldHash.replace('#', '').toLowerCase().split('?')[0]
        if (oldPath !== '/user/blog/request') {
          dispatch(pushToBackStack(oldHash))
        }
      }
    }

    window.addEventListener(NEFOL_HASH_ROUTE_CHANGE, handleRouteChange as EventListener)
    return () => window.removeEventListener(NEFOL_HASH_ROUTE_CHANGE, handleRouteChange as EventListener)
  }, [dispatch])

  return null
}
