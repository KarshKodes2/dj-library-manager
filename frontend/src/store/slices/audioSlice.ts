// frontend/src/store/slices/audioSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AudioState, Track } from "../../types";

const initialState: AudioState = {
  player: {
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    crossfader: 0, // -1 to 1
    cuePlaying: false,
  },
  waveformData: {},
  analyzingTracks: [],
};

const audioSlice = createSlice({
  name: "audio",
  initialState,
  reducers: {
    setCurrentTrack: (state, action: PayloadAction<Track>) => {
      state.player.currentTrack = action.payload;
      state.player.currentTime = 0;
      state.player.isPlaying = false;
    },
    playTrack: (state) => {
      state.player.isPlaying = true;
      state.player.isPaused = false;
    },
    pauseTrack: (state) => {
      state.player.isPlaying = false;
      state.player.isPaused = true;
    },
    stopTrack: (state) => {
      state.player.isPlaying = false;
      state.player.isPaused = false;
      state.player.currentTime = 0;
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.player.currentTime = action.payload;
    },
    setDuration: (state, action: PayloadAction<number>) => {
      state.player.duration = action.payload;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.player.volume = Math.max(0, Math.min(1, action.payload));
    },
    setCrossfader: (state, action: PayloadAction<number>) => {
      state.player.crossfader = Math.max(-1, Math.min(1, action.payload));
    },
    setDeckA: (state, action: PayloadAction<Track>) => {
      state.player.deckA = action.payload;
    },
    setDeckB: (state, action: PayloadAction<Track>) => {
      state.player.deckB = action.payload;
    },
    toggleCue: (state) => {
      state.player.cuePlaying = !state.player.cuePlaying;
    },
    setWaveformData: (
      state,
      action: PayloadAction<{ trackId: string; data: number[] }>
    ) => {
      state.waveformData[action.payload.trackId] = action.payload.data;
    },
    addAnalyzingTrack: (state, action: PayloadAction<string>) => {
      if (!state.analyzingTracks.includes(action.payload)) {
        state.analyzingTracks.push(action.payload);
      }
    },
    removeAnalyzingTrack: (state, action: PayloadAction<string>) => {
      state.analyzingTracks = state.analyzingTracks.filter(
        (id) => id !== action.payload
      );
    },
  },
});

export const {
  setCurrentTrack,
  playTrack,
  pauseTrack,
  stopTrack,
  setCurrentTime,
  setDuration,
  setVolume,
  setCrossfader,
  setDeckA,
  setDeckB,
  toggleCue,
  setWaveformData,
  addAnalyzingTrack,
  removeAnalyzingTrack,
} = audioSlice.actions;

export default audioSlice.reducer;
