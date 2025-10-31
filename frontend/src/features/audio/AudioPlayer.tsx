// frontend/src/features/audio/AudioPlayer.tsx
import React, { useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
} from "lucide-react";
import { Howl } from "howler";

import { useAppDispatch, useAppSelector } from "../../store";
import {
  playTrack,
  pauseTrack,
  setCurrentTime,
  setDuration,
  setVolume,
} from "../../store/slices/audioSlice";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatBPM, formatKey } from "@/lib/utils";

const AudioPlayer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { player } = useAppSelector((state) => state.audio);
  const { currentTrack, isPlaying, currentTime, duration, volume } = player;

  const howlRef = useRef<Howl | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio when track changes
  useEffect(() => {
    if (!currentTrack) return;

    // Clean up previous audio
    if (howlRef.current) {
      howlRef.current.unload();
    }

    // Create new Howl instance
    howlRef.current = new Howl({
      src: [`/api/tracks/${currentTrack.id}/stream`],
      volume: volume,
      onload: () => {
        if (howlRef.current) {
          dispatch(setDuration(howlRef.current.duration()));
        }
      },
      onplay: () => {
        // Start time update interval
        intervalRef.current = setInterval(() => {
          if (howlRef.current && howlRef.current.playing()) {
            dispatch(setCurrentTime(howlRef.current.seek()));
          }
        }, 1000);
      },
      onpause: () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      },
      onstop: () => {
        dispatch(setCurrentTime(0));
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      },
      onend: () => {
        dispatch(pauseTrack());
        dispatch(setCurrentTime(0));
      },
    });

    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentTrack, dispatch]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!howlRef.current) return;

    if (isPlaying) {
      howlRef.current.play();
    } else {
      howlRef.current.pause();
    }
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.volume(volume);
    }
  }, [volume]);

  const handleSeek = (value: number[]) => {
    const seekTime = value[0];
    if (howlRef.current) {
      howlRef.current.seek(seekTime);
      dispatch(setCurrentTime(seekTime));
    }
  };

  const handleVolumeChange = (value: number[]) => {
    dispatch(setVolume(value[0]));
  };

  const togglePlayPause = () => {
    if (!currentTrack) return;
    dispatch(isPlaying ? pauseTrack() : playTrack());
  };

  if (!currentTrack) {
    return (
      <div className="border-t bg-card/95 backdrop-blur p-4">
        <div className="flex items-center justify-center h-16 text-muted-foreground">
          <span>No track selected</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-t rounded-none bg-card/95 backdrop-blur">
      <div className="p-4">
        <div className="flex items-center space-x-4">
          {/* Track Info */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🎵</span>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-medium truncate">{currentTrack.title}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {currentTrack.artist}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {currentTrack.bpm && (
                <Badge variant="secondary">
                  {formatBPM(currentTrack.bpm)} BPM
                </Badge>
              )}
              {currentTrack.key && (
                <Badge variant="secondary">{formatKey(currentTrack.key)}</Badge>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" disabled>
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button onClick={togglePlayPause} size="icon">
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <Button variant="ghost" size="icon" disabled>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <span className="text-xs font-mono text-muted-foreground w-12 text-right">
              {formatDuration(currentTime)}
            </span>

            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
            />

            <span className="text-xs font-mono text-muted-foreground w-12">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Volume */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(setVolume(volume === 0 ? 0.8 : 0))}
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>

            <Slider
              value={[volume]}
              max={1}
              step={0.05}
              onValueChange={handleVolumeChange}
              className="w-20"
            />
          </div>

          {/* Additional Controls */}
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" disabled>
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" disabled>
              <Repeat className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AudioPlayer;
