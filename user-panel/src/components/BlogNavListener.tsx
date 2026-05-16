import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { pushToBackStack, setProgrammaticBack, isBlogRoute } from '../store/blogSlice'
import { store } from '../store'
import { deferStateWork } from '../utils/deferStateWork'
import { NEFOL_HASH_ROUTE_CHANGE, type NefolHashRouteDetail } from '../utils/hashRouteEvents'

export function BlogNavListener() {
  const dispatch = useDispatch()

  useEffect(() => {
    const handleRouteChange = (ev: Event) => {
      const ce = ev as CustomEvent<NefolHashRouteDetail>
      const detail = ce.detail
      if (!detail?.hash && !detail?.path) return

      const oldHash = detail.oldHash ?? ''
      const newHash = detail.hash || window.location.hash || '#/user/'
      if (oldHash === newHash) return

      deferStateWork(() => {
        if (store.getState().blog.isProgrammaticBack) {
          dispatch(setProgrammaticBack(false))
          return
        }

        if (isBlogRoute(newHash) && oldHash.startsWith('#/')) {
          const oldPath = oldHash.replace('#', '').toLowerCase().split('?')[0]
          if (oldPath !== '/user/blog/request') {
            dispatch(pushToBackStack(oldHash))
          }
        }
      })
    }

    window.addEventListener(NEFOL_HASH_ROUTE_CHANGE, handleRouteChange as EventListener)
    return () => window.removeEventListener(NEFOL_HASH_ROUTE_CHANGE, handleRouteChange as EventListener)
  }, [dispatch])

  return null
}
