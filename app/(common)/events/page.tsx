"use client";

import EventCard from "@/components/section/events/EventCard";
import { fetcher } from "@/fetcher";
import { EventMode, EventStatus, EventType } from "@prisma/client";
import useSWR from "swr";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LandingHeader } from "@/components/global/navigation-bar/LandingHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HackathonList } from "@/components/section/student/hackathons/HackathonList";
import { Calendar, Code } from "lucide-react";

// Skeleton loading component for events
function EventCardSkeleton() {
  return (
    <div className="overflow-hidden pt-0 z-10 border rounded-lg">
      <div className="relative h-48">
        <Skeleton className="h-full w-full" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <Skeleton className="h-6 w-16 bg-white/20" />
        </div>
      </div>
      <div className="p-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <div className="mb-2 flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-2/3 mt-1" />
      </div>
      <div className="flex items-center justify-between border-t p-4">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

// Skeleton loading component for hackathons
function HackathonCardSkeleton() {
  return (
    <div className="h-full flex flex-col border rounded-lg">
      <div className="relative">
        <Skeleton className="w-full h-48 rounded-t-lg" />
        <Skeleton className="absolute top-2 right-2 h-6 w-16" />
      </div>
      <div className="p-4 pb-2">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <div className="flex flex-wrap gap-1 mt-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
      </div>
      <div className="p-4 pb-2 flex-grow">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3 mb-1" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

type Event = {
  id: string;
  name: string;
  description: string;
  mode: EventMode;
  address: string | null;
  ticket_price: number;
  start_date: Date;
  start_time: Date;
  end_time: Date | null;
  event_type: EventType;
  status: EventStatus;
  poster_url: string;
};

export default function Page() {
  const [activeTab, setActiveTab] = useState("events");

  // Shared filter state
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  // Data fetching
  const { data, isLoading, error } = useSWR<Event[]>("/api/events", fetcher);
  const { data: hackathonData, isLoading: isHackathonsLoading, error: hackathonsError } = useSWR<any>("/api/hackathons", fetcher);

  // Reset filters when switching tabs
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearch("");
    setMode("");
    setType("");
    setStatus("");
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (!data) return [];
    return data.filter((event) => {
      const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase()) || event.description.toLowerCase().includes(search.toLowerCase());
      const matchesMode = mode === "all" || mode === "" ? true : event.mode === mode;
      const matchesType = type === "all" || type === "" ? true : event.event_type === type;
      const matchesStatus = status === "all" || status === "" ? true : event.status === status;
      return matchesSearch && matchesMode && matchesType && matchesStatus;
    });
  }, [data, search, mode, type, status]);

  // Filtered hackathons
  const filteredHackathons = useMemo(() => {
    if (!hackathonData || !hackathonData.hackathons) return [];
    return hackathonData.hackathons.filter((hackathon: any) => {
      const matchesSearch = hackathon.name.toLowerCase().includes(search.toLowerCase()) || (hackathon.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesMode = mode === "all" || mode === "" ? true : hackathon.mode === mode;
      const matchesType = type === "all" || type === "" ? true : hackathon.type === type;
      const matchesStatus = status === "all" || status === "" ? true : hackathon.status === status;
      return matchesSearch && matchesMode && matchesType && matchesStatus;
    });
  }, [hackathonData, search, mode, type, status]);

  return (
    <div>
      <LandingHeader />
      <main className="pt-10 px-2 pb-20">
        <div className="max-w-screen-xl mx-auto">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Explore
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Discover and participate in events and hackathons.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            {/* Tabs + Filters row */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <TabsList>
                  <TabsTrigger value="events" className="gap-1.5">
                    <Calendar className="size-4" />
                    Events
                  </TabsTrigger>
                  <TabsTrigger value="hackathons" className="gap-1.5">
                    <Code className="size-4" />
                    Hackathons
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Common filters panel */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Input
                  placeholder={activeTab === "events" ? "Search events..." : "Search hackathons..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-64"
                />
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="OFFLINE">Offline</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
                {activeTab === "events" && (
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="TECHNICAL">Technical</SelectItem>
                      <SelectItem value="CULTURAL">Cultural</SelectItem>
                      <SelectItem value="SPORTS">Sports</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="UPCOMING">Upcoming</SelectItem>
                    <SelectItem value="ONGOING">Ongoing</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setMode("");
                    setType("");
                    setStatus("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Events tab content */}
            <TabsContent value="events">
              {isLoading || !data ? (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <EventCardSkeleton key={index} />
                  ))}
                </div>
              ) : error ? (
                <div className="flex justify-center items-center h-64 text-lg font-medium text-destructive">
                  Failed to load events data
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredEvents.length === 0 ? (
                    <div className="col-span-full text-center text-muted-foreground py-16">No events found.</div>
                  ) : (
                    filteredEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        id={event.id}
                        name={event.name}
                        description={event.description}
                        poster_url={event.poster_url}
                        address={event.address}
                        start_date={event.start_date}
                        mode={event.mode}
                        price={event.ticket_price}
                      />
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            {/* Hackathons tab content */}
            <TabsContent value="hackathons">
              {isHackathonsLoading || !hackathonData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <HackathonCardSkeleton key={index} />
                  ))}
                </div>
              ) : hackathonsError ? (
                <div className="flex justify-center items-center h-64 text-lg font-medium text-destructive">
                  Failed to load hackathons data
                </div>
              ) : (
                <HackathonList
                  hackathons={filteredHackathons}
                  userRegistrations={hackathonData.userRegistrations || {}}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
