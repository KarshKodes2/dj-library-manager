"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryScanner = void 0;
// backend/src/services/LibraryScanner.ts
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DatabaseService_1 = require("./DatabaseService");
const AudioAnalyzer_1 = require("./AudioAnalyzer");
class LibraryScanner {
    constructor(databaseService) {
        this.supportedFormats = [".mp3", ".flac", ".wav", ".aiff", ".m4a", ".ogg"];
        this.isScanning = false;
        this.scanProgress = { processed: 0, total: 0 };
        this.databaseService = databaseService || new DatabaseService_1.DatabaseService();
        this.audioAnalyzer = new AudioAnalyzer_1.AudioAnalyzer();
    }
    async scanLibrary(libraryPath, progressCallback) {
        if (this.isScanning) {
            throw new Error("Library scan already in progress");
        }
        this.isScanning = true;
        console.log(`🔍 Starting library scan: ${libraryPath}`);
        try {
            // Find all audio files
            const audioFiles = this.findAudioFiles(libraryPath);
            console.log(`📁 Found ${audioFiles.length} audio files`);
            this.scanProgress = { processed: 0, total: audioFiles.length };
            // Process files in batches to avoid overwhelming the system
            const batchSize = 10;
            for (let i = 0; i < audioFiles.length; i += batchSize) {
                const batch = audioFiles.slice(i, i + batchSize);
                await Promise.all(batch.map(async (filePath) => {
                    try {
                        await this.processSingleFile(filePath, libraryPath);
                        this.scanProgress.processed++;
                        if (progressCallback) {
                            progressCallback({
                                processed: this.scanProgress.processed,
                                total: this.scanProgress.total,
                                percentage: Math.round((this.scanProgress.processed / this.scanProgress.total) *
                                    100),
                                currentFile: path_1.default.basename(filePath),
                            });
                        }
                    }
                    catch (error) {
                        console.error(`❌ Error processing ${filePath}:`, error);
                    }
                }));
                // Small delay between batches to prevent system overload
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            // Update smart crates after scanning
            await this.updateSmartCrates();
            console.log(`✅ Library scan completed! Processed ${this.scanProgress.processed}/${this.scanProgress.total} files`);
        }
        finally {
            this.isScanning = false;
        }
    }
    findAudioFiles(dir) {
        let files = [];
        try {
            const items = fs_1.default.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const fullPath = path_1.default.join(dir, item.name);
                if (item.isDirectory()) {
                    // Skip hidden directories and system folders
                    if (!item.name.startsWith(".") &&
                        !["System Volume Information", "$RECYCLE.BIN"].includes(item.name)) {
                        files = files.concat(this.findAudioFiles(fullPath));
                    }
                }
                else if (item.isFile()) {
                    const ext = path_1.default.extname(item.name).toLowerCase();
                    if (this.supportedFormats.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        }
        catch (error) {
            console.error(`❌ Error reading directory ${dir}:`, error);
        }
        return files;
    }
    async processSingleFile(filePath, libraryRoot) {
        try {
            // Check if file already exists in database
            const existingTrack = this.databaseService.getTrackByPath(filePath);
            // Get file stats
            const stats = fs_1.default.statSync(filePath);
            if (existingTrack) {
                // Check if file has been modified
                const existingModified = new Date(existingTrack.updated_at).getTime();
                const fileModified = stats.mtime.getTime();
                if (fileModified <= existingModified) {
                    // File hasn't changed, skip processing
                    return;
                }
                console.log(`🔄 Re-analyzing modified file: ${path_1.default.basename(filePath)}`);
            }
            else {
                console.log(`🆕 Analyzing new file: ${path_1.default.basename(filePath)}`);
            }
            // Analyze the audio file
            const trackData = await this.audioAnalyzer.analyzeTrack(filePath);
            // Add folder path information
            const relativePath = path_1.default.relative(libraryRoot, filePath);
            trackData.folder_path = path_1.default.dirname(relativePath);
            if (existingTrack) {
                // Update existing track
                this.databaseService.updateTrack(existingTrack.id, trackData);
            }
            else {
                // Insert new track
                const trackId = this.databaseService.insertTrack(trackData);
                // Auto-assign to folder-based crates
                await this.autoAssignToFolderCrates(trackId, trackData.folder_path, libraryRoot);
            }
        }
        catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
            throw error;
        }
    }
    async autoAssignToFolderCrates(trackId, folderPath, _libraryRoot) {
        if (!folderPath || folderPath === ".")
            return;
        try {
            const pathParts = folderPath.split(path_1.default.sep);
            // Create and assign to nested crates
            for (let i = 0; i < pathParts.length; i++) {
                const currentPath = pathParts.slice(0, i + 1).join(path_1.default.sep);
                const crateName = this.generateCrateNameFromPath(currentPath);
                let crate = this.findCrateByName(crateName);
                if (!crate) {
                    // Create the crate
                    const parentPath = i > 0 ? pathParts.slice(0, i).join(path_1.default.sep) : null;
                    const parentCrate = parentPath
                        ? this.findCrateByName(this.generateCrateNameFromPath(parentPath))
                        : null;
                    const crateData = {
                        name: crateName,
                        type: "folder",
                        description: `Auto-generated from folder: ${currentPath}`,
                        color: this.generateColorFromPath(currentPath),
                        icon: "📁",
                        is_smart: false,
                        is_folder: true,
                        parent_id: parentCrate?.id,
                        sort_order: 0,
                        criteria: undefined,
                        serato_crate_path: currentPath,
                    };
                    const crateId = this.databaseService.insertCrate(crateData);
                    crate = { ...crateData, id: crateId };
                }
                // Add track to this crate
                if (crate && i === pathParts.length - 1) {
                    // Only add to the deepest folder
                    this.databaseService.addTrackToCrate(crate.id, trackId);
                }
            }
        }
        catch (error) {
            console.error("Error auto-assigning to folder crates:", error);
        }
    }
    async updateSmartCrates() {
        console.log("🤖 Updating smart crates...");
        try {
            const smartCrates = this.databaseService
                .getAllCrates()
                .filter((crate) => crate.is_smart);
            for (const crate of smartCrates) {
                if (crate.criteria) {
                    try {
                        const criteria = JSON.parse(crate.criteria);
                        const matchingTracks = this.findTracksMatchingCriteria(criteria);
                        // Clear existing tracks from crate
                        const db = this.databaseService.getDatabaseSafe();
                        if (db) {
                            db.prepare("DELETE FROM crate_tracks WHERE crate_id = ?")
                                .run(crate.id);
                        }
                        // Add matching tracks
                        matchingTracks.forEach((trackId, index) => {
                            this.databaseService.addTrackToCrate(crate.id, trackId, index + 1);
                        });
                        console.log(`📦 Updated smart crate "${crate.name}": ${matchingTracks.length} tracks`);
                    }
                    catch (error) {
                        console.error(`Error updating smart crate ${crate.name}:`, error);
                    }
                }
            }
            console.log("✅ Smart crates updated");
        }
        catch (error) {
            console.error("Error updating smart crates:", error);
        }
    }
    findTracksMatchingCriteria(criteria) {
        try {
            let sql = "SELECT id FROM tracks WHERE 1=1";
            const params = [];
            // Build dynamic query based on criteria
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
            const db = this.databaseService.getDatabaseSafe();
            if (!db)
                return [];
            const stmt = db.prepare(sql);
            const results = stmt.all(...params);
            return results.map((row) => row.id);
        }
        catch (error) {
            console.error("Error finding tracks matching criteria:", error);
            return [];
        }
    }
    generateCrateNameFromPath(folderPath) {
        const pathParts = folderPath.split(path_1.default.sep);
        const folderName = pathParts[pathParts.length - 1];
        return folderName
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())
            .trim();
    }
    generateColorFromPath(folderPath) {
        const colors = [
            "#FF6B6B",
            "#4ECDC4",
            "#45B7D1",
            "#96CEB4",
            "#FFEAA7",
            "#DDA0DD",
            "#98D8C8",
            "#F7DC6F",
            "#BB8FCE",
            "#85C1E9",
        ];
        let hash = 0;
        for (let i = 0; i < folderPath.length; i++) {
            const char = folderPath.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return colors[Math.abs(hash) % colors.length];
    }
    findCrateByName(name) {
        try {
            const db = this.databaseService.getDatabaseSafe();
            if (!db)
                return null;
            const stmt = db.prepare("SELECT * FROM crates WHERE name = ?");
            return stmt.get(name);
        }
        catch (error) {
            return null;
        }
    }
    getScanProgress() {
        return {
            ...this.scanProgress,
            isScanning: this.isScanning,
        };
    }
    isCurrentlyScanning() {
        return this.isScanning;
    }
}
exports.LibraryScanner = LibraryScanner;
