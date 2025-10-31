// backend/src/services/SeratoSyncService.ts
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { DatabaseService } from "./DatabaseService";

export interface SeratoSyncResult {
  importedCrates: any[];
  exportedCrates: any[];
  importedPlaylists: any[];
  exportedPlaylists: any[];
  errors: string[];
}

class SeratoSyncService {
  constructor() {
    this.db = new DatabaseService();
    this.seratoPath = this.getSeratoPath();
    this.parser = new xml2js.Parser();
    this.builder = new xml2js.Builder();
  }

  getSeratoPath() {
    const platform = process.platform;
    const homeDir = require("os").homedir();

    switch (platform) {
      case "win32":
        return path.join(
          homeDir,
          "AppData",
          "Roaming",
          "Serato",
          "ScratchLive"
        );
      case "darwin":
        return path.join(
          homeDir,
          "Library",
          "Application Support",
          "Serato",
          "ScratchLive"
        );
      case "linux":
        return path.join(homeDir, ".serato", "ScratchLive");
      default:
        throw new Error("Unsupported platform for Serato sync");
    }
  }

  // Import Serato crates to DJ Library Manager
  async importSeratoCrates() {
    console.log("🎵 Importing Serato crates...");

    try {
      const cratesPath = path.join(this.seratoPath, "Subcrates");
      const files = await fs.readdir(cratesPath);
      const crateFiles = files.filter((file) => file.endsWith(".crate"));

      const importedCrates = [];

      for (const crateFile of crateFiles) {
        const crateName = path.basename(crateFile, ".crate");
        console.log(`📁 Processing crate: ${crateName}`);

        const crateContent = await fs.readFile(
          path.join(cratesPath, crateFile)
        );
        const tracks = this.parseSeratoCrate(crateContent);

        // Create crate in our database
        const crate = await this.db.createCrate({
          name: crateName,
          type: "static",
          description: `Imported from Serato`,
          tracks: tracks,
          dateCreated: new Date().toISOString(),
          dateModified: new Date().toISOString(),
          trackCount: tracks.length,
        });

        importedCrates.push(crate);
        console.log(
          `✅ Imported crate "${crateName}" with ${tracks.length} tracks`
        );
      }

      console.log(
        `🎉 Successfully imported ${importedCrates.length} Serato crates`
      );
      return importedCrates;
    } catch (error) {
      console.error("❌ Failed to import Serato crates:", error.message);
      throw error;
    }
  }

  // Export DJ Library Manager crates to Serato
  async exportCratesToSerato(crateIds = null) {
    console.log("🎵 Exporting crates to Serato...");

    try {
      const crates = crateIds
        ? await Promise.all(crateIds.map((id) => this.db.getCrate(id)))
        : await this.db.getAllCrates();

      const cratesPath = path.join(this.seratoPath, "Subcrates");

      // Ensure Serato subcrates directory exists
      await fs.mkdir(cratesPath, { recursive: true });

      const exportedCrates = [];

      for (const crate of crates) {
        console.log(`📁 Exporting crate: ${crate.name}`);

        // Get track file paths for this crate
        const tracks = await this.db.getTracksByCrateId(crate.id);
        const trackPaths = tracks.map((track) => track.path);

        // Generate Serato crate content
        const crateContent = this.generateSeratoCrateContent(trackPaths);

        // Write to Serato crate file
        const crateFileName = `${this.sanitizeFileName(crate.name)}.crate`;
        const crateFilePath = path.join(cratesPath, crateFileName);

        await fs.writeFile(crateFilePath, crateContent);

        exportedCrates.push({
          name: crate.name,
          fileName: crateFileName,
          trackCount: trackPaths.length,
        });

        console.log(
          `✅ Exported crate "${crate.name}" with ${trackPaths.length} tracks`
        );
      }

      console.log(
        `🎉 Successfully exported ${exportedCrates.length} crates to Serato`
      );
      return exportedCrates;
    } catch (error) {
      console.error("❌ Failed to export crates to Serato:", error.message);
      throw error;
    }
  }

  // Import Serato playlists
  async importSeratoPlaylists() {
    console.log("🎵 Importing Serato playlists...");

    try {
      const playlistsPath = path.join(this.seratoPath, "Playlists");

      if (!(await this.pathExists(playlistsPath))) {
        console.log("📝 No Serato playlists found");
        return [];
      }

      const files = await fs.readdir(playlistsPath);
      const playlistFiles = files.filter(
        (file) => file.endsWith(".m3u") || file.endsWith(".m3u8")
      );

      const importedPlaylists = [];

      for (const playlistFile of playlistFiles) {
        const playlistName = path.basename(
          playlistFile,
          path.extname(playlistFile)
        );
        console.log(`📝 Processing playlist: ${playlistName}`);

        const playlistContent = await fs.readFile(
          path.join(playlistsPath, playlistFile),
          "utf8"
        );
        const trackPaths = this.parseM3UPlaylist(playlistContent);

        // Match file paths to our track IDs
        const trackIds = await this.matchPathsToTrackIds(trackPaths);

        // Create playlist in our database
        const playlist = await this.db.createPlaylist({
          name: playlistName,
          description: `Imported from Serato`,
          tracks: trackIds.map((trackId, index) => ({
            trackId,
            position: index,
            addedAt: new Date().toISOString(),
          })),
          type: "manual",
          dateCreated: new Date().toISOString(),
          dateModified: new Date().toISOString(),
          duration: 0, // Will be calculated
          public: false,
        });

        importedPlaylists.push(playlist);
        console.log(
          `✅ Imported playlist "${playlistName}" with ${trackIds.length} tracks`
        );
      }

      console.log(
        `🎉 Successfully imported ${importedPlaylists.length} Serato playlists`
      );
      return importedPlaylists;
    } catch (error) {
      console.error("❌ Failed to import Serato playlists:", error.message);
      throw error;
    }
  }

  // Export playlists to Serato
  async exportPlaylistsToSerato(playlistIds = null) {
    console.log("🎵 Exporting playlists to Serato...");

    try {
      const playlists = playlistIds
        ? await Promise.all(playlistIds.map((id) => this.db.getPlaylist(id)))
        : await this.db.getAllPlaylists();

      const playlistsPath = path.join(this.seratoPath, "Playlists");

      // Ensure Serato playlists directory exists
      await fs.mkdir(playlistsPath, { recursive: true });

      const exportedPlaylists = [];

      for (const playlist of playlists) {
        console.log(`📝 Exporting playlist: ${playlist.name}`);

        // Get track file paths for this playlist
        const tracks = await this.db.getTracksByPlaylistId(playlist.id);
        const trackPaths = tracks.map((track) => track.path);

        // Generate M3U playlist content
        const playlistContent = this.generateM3UContent(trackPaths, tracks);

        // Write to Serato playlist file
        const playlistFileName = `${this.sanitizeFileName(playlist.name)}.m3u8`;
        const playlistFilePath = path.join(playlistsPath, playlistFileName);

        await fs.writeFile(playlistFilePath, playlistContent, "utf8");

        exportedPlaylists.push({
          name: playlist.name,
          fileName: playlistFileName,
          trackCount: trackPaths.length,
        });

        console.log(
          `✅ Exported playlist "${playlist.name}" with ${trackPaths.length} tracks`
        );
      }

      console.log(
        `🎉 Successfully exported ${exportedPlaylists.length} playlists to Serato`
      );
      return exportedPlaylists;
    } catch (error) {
      console.error("❌ Failed to export playlists to Serato:", error.message);
      throw error;
    }
  }

  // Bidirectional sync
  async fullSync() {
    console.log("🔄 Starting full bidirectional sync with Serato...");

    const results = {
      importedCrates: [],
      exportedCrates: [],
      importedPlaylists: [],
      exportedPlaylists: [],
      errors: [],
    };

    try {
      // Import from Serato
      console.log("\n📥 Phase 1: Importing from Serato...");
      results.importedCrates = await this.importSeratoCrates();
      results.importedPlaylists = await this.importSeratoPlaylists();

      // Export to Serato
      console.log("\n📤 Phase 2: Exporting to Serato...");
      results.exportedCrates = await this.exportCratesToSerato();
      results.exportedPlaylists = await this.exportPlaylistsToSerato();

      console.log("\n🎉 Full sync completed successfully!");
      this.printSyncSummary(results);
    } catch (error) {
      results.errors.push(error.message);
      console.error("❌ Sync failed:", error.message);
    }

    return results;
  }

  // Helper methods
  parseSeratoCrate(crateContent) {
    // Parse binary Serato crate format
    // This is a simplified version - actual Serato format is more complex
    const tracks = [];
    try {
      // Serato crates contain binary data with track references
      // You'll need to implement the actual Serato binary format parser
      // For now, we'll return empty array
      console.log("⚠️  Serato crate parsing not fully implemented");
    } catch (error) {
      console.error("Failed to parse Serato crate:", error);
    }
    return tracks;
  }

  generateSeratoCrateContent(trackPaths) {
    // Generate binary Serato crate format
    // This is a placeholder - actual implementation would generate proper binary format
    console.log("⚠️  Serato crate generation not fully implemented");
    return Buffer.alloc(0);
  }

  parseM3UPlaylist(content) {
    const lines = content.split("\n");
    const trackPaths = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        // Convert Windows paths to cross-platform
        const normalizedPath = trimmed.replace(/\\/g, "/");
        trackPaths.push(normalizedPath);
      }
    }

    return trackPaths;
  }

  generateM3UContent(trackPaths, tracks) {
    let content = "#EXTM3U\n";

    for (let i = 0; i < trackPaths.length; i++) {
      const track = tracks[i];
      if (track) {
        const duration = Math.round(track.duration);
        content += `#EXTINF:${duration},${track.artist} - ${track.title}\n`;
      }
      content += `${trackPaths[i]}\n`;
    }

    return content;
  }

  async matchPathsToTrackIds(trackPaths) {
    const trackIds = [];

    for (const trackPath of trackPaths) {
      try {
        const track = await this.db.getTrackByPath(trackPath);
        if (track) {
          trackIds.push(track.id);
        } else {
          console.log(`⚠️  Track not found in library: ${trackPath}`);
        }
      } catch (error) {
        console.error(`Failed to match track path: ${trackPath}`, error);
      }
    }

    return trackIds;
  }

  sanitizeFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, "_").trim();
  }

  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  printSyncSummary(results) {
    console.log("\n📊 SYNC SUMMARY");
    console.log("================");
    console.log(
      `📥 Imported: ${results.importedCrates.length} crates, ${results.importedPlaylists.length} playlists`
    );
    console.log(
      `📤 Exported: ${results.exportedCrates.length} crates, ${results.exportedPlaylists.length} playlists`
    );

    if (results.errors.length > 0) {
      console.log(`❌ Errors: ${results.errors.length}`);
      results.errors.forEach((error) => console.log(`   • ${error}`));
    }
  }
}

module.exports = { SeratoSyncService };

// CLI Usage Examples in your main CLI file:

// backend/src/cli/SeratoCLI.js
class SeratoCLI {
  constructor() {
    this.seratoSync = new SeratoSyncService();
  }

  async handleSeratoCommands(command, options) {
    switch (command) {
      case "sync":
        return await this.handleSync(options);
      case "import":
        return await this.handleImport(options);
      case "export":
        return await this.handleExport(options);
      case "status":
        return await this.handleStatus();
      default:
        this.showSeratoHelp();
    }
  }

  async handleSync(options) {
    console.log("🔄 Starting Serato sync...");

    if (options.crates && options.playlists) {
      return await this.seratoSync.fullSync();
    } else if (options.crates) {
      const imported = await this.seratoSync.importSeratoCrates();
      const exported = await this.seratoSync.exportCratesToSerato();
      return { imported, exported };
    } else if (options.playlists) {
      const imported = await this.seratoSync.importSeratoPlaylists();
      const exported = await this.seratoSync.exportPlaylistsToSerato();
      return { imported, exported };
    } else {
      return await this.seratoSync.fullSync();
    }
  }

  async handleImport(options) {
    if (options.crates) {
      return await this.seratoSync.importSeratoCrates();
    } else if (options.playlists) {
      return await this.seratoSync.importSeratoPlaylists();
    } else {
      const crates = await this.seratoSync.importSeratoCrates();
      const playlists = await this.seratoSync.importSeratoPlaylists();
      return { crates, playlists };
    }
  }

  async handleExport(options) {
    if (options.crates) {
      const crateIds = options.ids ? options.ids.split(",") : null;
      return await this.seratoSync.exportCratesToSerato(crateIds);
    } else if (options.playlists) {
      const playlistIds = options.ids ? options.ids.split(",") : null;
      return await this.seratoSync.exportPlaylistsToSerato(playlistIds);
    } else {
      const crates = await this.seratoSync.exportCratesToSerato();
      const playlists = await this.seratoSync.exportPlaylistsToSerato();
      return { crates, playlists };
    }
  }

  async handleStatus() {
    console.log("📊 Serato Integration Status");
    console.log("============================");

    try {
      const seratoPath = this.seratoSync.seratoPath;
      const exists = await this.seratoSync.pathExists(seratoPath);

      console.log(`Serato Path: ${seratoPath}`);
      console.log(`Status: ${exists ? "✅ Found" : "❌ Not Found"}`);

      if (exists) {
        const cratesPath = path.join(seratoPath, "Subcrates");
        const playlistsPath = path.join(seratoPath, "Playlists");

        const cratesExist = await this.seratoSync.pathExists(cratesPath);
        const playlistsExist = await this.seratoSync.pathExists(playlistsPath);

        console.log(`Crates: ${cratesExist ? "✅ Available" : "❌ Not Found"}`);
        console.log(
          `Playlists: ${playlistsExist ? "✅ Available" : "❌ Not Found"}`
        );
      }
    } catch (error) {
      console.error("❌ Failed to check Serato status:", error.message);
    }
  }

  showSeratoHelp() {
    console.log(`
🎛️  DJ Library Manager - Serato Integration

USAGE:
  node dj-manager.js serato <command> [options]

COMMANDS:
  sync              Bidirectional sync (import + export)
  import            Import from Serato to DJ Library Manager
  export            Export from DJ Library Manager to Serato  
  status            Check Serato integration status

OPTIONS:
  --crates          Sync only crates
  --playlists       Sync only playlists
  --ids <ids>       Comma-separated list of specific IDs to export

EXAMPLES:
  # Full bidirectional sync
  node dj-manager.js serato sync

  # Import only crates from Serato
  node dj-manager.js serato import --crates

  # Export specific playlists to Serato
  node dj-manager.js serato export --playlists --ids "1,2,3"

  # Check Serato status
  node dj-manager.js serato status
    `);
  }
}

module.exports = { SeratoCLI };
