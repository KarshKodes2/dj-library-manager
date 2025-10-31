"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaylistGenerator = void 0;
// backend/src/services/PlaylistGenerator.ts
const DatabaseService_1 = require("./DatabaseService");
class PlaylistGenerator {
    constructor() {
        this.databaseService = new DatabaseService_1.DatabaseService();
        this.keyCompatibilityMatrix = new Map();
        this.initializeKeyCompatibility();
    }
    initializeKeyCompatibility() {
        // Initialize Camelot wheel compatibility matrix
        const camelotKeys = [
            "1A",
            "1B",
            "2A",
            "2B",
            "3A",
            "3B",
            "4A",
            "4B",
            "5A",
            "5B",
            "6A",
            "6B",
            "7A",
            "7B",
            "8A",
            "8B",
            "9A",
            "9B",
            "10A",
            "10B",
            "11A",
            "11B",
            "12A",
            "12B",
        ];
        camelotKeys.forEach((key1) => {
            const compatibilityMap = new Map();
            camelotKeys.forEach((key2) => {
                compatibilityMap.set(key2, this.calculateKeyCompatibility(key1, key2));
            });
            this.keyCompatibilityMatrix.set(key1, compatibilityMap);
        });
    }
    calculateKeyCompatibility(key1, key2) {
        const num1 = parseInt(key1);
        const num2 = parseInt(key2);
        const letter1 = key1.slice(-1);
        const letter2 = key2.slice(-1);
        // Perfect match
        if (key1 === key2)
            return 1.0;
        // Same number, different letter (relative major/minor)
        if (num1 === num2 && letter1 !== letter2)
            return 0.9;
        // Adjacent numbers, same letter (perfect energy match)
        if ((Math.abs(num1 - num2) === 1 || Math.abs(num1 - num2) === 11) &&
            letter1 === letter2) {
            return 0.8;
        }
        // Adjacent numbers, different letter (good energy flow)
        if (Math.abs(num1 - num2) === 1 || Math.abs(num1 - num2) === 11) {
            return 0.6;
        }
        // Perfect fifth (7 steps apart)
        if (Math.abs(num1 - num2) === 7 || Math.abs(num1 - num2) === 5) {
            return 0.7;
        }
        // Opposite on wheel (dramatic change)
        if (Math.abs(num1 - num2) === 6)
            return 0.4;
        // Other relationships
        return 0.3;
    }
    async generateHarmonicPlaylist(options) {
        const startTime = Date.now();
        console.log("🎵 Generating harmonic playlist with options:", options);
        const { startKey = "4A", targetDuration = 3600, // 1 hour default
        energyCurve = "standard", preferredGenres = [], excludeExplicit = true, allowKeyJumps = true, minRating = 0, maxTracks = 50, } = options;
        try {
            // Get candidate tracks from database
            const candidateTracks = await this.getCandidateTracks({
                preferredGenres,
                excludeExplicit,
                minRating,
            });
            if (candidateTracks.length === 0) {
                throw new Error("No suitable tracks found for playlist generation");
            }
            console.log(`📚 Found ${candidateTracks.length} candidate tracks`);
            // Generate the playlist using harmonic mixing algorithm
            const playlistTracks = await this.buildHarmonicSequence(candidateTracks, startKey, targetDuration, energyCurve, allowKeyJumps, maxTracks);
            // Calculate playlist metrics
            const metrics = this.calculatePlaylistMetrics(playlistTracks);
            // Generate metadata
            const playlist = {
                name: this.generatePlaylistName(options, playlistTracks),
                description: this.generatePlaylistDescription(options, metrics),
                tracks: playlistTracks,
                total_duration: metrics.totalDuration,
                avg_bpm: metrics.avgBPM,
                energy_curve: metrics.energyCurve,
                harmonic_flow_score: metrics.harmonicFlowScore,
                transition_quality: metrics.transitionQuality,
                metadata: {
                    generated_at: new Date(),
                    options,
                    algorithm_version: "2.0.0",
                },
            };
            const generationTime = Date.now() - startTime;
            console.log(`✅ Playlist generated in ${generationTime}ms: ${playlist.tracks.length} tracks, ${Math.round(playlist.total_duration / 60)} minutes`);
            return playlist;
        }
        catch (error) {
            console.error("❌ Error generating harmonic playlist:", error.message);
            if (error instanceof Error) {
                throw new Error(`Playlist generation failed: ${error.message}`);
            }
            else {
                throw new Error("Playlist generation failed: Unknown error");
            }
        }
    }
    async getCandidateTracks(filters) {
        const db = this.databaseService.getDatabase();
        let sql = "SELECT * FROM tracks WHERE 1=1";
        const params = [];
        // Apply filters
        if (filters.preferredGenres.length > 0) {
            const placeholders = filters.preferredGenres.map(() => "?").join(",");
            sql += ` AND genre IN (${placeholders})`;
            params.push(...filters.preferredGenres);
        }
        if (filters.excludeExplicit) {
            sql += " AND explicit_content = 0";
        }
        if (filters.minRating > 0) {
            sql += " AND rating >= ?";
            params.push(filters.minRating);
        }
        // Exclude very short or very long tracks for better mixing
        sql += " AND duration BETWEEN 120 AND 600"; // 2-10 minutes
        // Prefer tracks with good metadata
        sql += " AND bpm > 0 AND key_signature IS NOT NULL";
        // Order by quality factors
        sql += " ORDER BY (rating * 2 + play_count * 0.1) DESC, RANDOM()";
        const tracks = db.prepare(sql).all(...params);
        return tracks;
    }
    async buildHarmonicSequence(candidateTracks, startKey, targetDuration, energyCurve, allowKeyJumps, maxTracks) {
        const playlist = [];
        const usedTrackIds = new Set();
        let currentDuration = 0;
        let currentKey = startKey;
        // Find starting track
        const startingTrack = this.findBestStartingTrack(candidateTracks, startKey);
        if (!startingTrack) {
            throw new Error(`No suitable starting track found for key ${startKey}`);
        }
        // Add first track
        playlist.push(this.createPlaylistTrack(startingTrack, 1, null, currentKey));
        usedTrackIds.add(startingTrack.id);
        currentDuration += startingTrack.duration;
        currentKey = startingTrack.key_signature;
        // Build the sequence
        while (currentDuration < targetDuration &&
            playlist.length < maxTracks &&
            usedTrackIds.size < candidateTracks.length) {
            const progress = currentDuration / targetDuration;
            const targetEnergy = this.getTargetEnergyForProgress(progress, energyCurve);
            const nextTrack = this.findNextBestTrack(candidateTracks, usedTrackIds, currentKey, targetEnergy, allowKeyJumps, playlist);
            if (!nextTrack) {
                console.warn("⚠️ No suitable next track found, ending playlist generation");
                break;
            }
            const playlistTrack = this.createPlaylistTrack(nextTrack, playlist.length + 1, playlist[playlist.length - 1], currentKey);
            playlist.push(playlistTrack);
            usedTrackIds.add(nextTrack.id);
            currentDuration += nextTrack.duration;
            currentKey = nextTrack.key_signature;
        }
        // Optimize transitions
        this.optimizeTransitions(playlist);
        return playlist;
    }
    findBestStartingTrack(tracks, preferredKey) {
        // First, try to find exact key match
        let candidates = tracks.filter((track) => track.key_signature === preferredKey);
        if (candidates.length === 0) {
            // Try compatible keys
            const compatibility = this.keyCompatibilityMatrix.get(preferredKey);
            if (compatibility) {
                candidates = tracks.filter((track) => {
                    const score = compatibility.get(track.key_signature) || 0;
                    return score >= 0.6;
                });
            }
        }
        if (candidates.length === 0) {
            // Fallback to any track
            candidates = tracks;
        }
        // Sort by quality and return best
        candidates.sort((a, b) => {
            const scoreA = (a.rating || 0) * 2 + (a.play_count || 0) * 0.1;
            const scoreB = (b.rating || 0) * 2 + (b.play_count || 0) * 0.1;
            return scoreB - scoreA;
        });
        return candidates[0] || null;
    }
    findNextBestTrack(tracks, usedTrackIds, currentKey, targetEnergy, allowKeyJumps, existingPlaylist) {
        const candidates = tracks.filter((track) => !usedTrackIds.has(track.id));
        if (candidates.length === 0)
            return null;
        // Score each candidate
        const scoredCandidates = candidates.map((track) => ({
            track,
            score: this.scoreTrackForPosition(track, currentKey, targetEnergy, allowKeyJumps, existingPlaylist),
        }));
        // Sort by score
        scoredCandidates.sort((a, b) => b.score - a.score);
        // Add some randomness to avoid predictable playlists
        const topCandidates = scoredCandidates.slice(0, Math.min(5, scoredCandidates.length));
        const selectedIndex = Math.floor(Math.random() * topCandidates.length);
        return topCandidates[selectedIndex]?.track || null;
    }
    scoreTrackForPosition(track, currentKey, targetEnergy, allowKeyJumps, existingPlaylist) {
        let score = 0;
        // Key compatibility (40% of score)
        const keyCompatibility = this.keyCompatibilityMatrix.get(currentKey)?.get(track.key_signature) ||
            0;
        if (!allowKeyJumps && keyCompatibility < 0.5) {
            return 0; // Disqualify incompatible keys if jumps not allowed
        }
        score += keyCompatibility * 40;
        // Energy matching (30% of score)
        const energyDiff = Math.abs(track.energy_level - targetEnergy);
        const energyScore = Math.max(0, 10 - energyDiff * 3);
        score += energyScore * 3;
        // Track quality (20% of score)
        const qualityScore = (track.rating || 0) * 4 + Math.min(10, (track.play_count || 0) * 0.1);
        score += qualityScore * 2;
        // Variety bonus (10% of score) - avoid repeating artists/genres
        const recentTracks = existingPlaylist.slice(-3);
        const artistRepeat = recentTracks.some((t) => t.artist === track.artist);
        const genreRepeat = recentTracks.filter((t) => t.genre === track.genre).length > 1;
        if (!artistRepeat)
            score += 10;
        if (!genreRepeat)
            score += 5;
        // BPM compatibility bonus
        if (existingPlaylist.length > 0) {
            const lastTrack = existingPlaylist[existingPlaylist.length - 1];
            const bpmDiff = Math.abs(track.bpm - lastTrack.bpm);
            if (bpmDiff <= 5)
                score += 15; // Very close BPM
            else if (bpmDiff <= 10)
                score += 10; // Good BPM range
            else if (bpmDiff > 20)
                score -= 10; // Penalize large BPM jumps
        }
        return score;
    }
    getTargetEnergyForProgress(progress, curve) {
        switch (curve) {
            case "buildup":
                return Math.min(5, Math.floor(1 + progress * 4));
            case "plateau":
                if (progress < 0.2)
                    return Math.floor(1 + progress * 10); // Quick ramp up
                if (progress > 0.8)
                    return Math.floor(5 - (progress - 0.8) * 10); // Quick wind down
                return 4; // Maintain high energy
            case "cooldown":
                return Math.max(1, Math.floor(5 - progress * 4));
            default: // 'standard'
                if (progress < 0.3)
                    return Math.floor(2 + progress * 6); // Gradual buildup
                if (progress > 0.7)
                    return Math.floor(4 - (progress - 0.7) * 6); // Gradual cooldown
                return 4; // Peak energy in middle
        }
    }
    createPlaylistTrack(track, position, previousTrack, currentKey) {
        const mixInTime = this.calculateMixInTime(track, previousTrack);
        const mixOutTime = this.calculateMixOutTime(track);
        const transitionType = this.getTransitionType(currentKey, track.key_signature);
        const harmonicCompatibility = this.keyCompatibilityMatrix.get(currentKey)?.get(track.key_signature) ||
            0;
        return {
            ...track,
            position,
            transition_type: transitionType,
            transition_quality: this.calculateTransitionQuality(track, previousTrack),
            mix_in_time: mixInTime,
            mix_out_time: mixOutTime,
            harmonic_compatibility: harmonicCompatibility,
            energy_flow_score: this.calculateEnergyFlowScore(track, previousTrack),
        };
    }
    calculateMixInTime(track, previousTrack) {
        if (!previousTrack)
            return 0;
        // Calculate optimal mix-in point based on intro analysis and BPM
        const baseIntroTime = track.intro_time || Math.min(16, track.duration * 0.1);
        // Adjust based on BPM compatibility
        const bpmDiff = Math.abs(track.bpm - previousTrack.bpm);
        if (bpmDiff <= 3)
            return baseIntroTime * 0.5; // Quick mix for similar BPM
        if (bpmDiff <= 10)
            return baseIntroTime * 0.75; // Medium mix
        return baseIntroTime; // Longer intro for BPM changes
    }
    calculateMixOutTime(track) {
        // Calculate optimal mix-out point based on outro analysis
        return track.outro_time || Math.min(32, track.duration * 0.15);
    }
    getTransitionType(fromKey, toKey) {
        const compatibility = this.keyCompatibilityMatrix.get(fromKey)?.get(toKey) || 0;
        if (fromKey === toKey)
            return "Same Key";
        if (compatibility >= 0.9)
            return "Relative";
        if (compatibility >= 0.8)
            return "Adjacent";
        if (compatibility >= 0.7)
            return "Perfect Fifth";
        if (compatibility >= 0.6)
            return "Compatible";
        if (compatibility >= 0.4)
            return "Energy Change";
        return "Key Jump";
    }
    calculateTransitionQuality(track, previousTrack) {
        if (!previousTrack)
            return 1.0;
        let quality = 0.5; // Base quality
        // Key compatibility
        const keyCompatibility = this.keyCompatibilityMatrix
            .get(previousTrack.key_signature)
            ?.get(track.key_signature) || 0;
        quality += keyCompatibility * 0.3;
        // BPM compatibility
        const bpmDiff = Math.abs(track.bpm - previousTrack.bpm);
        if (bpmDiff <= 3)
            quality += 0.2;
        else if (bpmDiff <= 10)
            quality += 0.1;
        else if (bpmDiff > 20)
            quality -= 0.2;
        // Energy flow
        const energyDiff = Math.abs(track.energy_level - previousTrack.energy_level);
        if (energyDiff <= 1)
            quality += 0.1;
        else if (energyDiff > 2)
            quality -= 0.1;
        return Math.max(0, Math.min(1, quality));
    }
    calculateEnergyFlowScore(track, previousTrack) {
        if (!previousTrack)
            return 1.0;
        const energyChange = track.energy_level - previousTrack.energy_level;
        // Prefer gradual energy changes
        if (Math.abs(energyChange) <= 1)
            return 1.0;
        if (Math.abs(energyChange) === 2)
            return 0.8;
        return 0.6; // Large energy jumps
    }
    optimizeTransitions(playlist) {
        // Post-process to optimize transition points and qualities
        for (let i = 1; i < playlist.length; i++) {
            const currentTrack = playlist[i];
            const previousTrack = playlist[i - 1];
            // Recalculate transition quality with more context
            currentTrack.transition_quality = this.calculateTransitionQuality(currentTrack, previousTrack);
            // Adjust mix times based on track relationships
            if (currentTrack.transition_quality > 0.8) {
                // High quality transition - can mix faster
                currentTrack.mix_in_time *= 0.8;
            }
        }
    }
    calculatePlaylistMetrics(tracks) {
        const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);
        const avgBPM = tracks.reduce((sum, track) => sum + track.bpm, 0) / tracks.length;
        const energyCurve = tracks.map((track) => track.energy_level);
        const harmonicFlowScore = tracks.reduce((sum, track) => sum + track.harmonic_compatibility, 0) /
            tracks.length;
        const transitionQuality = tracks.reduce((sum, track) => sum + track.transition_quality, 0) /
            tracks.length;
        return {
            totalDuration,
            avgBPM: Math.round(avgBPM),
            energyCurve,
            harmonicFlowScore,
            transitionQuality,
        };
    }
    generatePlaylistName(options, tracks) {
        const duration = Math.round(tracks.reduce((sum, t) => sum + t.duration, 0) / 60);
        const avgBPM = Math.round(tracks.reduce((sum, t) => sum + t.bpm, 0) / tracks.length);
        let name = `${options.energyCurve || "Standard"} Mix`;
        if (options.preferredGenres && options.preferredGenres.length > 0) {
            name += ` - ${options.preferredGenres[0]}`;
        }
        name += ` (${duration}min @ ${avgBPM}BPM)`;
        return name;
    }
    generatePlaylistDescription(options, metrics) {
        let description = `Generated harmonic playlist with ${metrics.energyCurve.length} tracks. `;
        description += `Total duration: ${Math.round(metrics.totalDuration / 60)} minutes. `;
        description += `Average BPM: ${metrics.avgBPM}. `;
        description += `Harmonic flow score: ${(metrics.harmonicFlowScore * 100).toFixed(1)}%. `;
        description += `Transition quality: ${(metrics.transitionQuality * 100).toFixed(1)}%.`;
        if (options.preferredGenres && options.preferredGenres.length > 0) {
            description += ` Focused on: ${options.preferredGenres.join(", ")}.`;
        }
        return description;
    }
    // Event-specific playlist generation
    async generateEventPlaylist(eventType, duration, guestPreferences) {
        const eventConfigs = {
            "wedding-ceremony": {
                energyCurve: "standard",
                preferredGenres: ["Classical", "Acoustic", "Jazz"],
                excludeExplicit: true,
                startKey: "4A",
                minRating: 4,
            },
            "wedding-reception": {
                energyCurve: "buildup",
                preferredGenres: ["Pop", "R&B", "Classic Rock", "Dance"],
                excludeExplicit: true,
                startKey: "8A",
                minRating: 3,
            },
            "corporate-event": {
                energyCurve: "plateau",
                preferredGenres: ["Jazz", "Pop", "Electronic"],
                excludeExplicit: true,
                startKey: "6A",
                minRating: 3,
            },
            "club-night": {
                energyCurve: "buildup",
                preferredGenres: ["House", "Techno", "Electronic", "Hip Hop"],
                excludeExplicit: false,
                startKey: "9A",
                minRating: 4,
            },
            "dinner-party": {
                energyCurve: "standard",
                preferredGenres: ["Jazz", "Bossa Nova", "Acoustic"],
                excludeExplicit: true,
                startKey: "5A",
                minRating: 3,
            },
        };
        const config = eventConfigs[eventType] ||
            eventConfigs["dinner-party"];
        const options = {
            ...config,
            targetDuration: duration,
            eventType,
            ...guestPreferences,
        };
        return this.generateHarmonicPlaylist(options);
    }
}
exports.PlaylistGenerator = PlaylistGenerator;
