// frontend/src/store/slices/librarySlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Track,
  LibraryStats,
  LibraryState,
  SortOption,
  ScanProgress,
} from "../../types";
import { libraryAPI } from "../../services/api";

const initialState: LibraryState = {
  tracks: [],
  stats: null,
  isLoading: false,
  lastScan: null,
  scanProgress: 0,
  isScanning: false,
  selectedTracks: [],
  viewMode: "list",
  sortBy: { field: "dateAdded", direction: "desc" },
};

// Async thunks
export const fetchTracks = createAsyncThunk(
  "library/fetchTracks",
  async (params?: { page?: number; limit?: number; sort?: SortOption }) => {
    const response = await libraryAPI.getTracks(params);
    return response.data;
  }
);

export const scanLibrary = createAsyncThunk(
  "library/scanLibrary",
  async (_, { dispatch }) => {
    // Start scan
    const response = await libraryAPI.scanLibrary();

    // Set up progress polling
    const pollProgress = () => {
      return libraryAPI.getScanProgress().then((progressResponse) => {
        if (progressResponse.data) {
          dispatch(updateScanProgress(progressResponse.data));
          if (progressResponse.data.current < progressResponse.data.total) {
            setTimeout(pollProgress, 1000);
          } else {
            dispatch(scanCompleted());
          }
        }
      });
    };

    pollProgress();
    return response.data;
  }
);

export const fetchLibraryStats = createAsyncThunk(
  "library/fetchStats",
  async () => {
    const response = await libraryAPI.getStats();
    return response.data;
  }
);

export const updateTrack = createAsyncThunk(
  "library/updateTrack",
  async ({ id, data }: { id: string; data: Partial<Track> }) => {
    const response = await libraryAPI.updateTrack(id, data);
    return response.data;
  }
);

export const deleteTrack = createAsyncThunk(
  "library/deleteTrack",
  async (id: string) => {
    await libraryAPI.deleteTrack(id);
    return id;
  }
);

const librarySlice = createSlice({
  name: "library",
  initialState,
  reducers: {
    setSelectedTracks: (state, action: PayloadAction<string[]>) => {
      state.selectedTracks = action.payload;
    },
    toggleTrackSelection: (state, action: PayloadAction<string>) => {
      const trackId = action.payload;
      const index = state.selectedTracks.indexOf(trackId);
      if (index > -1) {
        state.selectedTracks.splice(index, 1);
      } else {
        state.selectedTracks.push(trackId);
      }
    },
    clearSelection: (state) => {
      state.selectedTracks = [];
    },
    setViewMode: (
      state,
      action: PayloadAction<"list" | "grid" | "artwork">
    ) => {
      state.viewMode = action.payload;
    },
    setSortBy: (state, action: PayloadAction<SortOption>) => {
      state.sortBy = action.payload;
    },
    updateScanProgress: (state, action: PayloadAction<ScanProgress>) => {
      state.scanProgress =
        (action.payload.current / action.payload.total) * 100;
    },
    scanCompleted: (state) => {
      state.isScanning = false;
      state.scanProgress = 100;
      state.lastScan = new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tracks
      .addCase(fetchTracks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTracks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tracks = action.payload.tracks || action.payload;
      })
      .addCase(fetchTracks.rejected, (state) => {
        state.isLoading = false;
      })
      // Scan library
      .addCase(scanLibrary.pending, (state) => {
        state.isScanning = true;
        state.scanProgress = 0;
      })
      .addCase(scanLibrary.fulfilled, (state) => {
        // Progress will be updated via polling
      })
      .addCase(scanLibrary.rejected, (state) => {
        state.isScanning = false;
        state.scanProgress = 0;
      })
      // Fetch stats
      .addCase(fetchLibraryStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // Update track
      .addCase(updateTrack.fulfilled, (state, action) => {
        const index = state.tracks.findIndex(
          (track) => track.id === action.payload.id
        );
        if (index !== -1) {
          state.tracks[index] = action.payload;
        }
      })
      // Delete track
      .addCase(deleteTrack.fulfilled, (state, action) => {
        state.tracks = state.tracks.filter(
          (track) => track.id !== action.payload
        );
        state.selectedTracks = state.selectedTracks.filter(
          (id) => id !== action.payload
        );
      });
  },
});

export const {
  setSelectedTracks,
  toggleTrackSelection,
  clearSelection,
  setViewMode,
  setSortBy,
  updateScanProgress,
  scanCompleted,
} = librarySlice.actions;

export default librarySlice.reducer;
