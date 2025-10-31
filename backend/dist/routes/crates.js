"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/crates.ts
const express_1 = require("express");
const DatabaseService_1 = require("../services/DatabaseService");
const router = (0, express_1.Router)();
const databaseService = new DatabaseService_1.DatabaseService();
// GET /api/crates - Get all crates
router.get("/", async (req, res) => {
    try {
        const { type } = req.query;
        let crates;
        if (type) {
            crates = databaseService.getCratesByType(type);
        }
        else {
            crates = databaseService.getAllCrates();
        }
        res.json(crates);
    }
    catch (error) {
        console.error("Error getting crates:", error);
        res.status(500).json({ error: "Failed to get crates" });
    }
});
// GET /api/crates/:id - Get specific crate
router.get("/:id", async (req, res) => {
    try {
        const crate = databaseService.getCrateById(Number(req.params.id));
        if (!crate) {
            return res.status(404).json({ error: "Crate not found" });
        }
        res.json(crate);
    }
    catch (error) {
        console.error("Error getting crate:", error);
        res.status(500).json({ error: "Failed to get crate" });
    }
});
// GET /api/crates/:id/tracks - Get tracks in crate
router.get("/:id/tracks", async (req, res) => {
    try {
        const tracks = databaseService.getCrateTracks(Number(req.params.id));
        res.json(tracks);
    }
    catch (error) {
        console.error("Error getting crate tracks:", error);
        res.status(500).json({ error: "Failed to get crate tracks" });
    }
});
// POST /api/crates - Create new crate
router.post("/", async (req, res) => {
    try {
        const crateData = {
            ...req.body,
            created_at: new Date(),
            updated_at: new Date(),
        };
        const crateId = databaseService.insertCrate(crateData);
        const crate = databaseService.getCrateById(crateId);
        res.status(201).json(crate);
    }
    catch (error) {
        console.error("Error creating crate:", error);
        res.status(500).json({ error: "Failed to create crate" });
    }
});
// PUT /api/crates/:id - Update crate
router.put("/:id", async (req, res) => {
    try {
        const crateId = Number(req.params.id);
        const updates = { ...req.body, updated_at: new Date() };
        const db = databaseService.getDatabase();
        const setClause = Object.keys(updates)
            .map((key) => `${key} = ?`)
            .join(", ");
        const values = Object.values(updates);
        const result = db
            .prepare(`UPDATE crates SET ${setClause} WHERE id = ?`)
            .run(...values, crateId);
        if (result.changes === 0) {
            return res.status(404).json({ error: "Crate not found" });
        }
        const updatedCrate = databaseService.getCrateById(crateId);
        res.json(updatedCrate);
    }
    catch (error) {
        console.error("Error updating crate:", error);
        res.status(500).json({ error: "Failed to update crate" });
    }
});
// DELETE /api/crates/:id - Delete crate
router.delete("/:id", async (req, res) => {
    try {
        const db = databaseService.getDatabase();
        const result = db
            .prepare("DELETE FROM crates WHERE id = ?")
            .run(Number(req.params.id));
        if (result.changes === 0) {
            return res.status(404).json({ error: "Crate not found" });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting crate:", error);
        res.status(500).json({ error: "Failed to delete crate" });
    }
});
// POST /api/crates/:id/tracks/:trackId - Add track to crate
router.post("/:id/tracks/:trackId", async (req, res) => {
    try {
        const crateId = Number(req.params.id);
        const trackId = Number(req.params.trackId);
        const { position } = req.body;
        const success = databaseService.addTrackToCrate(crateId, trackId, position);
        if (!success) {
            return res.status(400).json({ error: "Failed to add track to crate" });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error adding track to crate:", error);
        res.status(500).json({ error: "Failed to add track to crate" });
    }
});
// DELETE /api/crates/:id/tracks/:trackId - Remove track from crate
router.delete("/:id/tracks/:trackId", async (req, res) => {
    try {
        const crateId = Number(req.params.id);
        const trackId = Number(req.params.trackId);
        const success = databaseService.removeTrackFromCrate(crateId, trackId);
        if (!success) {
            return res.status(404).json({ error: "Track not found in crate" });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error removing track from crate:", error);
        res.status(500).json({ error: "Failed to remove track from crate" });
    }
});
// POST /api/crates/:id/refresh - Refresh smart crate
router.post("/:id/refresh", async (req, res) => {
    try {
        const crate = databaseService.getCrateById(Number(req.params.id));
        if (!crate) {
            return res.status(404).json({ error: "Crate not found" });
        }
        if (!crate.is_smart || !crate.criteria) {
            return res.status(400).json({ error: "Not a smart crate" });
        }
        // Parse criteria and find matching tracks
        const criteria = JSON.parse(crate.criteria);
        const matchingTrackIds = findTracksMatchingCriteria(criteria);
        // Clear existing tracks and add new ones
        const db = databaseService.getDatabase();
        db.prepare("DELETE FROM crate_tracks WHERE crate_id = ?").run(crate.id);
        matchingTrackIds.forEach((trackId, index) => {
            databaseService.addTrackToCrate(crate.id, trackId, index + 1);
        });
        res.json({
            success: true,
            tracksFound: matchingTrackIds.length,
            message: "Smart crate refreshed successfully",
        });
    }
    catch (error) {
        console.error("Error refreshing smart crate:", error);
        res.status(500).json({ error: "Failed to refresh smart crate" });
    }
});
// Helper function for smart crate criteria
function findTracksMatchingCriteria(criteria) {
    const db = databaseService.getDatabase();
    let sql = "SELECT id FROM tracks WHERE 1=1";
    const params = [];
    Object.entries(criteria).forEach(([field, condition]) => {
        if (typeof condition === "object" && condition !== null) {
            if ("min" in condition && condition.min !== undefined) {
                sql += ` AND ${field} >= ?`;
                params.push(condition.min);
            }
            if ("max" in condition && condition.max !== undefined) {
                sql += ` AND ${field} <= ?`;
                params.push(condition.max);
            }
        }
        else if (Array.isArray(condition)) {
            const placeholders = condition.map(() => "?").join(",");
            sql += ` AND ${field} IN (${placeholders})`;
            params.push(...condition);
        }
        else {
            sql += ` AND ${field} = ?`;
            params.push(condition);
        }
    });
    const results = db.prepare(sql).all(...params);
    return results.map((row) => row.id);
}
exports.default = router;
