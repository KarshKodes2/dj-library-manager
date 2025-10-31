// backend/src/routes/search.ts
import { Router } from "express";
import { DatabaseService } from "../services/DatabaseService";

interface SearchFilters {
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

const router = Router();
const databaseService = new DatabaseService();

// GET /api/search - Advanced search
router.get("/", async (req, res) => {
  try {
    // const {
    //   q = "",
    //   genre,
    //   energyLevel,
    //   bpmMin,
    //   bpmMax,
    //   key,
    //   yearMin,
    //   yearMax,
    //   rating,
    //   explicit,
    //   language,
    //   mood,
    //   durationMin,
    //   durationMax,
    //   sortBy = "artist",
    //   limit = 100,
    // } = req.query;

    const rawFilters = req.query;
    const filters: SearchFilters = {
      genre:
        typeof rawFilters.genre === "string" ? rawFilters.genre : undefined,
      energyLevel: typeof rawFilters.energyLevel === 'string'
        ? Number(rawFilters.energyLevel)
        : undefined,
      bpmMin: typeof rawFilters.bpmMin === 'string' ? Number(rawFilters.bpmMin) : undefined,
      bpmMax: typeof rawFilters.bpmMax === 'string' ? Number(rawFilters.bpmMax) : undefined,
      key: typeof rawFilters.key === "string" ? rawFilters.key : undefined,
      yearMin: typeof rawFilters.yearMin === 'string' ? Number(rawFilters.yearMin) : undefined,
      yearMax: typeof rawFilters.yearMax === 'string' ? Number(rawFilters.yearMax) : undefined,
      rating: typeof rawFilters.rating === 'string' ? Number(rawFilters.rating) : undefined,
      explicit:
        rawFilters.explicit !== undefined
          ? rawFilters.explicit === "true"
          : undefined,
      language:
        typeof rawFilters.language === "string"
          ? rawFilters.language
          : undefined,
      mood: typeof rawFilters.mood === "string" ? rawFilters.mood : undefined,
      durationMin: typeof rawFilters.durationMin === 'string'
        ? Number(rawFilters.durationMin)
        : undefined,
      durationMax: typeof rawFilters.durationMax === 'string'
        ? Number(rawFilters.durationMax)
        : undefined,
      sortBy:
        typeof rawFilters.sortBy === "string" ? rawFilters.sortBy : "artist",
      limit: typeof rawFilters.limit === 'string' ? Number(rawFilters.limit) : 100,
    };

    // const filters = {
    //   genre,
    //   energyLevel: energyLevel ? parseInt(energyLevel as string) : undefined,
    //   bpmMin: bpmMin ? parseInt(bpmMin as string) : undefined,
    //   bpmMax: bpmMax ? parseInt(bpmMax as string) : undefined,
    //   key,
    //   yearMin: yearMin ? parseInt(yearMin as string) : undefined,
    //   yearMax: yearMax ? parseInt(yearMax as string) : undefined,
    //   rating: rating ? parseInt(rating as string) : undefined,
    //   explicit: explicit !== undefined ? explicit === "true" : undefined,
    //   language,
    //   mood,
    //   durationMin: durationMin ? parseInt(durationMin as string) : undefined,
    //   durationMax: durationMax ? parseInt(durationMax as string) : undefined,
    //   sortBy,
    //   limit: parseInt(limit as string),
    // };

    // Remove undefined filters (if needed)
    Object.keys(filters).forEach((key) => {
      if (filters[key as keyof SearchFilters] === undefined) {
        delete filters[key as keyof SearchFilters];
      }
    });

    const tracks = databaseService.searchTracks(rawFilters?.q as string, filters);
    res.json(tracks);
  } catch (error) {
    console.error("Error searching tracks:", error);
    res.status(500).json({ error: "Failed to search tracks" });
  }
});

// GET /api/search/suggestions - Get search suggestions
router.get("/suggestions", async (req, res) => {
  try {
    const { q = "", type = "all" } = req.query;
    const db = databaseService.getDatabase();

    let suggestions = [];

    if (type === "all" || type === "artists") {
      const artists = db
        .prepare(
          `
        SELECT DISTINCT artist as value, 'artist' as type, COUNT(*) as count
        FROM tracks 
        WHERE artist LIKE ? 
        GROUP BY artist 
        ORDER BY count DESC, artist
        LIMIT 10
      `
        )
        .all(`%${q}%`);
      suggestions.push(...artists);
    }

    if (type === "all" || type === "albums") {
      const albums = db
        .prepare(
          `
        SELECT DISTINCT album as value, 'album' as type, COUNT(*) as count
        FROM tracks 
        WHERE album LIKE ? 
        GROUP BY album 
        ORDER BY count DESC, album
        LIMIT 10
      `
        )
        .all(`%${q}%`);
      suggestions.push(...albums);
    }

    if (type === "all" || type === "genres") {
      const genres = db
        .prepare(
          `
        SELECT DISTINCT genre as value, 'genre' as type, COUNT(*) as count
        FROM tracks 
        WHERE genre LIKE ? 
        GROUP BY genre 
        ORDER BY count DESC, genre
        LIMIT 10
      `
        )
        .all(`%${q}%`);
      suggestions.push(...genres);
    }

    res.json(suggestions.slice(0, 20));
  } catch (error) {
    console.error("Error getting search suggestions:", error);
    res.status(500).json({ error: "Failed to get search suggestions" });
  }
});

// GET /api/search/similar/:id - Find similar tracks
router.get("/similar/:id", async (req, res) => {
  try {
    const trackId = Number(req.params.id);
    const track = databaseService.getTrackById(trackId);

    if (!track) {
      return res.status(404).json({ error: "Track not found" });
    }

    const db = databaseService.getDatabase();

    // Find similar tracks based on multiple criteria
    const similarTracks = db
      .prepare(
        `
      SELECT *, 
        (
          CASE WHEN ABS(bpm - ?) < 5 THEN 3 ELSE 0 END +
          CASE WHEN key_signature = ? THEN 3 ELSE 0 END +
          CASE WHEN genre = ? THEN 2 ELSE 0 END +
          CASE WHEN energy_level = ? THEN 2 ELSE 0 END +
          CASE WHEN ABS(valence - ?) < 0.2 THEN 1 ELSE 0 END +
          CASE WHEN ABS(danceability - ?) < 0.2 THEN 1 ELSE 0 END
        ) as similarity_score
      FROM tracks 
      WHERE id != ? 
      HAVING similarity_score > 3
      ORDER BY similarity_score DESC, rating DESC
      LIMIT 20
    `
      )
      .all(
        track.bpm,
        track.key_signature,
        track.genre,
        track.energy_level,
        track.valence,
        track.danceability,
        trackId
      );

    res.json(similarTracks);
  } catch (error) {
    console.error("Error finding similar tracks:", error);
    res.status(500).json({ error: "Failed to find similar tracks" });
  }
});

// GET /api/search/recommendations - Get personalized recommendations
router.get("/recommendations", async (req, res) => {
  try {
    const { genre, mood, energy, limit = 20 } = req.query;
    const db = databaseService.getDatabase();

    let sql = `
      SELECT *, 
        (rating * 2 + play_count * 0.1) as recommendation_score
      FROM tracks 
      WHERE rating >= 3
    `;
    const params: any[] = [];

    if (genre) {
      sql += " AND genre = ?";
      params.push(genre);
    }

    if (mood) {
      sql += " AND mood = ?";
      params.push(mood);
    }

    if (energy) {
      sql += " AND energy_level = ?";
      params.push(energy);
    }

    sql += `
      ORDER BY recommendation_score DESC, RANDOM()
      LIMIT ?
    `;
    params.push(parseInt(limit as string));

    const recommendations = db.prepare(sql).all(...params);
    res.json(recommendations);
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res.status(500).json({ error: "Failed to get recommendations" });
  }
});

export default router;
