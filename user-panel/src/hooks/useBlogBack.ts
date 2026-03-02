import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  popFromBackStack,
  setProgrammaticBack,
  BLOG_HOME,
  selectBackTarget,
  selectBackLabel,
  selectCanGoBack,
} from '../store/blogSlice'
import type { RootState } from '../store'

export function useBlogBack() {
  const dispatch = useDispatch()
  const backTarget = useSelector(selectBackTarget)
  const backLabel = useSelector(selectBackLabel)
  const canGoBack = useSelector(selectCanGoBack)

  const goBack = useCallback(() => {
    if (canGoBack && backTarget) {
      dispatch(setProgrammaticBack(true))
      dispatch(popFromBackStack())
      window.location.hash = backTarget
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else {
      window.location.hash = BLOG_HOME
    }
  }, [dispatch, canGoBack, backTarget])

  return { goBack, backLabel, canGoBack }
}
