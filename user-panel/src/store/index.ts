import { configureStore } from '@reduxjs/toolkit'
import { blogSlice } from './blogSlice'

const blogReducer = blogSlice.reducer

export const store = configureStore({
  reducer: {
    blog: blogReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
