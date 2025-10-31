// frontend/src/features/search/SearchPage.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Clock, TrendingUp } from "lucide-react";

const SearchPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for tracks, artists, albums, genres..."
            className="pl-10 text-lg h-12"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Searches</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                "house music",
                "calvin harris",
                "128 bpm",
                "trance classics",
              ].map((term, index) => (
                <div
                  key={index}
                  className="p-2 rounded hover:bg-accent cursor-pointer"
                >
                  {term}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Popular Searches</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                "deep house",
                "deadmau5",
                "progressive trance",
                "vocal house",
              ].map((term, index) => (
                <div
                  key={index}
                  className="p-2 rounded hover:bg-accent cursor-pointer"
                >
                  {term}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SearchPage;
