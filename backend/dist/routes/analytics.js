"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/analytics.ts
const express_1 = require("express");
const DatabaseService_1 = require("../services/DatabaseService");
const router = (0, express_1.Router)();
const databaseService = new DatabaseService_1.DatabaseService();
// GET /api/analytics/overview - Get analytics overview
router.get("/overview", async (req, res) => {
    try {
        const db = databaseService.getDatabase();
        const analytics = {
            library: databaseService.getLibraryStats(),
            topGenres: db
                .prepare(`
        SELECT genre, COUNT(*) as count, AVG(rating) as avg_rating
        FROM tracks 
        GROUP BY genre 
        ORDER BY count DESC 
        LIMIT 10
      `)
                .all(),
            topArtists: db
                .prepare(`
        SELECT artist, COUNT(*) as track_count, AVG(rating) as avg_rating
        FROM tracks 
        GROUP BY artist 
        ORDER BY track_count DESC 
        LIMIT 10
      `)
                .all(),
            energyDistribution: db
                .prepare(`
        SELECT energy_level, COUNT(*) as count
        FROM tracks 
        GROUP BY energy_level 
        ORDER BY energy_level
      `)
                .all(),
            keyDistribution: db
                .prepare(`
        SELECT key_signature, COUNT(*) as count
        FROM tracks 
        GROUP BY key_signature 
        ORDER BY count DESC
      `)
                .all(),
            recentActivity: db
                .prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as tracks_added
        FROM tracks 
        WHERE created_at > datetime('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `)
                .all(),
        };
        res.json(analytics);
    }
    catch (error) {
        console.error("Error getting analytics overview:", error);
        res.status(500).json({ error: "Failed to get analytics overview" });
    }
});
// POST /api/analytics/log-performance - Log track performance
router.post("/log-performance", async (req, res) => {
    try {
        const { trackId, eventType, venue, audienceSize, crowdResponse, energyContext, timeOfDay, successRating, notes, } = req.body;
        const db = databaseService.getDatabase();
        db.prepare(`
      INSERT INTO performance_log 
      (track_id, event_type, venue, audience_size, crowd_response, 
       energy_context, time_of_day, success_rating, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(trackId, eventType, venue, audienceSize, crowdResponse, energyContext, timeOfDay, successRating, notes);
        // Update track play count and rating
        db.prepare(`
      UPDATE tracks 
      SET play_count = play_count + 1, 
          last_played = CURRENT_TIMESTAMP,
          rating = CASE 
            WHEN play_count = 0 THEN ?
            ELSE ((rating * play_count) + ?) / (play_count + 1)
          END
      WHERE id = ?
    `).run(successRating, successRating, trackId);
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error logging performance:", error);
        res.status(500).json({ error: "Failed to log performance" });
    }
});
exports.default = router;
