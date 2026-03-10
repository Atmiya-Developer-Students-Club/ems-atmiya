"use client";

import useSWR from "swr";
import { useParams } from "next/navigation";
import HackathonDetail, { HackathonDetailProps } from "@/components/section/student/hackathons/HackathonDetail";
import { HackathonTeam } from "@/types/hackathon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { LandingHeader } from "@/components/global/navigation-bar/LandingHeader";
import { LandingFooter } from "@/components/global/LandingFooter";

export default function HackathonDetailPage() {
  const params = useParams();
  type HackathonData = {
    hackathon: HackathonDetailProps["hackathon"];
    userTeam?: HackathonTeam;
    pendingInvites?: { teamId: string; teamName: string }[];
  };
  const { user: authUser, loading: authLoading } = useAuth();

  // Fetch hackathon data
  const {
    data: hackathonData,
    error: hackathonError,
    isLoading: hackathonLoading,
    mutate: mutateHackathon,
  } = useSWR<HackathonData>(`/api/hackathons/${params.id}`, async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) {
        // next/navigation notFound() can't be called here, so handle below
        throw Object.assign(new Error("Not found"), { status: 404 });
      }
      throw new Error("Failed to fetch hackathon details");
    }
    return res.json();
  });

  // Fetch user data only if authenticated
  const {
    data: currentUser,
    error: userError,
    isLoading: userLoading,
  } = useSWR(
    authUser ? `/api/student/${authUser.id}` : null,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch user data");
      const data = await res.json();
      return data.user;
    }
  );

  // Loading state
  if (hackathonLoading || authLoading || (authUser && userLoading)) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="w-full h-64" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (hackathonError) {
    if (hackathonError.status === 404) {
      // Not found error
      return (
        <div className="container mx-auto py-8 px-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-red-700">Hackathon not found.</p>
            <button
              className="mt-2 text-red-600 underline"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">
            Failed to load hackathon details. Please try again later.
          </p>
          <button
            className="mt-2 text-red-600 underline"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!hackathonData) return null;

  return (
    <div>
      <LandingHeader />
      <HackathonDetail
        isTeamOwner={hackathonData.userTeam?.leaderId == currentUser?.id}
        hackathon={hackathonData.hackathon}
        currentUser={currentUser}
        userTeam={hackathonData.userTeam || null}
        pendingInvites={hackathonData.pendingInvites || []}
        mutate={mutateHackathon}
      />
      <LandingFooter />
    </div>
  );
}
