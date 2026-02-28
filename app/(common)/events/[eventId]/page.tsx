"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Clock,
  MapPin,
  Share2,
  Tag,
  Ticket,
  Users,
  Star,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Globe,
  Circle,
  Router,
  LogIn,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { fetcher } from "@/fetcher";
import useSWR from "swr";
import type { Event } from "@prisma/client";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { getImageUrl } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FacebookIcon,
  FacebookShareButton,
  TwitterShareButton,
  TwitterIcon,
  WhatsappShareButton,
  WhatsappIcon,
  LinkedinShareButton,
  LinkedinIcon,
  EmailShareButton,
  EmailIcon,
} from "react-share";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { registerInEventAction } from "@/components/section/events/registerInEventAction";
import { EventFeedbackForm } from "@/components/section/events/EventFeedbackForm";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LandingHeader } from "@/components/global/navigation-bar/LandingHeader";
import { LandingFooter } from "@/components/global/LandingFooter";

type EventWithSpeakers = Event & {
  speakers?: {
    id: string;
    name: string;
    bio?: string | null;
    photo_url?: string | null;
  }[];
} & {
  created_by: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 pt-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-96 w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to Load Event</h3>
          <p className="text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function hasEventEnded(event: EventWithSpeakers): boolean {
  const now = new Date();
  let eventEndDateTime: Date;

  if (event.end_date && event.end_time) {
    // If both end_date and end_time exist, use them
    eventEndDateTime = new Date(event.end_date);
    const endTime = new Date(event.end_time);
    eventEndDateTime.setHours(endTime.getHours(), endTime.getMinutes(), endTime.getSeconds());
  } else if (event.end_date) {
    // If only end_date exists, use end of day
    eventEndDateTime = new Date(event.end_date);
    eventEndDateTime.setHours(23, 59, 59, 999);
  } else if (event.end_time) {
    // If only end_time exists, combine with start_date
    eventEndDateTime = new Date(event.start_date);
    const endTime = new Date(event.end_time);
    eventEndDateTime.setHours(endTime.getHours(), endTime.getMinutes(), endTime.getSeconds());
  } else {
    // If neither exists, use end of start_date
    eventEndDateTime = new Date(event.start_date);
    eventEndDateTime.setHours(23, 59, 59, 999);
  }

  // Allow feedback 30 minutes before event ends
  const feedbackStartTime = new Date(eventEndDateTime.getTime() - 30 * 60 * 1000);

  return now >= feedbackStartTime;
}

function getEventTemporalStatus(event: EventWithSpeakers): 'upcoming' | 'ongoing' | 'ended' {
  const now = new Date();

  const startDateTime = new Date(event.start_date);
  const startTime = new Date(event.start_time);
  startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());

  let endDateTime: Date;
  if (event.end_date && event.end_time) {
    endDateTime = new Date(event.end_date);
    const endTime = new Date(event.end_time);
    endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), endTime.getSeconds());
  } else if (event.end_date) {
    endDateTime = new Date(event.end_date);
    endDateTime.setHours(23, 59, 59, 999);
  } else if (event.end_time) {
    endDateTime = new Date(event.start_date);
    const endTime = new Date(event.end_time);
    endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), endTime.getSeconds());
  } else {
    endDateTime = new Date(event.start_date);
    endDateTime.setHours(23, 59, 59, 999);
  }

  if (now < startDateTime) return 'upcoming';
  if (now > endDateTime) return 'ended';
  return 'ongoing';
}

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const id = params.eventId as string;
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();

  const handleGetTicket = async () => {
    setLoading(true);
    try {
      const response = await registerInEventAction(id);
      if (response.success) {
        toast.success("Successfully registered for the event!");
      } else {
        toast.error(response.error);
        if (response.error == "User not authenticated") {
          router.push("/login");
        }

        if (response.error == "User onboarding not complete") {
          router.push("/onboarding");
        }
      }
      setConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  };
  const {
    data: event,
    error,
    isLoading,
    mutate: mutateEvent,
  } = useSWR<EventWithSpeakers>(`/api/events/${id}`, fetcher);

  const supabase = createClient();

  const handleShare = async () => {
    setOpen((prev) => !prev);
  };

  if (error) {
    const is404 = error?.response?.status === 404 || error?.status === 404;
    return (
      <div>
        <LandingHeader />
        <ErrorState
          message={
            is404
              ? "Event not found. It may have been removed or the link is invalid."
              : "Failed to load event details. Please try again later."
          }
        />
        <LandingFooter />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <LandingHeader />
        <LoadingSkeleton />
        <LandingFooter />
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <LandingHeader />
        <ErrorState message="Event not found. It may have been removed or the link is invalid." />
        <LandingFooter />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode.toLowerCase()) {
      case "online":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "offline":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "hybrid":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Compute registration availability
  const temporalStatus = getEventTemporalStatus(event);
  const registrationStatus = (() => {
    if (event.status.toLowerCase() === 'cancelled') {
      return { available: false, reason: 'This event has been cancelled.' };
    }
    if (event.status.toLowerCase() === 'completed' || temporalStatus === 'ended') {
      return { available: false, reason: 'This event has already ended.' };
    }
    if (!event.registration_required) {
      return { available: false, reason: 'No registration required — open for all!' };
    }
    if (event.registration_limit && event.current_registration_count >= event.registration_limit) {
      return { available: false, reason: 'Registration is full.' };
    }
    if (!user) {
      return { available: false, reason: 'login_required' };
    }
    return { available: true, reason: '' };
  })();

  return (
    <div>
      <LandingHeader />
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60 z-10" />
          <div className="relative h-[70vh] overflow-hidden">
            <Image
              src={getImageUrl(event.poster_url, "event-posters")}
              alt={event.name}
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute inset-0 z-20 flex items-end">
            <div className="container mx-auto px-4 pb-16">
              <div className="max-w-4xl">
                <div className="flex flex-wrap gap-3 mb-6">
                  <Badge
                    className={`${getStatusColor(
                      event.status
                    )} font-medium px-3 py-1`}
                  >
                    {event.status}
                  </Badge>
                  <Badge
                    className={`${getModeColor(
                      event.mode
                    )} font-medium px-3 py-1`}
                  >
                    {event.mode}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-white/20 text-white border-white/30 font-medium px-3 py-1"
                  >
                    {event.event_type}
                  </Badge>
                </div>

                <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                  {event.name}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm opacity-90">Date</p>
                      <p className="font-semibold">
                        {event.end_date
                          ? `${format(
                            new Date(event.start_date),
                            "MMM dd"
                          )} - ${format(
                            new Date(event.end_date),
                            "MMM dd, yyyy"
                          )}`
                          : format(new Date(event.start_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm opacity-90">Time</p>
                      <p className="font-semibold">
                        {event.end_time
                          ? `${format(
                            new Date(event.start_time),
                            "hh:mm a"
                          )} - ${format(new Date(event.end_time), "hh:mm a")}`
                          : format(new Date(event.start_time), "hh:mm a")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm opacity-90">Location</p>
                      <p className="font-semibold">{event.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">
                    About This Event
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-lg leading-relaxed text-muted-foreground">
                    {event.description}
                  </p>

                  {event.key_highlights && event.key_highlights.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        Key Highlights
                      </h3>
                      <ul className="space-y-2">
                        {event.key_highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">
                              {highlight}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {event.note && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">
                        <strong>Note:</strong> {event.note}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="px-3 py-1"
                      >
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Speakers Section */}
              {event.speakers && event.speakers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <Users className="h-6 w-6" />
                      Featured Speakers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {event.speakers.map((speaker) => {
                        const speakerImageUrl = getImageUrl(speaker.photo_url, "event-speakers");

                        return (
                          <div
                            key={speaker.id}
                            className="flex gap-4 p-4 rounded-xl border"
                          >
                            <Avatar className="h-16 w-16">
                              <AvatarImage
                                src={speakerImageUrl}
                                alt={speaker.name}
                              />
                              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                                {speaker.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">
                                {speaker.name}
                              </h4>
                              {speaker.bio && (
                                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                                  {speaker.bio}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Registration & Feedback */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">
                      Registration Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Required</span>
                      <Badge
                        variant={
                          event.registration_required ? "default" : "secondary"
                        }
                      >
                        {event.registration_required ? "Yes" : "No"}
                      </Badge>
                    </div>

                    {event.registration_link && (
                      <Link
                        href={event.registration_link}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Submissions Here
                      </Link>
                    )}

                    {event.registration_limit && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Limit</span>
                        <span className="font-semibold">
                          {event.registration_limit}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Current Registrations
                      </span>
                      <span className="font-semibold">
                        {event.current_registration_count}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">
                      Event Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {event.feedback_form_link && (
                      <Link
                        href={event.feedback_form_link}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Give Feedback
                      </Link>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-semibold">
                        {(event.feedback_score ?? 0).toFixed(1)}
                      </span>
                    </div>

                    {event.recording_link && (
                      <Link
                        href={event.recording_link}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Watch Recording
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Organizer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Event Organizer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Organizer
                        </p>
                        <p className="font-semibold text-lg">
                          {event.organizer_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {event.organizer_contact}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Created by</p>
                        <p className="font-medium">{`${event.created_by.firstName} ${event.created_by.lastName}`}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">
                          {format(new Date(event.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last updated</p>
                        <p className="font-medium">
                          {format(new Date(event.updated_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Event Feedback Form - Only for authenticated, onboarded users and after event has ended */}
              {user && user.app_metadata?.onboarding_complete && event && hasEventEnded(event) && (
                <EventFeedbackForm
                  eventId={id}
                  onSuccess={() => {
                    mutateEvent();
                    toast.success("Feedback submitted successfully!");
                  }}
                />
              )}
            </div>

            {/* Right Column - Ticket Info */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center mb-6">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {event.ticket_price ? `₹${event.ticket_price}` : "Free"}
                      </div>
                      <p className="text-muted-foreground">per ticket</p>
                    </div>

                    <div className="space-y-4 mb-6 flex flex-col gap-0.5">
                      {registrationStatus.available ? (
                        <Button
                          size="lg"
                          className="w-full text-lg font-semibold h-12"
                          onClick={() => setConfirmOpen(true)}
                        >
                          <Ticket className="mr-2 h-5 w-5" />
                          Get Tickets
                        </Button>
                      ) : registrationStatus.reason === 'login_required' ? (
                        <Button
                          size="lg"
                          className="w-full text-lg font-semibold h-12"
                          onClick={() => router.push('/login')}
                        >
                          <LogIn className="mr-2 h-5 w-5" />
                          Login to Register
                        </Button>
                      ) : (
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-sm font-medium text-muted-foreground">
                            {registrationStatus.reason}
                          </p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full h-12 bg-transparent"
                        onClick={handleShare}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Event
                      </Button>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Event Details</h3>

                      <div className="space-y-4 text-sm">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Date</p>
                            <p className="text-muted-foreground">
                              {event.end_date
                                ? `${format(
                                  new Date(event.start_date),
                                  "MMM dd"
                                )} - ${format(
                                  new Date(event.end_date),
                                  "MMM dd, yyyy"
                                )}`
                                : format(
                                  new Date(event.start_date),
                                  "MMM dd, yyyy"
                                )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Time</p>
                            <p className="text-muted-foreground">
                              {event.end_time
                                ? `${format(
                                  new Date(event.start_time),
                                  "hh:mm a"
                                )} - ${format(
                                  new Date(event.end_time),
                                  "hh:mm a"
                                )}`
                                : format(new Date(event.start_time), "hh:mm a")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Location</p>
                            <p className="text-muted-foreground">
                              {event.address}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Globe className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Mode</p>
                            <Badge
                              className={`${getModeColor(event.mode)} text-xs`}
                            >
                              {event.mode}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Organizer</p>
                            <p className="text-muted-foreground">
                              {event.organizer_name}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm m-2 bg-white/30 backdrop-blur-lg border border-white/40 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>Share Event</DialogTitle>
            <DialogDescription>
              Share this event with your friends and colleagues via email or
              social media.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-around mt-4">
            {/* ...existing code for share buttons... */}
            <Tooltip>
              <TooltipTrigger asChild>
                <FacebookShareButton
                  url={window.location.href}
                  hashtag="#atmiyauniversity"
                  content={event.description}
                >
                  <Button variant="outline" size={"icon"}>
                    <FacebookIcon borderRadius={18} />
                  </Button>
                </FacebookShareButton>
              </TooltipTrigger>
              <TooltipContent>Share on Facebook</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TwitterShareButton
                  url={window.location.href}
                  title={event.name}
                  hashtags={["atmiyauniversity"]}
                  content={event.description}
                >
                  <Button variant="outline" size={"icon"}>
                    <TwitterIcon borderRadius={18} />
                  </Button>
                </TwitterShareButton>
              </TooltipTrigger>
              <TooltipContent>Share on Twitter</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <LinkedinShareButton
                  url={window.location.href}
                  title={event.name}
                  summary={event.description}
                  content={event.description}
                >
                  <Button variant="outline" size={"icon"}>
                    <LinkedinIcon borderRadius={18} />
                  </Button>
                </LinkedinShareButton>
              </TooltipTrigger>
              <TooltipContent>Share on LinkedIn</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <EmailShareButton
                  url={window.location.href}
                  subject={event.name}
                  body={event.description}
                  content={event.description}
                >
                  <Button variant="outline" size={"icon"}>
                    <EmailIcon borderRadius={18} />
                  </Button>
                </EmailShareButton>
              </TooltipTrigger>
              <TooltipContent>Share via Email</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <WhatsappShareButton
                  url={window.location.href}
                  title={event.name}
                  content={event.description}
                >
                  <Button variant="outline" size={"icon"}>
                    <WhatsappIcon borderRadius={18} />
                  </Button>
                </WhatsappShareButton>
              </TooltipTrigger>
              <TooltipContent>Share via Whatsapp</TooltipContent>
            </Tooltip>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Get Ticket Dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={loading ? undefined : setConfirmOpen}
      >
        <DialogContent className="max-w-sm m-2 bg-white/30 backdrop-blur-lg border border-white/40 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>Confirm Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to get a ticket for this event?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleGetTicket} disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Circle className="animate-spin h-4 w-4 text-white" />
                  Processing...
                </span>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <LandingFooter />
    </div>
  );
}
