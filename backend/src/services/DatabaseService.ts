// backend/src/services/DatabaseService.ts - COMPLETE FRESH IMPLEMENTATION
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export interface Track {
  id?: number;
  file_path: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  label?: string;
  remixer?: string;
  composer?: string;
  year?: number;
  duration: number;
  bitrate?: number;
  sample_rate?: number;
  file_size: number;
  bpm: number;
  bpm_locked: boolean;
  key_signature: string;
  key_locked: boolean;
  energy_level: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
  tempo_stability: number;
  dynamic_range: number;
  intro_time: number;
  outro_time: number;
  explicit_content: boolean;
  language?: string;
  mood?: string;
  color?: string;
  rating: number;
  play_count: number;
  skip_count: number;
  last_played?: Date;
  date_added: Date;
  file_hash: string;
  serato_id?: string;
  beatgrid?: string;
  cue_points?: string;
  loops?: string;
  waveform_overview?: string;
  waveform_detail?: string;
  artwork_path?: string;
  comment?: string;
  grouping?: string;
  folder_path?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Crate {
  id?: number;
  name: string;
  type: string;
  description?: string;
  color?: string;
  icon?: string;
  is_smart: boolean;
  is_folder: boolean;
  parent_id?: number;
  sort_order: number;
  criteria?: string;
  serato_crate_path?: string;
  track_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Playlist {
  id?: number;
  name: string;
  description?: string;
  total_duration: number;
  avg_bpm: number;
  energy_curve?: string;
  harmonic_flow_score: number;
  transition_quality: number;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SearchFilters {
  genre?: string;
  energyLevel?: number;
  bpmMin?: number;
  bpmMax?: number;
  key?: string;
  yearMin?: number;
  yearMax?: number;
  rating?: number;
  explicit?: boolean;
  language?: string;
  mood?: string;
  durationMin?: number;
  durationMax?: number;
  sortBy?: string;
  limit?: number;
}

export interface LibraryStats {
  totalTracks: { count: number }[];
  totalDuration: { total: number }[];
  totalSize: { total: number }[];
  avgBPM: { avg: number }[];
  genreBreakdown: { genre: string; count: number }[];
  energyBreakdown: { energy_level: number; count: number }[];
  keyBreakdown: { key_signature: string; count: number }[];
  recentlyAdded: { count: number }[];
  topRated: { count: number }[];
  explicitCount: { count: number }[];
}

export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = process.env.DATABASE_PATH || "./database/dj-library.db";
  }

  public async initialize(): Promise<void> {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize database connection
      this.db = new Database(this.dbPath);

      // Set pragmas for performance and reliability
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");
      this.db.pragma("cache_size = 1000000");
      this.db.pragma("temp_store = memory");
      this.db.pragma("foreign_keys = ON");

      // Create all tables
      this.createTables();
      this.createIndexes();
      this.seedInitialData();

      console.log("✅ Database initialized successfully");
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error("Database not initialized");

    // Tracks table - main music library
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT NOT NULL,
        genre TEXT NOT NULL,
        label TEXT,
        remixer TEXT,
        composer TEXT,
        year INTEGER,
        duration REAL NOT NULL,
        bitrate INTEGER,
        sample_rate INTEGER,
        file_size INTEGER NOT NULL,
        bpm REAL NOT NULL,
        bpm_locked INTEGER DEFAULT 0,
        key_signature TEXT NOT NULL,
        key_locked INTEGER DEFAULT 0,
        energy_level INTEGER NOT NULL CHECK(energy_level BETWEEN 1 AND 5),
        danceability REAL NOT NULL CHECK(danceability BETWEEN 0 AND 1),
        valence REAL NOT NULL CHECK(valence BETWEEN 0 AND 1),
        acousticness REAL NOT NULL CHECK(acousticness BETWEEN 0 AND 1),
        instrumentalness REAL NOT NULL CHECK(instrumentalness BETWEEN 0 AND 1),
        liveness REAL NOT NULL CHECK(liveness BETWEEN 0 AND 1),
        speechiness REAL NOT NULL CHECK(speechiness BETWEEN 0 AND 1),
        tempo_stability REAL NOT NULL CHECK(tempo_stability BETWEEN 0 AND 1),
        dynamic_range REAL NOT NULL,
        intro_time REAL NOT NULL,
        outro_time REAL NOT NULL,
        explicit_content INTEGER DEFAULT 0 CHECK(explicit_content IN (0, 1)),
        language TEXT,
        mood TEXT,
        color TEXT,
        rating INTEGER DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),
        play_count INTEGER DEFAULT 0,
        skip_count INTEGER DEFAULT 0,
        last_played DATETIME,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_hash TEXT NOT NULL,
        serato_id TEXT,
        beatgrid TEXT,
        cue_points TEXT,
        loops TEXT,
        waveform_overview TEXT,
        waveform_detail TEXT,
        artwork_path TEXT,
        comment TEXT,
        grouping TEXT,
        folder_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crates table - for organizing tracks
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS crates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        color TEXT,
        icon TEXT,
        is_smart INTEGER DEFAULT 0 CHECK(is_smart IN (0, 1)),
        is_folder INTEGER DEFAULT 0 CHECK(is_folder IN (0, 1)),
        parent_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        criteria TEXT,
        serato_crate_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES crates(id) ON DELETE CASCADE
      )
    `);

    // Crate tracks junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS crate_tracks (
        crate_id INTEGER NOT NULL,
        track_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (crate_id, track_id),
        FOREIGN KEY (crate_id) REFERENCES crates(id) ON DELETE CASCADE,
        FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      )
    `);

    // Playlists table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        total_duration REAL DEFAULT 0,
        avg_bpm REAL DEFAULT 0,
        energy_curve TEXT,
        harmonic_flow_score REAL DEFAULT 0 CHECK(harmonic_flow_score BETWEEN 0 AND 1),
        transition_quality REAL DEFAULT 0 CHECK(transition_quality BETWEEN 0 AND 1),
        is_public INTEGER DEFAULT 0 CHECK(is_public IN (0, 1)),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Playlist tracks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlist_id INTEGER NOT NULL,
        track_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        transition_type TEXT,
        transition_quality REAL CHECK(transition_quality BETWEEN 0 AND 1),
        mix_in_time REAL,
        mix_out_time REAL,
        notes TEXT,
        PRIMARY KEY (playlist_id, position),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      )
    `);

    // Performance analytics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS performance_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        venue TEXT,
        audience_size INTEGER,
        crowd_response INTEGER CHECK(crowd_response BETWEEN 1 AND 5),
        energy_context TEXT,
        time_of_day TEXT,
        weather TEXT,
        success_rating INTEGER CHECK(success_rating BETWEEN 1 AND 5),
        notes TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      )
    `);

    // Key compatibility matrix (Camelot wheel)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS key_compatibility (
        key1 TEXT NOT NULL,
        key2 TEXT NOT NULL,
        compatibility_score REAL NOT NULL CHECK(compatibility_score BETWEEN 0 AND 1),
        transition_type TEXT NOT NULL,
        PRIMARY KEY (key1, key2)
      )
    `);

    // Similar tracks table for recommendations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS similar_tracks (
        track1_id INTEGER NOT NULL,
        track2_id INTEGER NOT NULL,
        similarity_score REAL NOT NULL CHECK(similarity_score BETWEEN 0 AND 1),
        similarity_factors TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (track1_id, track2_id),
        FOREIGN KEY (track1_id) REFERENCES tracks(id) ON DELETE CASCADE,
        FOREIGN KEY (track2_id) REFERENCES tracks(id) ON DELETE CASCADE
      )
    `);

    // Track versions table for managing different versions
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS track_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track_id INTEGER NOT NULL,
        version_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        quality_score REAL CHECK(quality_score BETWEEN 0 AND 1),
        preferred INTEGER DEFAULT 0 CHECK(preferred IN (0, 1)),
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      )
    `);

    // Mix recordings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mix_recordings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        duration REAL NOT NULL,
        tracklist TEXT,
        venue TEXT,
        date_recorded DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Database tables created successfully");
  }

  private createIndexes(): void {
    if (!this.db) return;

    const indexes = [
      // Track indexes for fast searching
      "CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_bpm ON tracks(bpm)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_key ON tracks(key_signature)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_energy ON tracks(energy_level)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_rating ON tracks(rating)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_year ON tracks(year)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_date_added ON tracks(date_added)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_folder_path ON tracks(folder_path)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_file_hash ON tracks(file_hash)",
      "CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON tracks(play_count)",

      // Crate indexes
      "CREATE INDEX IF NOT EXISTS idx_crates_type ON crates(type)",
      "CREATE INDEX IF NOT EXISTS idx_crates_parent ON crates(parent_id)",
      "CREATE INDEX IF NOT EXISTS idx_crates_smart ON crates(is_smart)",
      "CREATE INDEX IF NOT EXISTS idx_crates_folder ON crates(is_folder)",

      // Junction table indexes
      "CREATE INDEX IF NOT EXISTS idx_crate_tracks_crate ON crate_tracks(crate_id)",
      "CREATE INDEX IF NOT EXISTS idx_crate_tracks_track ON crate_tracks(track_id)",
      "CREATE INDEX IF NOT EXISTS idx_crate_tracks_position ON crate_tracks(position)",

      // Playlist indexes
      "CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id)",
      "CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id)",
      "CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(position)",

      // Performance log indexes
      "CREATE INDEX IF NOT EXISTS idx_performance_track ON performance_log(track_id)",
      "CREATE INDEX IF NOT EXISTS idx_performance_event ON performance_log(event_type)",
      "CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON performance_log(timestamp)",
      "CREATE INDEX IF NOT EXISTS idx_performance_venue ON performance_log(venue)",

      // Similar tracks indexes
      "CREATE INDEX IF NOT EXISTS idx_similar_tracks_1 ON similar_tracks(track1_id)",
      "CREATE INDEX IF NOT EXISTS idx_similar_tracks_2 ON similar_tracks(track2_id)",
      "CREATE INDEX IF NOT EXISTS idx_similar_tracks_score ON similar_tracks(similarity_score)",
    ];

    indexes.forEach((sql) => {
      try {
        this.db!.exec(sql);
      } catch (error) {
        console.warn("Warning creating index:", error);
      }
    });

    console.log("✅ Database indexes created successfully");
  }

  private seedInitialData(): void {
    if (!this.db) return;

    // Initialize Camelot wheel key compatibility
    this.initializeKeyCompatibility();

    // Create default smart crates
    this.createDefaultSmartCrates();
  }

  private initializeKeyCompatibility(): void {
    if (!this.db) return;

    // Check if already initialized
    const existing = this.db
      .prepare("SELECT COUNT(*) as count FROM key_compatibility")
      .get() as { count: number };
    if (existing.count > 0) {
      return; // Already initialized
    }

    const camelotKeys = [
      "1A",
      "1B",
      "2A",
      "2B",
      "3A",
      "3B",
      "4A",
      "4B",
      "5A",
      "5B",
      "6A",
      "6B",
      "7A",
      "7B",
      "8A",
      "8B",
      "9A",
      "9B",
      "10A",
      "10B",
      "11A",
      "11B",
      "12A",
      "12B",
    ];

    const insertKey = this.db.prepare(`
      INSERT INTO key_compatibility (key1, key2, compatibility_score, transition_type)
      VALUES (?, ?, ?, ?)
    `);

    camelotKeys.forEach((key1) => {
      camelotKeys.forEach((key2) => {
        const compatibility = this.calculateKeyCompatibility(key1, key2);
        insertKey.run(key1, key2, compatibility.score, compatibility.type);
      });
    });

    console.log("✅ Key compatibility matrix initialized");
  }

  private calculateKeyCompatibility(
    key1: string,
    key2: string
  ): { score: number; type: string } {
    const num1 = parseInt(key1);
    const num2 = parseInt(key2);
    const letter1 = key1.slice(-1);
    const letter2 = key2.slice(-1);

    // Perfect match
    if (key1 === key2) return { score: 1.0, type: "Perfect" };

    // Same number, different letter (relative major/minor)
    if (num1 === num2 && letter1 !== letter2) {
      return { score: 0.9, type: "Relative" };
    }

    // Adjacent numbers, same letter
    if (
      (Math.abs(num1 - num2) === 1 || Math.abs(num1 - num2) === 11) &&
      letter1 === letter2
    ) {
      return { score: 0.8, type: "Adjacent" };
    }

    // Adjacent numbers, different letter
    if (Math.abs(num1 - num2) === 1 || Math.abs(num1 - num2) === 11) {
      return { score: 0.6, type: "Adjacent Cross" };
    }

    // Perfect fifth (7 semitones apart)
    if (Math.abs(num1 - num2) === 7 || Math.abs(num1 - num2) === 5) {
      return { score: 0.7, type: "Perfect Fifth" };
    }

    return { score: 0.3, type: "Distant" };
  }

  private createDefaultSmartCrates(): void {
    if (!this.db) return;

    // Check if already initialized
    const existing = this.db
      .prepare("SELECT COUNT(*) as count FROM crates WHERE is_smart = 1")
      .get() as { count: number };
    if (existing.count > 0) {
      return; // Already initialized
    }

    const defaultCrates = [
      // Energy-based crates
      {
        name: "🔥 Peak Time Bangers",
        type: "energy",
        description: "Ultimate peak time tracks",
        color: "#FF0000",
        is_smart: 1,
        criteria: JSON.stringify({
          energy_level: 5,
          danceability: { min: 0.8 },
          bpm: { min: 125 },
        }),
      },
      {
        name: "⚡ High Energy",
        type: "energy",
        description: "High energy dance tracks",
        color: "#FF6B35",
        is_smart: 1,
        criteria: JSON.stringify({
          energy_level: 4,
          danceability: { min: 0.6 },
        }),
      },
      {
        name: "🎵 Medium Energy",
        type: "energy",
        description: "Versatile medium energy tracks",
        color: "#F5A623",
        is_smart: 1,
        criteria: JSON.stringify({ energy_level: 3 }),
      },
      {
        name: "😌 Low Energy",
        type: "energy",
        description: "Chill and ambient tracks",
        color: "#4A90E2",
        is_smart: 1,
        criteria: JSON.stringify({ energy_level: { max: 2 } }),
      },

      // BPM-based crates
      {
        name: "🐌 Slow (60-90 BPM)",
        type: "bpm",
        description: "Very slow tracks",
        color: "#8E44AD",
        is_smart: 1,
        criteria: JSON.stringify({ bpm: { min: 60, max: 90 } }),
      },
      {
        name: "🚶 Walking (90-110 BPM)",
        type: "bpm",
        description: "Walking pace tracks",
        color: "#3498DB",
        is_smart: 1,
        criteria: JSON.stringify({ bpm: { min: 90, max: 110 } }),
      },
      {
        name: "🏃 Jogging (110-130 BPM)",
        type: "bpm",
        description: "Jogging pace tracks",
        color: "#2ECC71",
        is_smart: 1,
        criteria: JSON.stringify({ bpm: { min: 110, max: 130 } }),
      },
      {
        name: "🏃‍♂️ Running (130-150 BPM)",
        type: "bpm",
        description: "Running pace tracks",
        color: "#F39C12",
        is_smart: 1,
        criteria: JSON.stringify({ bpm: { min: 130, max: 150 } }),
      },
      {
        name: "💨 Sprinting (150+ BPM)",
        type: "bpm",
        description: "Ultra fast tracks",
        color: "#E74C3C",
        is_smart: 1,
        criteria: JSON.stringify({ bpm: { min: 150 } }),
      },

      // Event-specific crates
      {
        name: "🍸 Cocktail Hour",
        type: "event",
        description: "Sophisticated background music",
        color: "#95A5A6",
        is_smart: 1,
        criteria: JSON.stringify({
          energy_level: { max: 3 },
          acousticness: { min: 0.3 },
          explicit_content: 0,
        }),
      },
      {
        name: "💒 Wedding Ceremony",
        type: "event",
        description: "Romantic ceremony music",
        color: "#FFB6C1",
        is_smart: 1,
        criteria: JSON.stringify({
          valence: { min: 0.6 },
          acousticness: { min: 0.4 },
          energy_level: { max: 3 },
          explicit_content: 0,
        }),
      },
      {
        name: "🎉 Wedding Reception",
        type: "event",
        description: "Cross-generational party music",
        color: "#FF69B4",
        is_smart: 1,
        criteria: JSON.stringify({
          danceability: { min: 0.5 },
          explicit_content: 0,
          energy_level: { min: 3 },
        }),
      },
      {
        name: "🏢 Corporate Events",
        type: "event",
        description: "Professional atmosphere music",
        color: "#2C3E50",
        is_smart: 1,
        criteria: JSON.stringify({
          explicit_content: 0,
          energy_level: { min: 2, max: 4 },
          speechiness: { max: 0.2 },
        }),
      },
      {
        name: "👶 Kids Events",
        type: "event",
        description: "Family-friendly entertainment",
        color: "#FF6347",
        is_smart: 1,
        criteria: JSON.stringify({
          explicit_content: 0,
          valence: { min: 0.7 },
          energy_level: { min: 3, max: 4 },
        }),
      },

      // Genre-specific crates
      {
        name: "🏠 House Music",
        type: "genre",
        description: "All house variations",
        color: "#00CED1",
        is_smart: 1,
        criteria: JSON.stringify({
          genre: ["House", "Deep House", "Tech House", "Progressive House"],
        }),
      },
      {
        name: "🤖 Techno",
        type: "genre",
        description: "Techno and minimal",
        color: "#000000",
        is_smart: 1,
        criteria: JSON.stringify({
          genre: ["Techno", "Minimal Techno", "Hard Techno"],
        }),
      },
      {
        name: "🎤 Hip Hop",
        type: "genre",
        description: "Hip hop and rap",
        color: "#CD853F",
        is_smart: 1,
        criteria: JSON.stringify({ genre: ["Hip Hop", "Rap", "Trap"] }),
      },
      {
        name: "🌟 Pop Hits",
        type: "genre",
        description: "Popular music",
        color: "#FF1493",
        is_smart: 1,
        criteria: JSON.stringify({ genre: ["Pop", "Dance Pop", "Electropop"] }),
      },

      // Quality-based crates
      {
        name: "💎 High Quality (320kbps+)",
        type: "quality",
        description: "High bitrate tracks",
        color: "#FFD700",
        is_smart: 1,
        criteria: JSON.stringify({ bitrate: { min: 320 } }),
      },
      {
        name: "✅ Clean Versions",
        type: "content",
        description: "Explicit-free tracks",
        color: "#228B22",
        is_smart: 1,
        criteria: JSON.stringify({ explicit_content: 0 }),
      },
      {
        name: "⭐ 5-Star Tracks",
        type: "performance",
        description: "Top-rated tracks",
        color: "#FFD700",
        is_smart: 1,
        criteria: JSON.stringify({ rating: 5 }),
      },
      {
        name: "🆕 Recently Added",
        type: "performance",
        description: "Newest additions",
        color: "#32CD32",
        is_smart: 1,
        criteria: JSON.stringify({ days_since_added: { max: 30 } }),
      },
    ];

    const insertCrate = this.db.prepare(`
      INSERT INTO crates (name, type, description, color, is_smart, criteria, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    defaultCrates.forEach((crate, index) => {
      insertCrate.run(
        crate.name,
        crate.type,
        crate.description,
        crate.color,
        crate.is_smart,
        crate.criteria,
        index
      );
    });

    console.log(`✅ Created ${defaultCrates.length} default smart crates`);
  }

  // =============================================================================
  // TRACK OPERATIONS
  // =============================================================================

  public insertTrack(
    track: Omit<Track, "id" | "created_at" | "updated_at">
  ): number {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      INSERT INTO tracks (
        file_path, title, artist, album, genre, label, remixer, composer, year,
        duration, bitrate, sample_rate, file_size, bpm, bpm_locked, key_signature,
        key_locked, energy_level, danceability, valence, acousticness, instrumentalness,
        liveness, speechiness, tempo_stability, dynamic_range, intro_time, outro_time,
        explicit_content, language, mood, color, rating, play_count, skip_count,
        last_played, date_added, file_hash, serato_id, beatgrid, cue_points, loops,
        waveform_overview, waveform_detail, artwork_path, comment, grouping, folder_path
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    const result = stmt.run(
      track.file_path,
      track.title,
      track.artist,
      track.album,
      track.genre,
      track.label,
      track.remixer,
      track.composer,
      track.year,
      track.duration,
      track.bitrate,
      track.sample_rate,
      track.file_size,
      track.bpm,
      track.bpm_locked ? 1 : 0,
      track.key_signature,
      track.key_locked ? 1 : 0,
      track.energy_level,
      track.danceability,
      track.valence,
      track.acousticness,
      track.instrumentalness,
      track.liveness,
      track.speechiness,
      track.tempo_stability,
      track.dynamic_range,
      track.intro_time,
      track.outro_time,
      track.explicit_content ? 1 : 0,
      track.language,
      track.mood,
      track.color,
      track.rating,
      track.play_count,
      track.skip_count,
      track.last_played,
      track.date_added,
      track.file_hash,
      track.serato_id,
      track.beatgrid,
      track.cue_points,
      track.loops,
      track.waveform_overview,
      track.waveform_detail,
      track.artwork_path,
      track.comment,
      track.grouping,
      track.folder_path
    );

    return result.lastInsertRowid as number;
  }

  public updateTrack(id: number, updates: Partial<Track>): boolean {
    if (!this.db) throw new Error("Database not initialized");

    const setClause = Object.keys(updates)
      .filter((key) => key !== "id" && key !== "created_at")
      .map((key) => `${key} = ?`)
      .join(", ");

    if (!setClause) return false;

    const values = Object.entries(updates)
      .filter(([key]) => key !== "id" && key !== "created_at")
      .map(([, value]) => {
        // Handle boolean to integer conversion for SQLite
        if (typeof value === "boolean") {
          return value ? 1 : 0;
        }
        return value;
      });

    const stmt = this.db.prepare(`
      UPDATE tracks 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    const result = stmt.run(...values, id);
    return result.changes > 0;
  }

  public getTrackById(id: number): Track | null {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare("SELECT * FROM tracks WHERE id = ?");
    const row = stmt.get(id) as any;

    if (!row) return null;

    // Convert integer fields back to booleans
    return {
      ...row,
      bpm_locked: Boolean(row.bmp_locked),
      key_locked: Boolean(row.key_locked),
      explicit_content: Boolean(row.explicit_content),
    } as Track;
  }

  public getTrackByPath(filePath: string): Track | null {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare("SELECT * FROM tracks WHERE file_path = ?");
    const row = stmt.get(filePath) as any;

    if (!row) return null;

    // Convert integer fields back to booleans
    return {
      ...row,
      bpm_locked: Boolean(row.bpm_locked),
      key_locked: Boolean(row.key_locked),
      explicit_content: Boolean(row.explicit_content),
    } as Track;
  }

  public getAllTracks(limit?: number, offset?: number): Track[] {
    if (!this.db) throw new Error("Database not initialized");

    let sql = "SELECT * FROM tracks ORDER BY artist, title";
    if (limit) {
      sql += ` LIMIT ${limit}`;
      if (offset) {
        sql += ` OFFSET ${offset}`;
      }
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all() as any[];

    // Convert integer fields back to booleans for all tracks
    return rows.map((row) => ({
      ...row,
      bmp_locked: Boolean(row.bmp_locked),
      key_locked: Boolean(row.key_locked),
      explicit_content: Boolean(row.explicit_content),
    })) as Track[];
  }

  public deleteTrack(id: number): boolean {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare("DELETE FROM tracks WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public searchTracks(query: string, filters: SearchFilters = {}): Track[] {
    if (!this.db) throw new Error("Database not initialized");

    let sql = `
      SELECT * FROM tracks
      WHERE (title LIKE ? OR artist LIKE ? OR album LIKE ? OR genre LIKE ?)
    `;
    const params: any[] = [
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
    ];

    // Apply filters with proper type handling
    if (filters.genre) {
      sql += " AND genre = ?";
      params.push(filters.genre);
    }

    if (filters.energyLevel !== undefined) {
      sql += " AND energy_level = ?";
      params.push(filters.energyLevel);
    }

    if (filters.bpmMin !== undefined) {
      sql += " AND bmp >= ?";
      params.push(filters.bpmMin);
    }

    if (filters.bpmMax !== undefined) {
      sql += " AND bmp <= ?";
      params.push(filters.bpmMax);
    }

    if (filters.key) {
      sql += " AND key_signature = ?";
      params.push(filters.key);
    }

    if (filters.yearMin !== undefined) {
      sql += " AND year >= ?";
      params.push(filters.yearMin);
    }

    if (filters.yearMax !== undefined) {
      sql += " AND year <= ?";
      params.push(filters.yearMax);
    }

    if (filters.rating !== undefined) {
      sql += " AND rating >= ?";
      params.push(filters.rating);
    }

    // Handle boolean explicit filter properly
    if (filters.explicit !== undefined) {
      sql += " AND explicit_content = ?";
      params.push(filters.explicit ? 1 : 0);
    }

    if (filters.language) {
      sql += " AND language = ?";
      params.push(filters.language);
    }

    if (filters.mood) {
      sql += " AND mood = ?";
      params.push(filters.mood);
    }

    if (filters.durationMin !== undefined) {
      sql += " AND duration >= ?";
      params.push(filters.durationMin);
    }

    if (filters.durationMax !== undefined) {
      sql += " AND duration <= ?";
      params.push(filters.durationMax);
    }

    // Sorting
    const sortBy = filters.sortBy || "artist";
    const validSortFields = [
      "artist",
      "title",
      "album",
      "genre",
      "year",
      "bpm",
      "rating",
      "date_added",
      "play_count",
    ];

    if (validSortFields.includes(sortBy)) {
      sql += ` ORDER BY ${sortBy}, title`;
    } else {
      sql += " ORDER BY artist, title";
    }

    // Limit
    const limit = filters.limit || 500;
    sql += ` LIMIT ${limit}`;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    // Convert integer fields back to booleans
    return rows.map((row) => ({
      ...row,
      bmp_locked: Boolean(row.bmp_locked),
      key_locked: Boolean(row.key_locked),
      explicit_content: Boolean(row.explicit_content),
    })) as Track[];
  }

  // =============================================================================
  // CRATE OPERATIONS
  // =============================================================================

  public insertCrate(
    crate: Omit<Crate, "id" | "created_at" | "updated_at">
  ): number {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      INSERT INTO crates (
        name, type, description, color, icon, is_smart, is_folder, parent_id,
        sort_order, criteria, serato_crate_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      crate.name,
      crate.type,
      crate.description,
      crate.color,
      crate.icon,
      crate.is_smart ? 1 : 0,
      crate.is_folder ? 1 : 0,
      crate.parent_id,
      crate.sort_order,
      crate.criteria,
      crate.serato_crate_path
    );

    return result.lastInsertRowid as number;
  }

  public updateCrate(id: number, updates: Partial<Crate>): boolean {
    if (!this.db) throw new Error("Database not initialized");

    const setClause = Object.keys(updates)
      .filter((key) => key !== "id" && key !== "created_at")
      .map((key) => `${key} = ?`)
      .join(", ");

    if (!setClause) return false;

    const values = Object.entries(updates)
      .filter(([key]) => key !== "id" && key !== "created_at")
      .map(([, value]) => {
        if (typeof value === "boolean") {
          return value ? 1 : 0;
        }
        return value;
      });

    const stmt = this.db.prepare(`
      UPDATE crates 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    const result = stmt.run(...values, id);
    return result.changes > 0;
  }

  public getCrateById(id: number): Crate | null {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      SELECT c.*, COUNT(ct.track_id) as track_count
      FROM crates c
      LEFT JOIN crate_tracks ct ON c.id = ct.crate_id
      WHERE c.id = ?
      GROUP BY c.id
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      ...row,
      is_smart: Boolean(row.is_smart),
      is_folder: Boolean(row.is_folder),
    } as Crate;
  }

  public getAllCrates(): Crate[] {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      SELECT c.*, COUNT(ct.track_id) as track_count
      FROM crates c
      LEFT JOIN crate_tracks ct ON c.id = ct.crate_id
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);

    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      ...row,
      is_smart: Boolean(row.is_smart),
      is_folder: Boolean(row.is_folder),
    })) as Crate[];
  }

  public getCratesByType(type: string): Crate[] {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      SELECT c.*, COUNT(ct.track_id) as track_count
      FROM crates c
      LEFT JOIN crate_tracks ct ON c.id = ct.crate_id
      WHERE c.type = ?
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);

    const rows = stmt.all(type) as any[];

    return rows.map((row) => ({
      ...row,
      is_smart: Boolean(row.is_smart),
      is_folder: Boolean(row.is_folder),
    })) as Crate[];
  }

  public deleteCrate(id: number): boolean {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare("DELETE FROM crates WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  public addTrackToCrate(
    crateId: number,
    trackId: number,
    position?: number
  ): boolean {
    if (!this.db) throw new Error("Database not initialized");

    if (!position) {
      // Get the next position
      const maxPos = this.db
        .prepare(
          "SELECT MAX(position) as max_pos FROM crate_tracks WHERE crate_id = ?"
        )
        .get(crateId) as any;
      position = (maxPos?.max_pos || 0) + 1;
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO crate_tracks (crate_id, track_id, position)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(crateId, trackId, position);
    return result.changes > 0;
  }

  public removeTrackFromCrate(crateId: number, trackId: number): boolean {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(
      "DELETE FROM crate_tracks WHERE crate_id = ? AND track_id = ?"
    );
    const result = stmt.run(crateId, trackId);
    return result.changes > 0;
  }

  public getCrateTracks(crateId: number): Track[] {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      SELECT t.*, ct.position
      FROM tracks t
      JOIN crate_tracks ct ON t.id = ct.track_id
      WHERE ct.crate_id = ?
      ORDER BY ct.position
    `);

    const rows = stmt.all(crateId) as any[];

    return rows.map((row) => ({
      ...row,
      bmp_locked: Boolean(row.bmp_locked),
      key_locked: Boolean(row.key_locked),
      explicit_content: Boolean(row.explicit_content),
    })) as Track[];
  }

  // =============================================================================
  // SMART CRATE OPERATIONS
  // =============================================================================

  public findTracksMatchingCriteria(criteria: any): number[] {
    if (!this.db) throw new Error("Database not initialized");

    let sql = "SELECT id FROM tracks WHERE 1=1";
    const params: any[] = [];

    // Build dynamic query based on criteria
    Object.entries(criteria).forEach(([field, condition]) => {
      if (
        typeof condition === "object" &&
        condition !== null &&
        !Array.isArray(condition)
      ) {
        if ("min" in condition && condition.min !== undefined) {
          sql += ` AND ${field} >= ?`;
          params.push(condition.min);
        }
        if ("max" in condition && condition.max !== undefined) {
          sql += ` AND ${field} <= ?`;
          params.push(condition.max);
        }
      } else if (Array.isArray(condition)) {
        const placeholders = condition.map(() => "?").join(",");
        sql += ` AND ${field} IN (${placeholders})`;
        params.push(...condition);
      } else {
        sql += ` AND ${field} = ?`;
        params.push(condition);
      }
    });

    const stmt = this.db.prepare(sql);
    const results = stmt.all(...params) as { id: number }[];
    return results.map((row) => row.id);
  }

  public updateSmartCrates(): void {
    if (!this.db) return;

    console.log("🤖 Updating smart crates...");

    const smartCrates = this.getAllCrates().filter((crate) => crate.is_smart);

    for (const crate of smartCrates) {
      if (crate.criteria) {
        try {
          const criteria = JSON.parse(crate.criteria);
          const matchingTrackIds = this.findTracksMatchingCriteria(criteria);

          // Clear existing tracks from crate
          this.db
            .prepare("DELETE FROM crate_tracks WHERE crate_id = ?")
            .run(crate.id);

          // Add matching tracks
          matchingTrackIds.forEach((trackId, index) => {
            this.addTrackToCrate(crate.id!, trackId, index + 1);
          });

          console.log(
            `📦 Updated smart crate "${crate.name}": ${matchingTrackIds.length} tracks`
          );
        } catch (error) {
          console.error(`Error updating smart crate ${crate.name}:`, error);
        }
      }
    }

    console.log("✅ Smart crates updated");
  }

  // =============================================================================
  // PLAYLIST OPERATIONS
  // =============================================================================

  public insertPlaylist(
    playlist: Omit<Playlist, "id" | "created_at" | "updated_at">
  ): number {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      INSERT INTO playlists (
        name, description, total_duration, avg_bpm, energy_curve,
        harmonic_flow_score, transition_quality, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      playlist.name,
      playlist.description,
      playlist.total_duration,
      playlist.avg_bpm,
      playlist.energy_curve,
      playlist.harmonic_flow_score,
      playlist.transition_quality,
      playlist.is_public ? 1 : 0
    );

    return result.lastInsertRowid as number;
  }

  public getPlaylistById(id: number): Playlist | null {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare("SELECT * FROM playlists WHERE id = ?");
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      ...row,
      is_public: Boolean(row.is_public),
    } as Playlist;
  }

  public getAllPlaylists(): Playlist[] {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      SELECT p.*, COUNT(pt.track_id) as track_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      ...row,
      is_public: Boolean(row.is_public),
    })) as Playlist[];
  }

  public deletePlaylist(id: number): boolean {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare("DELETE FROM playlists WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // =============================================================================
  // ANALYTICS & PERFORMANCE
  // =============================================================================

  public getLibraryStats(): LibraryStats {
    if (!this.db) throw new Error("Database not initialized");

    const stats: LibraryStats = {
      totalTracks: [
        this.db.prepare("SELECT COUNT(*) as count FROM tracks").get() as {
          count: number;
        },
      ],
      totalDuration: [
        this.db.prepare("SELECT SUM(duration) as total FROM tracks").get() as {
          total: number;
        },
      ],
      totalSize: [
        this.db.prepare("SELECT SUM(file_size) as total FROM tracks").get() as {
          total: number;
        },
      ],
      avgBPM: [
        this.db.prepare("SELECT AVG(bpm) as avg FROM tracks").get() as {
          avg: number;
        },
      ],
      genreBreakdown: this.db
        .prepare(
          "SELECT genre, COUNT(*) as count FROM tracks GROUP BY genre ORDER BY count DESC LIMIT 20"
        )
        .all() as { genre: string; count: number }[],
      energyBreakdown: this.db
        .prepare(
          "SELECT energy_level, COUNT(*) as count FROM tracks GROUP BY energy_level ORDER BY energy_level"
        )
        .all() as { energy_level: number; count: number }[],
      keyBreakdown: this.db
        .prepare(
          "SELECT key_signature, COUNT(*) as count FROM tracks GROUP BY key_signature ORDER BY count DESC LIMIT 24"
        )
        .all() as { key_signature: string; count: number }[],
      recentlyAdded: [
        this.db
          .prepare(
            'SELECT COUNT(*) as count FROM tracks WHERE date_added > datetime("now", "-30 days")'
          )
          .get() as { count: number },
      ],
      topRated: [
        this.db
          .prepare("SELECT COUNT(*) as count FROM tracks WHERE rating >= 4")
          .get() as { count: number },
      ],
      explicitCount: [
        this.db
          .prepare(
            "SELECT COUNT(*) as count FROM tracks WHERE explicit_content = 1"
          )
          .get() as { count: number },
      ],
    };

    return stats;
  }

  public logPerformance(data: {
    trackId: number;
    eventType: string;
    venue?: string;
    audienceSize?: number;
    crowdResponse?: number;
    energyContext?: string;
    timeOfDay?: string;
    successRating?: number;
    notes?: string;
  }): void {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      INSERT INTO performance_log 
      (track_id, event_type, venue, audience_size, crowd_response, 
       energy_context, time_of_day, success_rating, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.trackId,
      data.eventType,
      data.venue,
      data.audienceSize,
      data.crowdResponse,
      data.energyContext,
      data.timeOfDay,
      data.successRating,
      data.notes
    );

    // Update track statistics
    this.db
      .prepare(
        `
      UPDATE tracks 
      SET play_count = play_count + 1, 
          last_played = CURRENT_TIMESTAMP
      WHERE id = ?
    `
      )
      .run(data.trackId);
  }

  public getPerformanceAnalytics(trackId?: number): any {
    if (!this.db) throw new Error("Database not initialized");

    if (trackId) {
      // Get analytics for specific track
      return {
        totalPlays: this.db
          .prepare(
            "SELECT COUNT(*) as count FROM performance_log WHERE track_id = ?"
          )
          .get(trackId),
        avgCrowdResponse: this.db
          .prepare(
            "SELECT AVG(crowd_response) as avg FROM performance_log WHERE track_id = ? AND crowd_response IS NOT NULL"
          )
          .get(trackId),
        avgSuccessRating: this.db
          .prepare(
            "SELECT AVG(success_rating) as avg FROM performance_log WHERE track_id = ? AND success_rating IS NOT NULL"
          )
          .get(trackId),
        eventTypes: this.db
          .prepare(
            "SELECT event_type, COUNT(*) as count FROM performance_log WHERE track_id = ? GROUP BY event_type"
          )
          .all(trackId),
        venues: this.db
          .prepare(
            "SELECT venue, COUNT(*) as count FROM performance_log WHERE track_id = ? AND venue IS NOT NULL GROUP BY venue"
          )
          .all(trackId),
      };
    } else {
      // Get overall analytics
      return {
        totalPerformances: this.db
          .prepare("SELECT COUNT(*) as count FROM performance_log")
          .get(),
        topTracks: this.db
          .prepare(
            `
          SELECT t.title, t.artist, COUNT(pl.id) as play_count, AVG(pl.success_rating) as avg_rating
          FROM tracks t
          JOIN performance_log pl ON t.id = pl.track_id
          GROUP BY t.id
          ORDER BY play_count DESC, avg_rating DESC
          LIMIT 10
        `
          )
          .all(),
        eventTypeStats: this.db
          .prepare(
            "SELECT event_type, COUNT(*) as count, AVG(success_rating) as avg_rating FROM performance_log GROUP BY event_type"
          )
          .all(),
        venueStats: this.db
          .prepare(
            "SELECT venue, COUNT(*) as count, AVG(success_rating) as avg_rating FROM performance_log WHERE venue IS NOT NULL GROUP BY venue ORDER BY count DESC LIMIT 10"
          )
          .all(),
      };
    }
  }

  // =============================================================================
  // SIMILAR TRACKS & RECOMMENDATIONS
  // =============================================================================

  public getSimilarTracks(trackId: number, limit: number = 10): Track[] {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      SELECT t.*, st.similarity_score
      FROM tracks t
      JOIN similar_tracks st ON t.id = st.track2_id
      WHERE st.track1_id = ?
      ORDER BY st.similarity_score DESC
      LIMIT ?
    `);

    const rows = stmt.all(trackId, limit) as any[];

    return rows.map((row) => ({
      ...row,
      bmp_locked: Boolean(row.bmp_locked),
      key_locked: Boolean(row.key_locked),
      explicit_content: Boolean(row.explicit_content),
    })) as Track[];
  }

  public insertSimilarTrack(
    track1Id: number,
    track2Id: number,
    similarityScore: number,
    factors?: string[]
  ): void {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO similar_tracks (track1_id, track2_id, similarity_score, similarity_factors)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      track1Id,
      track2Id,
      similarityScore,
      factors ? JSON.stringify(factors) : null
    );
  }

  public getRecommendations(
    filters: {
      genre?: string;
      mood?: string;
      energy?: number;
      limit?: number;
    } = {}
  ): Track[] {
    if (!this.db) throw new Error("Database not initialized");

    let sql = `
      SELECT *, 
        (rating * 2 + play_count * 0.1) as recommendation_score
      FROM tracks 
      WHERE rating >= 3
    `;
    const params: any[] = [];

    if (filters.genre) {
      sql += " AND genre = ?";
      params.push(filters.genre);
    }

    if (filters.mood) {
      sql += " AND mood = ?";
      params.push(filters.mood);
    }

    if (filters.energy) {
      sql += " AND energy_level = ?";
      params.push(filters.energy);
    }

    sql += `
      ORDER BY recommendation_score DESC, RANDOM()
      LIMIT ?
    `;
    params.push(filters.limit || 20);

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map((row) => ({
      ...row,
      bmp_locked: Boolean(row.bmp_locked),
      key_locked: Boolean(row.key_locked),
      explicit_content: Boolean(row.explicit_content),
    })) as Track[];
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  public getKeyCompatibility(key1: string, key2: string): number {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(
      "SELECT compatibility_score FROM key_compatibility WHERE key1 = ? AND key2 = ?"
    );
    const result = stmt.get(key1, key2) as
      | { compatibility_score: number }
      | undefined;

    return result?.compatibility_score || 0;
  }

  public findDuplicates(): any[] {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      SELECT file_hash, COUNT(*) as count, 
             GROUP_CONCAT(id) as track_ids,
             GROUP_CONCAT(file_path) as file_paths
      FROM tracks 
      GROUP BY file_hash 
      HAVING count > 1
      ORDER BY count DESC
    `);

    return stmt.all();
  }

  public vacuum(): void {
    if (!this.db) throw new Error("Database not initialized");

    console.log("🧹 Running database maintenance...");
    this.db.exec("VACUUM");
    this.db.exec("ANALYZE");
    console.log("✅ Database maintenance completed");
  }

  public getStatus(): {
    connected: boolean;
    path: string;
    size: number;
    tables: string[];
    trackCount: number;
    crateCount: number;
    playlistCount: number;
  } {
    if (!this.db) {
      return {
        connected: false,
        path: this.dbPath,
        size: 0,
        tables: [],
        trackCount: 0,
        crateCount: 0,
        playlistCount: 0,
      };
    }

    const stats = fs.statSync(this.dbPath);
    const tables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const trackCount = (
      this.db.prepare("SELECT COUNT(*) as count FROM tracks").get() as {
        count: number;
      }
    ).count;
    const crateCount = (
      this.db.prepare("SELECT COUNT(*) as count FROM crates").get() as {
        count: number;
      }
    ).count;
    const playlistCount = (
      this.db.prepare("SELECT COUNT(*) as count FROM playlists").get() as {
        count: number;
      }
    ).count;

    return {
      connected: true,
      path: this.dbPath,
      size: stats.size,
      tables: tables.map((t) => t.name),
      trackCount,
      crateCount,
      playlistCount,
    };
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log("✅ Database connection closed");
    }
  }

  public getDatabase(): Database.Database {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }

  public getDatabaseSafe(): Database.Database | null {
    return this.db;
  }

  public isInitialized(): boolean {
    return this.db !== null;
  }
}
