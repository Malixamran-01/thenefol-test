import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

const BLOG_HOME = '#/user/blog'
const MAX_BACK_STACK = 20

function isBlogRoute(hash: string): boolean {
  const h = (hash || '').replace('#', '').toLowerCase().split('?')[0]
  return (
    h === '/user/blog' ||
    h.startsWith('/user/blog/') ||
    h.startsWith('/user/author/')
  )
}

function isValidAppRoute(hash: string): boolean {
  const h = (hash || '').trim()
  return h.startsWith('#/')
}

function getBackLabel(route: string): string {
  const path = (route || '').replace('#', '').toLowerCase().split('?')[0]
  if (path === '/user/blog' || path.startsWith('/user/blog?')) return 'Back to Blog'
  if (path.match(/^\/user\/blog\/\d+/)) return 'Back to Post'
  if (path.startsWith('/user/author/')) return 'Back to Author'
  if (path === '/user/blog/request') return 'Back'
  return 'Back'
}

interface BlogState {
  backStack: string[]
  isProgrammaticBack: boolean
}

const initialState: BlogState = {
  backStack: [],
  isProgrammaticBack: false,
}

export const blogSlice = createSlice({
  name: 'blog',
  initialState,
  reducers: {
    pushToBackStack: (state, action: PayloadAction<string>) => {
      const route = action.payload
      if (!isValidAppRoute(route)) return
      if (state.backStack[state.backStack.length - 1] === route) return
      state.backStack.push(route)
      if (state.backStack.length > MAX_BACK_STACK) {
        state.backStack.shift()
      }
    },
    popFromBackStack: (state) => {
      state.backStack.pop()
    },
    setProgrammaticBack: (state, action: PayloadAction<boolean>) => {
      state.isProgrammaticBack = action.payload
    },
    clearBackStack: (state) => {
      state.backStack = []
    },
  },
})

export const {
  pushToBackStack,
  popFromBackStack,
  setProgrammaticBack,
  clearBackStack,
} = blogSlice.actions

export const selectBackTarget = (state: { blog: BlogState }) => {
  const { backStack } = state.blog
  if (backStack.length === 0) return null
  return backStack[backStack.length - 1]
}

export const selectBackLabel = (state: { blog: BlogState }) => {
  const target = selectBackTarget(state)
  if (!target) return 'Back to Blog'
  return getBackLabel(target)
}

export const selectCanGoBack = (state: { blog: BlogState }) =>
  state.blog.backStack.length > 0

export { BLOG_HOME, isBlogRoute }
