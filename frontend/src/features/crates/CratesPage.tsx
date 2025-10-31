// frontend/src/features/crates/CratesPage.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Folder } from "lucide-react";

const CratesPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Crates</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Crate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder crates */}
        {[
          { name: "House Classics", count: 45, color: "blue" },
          { name: "Peak Time", count: 32, color: "red" },
          { name: "Warm Up", count: 28, color: "green" },
          { name: "New Tracks", count: 12, color: "purple" },
        ].map((crate, index) => (
          <Card
            key={index}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-lg bg-${crate.color}-500/20 flex items-center justify-center`}
                >
                  <Folder className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{crate.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {crate.count} tracks
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CratesPage;
