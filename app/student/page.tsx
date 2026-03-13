"use client";

import useSWR from "swr";
import { sidebarBreadcrumbs } from "@/store/sidebar";
import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetcher } from "@/fetcher";
import { Heading } from "@/components/global/heading/Heading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StudentKeyMetrics } from "@/components/section/student/overview/KeyMetrics";
import { StudentRecentActivity } from "@/components/section/student/overview/RecentActivity";
import { StudentCompletedEvents } from "@/components/section/student/overview/CompletedEvents";
import { Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

interface Event {
  event: {
    id: string;
    name: string;
    start_date: string;
    end_date?: string;
    event_type: string;
    mode: string;
  };
}
interface Feedback {
  id: string;
  rating: number;
  comment: string;
  event: { name: string };
  createdAt: string;
}

type StudentOverviewData = {
  student: {
    firstName: string;
    lastName: string;
    department?: string;
    program?: string;
    currentSemester?: number;
    currentYear?: number;
  };
  totalEventsAttended: number;
  feedbackGiven: number;
  upcomingEvents: Event[];
  completedEvents: Event[];
  recentFeedback: Feedback[];
};

export default function StudentDashboard() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR<StudentOverviewData>(
    "/api/student/overview",
    fetcher,
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );
  const setCurrentBreadcrumbs = useSetAtom(sidebarBreadcrumbs);

  useEffect(() => {
    setCurrentBreadcrumbs([{ label: "Dashboard", href: "/student" }]);
  }, [setCurrentBreadcrumbs]);

  if (error) {
    return <div className="p-8">Error loading data</div>;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <Heading
          title={`Welcome Back - ${data?.student
              ? `${data.student.firstName} ${data.student.lastName}`
              : "Student"
            }`}
          description={
            data?.student?.department && data?.student?.program
              ? `${data.student.department} • ${data.student.program}`
              : "Your personalized dashboard overview."
          }
        />
        <Button className="mb-4" onClick={() => router.push("/events")}>
          <Calendar className="mr-2 h-4 w-4" /> Events
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
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data ? (
        <div className="w-full space-y-8">
          <StudentKeyMetrics
            data={{
              totalEventsAttended: data.totalEventsAttended,
              feedbackGiven: data.feedbackGiven,
              upcomingEvents: data.upcomingEvents.length,
              department: data.student.department,
              program: data.student.program,
              currentSemester: data.student.currentSemester,
              currentYear: data.student.currentYear,
            }}
          />
          <StudentRecentActivity
            upcomingEvents={data.upcomingEvents}
            completedEvents={data.completedEvents}
            recentFeedback={data.recentFeedback}
          />
          <StudentCompletedEvents completedEvents={data.completedEvents} />
        </div>
      ) : null}
    </div>
  );
}
