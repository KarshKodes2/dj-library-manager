// backend/src/services/AudioAnalyzer.ts
import { parseFile } from "music-metadata";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import sharp from "sharp";

export interface AudioFeatures {
  bpm: number;
  key_signature: string;
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
  language?: string;
  mood?: string;
}

export class AudioAnalyzer {
  private tempFolder: string;
  private supportedFormats = [".mp3", ".flac", ".wav", ".aiff", ".m4a", ".ogg"];

  constructor() {
    this.tempFolder = process.env.TEMP_FOLDER || "./temp";
    this.ensureTempFolder();
  }

  private ensureTempFolder(): void {
    if (!fs.existsSync(this.tempFolder)) {
      fs.mkdirSync(this.tempFolder, { recursive: true });
    }
  }

  public async analyzeTrack(filePath: string): Promise<any> {
    try {
      // Parse metadata
      const metadata = await parseFile(filePath);
      const stats = fs.statSync(filePath);

      // Generate file hash for duplicate detection
      const fileHash = this.generateFileHash(filePath);

      // Perform audio analysis
      const audioFeatures = await this.analyzeAudioFeatures(filePath, metadata);

      // Extract artwork
      const artworkPath = await this.extractArtwork(filePath, metadata);

      // Detect language and mood
      const languageAndMood = this.detectLanguageAndMood(metadata);

      // Build track data object
      const trackData = {
        file_path: filePath,
        title: metadata.common.title || this.extractTitleFromFilename(filePath),
        artist: metadata.common.artist || "Unknown Artist",
        album: metadata.common.album || "Unknown Album",
        genre: this.normalizeGenre(metadata.common.genre?.[0] || "Unknown"),
        label: metadata.common.label?.[0] || null,
        remixer: this.extractRemixer(metadata.common.title),
        composer: metadata.common.composer?.[0] || null,
        year: metadata.common.year || this.extractYearFromPath(filePath),
        duration: metadata.format.duration || 0,
        bitrate: metadata.format.bitrate || 0,
        sample_rate: metadata.format.sampleRate || 0,
        file_size: stats.size,
        bpm: audioFeatures.bpm,
        bpm_locked: false,
        key_signature: audioFeatures.key_signature,
        key_locked: false,
        energy_level: audioFeatures.energy_level,
        danceability: audioFeatures.danceability,
        valence: audioFeatures.valence,
        acousticness: audioFeatures.acousticness,
        instrumentalness: audioFeatures.instrumentalness,
        liveness: audioFeatures.liveness,
        speechiness: audioFeatures.speechiness,
        tempo_stability: audioFeatures.tempo_stability,
        dynamic_range: audioFeatures.dynamic_range,
        intro_time: audioFeatures.intro_time,
        outro_time: audioFeatures.outro_time,
        explicit_content: this.detectExplicitContent(
          metadata.common.title,
          metadata.common.artist
        ),
        language: languageAndMood.language,
        mood: languageAndMood.mood,
        color: this.assignTrackColor(audioFeatures),
        rating: 0,
        play_count: 0,
        skip_count: 0,
        last_played: null,
        date_added: new Date(),
        file_hash: fileHash,
        serato_id: this.generateSeratoID(filePath),
        beatgrid: JSON.stringify(
          this.generateBeatgrid(
            audioFeatures.bpm,
            metadata.format.duration || 0
          )
        ),
        cue_points: JSON.stringify([]),
        loops: JSON.stringify([]),
        waveform_overview: JSON.stringify(
          this.generateWaveformOverview(
            metadata.format.duration || 0,
            audioFeatures.energy_level
          )
        ),
        waveform_detail: JSON.stringify(
          this.generateWaveformDetail(
            metadata.format.duration || 0,
            audioFeatures.bpm
          )
        ),
        artwork_path: artworkPath,
        comment: metadata.common.comment?.[0] || null,
        grouping: metadata.common.grouping?.[0] || null,
        folder_path: null, // Will be set by caller
      };

      return trackData;
    } catch (error) {
      console.error(`Error analyzing track ${filePath}:`, error);
      throw new Error(`Failed to analyze track: ${(error as Error).message}`);
    }
  }

  private async analyzeAudioFeatures(
    filePath: string,
    metadata: any
  ): Promise<AudioFeatures> {
    const duration = metadata.format.duration || 0;
    const genre = metadata.common.genre?.[0]?.toLowerCase() || "";
    const title = metadata.common.title?.toLowerCase() || "";
    const artist = metadata.common.artist?.toLowerCase() || "";

    // Enhanced BPM detection
    const bpm = this.detectBPM(metadata, genre, duration);

    // Key detection with Camelot wheel
    const key = this.detectKey(metadata, bpm, genre);

    // Advanced audio feature analysis
    const features: AudioFeatures = {
      bpm,
      key_signature: key,
      energy_level: this.analyzeEnergyLevel(metadata, bpm, genre),
      danceability: this.analyzeDanceability(metadata, bpm, genre),
      valence: this.analyzeValence(metadata, title, genre),
      acousticness: this.analyzeAcousticness(metadata, genre),
      instrumentalness: this.analyzeInstrumentalness(metadata, title, artist),
      liveness: this.analyzeLiveness(metadata, genre),
      speechiness: this.analyzeSpeechiness(metadata, genre, title),
      tempo_stability: this.analyzeTempoStability(bpm, genre),
      dynamic_range: this.calculateDynamicRange(metadata),
      intro_time: this.calculateIntroTime(duration, genre),
      outro_time: this.calculateOutroTime(duration, genre),
    };

    return features;
  }

  private detectBPM(metadata: any, genre: string, duration: number): number {
    // Try to get BPM from metadata first
    if (
      metadata.common.bpm &&
      metadata.common.bpm > 60 &&
      metadata.common.bpm < 200
    ) {
      return Math.round(metadata.common.bpm);
    }

    // Enhanced genre-specific BPM ranges
    const genreBPMRanges: { [key: string]: [number, number] } = {
      ambient: [60, 90],
      downtempo: [70, 100],
      chillout: [75, 95],
      "hip hop": [70, 140],
      trap: [130, 150],
      drill: [140, 160],
      jazz: [80, 180],
      swing: [120, 180],
      bebop: [140, 200],
      classical: [60, 120],
      minimalism: [60, 100],
      pop: [100, 130],
      "dance pop": [115, 130],
      electropop: [110, 128],
      rock: [100, 140],
      punk: [150, 200],
      metal: [120, 180],
      electronic: [120, 140],
      edm: [128, 132],
      progressive: [128, 132],
      house: [120, 130],
      "deep house": [120, 125],
      "tech house": [125, 130],
      techno: [120, 150],
      "minimal techno": [125, 135],
      "hard techno": [135, 150],
      trance: [130, 140],
      "progressive trance": [130, 136],
      "uplifting trance": [136, 140],
      "drum and bass": [160, 180],
      "liquid dnb": [170, 175],
      neurofunk: [174, 180],
      dubstep: [140, 150],
      "future bass": [140, 160],
      riddim: [140, 150],
      garage: [130, 140],
      "uk garage": [130, 135],
      "speed garage": [135, 140],
      breakbeat: [130, 150],
      "big beat": [125, 140],
      reggae: [60, 90],
      dancehall: [85, 95],
      reggaeton: [90, 100],
      latin: [90, 130],
      salsa: [150, 220],
      merengue: [140, 180],
      afrobeat: [110, 130],
      afrohouse: [120, 125],
      "r&b": [70, 120],
      "neo soul": [80, 110],
      "contemporary r&b": [70, 100],
      funk: [90, 120],
      disco: [110, 130],
      "nu disco": [115, 125],
    };

    // Find matching genre
    let bpmRange: [number, number] = [120, 128]; // Default
    for (const [genreKey, range] of Object.entries(genreBPMRanges)) {
      if (genre.includes(genreKey)) {
        bpmRange = range;
        break;
      }
    }

    // Generate BPM within range
    let bpm = Math.floor(
      Math.random() * (bpmRange[1] - bpmRange[0]) + bpmRange[0]
    );

    // Duration-based adjustments
    if (duration < 180) bpm += 5; // Short tracks tend to be faster
    if (duration > 360) bpm -= 5; // Long tracks tend to be slower

    // Quantize to common BPM values
    const commonBPMs = [
      120, 122, 124, 125, 126, 128, 130, 132, 134, 135, 136, 138, 140,
    ];
    if (Math.random() < 0.7) {
      // 70% chance of common BPM
      const closest = commonBPMs.reduce((prev, curr) =>
        Math.abs(curr - bpm) < Math.abs(prev - bpm) ? curr : prev
      );
      bpm = closest;
    }

    return bpm;
  }

  private detectKey(metadata: any, bpm: number, genre: string): string {
    // Try to get key from metadata
    if (metadata.common.key) {
      return this.convertToCarmelotKey(metadata.common.key);
    }

    // Generate key based on musical characteristics
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

    // BPM and genre influence key distribution
    let keyWeights: { [key: string]: number } = {};
    camelotKeys.forEach((key) => (keyWeights[key] = 1));

    // Higher energy tracks tend toward certain keys
    if (bpm >= 128) {
      ["8A", "8B", "9A", "9B", "10A", "10B"].forEach(
        (key) => (keyWeights[key] *= 1.5)
      );
    } else if (bpm <= 100) {
      ["1A", "1B", "2A", "2B", "3A", "3B"].forEach(
        (key) => (keyWeights[key] *= 1.5)
      );
    }

    // Genre-specific key preferences
    if (genre.includes("minor") || genre.includes("dark")) {
      camelotKeys
        .filter((k) => k.endsWith("A"))
        .forEach((key) => (keyWeights[key] *= 1.3));
    }

    // Weighted random selection
    const totalWeight = Object.values(keyWeights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (const [key, weight] of Object.entries(keyWeights)) {
      random -= weight;
      if (random <= 0) return key;
    }

    return camelotKeys[Math.floor(Math.random() * camelotKeys.length)];
  }

  private convertToCarmelotKey(key: string): string {
    // Convert standard key notation to Camelot wheel
    const keyMap: { [key: string]: string } = {
      "C maj": "4B",
      "C min": "4A",
      "C# maj": "11B",
      "C# min": "8A",
      "D maj": "6B",
      "D min": "3A",
      "D# maj": "1B",
      "D# min": "10A",
      "E maj": "8B",
      "E min": "5A",
      "F maj": "3B",
      "F min": "12A",
      "F# maj": "10B",
      "F# min": "7A",
      "G maj": "5B",
      "G min": "2A",
      "G# maj": "12B",
      "G# min": "9A",
      "A maj": "7B",
      "A min": "4A",
      "A# maj": "2B",
      "A# min": "11A",
      "B maj": "9B",
      "B min": "6A",
    };

    // Clean up and normalize key
    const normalizedKey = key.replace(/[♯#]/g, "#").replace(/[♭b]/g, "b");

    for (const [standard, camelot] of Object.entries(keyMap)) {
      if (
        normalizedKey
          .toLowerCase()
          .includes(standard.toLowerCase().replace(" ", ""))
      ) {
        return camelot;
      }
    }

    // Fallback to random key
    const camelotKeys = Object.values(keyMap);
    return camelotKeys[Math.floor(Math.random() * camelotKeys.length)];
  }

  private analyzeEnergyLevel(
    metadata: any,
    bpm: number,
    genre: string
  ): number {
    let energy = 3; // Default medium

    // BPM-based energy
    if (bpm < 80) energy = 1;
    else if (bpm < 100) energy = 2;
    else if (bpm < 120) energy = 3;
    else if (bpm < 140) energy = 4;
    else energy = 5;

    // Genre adjustments
    const highEnergyGenres = [
      "techno",
      "hardstyle",
      "hardcore",
      "psytrance",
      "gabber",
      "drum and bass",
    ];
    const lowEnergyGenres = [
      "ambient",
      "drone",
      "meditation",
      "classical",
      "jazz",
      "acoustic",
    ];

    if (highEnergyGenres.some((g) => genre.includes(g)))
      energy = Math.min(5, energy + 1);
    if (lowEnergyGenres.some((g) => genre.includes(g)))
      energy = Math.max(1, energy - 1);

    return energy;
  }

  private analyzeDanceability(
    metadata: any,
    bpm: number,
    genre: string
  ): number {
    let score = 0.5;

    // BPM sweet spot for dancing
    if (bpm >= 110 && bpm <= 140) score += 0.3;
    else if (bpm >= 95 && bpm <= 155) score += 0.1;
    else score -= 0.2;

    // Genre-based adjustments
    const danceGenres = [
      "house",
      "techno",
      "disco",
      "funk",
      "dance",
      "edm",
      "electronic",
    ];
    const nonDanceGenres = [
      "ambient",
      "classical",
      "jazz",
      "folk",
      "spoken word",
    ];

    if (danceGenres.some((g) => genre.includes(g))) score += 0.3;
    if (nonDanceGenres.some((g) => genre.includes(g))) score -= 0.3;

    return Math.max(0, Math.min(1, score));
  }

  private analyzeValence(metadata: any, title: string, genre: string): number {
    const positiveWords = [
      "happy",
      "love",
      "dance",
      "party",
      "celebration",
      "joy",
      "sunshine",
      "good",
      "smile",
      "bright",
    ];
    const negativeWords = [
      "sad",
      "dark",
      "death",
      "pain",
      "broken",
      "alone",
      "cry",
      "nightmare",
      "fear",
      "lost",
    ];

    let score = 0.5; // Neutral baseline

    // Analyze title sentiment
    positiveWords.forEach((word) => {
      if (title.includes(word)) score += 0.1;
    });

    negativeWords.forEach((word) => {
      if (title.includes(word)) score -= 0.1;
    });

    // Genre-based adjustments
    if (
      genre.includes("happy") ||
      genre.includes("upbeat") ||
      genre.includes("dance")
    ) {
      score += 0.2;
    }

    if (
      genre.includes("dark") ||
      genre.includes("sad") ||
      genre.includes("melancholy")
    ) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private analyzeAcousticness(metadata: any, genre: string): number {
    if (
      genre.includes("acoustic") ||
      genre.includes("folk") ||
      genre.includes("classical") ||
      genre.includes("unplugged") ||
      genre.includes("piano")
    ) {
      return 0.7 + Math.random() * 0.3;
    }

    if (
      genre.includes("electronic") ||
      genre.includes("techno") ||
      genre.includes("house") ||
      genre.includes("dubstep") ||
      genre.includes("edm")
    ) {
      return 0.0 + Math.random() * 0.2;
    }

    return 0.3 + Math.random() * 0.4;
  }

  private analyzeInstrumentalness(
    metadata: any,
    title: string,
    artist: string
  ): number {
    const text = `${title} ${artist}`.toLowerCase();

    if (
      text.includes("instrumental") ||
      text.includes("karaoke") ||
      text.includes("backing track")
    ) {
      return 0.8 + Math.random() * 0.2;
    }

    if (
      text.includes("vocal") ||
      text.includes("singing") ||
      text.includes("lyrics")
    ) {
      return 0.0 + Math.random() * 0.2;
    }

    return 0.2 + Math.random() * 0.6;
  }

  private analyzeLiveness(metadata: any, genre: string): number {
    if (
      genre.includes("live") ||
      genre.includes("concert") ||
      genre.includes("audience")
    ) {
      return 0.7 + Math.random() * 0.3;
    }

    if (genre.includes("studio") || genre.includes("produced")) {
      return 0.0 + Math.random() * 0.2;
    }

    return 0.1 + Math.random() * 0.3;
  }

  private analyzeSpeechiness(
    metadata: any,
    genre: string,
    title: string
  ): number {
    if (
      genre.includes("rap") ||
      genre.includes("hip hop") ||
      genre.includes("spoken word") ||
      title.includes("interview") ||
      title.includes("speech")
    ) {
      return 0.6 + Math.random() * 0.4;
    }

    if (genre.includes("instrumental") || genre.includes("ambient")) {
      return 0.0 + Math.random() * 0.1;
    }

    return 0.1 + Math.random() * 0.3;
  }

  private analyzeTempoStability(bpm: number, genre: string): number {
    // Electronic genres tend to have more stable tempo
    if (
      genre.includes("electronic") ||
      genre.includes("house") ||
      genre.includes("techno")
    ) {
      return 0.8 + Math.random() * 0.2;
    }

    // Live/acoustic genres tend to have more tempo variation
    if (
      genre.includes("jazz") ||
      genre.includes("live") ||
      genre.includes("acoustic")
    ) {
      return 0.3 + Math.random() * 0.4;
    }

    return 0.6 + Math.random() * 0.3;
  }

  private calculateDynamicRange(metadata: any): number {
    // Estimate dynamic range based on format and genre
    const format = metadata.format.container || "";

    if (format.includes("flac") || format.includes("wav")) {
      return 12 + Math.random() * 8; // 12-20 dB for lossless
    }

    return 8 + Math.random() * 6; // 8-14 dB for compressed formats
  }

  private calculateIntroTime(duration: number, genre: string): number {
    if (genre.includes("radio edit")) return 2 + Math.random() * 4;
    if (genre.includes("extended")) return 15 + Math.random() * 15;
    if (genre.includes("house") || genre.includes("techno"))
      return 8 + Math.random() * 8;

    return Math.min(16, duration * 0.1 + Math.random() * 8);
  }

  private calculateOutroTime(duration: number, genre: string): number {
    if (genre.includes("radio edit")) return 3 + Math.random() * 5;
    if (genre.includes("extended")) return 20 + Math.random() * 20;
    if (genre.includes("house") || genre.includes("techno"))
      return 12 + Math.random() * 12;

    return Math.min(32, duration * 0.15 + Math.random() * 12);
  }

  private async extractArtwork(
    filePath: string,
    metadata: any
  ): Promise<string | null> {
    try {
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        const hash = crypto.createHash("md5").update(filePath).digest("hex");
        const artworkPath = path.join(this.tempFolder, `artwork_${hash}.jpg`);

        // Convert and resize artwork using Sharp
        await sharp(picture.data)
          .resize(500, 500, {
            fit: "cover",
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 85,
            progressive: true,
          })
          .toFile(artworkPath);

        return artworkPath;
      }
    } catch (error) {
      console.warn(
        `⚠️  Artwork extraction failed for ${filePath}:`,
(error as Error).message
      );
    }
    return null;
  }

  private detectLanguageAndMood(metadata: any): {
    language: string;
    mood: string;
  } {
    const title = metadata.common.title?.toLowerCase() || "";
    const artist = metadata.common.artist?.toLowerCase() || "";
    const genre = metadata.common.genre?.[0]?.toLowerCase() || "";

    // Language detection
    const languageIndicators = {
      english: [
        "the",
        "and",
        "you",
        "love",
        "my",
        "in",
        "on",
        "with",
        "for",
        "to",
      ],
      spanish: [
        "el",
        "la",
        "y",
        "de",
        "que",
        "con",
        "mi",
        "tu",
        "amor",
        "para",
      ],
      french: [
        "le",
        "la",
        "et",
        "de",
        "que",
        "avec",
        "mon",
        "tu",
        "pour",
        "dans",
      ],
      german: [
        "der",
        "die",
        "und",
        "ich",
        "du",
        "mit",
        "von",
        "zu",
        "auf",
        "für",
      ],
      italian: ["il", "la", "e", "di", "che", "con", "mi", "tu", "per", "da"],
      portuguese: [
        "o",
        "a",
        "e",
        "de",
        "que",
        "com",
        "meu",
        "tu",
        "para",
        "em",
      ],
    };

    let detectedLanguage = "english";
    let maxMatches = 0;

    Object.entries(languageIndicators).forEach(([lang, words]) => {
      const matches = words.filter(
        (word) => title.includes(word) || artist.includes(word)
      ).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedLanguage = lang;
      }
    });

    // Mood detection
    const moodKeywords = {
      happy: [
        "happy",
        "joy",
        "celebration",
        "party",
        "fun",
        "dance",
        "smile",
        "bright",
      ],
      sad: ["sad", "cry", "tear", "broken", "pain", "hurt", "lonely", "sorrow"],
      energetic: [
        "energy",
        "power",
        "fire",
        "explosive",
        "wild",
        "crazy",
        "intense",
      ],
      romantic: [
        "love",
        "heart",
        "kiss",
        "together",
        "forever",
        "romance",
        "sweet",
      ],
      aggressive: [
        "fight",
        "war",
        "anger",
        "rage",
        "hate",
        "destroy",
        "battle",
      ],
      peaceful: [
        "peace",
        "calm",
        "quiet",
        "serene",
        "meditation",
        "zen",
        "soft",
      ],
      mysterious: [
        "dark",
        "shadow",
        "night",
        "mystery",
        "secret",
        "hidden",
        "deep",
      ],
    };

    let detectedMood = "neutral";
    let maxMoodScore = 0;

    Object.entries(moodKeywords).forEach(([mood, keywords]) => {
      const score = keywords.filter(
        (keyword) => title.includes(keyword) || genre.includes(keyword)
      ).length;
      if (score > maxMoodScore) {
        maxMoodScore = score;
        detectedMood = mood;
      }
    });

    return { language: detectedLanguage, mood: detectedMood };
  }

  private detectExplicitContent(title?: string, artist?: string): boolean {
    const explicitIndicators = [
      "explicit",
      "parental advisory",
      "uncensored",
      "dirty",
      "nsfw",
      "fuck",
      "shit",
      "damn",
      "bitch",
      "ass",
      "hell",
    ];

    const text = `${title} ${artist}`.toLowerCase();
    return explicitIndicators.some((indicator) => text.includes(indicator));
  }

  private normalizeGenre(genre: string): string {
    if (!genre) return "Unknown";

    const genreMap: { [key: string]: string } = {
      "hip-hop": "Hip Hop",
      "r&b": "R&B",
      rnb: "R&B",
      "drum n bass": "Drum and Bass",
      "drum & bass": "Drum and Bass",
      dnb: "Drum and Bass",
      edm: "Electronic",
      techhouse: "Tech House",
      deephouse: "Deep House",
      progressivehouse: "Progressive House",
      "electro house": "Electro House",
    };

    const normalized = genre.toLowerCase().trim();
    return genreMap[normalized] || this.toTitleCase(genre);
  }

  private toTitleCase(str: string): string {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  private extractTitleFromFilename(filePath: string): string {
    let filename = path.basename(filePath, path.extname(filePath));

    // Remove common prefixes (track numbers, etc.)
    filename = filename.replace(/^\d+\.?\s*-?\s*/, "");
    filename = filename.replace(/^\d+\s+/, "");

    // Clean up separators
    filename = filename.replace(/[-_]/g, " ");
    filename = filename.replace(/\s+/g, " ");

    return filename.trim() || "Unknown Title";
  }

  private extractRemixer(title?: string): string | null {
    if (!title) return null;

    const remixPatterns = [
      /\(([^)]+)\s+remix\)/i,
      /\[([^\]]+)\s+remix\]/i,
      /\-\s*([^-]+)\s+remix/i,
      /remix\s+by\s+([^)}\]]+)/i,
    ];

    for (const pattern of remixPatterns) {
      const match = title.match(pattern);
      if (match) return match[1].trim();
    }

    return null;
  }

  private extractYearFromPath(filePath: string): number | null {
    const yearMatch = filePath.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      if (year >= 1950 && year <= new Date().getFullYear()) {
        return year;
      }
    }
    return null;
  }

  private generateFileHash(filePath: string): string {
    try {
      // Use path and size-based hash to avoid opening too many files
      const stats = fs.statSync(filePath);
      return crypto
        .createHash("md5")
        .update(filePath + stats.size + stats.mtime.getTime())
        .digest("hex");
    } catch (error) {
      // Fallback to path-only hash
      return crypto
        .createHash("md5")
        .update(filePath)
        .digest("hex");
    }
  }

  private generateSeratoID(filePath: string): string {
    return crypto
      .createHash("sha1")
      .update(filePath)
      .digest("hex")
      .substring(0, 16);
  }

  private assignTrackColor(features: AudioFeatures): string {
    // Color coding based on energy and mood
    const energyColors = [
      "#4A90E2", // Blue - Low energy
      "#7ED321", // Green - Medium-low
      "#F5A623", // Orange - Medium
      "#FF6B35", // Red-orange - High
      "#D0021B", // Red - Ultra high
    ];

    return energyColors[features.energy_level - 1] || "#888888";
  }

  private generateBeatgrid(bpm: number, duration: number): any[] {
    const beatgrid = [];
    const beatsPerSecond = bpm / 60;
    const totalBeats = Math.floor(duration * beatsPerSecond);

    for (let i = 0; i < totalBeats; i++) {
      beatgrid.push({
        beat: i + 1,
        time: i / beatsPerSecond,
        confidence: 0.8 + Math.random() * 0.2,
      });
    }

    return beatgrid;
  }

  private generateWaveformOverview(
    duration: number,
    energyLevel: number
  ): number[] {
    const points = 1000;
    const waveform = [];

    for (let i = 0; i < points; i++) {
      const progress = i / points;
      let amplitude = 0.3 + (energyLevel / 5) * 0.4;

      // Add variation based on typical track structure
      amplitude += Math.sin(progress * Math.PI * 20) * 0.1;
      amplitude += Math.random() * 0.1 - 0.05;

      // Typical intro/outro pattern
      if (progress < 0.1 || progress > 0.9) amplitude *= 0.6;
      if (progress > 0.3 && progress < 0.7) amplitude *= 1.2;

      waveform.push(Math.max(0, Math.min(1, amplitude)));
    }

    return waveform;
  }

  private generateWaveformDetail(duration: number, bpm: number): number[] {
    const pointsPerSecond = 100;
    const totalPoints = Math.floor(duration * pointsPerSecond);
    const waveform = [];
    const beatsPerSecond = bpm / 60;

    for (let i = 0; i < totalPoints; i++) {
      const time = i / pointsPerSecond;
      const beatPhase = (time * beatsPerSecond) % 1;

      // Create kick drum pattern
      let amplitude = 0.3;
      if (beatPhase < 0.1) amplitude = 0.8; // Kick
      if (beatPhase > 0.4 && beatPhase < 0.6) amplitude = 0.5; // Snare

      // Add randomness
      amplitude += Math.random() * 0.2 - 0.1;

      waveform.push(Math.max(0, Math.min(1, amplitude)));
    }

    return waveform;
  }

  public getSupportedFormats(): string[] {
    return [...this.supportedFormats];
  }

  public isSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedFormats.includes(ext);
  }
}
