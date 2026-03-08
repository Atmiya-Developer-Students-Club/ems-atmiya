"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, MapPin, Users } from "lucide-react";
import { getImageUrl } from "@/lib/utils";

interface Hackathon {
  id: string;
  name: string;
  description: string;
  poster_url: string;
  start_date: string;
  end_date: string;
  mode: "ONLINE" | "OFFLINE";
  location: string | null;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED" | "OTHER";
  tags: string[];
  team_size_limit: number | null;
}

interface HackathonCardProps {
  hackathon: Hackathon;
  isRegistered?: boolean;
}

function HackathonCard({ hackathon, isRegistered }: HackathonCardProps) {
  const router = useRouter();

  const truncateDescription = (description: string, maxLength: number = 150) => {
    if (description.length <= maxLength) return description;
    return `${description.substring(0, maxLength)}...`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "UPCOMING":
        return "default";
      case "COMPLETED":
        return "secondary";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleViewDetails = () => {
    router.push(`/hackathons/${hackathon.id}`);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden pt-0">
      <div className="relative">
        <img
          src={getImageUrl(hackathon.poster_url, "hackathon-posters")}
          alt={hackathon.name}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        <Badge
          className="absolute top-2 right-2"
          variant={getStatusColor(hackathon.status) as any}
        >
          {hackathon.status}
        </Badge>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-2">{hackathon.name}</CardTitle>
        <div className="flex flex-wrap gap-1 mt-1">
          {hackathon.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {hackathon.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{hackathon.tags.length - 3} more
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <p className="text-muted-foreground text-sm line-clamp-3">
          {truncateDescription(hackathon.description)}
        </p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            <span>
              {format(new Date(hackathon.start_date), "MMM d, yyyy")} -{" "}
              {format(new Date(hackathon.end_date), "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 mr-1" />
            <span>
              {hackathon.mode}{" "}
              {hackathon.location ? `- ${hackathon.location}` : ""}
            </span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Users className="h-3 w-3 mr-1" />
            <span>
              Team size: up to {hackathon.team_size_limit || 5} members
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={isRegistered ? "secondary" : "default"}
          onClick={handleViewDetails}
        >
          {isRegistered ? "View Team" : "View Details"}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface HackathonListProps {
  hackathons: Hackathon[];
  userRegistrations?: Record<string, boolean>; // Map of hackathon IDs that the user is registered for
}

export function HackathonList({
  hackathons,
  userRegistrations = {},
}: HackathonListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");

  const filteredHackathons = hackathons.filter((hackathon) => {
    // Search filter
    const searchMatch =
      hackathon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hackathon.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hackathon.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    // Status filter
    const statusMatch =
      statusFilter === "ALL" || hackathon.status === statusFilter;

    // Mode filter
    const modeMatch = modeFilter === "ALL" || hackathon.mode === modeFilter;

    return searchMatch && statusMatch && modeMatch;
  });

  return (
    <div className="space-y-6">
      {filteredHackathons.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No hackathons found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHackathons.map((hackathon) => (
            <HackathonCard
              key={hackathon.id}
              hackathon={hackathon}
              isRegistered={userRegistrations[hackathon.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
