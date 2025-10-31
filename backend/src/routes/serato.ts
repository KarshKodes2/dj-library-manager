// backend/src/routes/serato.ts
import { Router } from "express";
import { SeratoService } from "../services/SeratoService";

const router = Router();
const seratoService = new SeratoService();

// POST /api/serato/sync - Sync with Serato
router.post("/sync", async (req, res) => {
  try {
    await seratoService.syncWithSerato();
    res.json({
      success: true,
      message: "Serato sync completed successfully",
    });
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    console.error("Error exporting playlist to Serato:", error);
    res.status(500).json({ error: "Failed to export playlist to Serato" });
  }
});

export default router;
