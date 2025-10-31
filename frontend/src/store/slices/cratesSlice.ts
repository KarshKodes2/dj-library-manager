// frontend/src/store/slices/cratesSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Crate, CratesState, CreateCrateData } from "../../types";
import { cratesAPI } from "../../services/api";

const initialState: CratesState = {
  crates: [],
  selectedCrate: null,
  isLoading: false,
  draggedTrack: null,
};

// Async thunks
export const fetchCrates = createAsyncThunk("crates/fetchCrates", async () => {
  const response = await cratesAPI.getCrates();
  return response.data;
});

const playlistsSlice = createSlice({
  name: "playlists",
  initialState,
  reducers: {
    setCurrentPlaylist: (state, action: PayloadAction<string | null>) => {
      state.currentPlaylist = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlaylists.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPlaylists.fulfilled, (state, action) => {
        state.isLoading = false;
        state.playlists = action.payload;
      })
      .addCase(fetchPlaylists.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(createPlaylist.pending, (state) => {
        state.isCreating = true;
      })
      .addCase(createPlaylist.fulfilled, (state, action) => {
        state.isCreating = false;
        state.playlists.push(action.payload);
      })
      .addCase(createPlaylist.rejected, (state) => {
        state.isCreating = false;
      });
  },
});

export const { setCurrentPlaylist } = playlistsSlice.actions;
export default playlistsSlice.reducer;
