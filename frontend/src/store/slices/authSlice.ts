// frontend/src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AuthState, User } from "../../types";

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

// For now, we'll use a simple auth system
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials: { username: string; password: string }) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const user: User = {
      id: "1",
      username: credentials.username,
      email: `${credentials.username}@example.com`,
      preferences: {
        theme: "dark",
        defaultView: "list",
        autoAnalyze: true,
        seratoSync: false,
        notifications: true,
      },
    };

    localStorage.setItem("auth_token", "fake-jwt-token");
    return user;
  }
);

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  localStorage.removeItem("auth_token");
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setUser } = authSlice.actions;
export default authSlice.reducer;

export const createCrate = createAsyncThunk(
  "crates/createCrate",
  async (data: CreateCrateData) => {
    const response = await cratesAPI.createCrate(data);
    return response.data;
  }
);

export const addTracksToCrate = createAsyncThunk(
  "crates/addTracks",
  async ({ crateId, trackIds }: { crateId: string; trackIds: string[] }) => {
    const response = await cratesAPI.addTracks(crateId, trackIds);
    return response.data;
  }
);

const cratesSlice = createSlice({
  name: "crates",
  initialState,
  reducers: {
    setSelectedCrate: (state, action: PayloadAction<string | null>) => {
      state.selectedCrate = action.payload;
    },
    setDraggedTrack: (state, action: PayloadAction<string | null>) => {
      state.draggedTrack = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCrates.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCrates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.crates = action.payload;
      })
      .addCase(fetchCrates.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(createCrate.fulfilled, (state, action) => {
        state.crates.push(action.payload);
      })
      .addCase(addTracksToCrate.fulfilled, (state, action) => {
        const index = state.crates.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.crates[index] = action.payload;
        }
      });
  },
});

export const { setSelectedCrate, setDraggedTrack } = cratesSlice.actions;
export default cratesSlice.reducer;
