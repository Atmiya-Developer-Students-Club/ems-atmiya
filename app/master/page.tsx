"use client";

import useSWR from "swr";
import { ChartArea } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetcher } from "@/fetcher";
import { useSetAtom } from "jotai";
import { sidebarBreadcrumbs } from "@/store/sidebar";
import { useEffect } from "react";
import { Heading } from "@/components/global/heading/Heading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { KeyMetrics } from "@/components/section/master/overview/KeyMetrics";
import { DistributionCharts } from "@/components/section/master/overview/DistributionCharts";
import { EventCharts } from "@/components/section/master/overview/EventCharts";
import { MonthlyTrendCharts } from "@/components/section/master/overview/MonthlyTrendCharts";
import { RecentActivity } from "@/components/section/master/overview/RecentActivity";
import { useAuth } from "@/contexts/AuthContext";

type MasterOverviewData = {
  totalStudents: number;
  totalPrograms: number;
  avgEventRating: number;
  departmentStats: { name: string; count: number }[];
  programStats: { name: string; count: number }[];
  universityStats: { name: string; count: number }[];
  eventTypeStats: { name: string; count: number }[];
  eventModeStats: { name: string; count: number }[];
  upcomingEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  topEvents: { name: string; current_registration_count: number }[];
  userRegistrationTrend: { month: string; users: number }[];
  eventHackathonTrend: { month: string; events: number; hackathons: number }[];
  recentEvents: {
    id: string;
    name: string;
    start_date: string;
    status: string;
    registration_required: boolean;
    current_registration_count: number;
    event_type: string;
    mode: string;
  }[];
  recentRegistrations: {
    id: string;
    event: { name: string };
    user: { firstName: string; lastName: string };
    createdAt: string;
  }[];
  recentFeedback: {
    id: string;
    rating: number;
    comment: string;
    event: { name: string };
    user: { firstName: string; lastName: string };
    createdAt: string;
  }[];
};

export default function MasterOverview() {
  const { data, error, isLoading } = useSWR<MasterOverviewData>(
    "/api/master/overview",
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );
  const setCurrentBreadcrumbs = useSetAtom(sidebarBreadcrumbs);
  const { user } = useAuth(); // Use auth context instead of direct calls

  useEffect(() => {
    setCurrentBreadcrumbs([{ label: "Dashboard", href: "/master" }]);
  }, [setCurrentBreadcrumbs]);

  if (error) {
    return <div className="p-8">Error loading data: {error.message}</div>;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <Heading
          title={`Welcome Back - ${user?.user_metadata.full_name
              ? user?.user_metadata.full_name
              : "Master"
            }`}
          description="Platform-wide insights and analytics for the entire system."
        />
        <Button className="mb-4">
          <ChartArea className="mr-2 h-4 w-4" /> More Insights
        </Button>
      </div>

      <Separator className="mb-8" />

      {isLoading ? (
        <div className="w-full space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data ? (
        <div className="w-full space-y-8">
          <KeyMetrics data={data} />
          <MonthlyTrendCharts
            userRegistrationTrend={data.userRegistrationTrend}
            eventHackathonTrend={data.eventHackathonTrend}
          />
          <DistributionCharts
            departmentStats={data.departmentStats}
            eventTypeStats={data.eventTypeStats}
          />
          <EventCharts
            upcomingEvents={data.upcomingEvents}
            completedEvents={data.completedEvents}
            cancelledEvents={data.cancelledEvents}
            universityStats={data.universityStats}
          />
          <RecentActivity
            recentEvents={data.recentEvents}
            recentRegistrations={data.recentRegistrations}
            recentFeedback={data.recentFeedback}
          />
        </div>
      ) : null}
    </div>
  );
}
