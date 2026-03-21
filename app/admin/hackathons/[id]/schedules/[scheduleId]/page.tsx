"use client";

import { useSetAtom } from "jotai";
import { sidebarBreadcrumbs } from "@/store/sidebar";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/global/heading/Heading";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  QrCode,
  X,
  Users,
  CheckCircle,
  XCircle,
  MapPin,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";

interface HackathonInfo {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  mode: string;
  status: string;
  location: string;
  teamCount: number;
}

interface AttendanceStats {
  totalMembers: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
  totalTeams: number;
  presentTeams: number;
  absentTeams: number;
}

interface AttendanceSchedule {
  id: string;
  day: number;
  checkInTime: string;
  description: string | null;
  hackathon: HackathonInfo;
}

interface Hackathon {
  id: string;
  name: string;
}

export default function ScheduleAttendance() {
  const setCurrentBreadcrumbs = useSetAtom(sidebarBreadcrumbs);
  const router = useRouter();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [schedule, setSchedule] = useState<AttendanceSchedule | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [processingQr, setProcessingQr] = useState(false);
  const processingRef = useRef(false);
  const scannerRef = useRef<any>(null);
  const scannerDivId = "admin-attendance-qr-scanner";
  const params = useParams<{
    id: string;
    scheduleId: string;
  }>();

  const fetcher = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
  };

  const { data: hackathonData } = useSWR<any>(
    `/api/hackathons/${params.id}`,
    fetcher
  );

  const {
    data: scheduleData,
    error: scheduleError,
    isLoading: scheduleIsLoading,
  } = useSWR<any>(
    `/api/admin/hackathons/attendance-schedule/${params.scheduleId}`,
    fetcher
  );

  useEffect(() => {
    if (hackathonData && hackathonData.hackathon) {
      setHackathon(hackathonData.hackathon);
    }
  }, [hackathonData]);

  useEffect(() => {
    if (scheduleData && scheduleData.attendanceSchedule) {
      setSchedule(scheduleData.attendanceSchedule);
    }
    if (scheduleData && scheduleData.stats) {
      setStats(scheduleData.stats);
    }
  }, [scheduleData]);

  useEffect(() => {
    if (hackathon && schedule) {
      setCurrentBreadcrumbs([
        { label: "Dashboard", href: "/admin" },
        { label: "Hackathons", href: "/admin/hackathons" },
        { label: hackathon.name, href: `/admin/hackathons/${params.id}` },
        {
          label: `Day ${schedule.day} Check-in`,
          href: `/admin/hackathons/${params.id}/schedules/${params.scheduleId}`,
        },
      ]);
    }
  }, [
    setCurrentBreadcrumbs,
    params.id,
    params.scheduleId,
    hackathon,
    schedule,
  ]);

  // QR Scanner Styles
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
    setIsQrScannerOpen(true);
    setIsScanning(true);
  };

  const stopQrScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsQrScannerOpen(false);
  };

  useEffect(() => {
    let styleEl: HTMLStyleElement | null = null;
    if (isQrScannerOpen && !scannerRef.current) {
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
                  if (!processingRef.current) processQrCode(qrData);
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
  }, [isQrScannerOpen]);

  // This function is left empty as per the requirements
  const processQrCode = async (qrData: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      setProcessingQr(true);

      // Parse the QR code data (assuming it contains a user ID)
      let userId;
      let teamId;
      try {
        const userData = JSON.parse(qrData.trim());
        userId = userData.userId;
        teamId = userData.teamId;
      } catch (error) {
        // If not JSON, try using the raw data as userId
        userId = qrData.trim();
      }

      if (!userId) {
        toast.error("Invalid QR code data");
        return;
      }

      if (!teamId) {
        toast.error("Invalid QR code data");
        return;
      }

      if (!params.scheduleId) {
        toast.error("Attendance data not loaded");
        return;
      }

      // Call the attendance API
      const res = await axios.post("/api/hackathons/attendance-single", {
        sheduleId: params.scheduleId,
        studentId: userId,
        teamId: teamId,
      });

      const data = res.data;

      if (data.success) {
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
            <p class="text-sm text-muted-foreground mt-2">${
              data.message || "Participant attendance recorded successfully"
            }</p>
          </div>
        `;
        document.body.appendChild(successOverlay);

        // Remove after animation
        setTimeout(() => {
          successOverlay.classList.add("animate-out", "fade-out");
          setTimeout(() => {
            document.body.removeChild(successOverlay);
          }, 300);
        }, 1500);

        // Refresh the data to update the attendance status
        setTimeout(() => {
          // Use SWR to refresh data instead of refreshing the whole page
          const refreshUrl = `/api/admin/hackathons/attendance-schedule/${params.scheduleId}`;
          fetch(refreshUrl, { method: "GET" })
            .then((response) => response.json())
            .then((refreshedData) => {
              if (refreshedData.success) {
                setSchedule(refreshedData.attendanceSchedule);
                setStats(refreshedData.stats);
              }
            })
            .catch((err) => {
              console.error("Error refreshing data:", err);
            });
        }, 2000);
      } else {
        toast.error(data.message || "Failed to mark attendance");
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      toast.error("An error occurred while processing the QR code");
    } finally {
      // Add a small delay before allowing next scan
      setTimeout(() => {
        processingRef.current = false;
        setProcessingQr(false);
      }, 3000);
    }
  };

  if (scheduleIsLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (scheduleError || !schedule) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">
          Error loading attendance schedule
        </h2>
        <Button onClick={() => router.push(`/admin/hackathons/${params.id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hackathon
        </Button>
      </div>
    );
  }

  const formatCheckInTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "h:mm a");
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push(`/admin/hackathons/${params.id}`)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hackathon
          </Button>
          <Heading
            title={`Day ${schedule.day} Attendance`}
            description={`Mark attendance for ${
              hackathon?.name || "Hackathon"
            }`}
          />
        </div>
      </div>

      <Separator className="mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Schedule Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Day</p>
                  <p className="text-sm text-muted-foreground">
                    Day {schedule.day}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Check-in Time</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCheckInTime(schedule.checkInTime)}
                  </p>
                </div>
              </div>

              {schedule.description && (
                <div>
                  <p className="font-medium">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {schedule.description}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
            <CardDescription>
              Scan team member QR codes to record their attendance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog
              open={isQrScannerOpen}
              onOpenChange={(open) => {
                if (!open) stopQrScanner();
                setIsQrScannerOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={startQrScanner} className="w-full">
                  <QrCode className="mr-2 h-4 w-4" />
                  Start QR Code Scanner
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Scan QR Code</DialogTitle>
                  <DialogDescription>
                    Hold up a team member QR code to mark attendance.
                  </DialogDescription>
                </DialogHeader>
                <div className="qr-scanner-container">
                  <div id={scannerDivId} className="w-full"></div>
                </div>
                <div className="flex justify-center mt-4">
                  <DialogClose asChild>
                    <Button variant="outline" onClick={stopQrScanner}>
                      <X className="mr-2 h-4 w-4" /> Close Scanner
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-primary/10 p-4 rounded-lg flex items-center">
                  <Users className="h-8 w-8 text-muted-foreground mr-3" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Participants
                    </p>
                    <p className="text-2xl font-bold">{stats.totalMembers}</p>
                  </div>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
                  <div>
                    <p className="text-sm text-muted-foreground">Present</p>
                    <p className="text-2xl font-bold">{stats.presentCount}</p>
                  </div>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg flex items-center">
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400 mr-3" />
                  <div>
                    <p className="text-sm text-muted-foreground">Absent</p>
                    <p className="text-2xl font-bold">{stats.absentCount}</p>
                  </div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Attendance</p>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        stats.attendancePercentage >= 75
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : stats.attendancePercentage >= 50
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {stats.attendancePercentage}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className={`h-2.5 rounded-full ${
                        stats.attendancePercentage >= 75
                          ? "bg-green-600"
                          : stats.attendancePercentage >= 50
                          ? "bg-yellow-400"
                          : "bg-red-600"
                      }`}
                      style={{ width: `${stats.attendancePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Teams</p>
                  <p className="text-xl font-bold">{stats.totalTeams}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Teams Present</p>
                  <p className="text-xl font-bold">{stats.presentTeams}</p>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Teams Absent</p>
                  <p className="text-xl font-bold">{stats.absentTeams}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {schedule.hackathon && (
        <div className="mb-8">
          <Heading
            title="Hackathon Overview"
            description="Basic information about the hackathon"
          />
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{schedule.hackathon.name}</CardTitle>
              <CardDescription>
                {schedule.hackathon.location} • {schedule.hackathon.mode}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Date Range</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(schedule.hackathon.start_date),
                        "MMMM d"
                      )}{" "}
                      -
                      {format(
                        new Date(schedule.hackathon.end_date),
                        "MMMM d, yyyy"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {schedule.hackathon.location}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="font-medium">Status</p>
                  <Badge
                    variant={
                      schedule.hackathon.status === "UPCOMING"
                        ? "default"
                        : schedule.hackathon.status === "COMPLETED"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {schedule.hackathon.status.toLowerCase()}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <p className="font-medium">Total Teams</p>
                  <span className="text-sm font-medium bg-primary/10 px-2 py-1 rounded">
                    {schedule.hackathon.teamCount} teams
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
