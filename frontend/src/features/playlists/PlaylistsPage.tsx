// frontend/src/features/playlists/PlaylistsPage.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, List, Clock } from "lucide-react";

const PlaylistsPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Playlists</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Playlist
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder playlists */}
        {[
          { name: "Friday Night Set", tracks: 15, duration: "1h 32m" },
          { name: "Corporate Event", tracks: 25, duration: "2h 15m" },
          { name: "Summer Vibes", tracks: 20, duration: "1h 45m" },
        ].map((playlist, index) => (
          <Card
            key={index}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <List className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{playlist.name}</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>{playlist.tracks} tracks</span>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{playlist.duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlaylistsPage;
