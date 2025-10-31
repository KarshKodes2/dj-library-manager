"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/library.ts
const express_1 = require("express");
const DatabaseService_1 = require("../services/DatabaseService");
const LibraryScanner_1 = require("../services/LibraryScanner");
const AudioAnalyzer_1 = require("../services/AudioAnalyzer");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const databaseService = new DatabaseService_1.DatabaseService();
const libraryScanner = new LibraryScanner_1.LibraryScanner();
const audioAnalyzer = new AudioAnalyzer_1.AudioAnalyzer();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    dest: process.env.UPLOADS_FOLDER || "./uploads",
    fileFilter: (req, file, cb) => {
        const supportedFormats = audioAnalyzer.getSupportedFormats();
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (supportedFormats.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported file format: ${ext}`));
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
});
// GET /api/library/stats - Get library statistics
router.get("/stats", async (req, res) => {
    try {
        const stats = databaseService.getLibraryStats();
        res.json(stats);
    }
    catch (error) {
        console.error("Error getting library stats:", error);
        res.status(500).json({ error: "Failed to get library statistics" });
    }
});
// GET /api/library/tracks - Get all tracks with pagination
router.get("/tracks", async (req, res) => {
    try {
        const { page = 1, limit = 50, sortBy = "artist", sortOrder = "asc", } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const tracks = databaseService.getAllTracks(Number(limit), offset);
        const totalTracks = databaseService.getLibraryStats().totalTracks;
        res.json({
            tracks,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: totalTracks[0].count,
                pages: Math.ceil(totalTracks[0].count / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Error getting tracks:", error);
        res.status(500).json({ error: "Failed to get tracks" });
    }
});
// GET /api/library/tracks/:id - Get specific track
router.get("/tracks/:id", async (req, res) => {
    try {
        const track = databaseService.getTrackById(Number(req.params.id));
        if (!track) {
            return res.status(404).json({ error: "Track not found" });
        }
        res.json(track);
    }
    catch (error) {
        console.error("Error getting track:", error);
        res.status(500).json({ error: "Failed to get track" });
    }
});
// PUT /api/library/tracks/:id - Update track
router.put("/tracks/:id", async (req, res) => {
    try {
        const trackId = Number(req.params.id);
        const updates = req.body;
        const success = databaseService.updateTrack(trackId, updates);
        if (!success) {
            return res.status(404).json({ error: "Track not found" });
        }
        const updatedTrack = databaseService.getTrackById(trackId);
        res.json(updatedTrack);
    }
    catch (error) {
        console.error("Error updating track:", error);
        res.status(500).json({ error: "Failed to update track" });
    }
});
// DELETE /api/library/tracks/:id - Delete track
router.delete("/tracks/:id", async (req, res) => {
    try {
        const success = databaseService.deleteTrack(Number(req.params.id));
        if (!success) {
            return res.status(404).json({ error: "Track not found" });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting track:", error);
        res.status(500).json({ error: "Failed to delete track" });
    }
});
// POST /api/library/scan - Scan music library
router.post("/scan", async (req, res) => {
    try {
        const musicLibraryPath = process.env.MUSIC_LIBRARY_PATH;
        if (!musicLibraryPath) {
            return res
                .status(400)
                .json({ error: "Music library path not configured" });
        }
        if (libraryScanner.isCurrentlyScanning()) {
            return res
                .status(409)
                .json({ error: "Library scan already in progress" });
        }
        // Start scan in background
        libraryScanner
            .scanLibrary(musicLibraryPath, (progress) => {
            // In a real implementation, you'd use WebSockets to send progress updates
            console.log(`Scan progress: ${progress.percentage}%`);
        })
            .catch((error) => {
            console.error("Library scan failed:", error);
        });
        res.json({
            success: true,
            message: "Library scan started",
            libraryPath: musicLibraryPath,
        });
    }
    catch (error) {
        console.error("Error starting library scan:", error);
        res.status(500).json({ error: "Failed to start library scan" });
    }
});
// GET /api/library/scan/progress - Get scan progress
router.get("/scan/progress", (req, res) => {
    try {
        const progress = libraryScanner.getScanProgress();
        res.json(progress);
    }
    catch (error) {
        console.error("Error getting scan progress:", error);
        res.status(500).json({ error: "Failed to get scan progress" });
    }
});
// POST /api/library/upload - Upload and analyze audio file
router.post("/upload", upload.single("audioFile"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file provided" });
        }
        const trackData = await audioAnalyzer.analyzeTrack(req.file.path);
        const trackId = databaseService.insertTrack(trackData);
        const track = databaseService.getTrackById(trackId);
        res.json({
            success: true,
            track,
            message: "Track uploaded and analyzed successfully",
        });
    }
    catch (error) {
        console.error("Error uploading track:", error);
        res.status(500).json({ error: "Failed to upload and analyze track" });
    }
});
// GET /api/library/duplicates - Find duplicate tracks
router.get("/duplicates", async (req, res) => {
    try {
        const db = databaseService.getDatabase();
        const duplicates = db
            .prepare(`
      SELECT file_hash, COUNT(*) as count, 
             GROUP_CONCAT(id) as track_ids,
             GROUP_CONCAT(file_path) as file_paths
      FROM tracks 
      GROUP BY file_hash 
      HAVING count > 1
      ORDER BY count DESC
    `)
            .all();
        res.json(duplicates);
    }
    catch (error) {
        console.error("Error finding duplicates:", error);
        res.status(500).json({ error: "Failed to find duplicate tracks" });
    }
});
// POST /api/library/analyze/:id - Re-analyze specific track
router.post("/analyze/:id", async (req, res) => {
    try {
        const track = databaseService.getTrackById(Number(req.params.id));
        if (!track) {
            return res.status(404).json({ error: "Track not found" });
        }
        const updatedTrackData = await audioAnalyzer.analyzeTrack(track.file_path);
        databaseService.updateTrack(track.id, updatedTrackData);
        const updatedTrack = databaseService.getTrackById(track.id);
        res.json({
            success: true,
            track: updatedTrack,
            message: "Track re-analyzed successfully",
        });
    }
    catch (error) {
        console.error("Error re-analyzing track:", error);
        res.status(500).json({ error: "Failed to re-analyze track" });
    }
});
exports.default = router;
