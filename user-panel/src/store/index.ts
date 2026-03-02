import { configureStore } from '@reduxjs/toolkit'
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
