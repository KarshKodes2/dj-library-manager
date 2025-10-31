// backend/src/services/FileWatcherService.ts
import chokidar, { FSWatcher } from "chokidar";
import path from "path";
import fs from "fs";
import { EventEmitter } from "events";
import { DatabaseService } from "./DatabaseService";
import { AudioAnalyzer } from "./AudioAnalyzer";

export class FileWatcherService extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private databaseService: DatabaseService;
  private audioAnalyzer: AudioAnalyzer;
  private supportedFormats = [".mp3", ".flac", ".wav", ".aiff", ".m4a", ".ogg"];
  private processingQueue: Set<string> = new Set();
  private maxConcurrentProcessing = 3;

  constructor(databaseService?: DatabaseService) {
    super();
    this.databaseService = databaseService || new DatabaseService();
    this.audioAnalyzer = new AudioAnalyzer();
    
    // Handle unhandled errors
    this.on('error', (error) => {
      console.error('FileWatcher error event:', error);
    });
  }

  public start(musicLibraryPath: string): void {
    if (this.watcher) {
      this.stop();
    }

    console.log(`👁️  Starting file watcher for: ${musicLibraryPath}`);

    this.watcher = chokidar.watch(musicLibraryPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true, // Don't process existing files on startup to avoid overwhelming system
      depth: 5, // Reduce depth to prevent too many watchers
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
      // Reduce system load with these options
      usePolling: false,
      atomic: true,
    });

    this.watcher
      .on("add", (filePath: string) => this.handleFileAdded(filePath))
      .on("change", (filePath: string) => this.handleFileChanged(filePath))
      .on("unlink", (filePath: string) => this.handleFileRemoved(filePath))
      .on("addDir", (dirPath: string) => this.handleDirectoryAdded(dirPath))
      .on("unlinkDir", (dirPath: string) => this.handleDirectoryRemoved(dirPath))
      .on("error", (error: unknown) => console.error("File watcher error:", error));

    console.log("✅ File watcher started successfully");
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log("🛑 File watcher stopped");
    }
  }

  private async handleFileAdded(filePath: string): Promise<void> {
    if (!this.isAudioFile(filePath)) return;

    // Check if database is initialized
    if (!this.databaseService.isInitialized()) {
      console.warn(`⚠️  Database not ready, skipping file: ${path.basename(filePath)}`);
      return;
    }

    // Throttle processing to prevent overwhelming the system
    if (this.processingQueue.size >= this.maxConcurrentProcessing) {
      console.warn(`⚠️  Processing queue full, skipping file: ${path.basename(filePath)}`);
      return;
    }

    // Check if already processing this file
    if (this.processingQueue.has(filePath)) {
      return;
    }

    this.processingQueue.add(filePath);

    try {
      console.log(`➕ New audio file detected: ${path.basename(filePath)}`);

      // Check if file already exists in database
      const existingTrack = this.databaseService.getTrackByPath(filePath);
      if (existingTrack) {
        console.log(`🔄 File already in database: ${path.basename(filePath)}`);
        return;
      }

      // Analyze and add to database
      const trackData = await this.audioAnalyzer.analyzeTrack(filePath);
      const trackId = this.databaseService.insertTrack(trackData);

      // Auto-assign to folder-based crates
      await this.autoAssignToCrates(trackId, filePath);

      this.emit("trackAdded", { trackId, filePath, trackData });
    } catch (error) {
      console.error(`❌ Error processing new file ${filePath}:`, error);
      this.emit("error", { filePath, error: (error as Error).message, type: "fileAdded" });
    } finally {
      // Always remove from processing queue
      this.processingQueue.delete(filePath);
    }
  }

  private async handleFileChanged(filePath: string): Promise<void> {
    if (!this.isAudioFile(filePath)) return;

    // Check if database is initialized
    if (!this.databaseService.isInitialized()) {
      console.warn(`⚠️  Database not ready, skipping file: ${path.basename(filePath)}`);
      return;
    }

    try {
      console.log(`🔄 Audio file modified: ${path.basename(filePath)}`);

      const existingTrack = this.databaseService.getTrackByPath(filePath);
      if (!existingTrack) {
        // File not in database, treat as new
        await this.handleFileAdded(filePath);
        return;
      }

      // Re-analyze the file
      const updatedTrackData = await this.audioAnalyzer.analyzeTrack(filePath);
      this.databaseService.updateTrack(existingTrack.id!, updatedTrackData);

      this.emit("trackUpdated", {
        trackId: existingTrack.id,
        filePath,
        trackData: updatedTrackData,
      });
    } catch (error) {
      console.error(`❌ Error updating file ${filePath}:`, error);
      this.emit("error", {
        filePath,
        error: (error as Error).message,
        type: "fileChanged",
      });
    }
  }

  private async handleFileRemoved(filePath: string): Promise<void> {
    if (!this.isAudioFile(filePath)) return;

    // Check if database is initialized
    if (!this.databaseService.isInitialized()) {
      console.warn(`⚠️  Database not ready, skipping file: ${path.basename(filePath)}`);
      return;
    }

    try {
      console.log(`➖ Audio file removed: ${path.basename(filePath)}`);

      const existingTrack = this.databaseService.getTrackByPath(filePath);
      if (existingTrack) {
        this.databaseService.deleteTrack(existingTrack.id!);
        this.emit("trackRemoved", { trackId: existingTrack.id, filePath });
      }
    } catch (error) {
      console.error(`❌ Error removing file ${filePath}:`, error);
      this.emit("error", {
        filePath,
        error: (error as Error).message,
        type: "fileRemoved",
      });
    }
  }

  private async handleDirectoryAdded(dirPath: string): Promise<void> {
    try {
      console.log(`📁 New directory detected: ${path.basename(dirPath)}`);

      // Create crate from folder structure
      await this.createCrateFromFolder(dirPath);

      this.emit("directoryAdded", { dirPath });
    } catch (error) {
      console.error(`❌ Error processing new directory ${dirPath}:`, error);
    }
  }

  private async handleDirectoryRemoved(dirPath: string): Promise<void> {
    try {
      console.log(`📁 Directory removed: ${path.basename(dirPath)}`);

      // Remove associated crate if it exists
      await this.removeCrateFromFolder(dirPath);

      this.emit("directoryRemoved", { dirPath });
    } catch (error) {
      console.error(`❌ Error removing directory ${dirPath}:`, error);
    }
  }

  private isAudioFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedFormats.includes(ext);
  }

  private async autoAssignToCrates(
    trackId: number,
    filePath: string
  ): Promise<void> {
    try {
      // Get relative path from music library root
      const musicLibraryPath = process.env.MUSIC_LIBRARY_PATH!;
      const relativePath = path.relative(musicLibraryPath, filePath);
      const folderPath = path.dirname(relativePath);

      if (folderPath && folderPath !== ".") {
        // Find or create crate for this folder
        const crateName = this.generateCrateNameFromPath(folderPath);
        let crate = this.findCrateByName(crateName);

        if (!crate) {
          crate = await this.createCrateFromPath(folderPath);
        }

        if (crate) {
          this.databaseService.addTrackToCrate(crate.id!, trackId);
          console.log(`📦 Added track to crate: ${crateName}`);
        }
      }
    } catch (error) {
      console.error("Error auto-assigning to crates:", error);
    }
  }

  private async createCrateFromFolder(dirPath: string): Promise<void> {
    try {
      const musicLibraryPath = process.env.MUSIC_LIBRARY_PATH!;
      const relativePath = path.relative(musicLibraryPath, dirPath);

      if (relativePath && relativePath !== ".") {
        await this.createCrateFromPath(relativePath);
      }
    } catch (error) {
      console.error("Error creating crate from folder:", error);
    }
  }

  private async createCrateFromPath(folderPath: string): Promise<any> {
    try {
      const pathParts = folderPath.split(path.sep);
      let parentId: number | undefined;

      // Create nested crates for each folder level
      for (let i = 0; i < pathParts.length; i++) {
        const currentPath = pathParts.slice(0, i + 1).join(path.sep);
        const crateName = this.generateCrateNameFromPath(currentPath);

        let crate = this.findCrateByName(crateName);

        if (!crate) {
          const crateData = {
            name: crateName,
            type: "folder",
            description: `Auto-generated from folder: ${currentPath}`,
            color: this.generateColorFromPath(currentPath),
            icon: "📁",
            is_smart: false,
            is_folder: true,
            parent_id: parentId,
            sort_order: 0,
            criteria: undefined,
            serato_crate_path: currentPath,
            created_at: new Date(),
            updated_at: new Date(),
          };

          const crateId = this.databaseService.insertCrate(crateData);
          crate = { ...crateData, id: crateId };
          console.log(`📦 Created folder crate: ${crateName}`);
        }

        parentId = crate.id;
      }

      return this.findCrateByName(this.generateCrateNameFromPath(folderPath));
    } catch (error) {
      console.error("Error creating crate from path:", error);
      return null;
    }
  }

  private async removeCrateFromFolder(dirPath: string): Promise<void> {
    try {
      const musicLibraryPath = process.env.MUSIC_LIBRARY_PATH!;
      const relativePath = path.relative(musicLibraryPath, dirPath);

      if (relativePath && relativePath !== ".") {
        const crateName = this.generateCrateNameFromPath(relativePath);
        const crate = this.findCrateByName(crateName);

        if (crate && crate.is_folder) {
          // Only remove if it's a folder-based crate and has no tracks
          const tracks = this.databaseService.getCrateTracks(crate.id!);
          if (tracks.length === 0) {
            const db = this.databaseService.getDatabaseSafe();
            if (db) {
              db.prepare("DELETE FROM crates WHERE id = ?")
                .run(crate.id);
            }
            console.log(`🗑️  Removed empty folder crate: ${crateName}`);
          }
        }
      }
    } catch (error) {
      console.error("Error removing crate from folder:", error);
    }
  }

  private generateCrateNameFromPath(folderPath: string): string {
    // Convert folder path to user-friendly crate name
    const pathParts = folderPath.split(path.sep);
    const folderName = pathParts[pathParts.length - 1];

    // Clean up the folder name
    return folderName
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  }

  private generateColorFromPath(folderPath: string): string {
    // Generate consistent color based on path hash
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
      hash = hash & hash; // Convert to 32-bit integer
    }

    return colors[Math.abs(hash) % colors.length];
  }

  private findCrateByName(name: string): any {
    try {
      const db = this.databaseService.getDatabaseSafe();
      if (!db) return null;
      const stmt = db.prepare("SELECT * FROM crates WHERE name = ?");
      return stmt.get(name);
    } catch (error) {
      return null;
    }
  }
}
