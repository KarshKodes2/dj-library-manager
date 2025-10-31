"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/serato.ts
const express_1 = require("express");
const SeratoService_1 = require("../services/SeratoService");
const router = (0, express_1.Router)();
const seratoService = new SeratoService_1.SeratoService();
// POST /api/serato/sync - Sync with Serato
router.post("/sync", async (req, res) => {
    try {
        await seratoService.syncWithSerato();
        res.json({
            success: true,
            message: "Serato sync completed successfully",
        });
    }
    catch (error) {
        console.error("Error syncing with Serato:", error);
        res.status(500).json({ error: "Failed to sync with Serato" });
    }
});
// POST /api/serato/export-crate/:id - Export crate to Serato
router.post("/export-crate/:id", async (req, res) => {
    try {
        const crateId = Number(req.params.id);
        await seratoService.exportCrateToSerato(crateId);
        res.json({
            success: true,
            message: "Crate exported to Serato successfully",
        });
    }
    catch (error) {
        console.error("Error exporting crate to Serato:", error);
        res.status(500).json({ error: "Failed to export crate to Serato" });
    }
});
// POST /api/serato/export-playlist/:id - Export playlist to Serato
router.post("/export-playlist/:id", async (req, res) => {
    try {
        const playlistId = Number(req.params.id);
        await seratoService.exportPlaylistToSerato(playlistId);
        res.json({
            success: true,
            message: "Playlist exported to Serato successfully",
        });
    }
    catch (error) {
        console.error("Error exporting playlist to Serato:", error);
        res.status(500).json({ error: "Failed to export playlist to Serato" });
    }
});
exports.default = router;
