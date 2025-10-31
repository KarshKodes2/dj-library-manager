// Application constants

export const APP_NAME = 'DJ Library Manager';
export const APP_VERSION = '1.0.0';

// Audio constants
export const SUPPORTED_AUDIO_FORMATS = [
  'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'
];

export const DEFAULT_BPM_RANGE = [60, 200];
export const DEFAULT_ENERGY_RANGE = [0, 100];

// UI constants
export const SIDEBAR_WIDTH = 256;
export const HEADER_HEIGHT = 64;
export const PLAYER_HEIGHT = 80;

// Search constants
export const SEARCH_DEBOUNCE_MS = 300;
export const MAX_SEARCH_RESULTS = 500;

// Notification constants
export const NOTIFICATION_DURATION = 4000;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'dj-library-theme',
  USER_PREFERENCES: 'dj-library-preferences',
  RECENT_SEARCHES: 'dj-library-recent-searches',
  SIDEBAR_STATE: 'dj-library-sidebar-state',
};

// API endpoints
export const API_ENDPOINTS = {
  TRACKS: '/tracks',
  CRATES: '/crates',
  PLAYLISTS: '/playlists',
  SEARCH: '/search',
  ANALYTICS: '/analytics',
  SERATO: '/serato',
};

// Default crate types
export const DEFAULT_CRATES = [
  {
    name: 'Favorites',
    type: 'static' as const,
    description: 'Your favorite tracks',
  },
  {
    name: 'Recently Added',
    type: 'smart' as const,
    description: 'Tracks added in the last 30 days',
  },
  {
    name: 'High Energy',
    type: 'smart' as const,
    description: 'Tracks with energy level > 75',
  },
  {
    name: 'Low Energy',
    type: 'smart' as const,
    description: 'Tracks with energy level < 25',
  },
];

// Genre colors for UI
export const GENRE_COLORS: Record<string, string> = {
  house: '#3B82F6',
  techno: '#8B5CF6',
  trance: '#EC4899',
  dubstep: '#F59E0B',
  'hip hop': '#EF4444',
  pop: '#10B981',
  rock: '#F97316',
  electronic: '#06B6D4',
  classical: '#6366F1',
  jazz: '#84CC16',
};
