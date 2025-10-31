// frontend/src/store/index.ts - UPDATED
import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

// Import your reducers
import libraryReducer from "./slices/librarySlice";
import cratesReducer from "./slices/cratesSlice";
import playlistsReducer from "./slices/playlistsSlice";
import searchReducer from "./slices/searchSlice";
import audioReducer from "./slices/audioSlice";
import uiReducer from "./slices/uiSlice";
import authReducer from "./slices/authSlice";

// Import the notification middleware
import { notificationMiddleware } from "./middleware/notificationMiddleware";

export const store = configureStore({
  reducer: {
    library: libraryReducer,
    crates: cratesReducer,
    playlists: playlistsReducer,
    search: searchReducer,
    audio: audioReducer,
    ui: uiReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }).concat(notificationMiddleware), // ✅ Add the middleware here
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
