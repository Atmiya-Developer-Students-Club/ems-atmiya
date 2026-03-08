"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  CalendarIcon,
  MapPinIcon,
  Users,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import { respondToInvitationAction } from "@/components/section/student/hackathons/respondToInvitationAction";
import { toast } from "sonner";
import Link from "next/link";
import { Participation, PendingInvitation, User, EventRegistrationData } from "@/types/hackathon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrCode } from "lucide-react";
import axios from "axios";

interface MyParticipationsProps {
  participations: Participation[];
  pendingInvitations: PendingInvitation[];
  eventRegistrations: EventRegistrationData[];
  studentId: string;
}

export function MyParticipations({
  participations,
  pendingInvitations,
  eventRegistrations,
  studentId,
}: MyParticipationsProps) {
  const [activeTab, setActiveTab] = useState("participations");
  const [isResponding, setIsResponding] = useState(false);
  const [selectedParticipation, setSelectedParticipation] =
    useState<Participation | null>(null);

  // QR Scanner logic (correct placement inside function)
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [processingQr, setProcessingQr] = useState(false);
  const scannerRef = useRef<any>(null);
  const scannerDivId = "student-qr-code-scanner";

  // Add styles for QR scanner
  const qrScannerStyles = `
    .qr-scanner-container { width: 100%; margin: 0 auto; max-height: 70vh; }
    .qr-scanner-container section { width: 100% !important; }
    .qr-scanner-container section div:first-child { margin: 0 auto !important; }
    .qr-scanner-container button { border-radius: 0.375rem; padding: 0.5rem 1rem; font-weight: 500; background-color: hsl(var(--primary) / 0.9); color: hsl(var(--primary-foreground)); margin: 0.25rem; }
    .qr-scanner-container button:hover { background-color: hsl(var(--primary)); }
    .qr-scanner-container select { border-radius: 0.375rem; padding: 0.5rem; margin-bottom: 0.5rem; border: 1px solid hsl(var(--border)); }
    @media (max-width: 640px) { .qr-scanner-container section { padding: 0 !important; } .qr-scanner-container section > div { flex-direction: column !important; } .qr-scanner-container video { max-height: 40vh !important; } .qr-scanner-container button { margin: 0.25rem 0; width: 100%; } }
  `;

  const startQrScanner = () => {
    setQrScannerOpen(true);
    setIsScanning(true);
  };

  const stopQrScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setQrScannerOpen(false);
  };

  useEffect(() => {
    let styleEl: HTMLStyleElement | null = null;
    if (qrScannerOpen && !scannerRef.current) {
      styleEl = document.createElement("style");
      styleEl.innerHTML = qrScannerStyles;
      document.head.appendChild(styleEl);
      import("html5-qrcode")
        .then(({ Html5QrcodeScanner: Scanner }) => {
          setTimeout(() => {
            try {
              const scanner = new Scanner(
                scannerDivId,
                {
                  fps: 10,
                  qrbox: { width: 250, height: 250 },
                  aspectRatio: 1.0,
                  rememberLastUsedCamera: true,
                  showTorchButtonIfSupported: true,
                  videoConstraints: { facingMode: { ideal: "environment" } },
                },
                false
              );
              scanner.render(
                (qrData: string) => {
                  if (!processingQr) processQrCode(qrData);
                },
                (error: any) => {
                  console.log("QR scanning error:", error);
                }
              );
              scannerRef.current = scanner;
            } catch (error) {
              console.error("Error initializing QR scanner:", error);
              stopQrScanner();
            }
          }, 100);
        })
        .catch((error) => {
          console.error("Error loading QR scanner library:", error);
          stopQrScanner();
        });
    }
    return () => {
      if (styleEl) styleEl.remove();
    };
  }, [qrScannerOpen]);

  // Placeholder for QR code processing
  const processQrCode = async (qrData: string) => {
    if (processingQr) return;
    setProcessingQr(true);

    // Expect qrData to be a URL string like "http://localhost:3000/hackathons/random-uuid"
    const data: { id?: string } = {};
    try {
      // Try to extract hackathon id from the URL
      const url = new URL(qrData);
      const paths = url.pathname.split("/");
      // Find the hackathon id (assumes last segment is the id)
      const hackathonId = paths[paths.length - 1];
      if (hackathonId && hackathonId !== "hackathons") {
        data.id = hackathonId;
      }
    } catch (error) {
      // If qrData is not a valid URL, treat as invalid
      console.error("Error parsing QR code data:", error);
      toast.error("Invalid QR code format");
      setProcessingQr(false);
      return;
    }

    if (!data || !data.id) {
      toast.error("Invalid QR code format");
      setProcessingQr(false);
      return;
    }

    try {
      const res = await axios.post("/api/hackathons/attendance", {
        id: studentId,
        teamId: selectedParticipation?.team.id,
        hackathonId: data.id,
      });

      if (!res.data.success) {
        console.error("Error marking attendance:", res.data.error);
        toast.error(res.data.error);
        setProcessingQr(false);
        return;
      } else {
        // Show success animation overlay before toast
        const successOverlay = document.createElement("div");
        successOverlay.className =
          "fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm";
        successOverlay.innerHTML = `
        <div class="bg-background rounded-lg p-6 shadow-lg flex flex-col items-center animate-in zoom-in-90 duration-300">
          <div class="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-lg font-medium">Attendance Marked!</h3>
        </div>
      `;
        document.body.appendChild(successOverlay);
        setTimeout(() => {
          successOverlay.classList.add("animate-out", "fade-out");
          setTimeout(() => {
            document.body.removeChild(successOverlay);
            toast.success("Attendance marked successfully");
            setProcessingQr(false);
            window.location.reload();
          }, 300);
        }, 1000);
        return;
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error("Failed to mark attendance");
      setProcessingQr(false);
      return;
    }
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(dateString);
    const time = new Date(timeString);
    date.setHours(time.getHours(), time.getMinutes());
    return format(date, "PPP 'at' p");
  };

  const handleRespondToInvitation = async (teamId: string, accept: boolean) => {
    setIsResponding(true);
    try {
      const response = await respondToInvitationAction(teamId, accept);
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(
          accept
            ? "You have joined the team!"
            : "You have declined the invitation."
        );
        // Refresh the page after response
        setTimeout(() => {
          window.location.reload();
        }, 0);
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
      toast.error("Failed to respond to invitation");
    } finally {
      setIsResponding(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "UPCOMING":
        return <Badge variant="default">Upcoming</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Hackathon Participations</h1>
        <p className="text-muted-foreground">
          Manage your hackathon teams and view your participation history
        </p>
      </div>

      <Tabs
        defaultValue="participations"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="participations">
            Hackathons ({participations.length})
          </TabsTrigger>
          <TabsTrigger value="events">
            Events ({eventRegistrations.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({pendingInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participations" className="mt-6">
          {participations.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Participations Yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't joined any hackathon teams yet.
                  </p>
                  <Link href="/events">
                    <Button>Browse Hackathons</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {participations.map((participation) => (
                <Card key={participation.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <img
                          src={getImageUrl(
                            participation.hackathon.poster_url,
                            "hackathon-posters"
                          )}
                          alt={participation.hackathon.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div>
                          <CardTitle className="text-xl mb-2">
                            {participation.hackathon.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(participation.hackathon.status)}
                            <Badge variant="outline">
                              {participation.isTeamOwner
                                ? "Team Lead"
                                : "Team Member"}
                            </Badge>
                            {participation.attended && (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Attended
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {participation.hackathon.tags.map((tag, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">
                          Team
                        </p>
                        <p className="font-medium">
                          {participation.team.teamName}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Start Date</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(
                              participation.hackathon.start_date,
                              participation.hackathon.start_time
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">End Date</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(
                              participation.hackathon.end_date,
                              participation.hackathon.end_time
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Mode</p>
                          <p className="text-xs text-muted-foreground">
                            {participation.hackathon.mode}{" "}
                            {participation.hackathon.location &&
                              `- ${participation.hackathon.location}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {participation.team.problemStatement && (
                      <div className="mb-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">
                          Selected Problem Statement
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {participation.team.problemStatement.code}:{" "}
                          {participation.team.problemStatement.title}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link href={`/hackathons/${participation.hackathon.id}`}>
                        <Button variant="outline" size="sm">
                          View Hackathon
                        </Button>
                      </Link>
                      <Link
                        href={`participations/${participation.hackathon.id}/manage`}
                      >
                        <Button size="sm">
                          {participation.isTeamOwner
                            ? "Manage Team"
                            : "View Team"}
                        </Button>
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={
                          isScanning
                            ? stopQrScanner
                            : () => {
                                setSelectedParticipation(participation);
                                startQrScanner();
                              }
                        }
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        {isScanning
                          ? "Stop Scanning"
                          : "Scan Attendance QR Code"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          {eventRegistrations.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="py-8">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Event Registrations
                  </h3>
                  <p className="text-muted-foreground">
                    You haven't registered for any events yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {eventRegistrations.map((registration) => (
                <Card key={registration.id} className="overflow-hidden pt-0">
                  <div className="relative h-48">
                    <img
                      src={getImageUrl(registration.event.poster_url, "event-posters")}
                      alt={registration.event.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Status badge overlay like main EventCard */}
                    <div className="absolute top-2 left-2 z-10">
                      {registration.attended ? (
                        <Badge className="bg-green-600 text-white shadow">Attended</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-white/90 text-black shadow">Registered</Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="mb-2 line-clamp-1 text-xl font-bold">
                      {registration.event.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {registration.event.event_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {registration.event.mode}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>
                          {format(new Date(registration.event.start_date), "PPP")}
                        </span>
                      </div>
                      {registration.event.address && (
                        <div className="flex items-center gap-2">
                          <MapPinIcon className="h-4 w-4" />
                          <span className="line-clamp-1">{registration.event.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {format(new Date(registration.event.start_time), "p")}
                          {registration.event.end_time && 
                            ` - ${format(new Date(registration.event.end_time), "p")}`
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="mt-6">
          {pendingInvitations.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Pending Invitations
                  </h3>
                  <p className="text-muted-foreground">
                    You don't have any pending team invitations.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <Card key={invitation.inviteId}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <img
                          src={getImageUrl(
                            invitation.hackathon.poster_url,
                            "hackathon-posters"
                          )}
                          alt={invitation.hackathon.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div>
                          <CardTitle className="text-lg mb-1">
                            {invitation.hackathon.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(invitation.hackathon.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            You've been invited to join team:{" "}
                            <span className="font-medium">
                              {invitation.team.teamName}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <p>
                          Start:{" "}
                          {format(
                            new Date(invitation.hackathon.start_date),
                            "PPP"
                          )}
                        </p>
                        <p>Mode: {invitation.hackathon.mode}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRespondToInvitation(invitation.team.id, false)
                          }
                          disabled={isResponding}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleRespondToInvitation(invitation.team.id, true)
                          }
                          disabled={isResponding}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* QR Scanner Dialog */}
      <Dialog
        open={qrScannerOpen}
        onOpenChange={(open) => {
          if (!open) stopQrScanner();
          setQrScannerOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold">
              Scan QR Code for Attendance
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Position the QR code within the camera view
            </p>
          </DialogHeader>
          <div className="flex flex-col items-center mt-4">
            <div className="relative w-full">
              <div
                id={scannerDivId}
                className="qr-scanner-container rounded-lg overflow-hidden"
              ></div>
              {processingQr && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 rounded-lg backdrop-blur-sm">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  <p className="text-sm font-medium text-white">
                    Processing...
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 w-full flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground order-2 sm:order-1">
                Scanned QR codes will be processed automatically
              </p>
              <Button
                variant="secondary"
                onClick={stopQrScanner}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Close Scanner
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
