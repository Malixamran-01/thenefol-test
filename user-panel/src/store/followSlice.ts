import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/** Map of authorId (string) -> isFollowing (boolean). Uses author_profiles.id or user_id as key. */
interface FollowState {
  byAuthorId: Record<string, boolean>
}

const initialState: FollowState = {
  byAuthorId: {},
}

export const followSlice = createSlice({
  name: 'follow',
  initialState,
  reducers: {
    setFollowStatus: (state, action: PayloadAction<{ authorId: string; isFollowing: boolean }>) => {
      const { authorId, isFollowing } = action.payload
      if (authorId) state.byAuthorId[authorId] = isFollowing
    },
    setFollowStatusBulk: (state, action: PayloadAction<Record<string, boolean>>) => {
      Object.assign(state.byAuthorId, action.payload)
    },
  },
})

export const { setFollowStatus, setFollowStatusBulk } = followSlice.actions

export const selectIsFollowing = (authorId: string) => (state: { follow: FollowState }) =>
  state.follow.byAuthorId[authorId] ?? null
