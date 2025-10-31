// frontend/src/features/library/LibraryPage.tsx
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  Pause,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  RefreshCw,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../store";
import {
  fetchTracks,
  scanLibrary,
  setViewMode,
  setSortBy,
} from "../../store/slices/librarySlice";
import { setCurrentTrack, playTrack } from "../../store/slices/audioSlice";
import { addNotification } from "../../store/slices/uiSlice";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  formatDuration,
  formatFileSize,
  formatBPM,
  formatKey,
  cn,
} from "@/lib/utils";
import { Track } from "../../types";

const LibraryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    tracks,
    isLoading,
    viewMode,
    sortBy,
    selectedTracks,
    isScanning,
    scanProgress,
  } = useAppSelector((state) => state.library);

  const { currentTrack, isPlaying } = useAppSelector(
    (state) => state.audio.player
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);

  // Fetch tracks on component mount
  const { data, refetch } = useQuery({
    queryKey: ["tracks", sortBy],
    queryFn: () => dispatch(fetchTracks({ sort: sortBy })).unwrap(),
    enabled: !isLoading,
  });

  // Filter tracks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTracks(tracks);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query) ||
        track.album.toLowerCase().includes(query) ||
        track.genre.toLowerCase().includes(query)
    );
    setFilteredTracks(filtered);
  }, [tracks, searchQuery]);

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      // Toggle play/pause for current track
      dispatch(isPlaying ? pauseTrack() : playTrack());
    } else {
      // Set new track and play
      dispatch(setCurrentTrack(track));
      dispatch(playTrack());
    }
  };

  const handleScanLibrary = async () => {
    try {
        dispatch(
          addNotification({
            type: "info",
            title: "Library Scan",
            message: "Starting library scan...",
          })
        );
      await dispatch(scanLibrary()).unwrap();
        
    } catch (error) {
      dispatch(
        addNotification({
          type: "error",
          title: "Scan Failed",
          message: "Failed to start library scan. Please try again.",
        })
      );
    }
  };

  const handleSortChange = (field: string) => {
    const newDirection =
      sortBy.field === field && sortBy.direction === "asc" ? "desc" : "asc";
    dispatch(
      setSortBy({ field: field as keyof Track, direction: newDirection })
    );
  };

  const handleViewModeChange = (mode: "list" | "grid" | "artwork") => {
    dispatch(setViewMode(mode));
  };

  if (isLoading && tracks.length === 0) {
    return <LibraryPageSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header Actions */}
      <div className="border-b bg-card/50 backdrop-blur p-4">
        <div className="flex items-center justify-between">
          {/* Search and filters */}
          <div className="flex items-center space-x-4 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tracks, artists, albums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select>
              <SelectTrigger className="w-[120px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="techno">Techno</SelectItem>
                <SelectItem value="trance">Trance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View controls */}
          <div className="flex items-center space-x-2">
            <Tabs value={viewMode} onValueChange={handleViewModeChange}>
              <TabsList className="grid w-fit grid-cols-3">
                <TabsTrigger value="list" className="px-3">
                  <List className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="grid" className="px-3">
                  <Grid3X3 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="artwork" className="px-3">
                  <Grid3X3 className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              onClick={handleScanLibrary}
              disabled={isScanning}
              variant="outline"
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", isScanning && "animate-spin")}
              />
              {isScanning ? "Scanning..." : "Scan Library"}
            </Button>
          </div>
        </div>

        {/* Scan progress */}
        {isScanning && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Scanning music library...</span>
              <span>{Math.round(scanProgress)}%</span>
            </div>
            <Progress value={scanProgress} className="h-2" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "list" ? (
          <TrackTable
            tracks={filteredTracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
            onSortChange={handleSortChange}
            sortBy={sortBy}
          />
        ) : viewMode === "grid" ? (
          <TrackGrid
            tracks={filteredTracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
          />
        ) : (
          <ArtworkView
            tracks={filteredTracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
          />
        )}
      </div>
    </div>
  );
};

// Track Table Component
interface TrackTableProps {
  tracks: Track[];
  currentTrack?: Track;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onSortChange: (field: string) => void;
  sortBy: { field: string; direction: "asc" | "desc" };
}

const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onSortChange,
  sortBy,
}) => {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy.field !== field) return null;
    return sortBy.direction === "asc" ? (
      <SortAsc className="h-4 w-4" />
    ) : (
      <SortDesc className="h-4 w-4" />
    );
  };

  return (
    <div className="p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead
              className="cursor-pointer hover:text-foreground"
              onClick={() => onSortChange("title")}
            >
              <div className="flex items-center space-x-1">
                <span>Title</span>
                <SortIcon field="title" />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:text-foreground"
              onClick={() => onSortChange("artist")}
            >
              <div className="flex items-center space-x-1">
                <span>Artist</span>
                <SortIcon field="artist" />
              </div>
            </TableHead>
            <TableHead>Album</TableHead>
            <TableHead>Genre</TableHead>
            <TableHead
              className="cursor-pointer hover:text-foreground text-right"
              onClick={() => onSortChange("bpm")}
            >
              <div className="flex items-center justify-end space-x-1">
                <span>BPM</span>
                <SortIcon field="bpm" />
              </div>
            </TableHead>
            <TableHead>Key</TableHead>
            <TableHead
              className="cursor-pointer hover:text-foreground text-right"
              onClick={() => onSortChange("duration")}
            >
              <div className="flex items-center justify-end space-x-1">
                <span>Duration</span>
                <SortIcon field="duration" />
              </div>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tracks.map((track) => {
            const isCurrentTrack = currentTrack?.id === track.id;

            return (
              <TableRow
                key={track.id}
                className={cn(
                  "cursor-pointer hover:bg-accent/50",
                  isCurrentTrack && "bg-accent"
                )}
                onDoubleClick={() => onPlayTrack(track)}
              >
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onPlayTrack(track)}
                    className="h-8 w-8"
                  >
                    {isCurrentTrack && isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{track.title}</TableCell>
                <TableCell>{track.artist}</TableCell>
                <TableCell>{track.album}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{track.genre}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatBPM(track.bpm)}
                </TableCell>
                <TableCell className="font-mono">
                  {formatKey(track.key)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatDuration(track.duration)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Add to Crate</DropdownMenuItem>
                      <DropdownMenuItem>Add to Playlist</DropdownMenuItem>
                      <DropdownMenuItem>Track Info</DropdownMenuItem>
                      <DropdownMenuItem>Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

// Grid View Component (placeholder)
const TrackGrid: React.FC<Omit<TrackTableProps, "onSortChange" | "sortBy">> = ({
  tracks,
}) => {
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tracks.map((track) => (
          <Card key={track.id} className="hover-lift cursor-pointer">
            <CardContent className="p-4">
              <div className="track-artwork mb-3">
                <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎵</span>
                </div>
              </div>
              <h3 className="font-medium text-sm truncate">{track.title}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {track.artist}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Artwork View Component (placeholder)
const ArtworkView: React.FC<
  Omit<TrackTableProps, "onSortChange" | "sortBy">
> = ({ tracks }) => {
  return (
    <div className="p-4">
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="track-artwork cursor-pointer hover-lift"
          >
            <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
              <span className="text-xl">🎵</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Loading skeleton
const LibraryPageSkeleton: React.FC = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 max-w-2xl">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
