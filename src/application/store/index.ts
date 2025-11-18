import { configureStore } from '@reduxjs/toolkit'
import gameReducer from './gameSlice'
import walletReducer from './walletSlice'

export const store = configureStore({
  reducer: {
    game: gameReducer,
    wallet: walletReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch