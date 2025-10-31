// frontend/src/store/slices/playlistsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Playlist, PlaylistsState, CreatePlaylistData } from "../../types";
import { playlistsAPI } from "../../services/api";

const initialState: PlaylistsState = {
  playlists: [],
  currentPlaylist: null,
  isLoading: false,
  isCreating: false,
};

export const fetchPlaylists = createAsyncThunk(
  "playlists/fetchPlaylists",
  async () => {
    const response = await playlistsAPI.getPlaylists();
    return response.data;
  }
);

export const createPlaylist = createAsyncThunk(
  "playlists/createPlaylist",
  async (data: CreatePlaylistData) => {
    const response = await playlistsAPI.createPlaylist(data);
    return response.data;
  }
);
