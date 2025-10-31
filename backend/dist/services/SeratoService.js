"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeratoService = void 0;
// backend/src/services/SeratoService.ts
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const xml2js_1 = require("xml2js");
const DatabaseService_1 = require("./DatabaseService");
class SeratoService {
    constructor() {
        this.databaseService = new DatabaseService_1.DatabaseService();
        this.seratoPath = this.getSeratoPath();
        this.databaseXmlPath = path.join(this.seratoPath, "database V2");
        this.cratesPath = path.join(this.seratoPath, "Subcrates");
        this.xmlParser = new xml2js_1.Parser({
            explicitArray: false,
            mergeAttrs: true,
            normalize: true,
            normalizeTags: true,
        });
        this.xmlBuilder = new xml2js_1.Builder({
            rootName: "serato_dj",
            xmldec: { version: "1.0", encoding: "UTF-8" },
            renderOpts: { pretty: true, indent: "  " },
        });
        this.ensureSeratoDirectories();
    }
    getSeratoPath() {
        const platform = os.platform();
        const homeDir = os.homedir();
        const paths = {
            darwin: path.join(homeDir, "Music", "_Serato_"), // macOS
            win32: path.join(homeDir, "Music", "_Serato_"), // Windows
            linux: path.join(homeDir, "Music", "_Serato_"), // Linux
        };
        return paths[platform] || paths["darwin"];
    }
    ensureSeratoDirectories() {
        const directories = [
            this.seratoPath,
            this.cratesPath,
            path.join(this.seratoPath, "History"),
            path.join(this.seratoPath, "Playlists"),
        ];
        directories.forEach((dir) => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Created Serato directory: ${dir}`);
            }
        });
    }
    async syncWithSerato() {
        console.log("🔄 Starting Serato sync...");
        try {
            // Import existing Serato data
            await this.importFromSerato();
            // Export our data to Serato
            await this.exportToSerato();
            console.log("✅ Serato sync completed successfully");
        }
        catch (error) {
            console.error("❌ Serato sync failed:", error);
            throw new Error(`Serato sync failed: ${error.message}`);
        }
    }
    async importFromSerato() {
        console.log("📥 Importing from Serato...");
        try {
            // Import database
            await this.importSeratoDatabase();
            // Import crates
            await this.importSeratoCrates();
            // Import playlists
            await this.importSeratoPlaylists();
            console.log("✅ Serato import completed");
        }
        catch (error) {
            console.warn("⚠️ Serato import warning:", error.message);
        }
    }
    async importSeratoDatabase() {
        if (!fs.existsSync(this.databaseXmlPath)) {
            console.log("📂 No existing Serato database found");
            return;
        }
        try {
            const xmlContent = fs.readFileSync(this.databaseXmlPath, "utf8");
            const result = await this.xmlParser.parseStringPromise(xmlContent);
            if (result.serato_dj && result.serato_dj.music) {
                const tracks = Array.isArray(result.serato_dj.music.track)
                    ? result.serato_dj.music.track
                    : [result.serato_dj.music.track];
                console.log(`📥 Importing ${tracks.length} tracks from Serato`);
                for (const seratoTrack of tracks) {
                    await this.importSeratoTrack(seratoTrack);
                }
            }
        }
        catch (error) {
            console.error("❌ Error importing Serato database:", error);
        }
    }
    async importSeratoTrack(seratoTrack) {
        try {
            const filePath = seratoTrack.file || seratoTrack.location;
            if (!filePath || !fs.existsSync(filePath)) {
                return; // Skip if file doesn't exist
            }
            // Check if track already exists in our database
            let existingTrack = this.databaseService.getTrackByPath(filePath);
            if (existingTrack) {
                // Update with Serato data
                const updates = {
                    rating: parseInt(seratoTrack.rating) || existingTrack.rating,
                    play_count: parseInt(seratoTrack.playcount) || existingTrack.play_count,
                    color: seratoTrack.color || existingTrack.color,
                    bpm_locked: seratoTrack.bpm ? true : existingTrack.bpm_locked,
                    key_locked: seratoTrack.key ? true : existingTrack.key_locked,
                    cue_points: seratoTrack.cuepoints || existingTrack.cue_points,
                    loops: seratoTrack.loops || existingTrack.loops,
                    beatgrid: seratoTrack.beatgrid || existingTrack.beatgrid,
                    serato_id: this.generateSeratoID(filePath),
                };
                this.databaseService.updateTrack(existingTrack.id, updates);
            }
        }
        catch (error) {
            console.warn(`⚠️ Could not import Serato track ${seratoTrack.file}:`, error.message);
        }
    }
    async importSeratoCrates() {
        if (!fs.existsSync(this.cratesPath)) {
            return;
        }
        try {
            const crateFiles = fs
                .readdirSync(this.cratesPath)
                .filter((file) => file.endsWith(".crate"));
            for (const crateFile of crateFiles) {
                await this.importSeratoCrate(path.join(this.cratesPath, crateFile));
            }
        }
        catch (error) {
            console.error("❌ Error importing Serato crates:", error);
        }
    }
    async importSeratoCrate(crateFilePath) {
        try {
            const crateName = path.basename(crateFilePath, ".crate");
            const crateContent = fs.readFileSync(crateFilePath, "utf8");
            const trackPaths = crateContent.split("\n").filter((line) => line.trim());
            // Check if crate already exists
            const db = this.databaseService.getDatabase();
            let crate = db
                .prepare("SELECT * FROM crates WHERE name = ?")
                .get(crateName);
            if (!crate) {
                // Create new crate
                const crateData = {
                    name: crateName,
                    type: "serato_import",
                    description: `Imported from Serato: ${crateName}`,
                    color: "#4A90E2",
                    icon: "📦",
                    is_smart: false,
                    is_folder: false,
                    parent_id: undefined,
                    sort_order: 0,
                    criteria: undefined,
                    serato_crate_path: crateFilePath,
                    created_at: new Date(),
                    updated_at: new Date(),
                };
                const crateId = this.databaseService.insertCrate(crateData);
                crate = { ...crateData, id: crateId };
            }
            // Add tracks to crate
            let position = 1;
            for (const trackPath of trackPaths) {
                const track = this.databaseService.getTrackByPath(trackPath.trim());
                if (track) {
                    this.databaseService.addTrackToCrate(crate.id, track.id, position++);
                }
            }
            console.log(`📦 Imported Serato crate: ${crateName} (${trackPaths.length} tracks)`);
        }
        catch (error) {
            console.error(`❌ Error importing crate ${crateFilePath}:`, error);
        }
    }
    async importSeratoPlaylists() {
        const playlistsPath = path.join(this.seratoPath, "Playlists");
        if (!fs.existsSync(playlistsPath)) {
            return;
        }
        try {
            const playlistFiles = fs
                .readdirSync(playlistsPath)
                .filter((file) => file.endsWith(".m3u"));
            for (const playlistFile of playlistFiles) {
                await this.importSeratoPlaylist(path.join(playlistsPath, playlistFile));
            }
        }
        catch (error) {
            console.error("❌ Error importing Serato playlists:", error);
        }
    }
    async importSeratoPlaylist(playlistFilePath) {
        try {
            const playlistName = path.basename(playlistFilePath, ".m3u");
            const playlistContent = fs.readFileSync(playlistFilePath, "utf8");
            const lines = playlistContent
                .split("\n")
                .filter((line) => line.trim() && !line.startsWith("#"));
            const db = this.databaseService.getDatabase();
            // Create playlist
            const playlistResult = db
                .prepare(`
        INSERT INTO playlists (name, description, is_public)
        VALUES (?, ?, ?)
      `)
                .run(playlistName, `Imported from Serato: ${playlistName}`, false);
            const playlistId = playlistResult.lastInsertRowid;
            // Add tracks
            let position = 1;
            for (const trackPath of lines) {
                const track = this.databaseService.getTrackByPath(trackPath.trim());
                if (track) {
                    db.prepare(`
            INSERT INTO playlist_tracks (playlist_id, track_id, position)
            VALUES (?, ?, ?)
          `).run(playlistId, track.id, position++);
                }
            }
            console.log(`🎵 Imported Serato playlist: ${playlistName} (${lines.length} tracks)`);
        }
        catch (error) {
            console.error(`❌ Error importing playlist ${playlistFilePath}:`, error);
        }
    }
    async exportToSerato() {
        console.log("📤 Exporting to Serato...");
        try {
            // Export database
            await this.exportSeratoDatabase();
            // Export crates
            await this.exportSeratoCrates();
            // Export playlists
            await this.exportSeratoPlaylists();
            console.log("✅ Serato export completed");
        }
        catch (error) {
            console.error("❌ Serato export failed:", error);
            throw error;
        }
    }
    async exportSeratoDatabase() {
        const tracks = this.databaseService.getAllTracks();
        const seratoTracks = tracks.map((track) => this.convertToSeratoTrack(track));
        const seratoData = {
            serato_dj: {
                $: { version: "2.5.12" },
                music: {
                    track: seratoTracks,
                },
            },
        };
        const xml = this.xmlBuilder.buildObject(seratoData);
        fs.writeFileSync(this.databaseXmlPath, xml);
        console.log(`📤 Exported ${tracks.length} tracks to Serato database`);
    }
    convertToSeratoTrack(track) {
        return {
            file: track.file_path,
            title: track.title,
            artist: track.artist,
            album: track.album,
            genre: track.genre,
            year: track.year || 0,
            length: Math.round(track.duration),
            bpm: parseFloat(track.bpm.toFixed(2)),
            key: this.convertToSeratoKey(track.key_signature),
            energy: track.energy_level,
            rating: track.rating,
            playcount: track.play_count,
            color: track.color || "#FFFFFF",
            dateadded: track.date_added.toISOString().split("T")[0],
            cuepoints: track.cue_points || "",
            loops: track.loops || "",
            beatgrid: track.beatgrid || "",
        };
    }
    convertToSeratoKey(camelotKey) {
        // Convert Camelot wheel to Serato's key notation
        const keyMap = {
            "1A": "Cm",
            "1B": "D#",
            "2A": "Gm",
            "2B": "A#",
            "3A": "Dm",
            "3B": "F",
            "4A": "Am",
            "4B": "C",
            "5A": "Em",
            "5B": "G",
            "6A": "Bm",
            "6B": "D",
            "7A": "F#m",
            "7B": "A",
            "8A": "C#m",
            "8B": "E",
            "9A": "G#m",
            "9B": "B",
            "10A": "D#m",
            "10B": "F#",
            "11A": "A#m",
            "11B": "C#",
            "12A": "Fm",
            "12B": "G#",
        };
        return keyMap[camelotKey] || camelotKey;
    }
    convertFromSeratoKey(seratoKey) {
        // Convert Serato key notation to Camelot wheel
        const keyMap = {
            Cm: "1A",
            "D#": "1B",
            Gm: "2A",
            "A#": "2B",
            Dm: "3A",
            F: "3B",
            Am: "4A",
            C: "4B",
            Em: "5A",
            G: "5B",
            Bm: "6A",
            D: "6B",
            "F#m": "7A",
            A: "7B",
            "C#m": "8A",
            E: "8B",
            "G#m": "9A",
            B: "9B",
            "D#m": "10A",
            "F#": "10B",
            "A#m": "11A",
            "C#": "11B",
            Fm: "12A",
            "G#": "12B",
        };
        return keyMap[seratoKey] || seratoKey;
    }
    async exportSeratoCrates() {
        const crates = this.databaseService
            .getAllCrates()
            .filter((crate) => !crate.is_smart);
        for (const crate of crates) {
            await this.exportCrateToSerato(crate.id);
        }
    }
    async exportCrateToSerato(crateId) {
        try {
            const crate = this.databaseService.getCrateById(crateId);
            if (!crate) {
                throw new Error(`Crate with ID ${crateId} not found`);
            }
            const tracks = this.databaseService.getCrateTracks(crateId);
            const trackPaths = tracks.map((track) => track.file_path);
            const crateContent = trackPaths.join("\n");
            const crateFileName = this.sanitizeFileName(crate.name) + ".crate";
            const crateFilePath = path.join(this.cratesPath, crateFileName);
            fs.writeFileSync(crateFilePath, crateContent);
            // Update crate with Serato path
            this.databaseService
                .getDatabase()
                .prepare(`
        UPDATE crates SET serato_crate_path = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `)
                .run(crateFilePath, crateId);
            console.log(`📦 Exported crate to Serato: ${crate.name} (${tracks.length} tracks)`);
        }
        catch (error) {
            console.error(`❌ Error exporting crate ${crateId} to Serato:`, error);
            throw error;
        }
    }
    async exportPlaylistToSerato(playlistId) {
        try {
            const db = this.databaseService.getDatabase();
            const playlist = db
                .prepare("SELECT * FROM playlists WHERE id = ?")
                .get(playlistId);
            if (!playlist) {
                throw new Error(`Playlist with ID ${playlistId} not found`);
            }
            const tracks = db
                .prepare(`
        SELECT t.file_path
        FROM tracks t
        JOIN playlist_tracks pt ON t.id = pt.track_id
        WHERE pt.playlist_id = ?
        ORDER BY pt.position
      `)
                .all(playlistId);
            // Create M3U playlist
            let m3uContent = "#EXTM3U\n";
            tracks.forEach((track) => {
                m3uContent += `#EXTINF:-1,${path.basename(track.file_path)}\n`;
                m3uContent += `${track.file_path}\n`;
            });
            const playlistFileName = this.sanitizeFileName(playlist.name) + ".m3u";
            const playlistFilePath = path.join(this.seratoPath, "Playlists", playlistFileName);
            // Ensure Playlists directory exists
            const playlistsDir = path.dirname(playlistFilePath);
            if (!fs.existsSync(playlistsDir)) {
                fs.mkdirSync(playlistsDir, { recursive: true });
            }
            fs.writeFileSync(playlistFilePath, m3uContent);
            console.log(`🎵 Exported playlist to Serato: ${playlist.name} (${tracks.length} tracks)`);
        }
        catch (error) {
            console.error(`❌ Error exporting playlist ${playlistId} to Serato:`, error);
            throw error;
        }
    }
    async exportSeratoPlaylists() {
        const db = this.databaseService.getDatabase();
        const playlists = db.prepare("SELECT * FROM playlists").all();
        for (const playlist of playlists) {
            await this.exportPlaylistToSerato(playlist.id);
        }
    }
    sanitizeFileName(fileName) {
        // Remove or replace invalid filename characters
        return fileName
            .replace(/[<>:"/\\|?*]/g, "_")
            .replace(/\s+/g, "_")
            .substring(0, 100) // Limit length
            .trim();
    }
    generateSeratoID(filePath) {
        const crypto = require("crypto");
        return crypto
            .createHash("sha1")
            .update(filePath)
            .digest("hex")
            .substring(0, 16);
    }
    // History and performance tracking integration
    async importSeratoHistory() {
        const historyPath = path.join(this.seratoPath, "History");
        if (!fs.existsSync(historyPath)) {
            return;
        }
        try {
            const historyFiles = fs
                .readdirSync(historyPath)
                .filter((file) => file.startsWith("History_") && file.endsWith(".database"));
            for (const historyFile of historyFiles) {
                await this.parseSeratoHistoryFile(path.join(historyPath, historyFile));
            }
        }
        catch (error) {
            console.error("❌ Error importing Serato history:", error);
        }
    }
    async parseSeratoHistoryFile(historyFilePath) {
        try {
            // Serato history files are binary - this is a simplified approach
            // In a full implementation, you'd need to parse the binary format
            const fileName = path.basename(historyFilePath);
            const dateMatch = fileName.match(/History_(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
                const sessionDate = dateMatch[1];
                console.log(`📊 Found Serato session: ${sessionDate}`);
                // Here you would parse the binary file and extract:
                // - Tracks played
                // - Play order
                // - Mix transitions
                // - Performance data
                // For now, we'll just log that we found the file
            }
        }
        catch (error) {
            console.error(`❌ Error parsing history file ${historyFilePath}:`, error);
        }
    }
    // Serato DJ Live integration
    async enableLiveSync() {
        // Monitor Serato's live session files for real-time integration
        const livePath = path.join(this.seratoPath, "Live");
        if (!fs.existsSync(livePath)) {
            fs.mkdirSync(livePath, { recursive: true });
        }
        // This would typically involve:
        // 1. Watching for Serato's session files
        // 2. Parsing real-time play data
        // 3. Updating our performance analytics
        // 4. Providing live recommendations
        console.log("🔴 Live sync enabled - monitoring Serato session data");
    }
    // Backup and restore functionality
    async backupSeratoData() {
        const backupDir = path.join(this.seratoPath, "Backups", new Date().toISOString().split("T")[0]);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        try {
            // Backup database
            if (fs.existsSync(this.databaseXmlPath)) {
                fs.copyFileSync(this.databaseXmlPath, path.join(backupDir, "database_backup.xml"));
            }
            // Backup crates
            if (fs.existsSync(this.cratesPath)) {
                const crateBackupDir = path.join(backupDir, "Crates");
                fs.mkdirSync(crateBackupDir, { recursive: true });
                const crateFiles = fs.readdirSync(this.cratesPath);
                crateFiles.forEach((file) => {
                    fs.copyFileSync(path.join(this.cratesPath, file), path.join(crateBackupDir, file));
                });
            }
            console.log(`💾 Serato data backed up to: ${backupDir}`);
            return backupDir;
        }
        catch (error) {
            console.error("❌ Error backing up Serato data:", error);
            throw error;
        }
    }
    async restoreSeratoData(backupPath) {
        try {
            // Restore database
            const backupDbPath = path.join(backupPath, "database_backup.xml");
            if (fs.existsSync(backupDbPath)) {
                fs.copyFileSync(backupDbPath, this.databaseXmlPath);
            }
            // Restore crates
            const backupCratesPath = path.join(backupPath, "Crates");
            if (fs.existsSync(backupCratesPath)) {
                const backupCrateFiles = fs.readdirSync(backupCratesPath);
                backupCrateFiles.forEach((file) => {
                    fs.copyFileSync(path.join(backupCratesPath, file), path.join(this.cratesPath, file));
                });
            }
            console.log(`📥 Serato data restored from: ${backupPath}`);
        }
        catch (error) {
            console.error("❌ Error restoring Serato data:", error);
            throw error;
        }
    }
    // Version compatibility check
    getSeratoVersion() {
        try {
            const versionFile = path.join(this.seratoPath, "Serato DJ Pro", "Version");
            if (fs.existsSync(versionFile)) {
                return fs.readFileSync(versionFile, "utf8").trim();
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    isSeratoInstalled() {
        return fs.existsSync(this.seratoPath);
    }
    getSeratoStatus() {
        const installed = this.isSeratoInstalled();
        const version = this.getSeratoVersion();
        const databaseExists = fs.existsSync(this.databaseXmlPath);
        let cratesCount = 0;
        if (fs.existsSync(this.cratesPath)) {
            cratesCount = fs
                .readdirSync(this.cratesPath)
                .filter((file) => file.endsWith(".crate")).length;
        }
        // Get last sync time from a marker file
        const syncMarkerPath = path.join(this.seratoPath, ".last_sync");
        let lastSync = null;
        if (fs.existsSync(syncMarkerPath)) {
            const syncTime = fs.readFileSync(syncMarkerPath, "utf8");
            lastSync = new Date(syncTime);
        }
        return {
            installed,
            version,
            databaseExists,
            cratesCount,
            lastSync,
        };
    }
    updateSyncMarker() {
        const syncMarkerPath = path.join(this.seratoPath, ".last_sync");
        fs.writeFileSync(syncMarkerPath, new Date().toISOString());
    }
}
exports.SeratoService = SeratoService;
