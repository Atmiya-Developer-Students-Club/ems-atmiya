"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, formatDate } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, Download, FileDown, Loader2, QrCode, Search, X, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import useSWR from "swr";
import { fetcher } from "@/fetcher";
import axios from "axios";
import { pdf } from '@react-pdf/renderer';
import AttendanceExportPDF from "@/components/export/AttendanceExportPDF";
import { saveAs } from 'file-saver';

interface TeamMember {
  id: string;
  studentId: string; student: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
    department?: {
      name: string;
    };
  };
  attendanceRecords: {
    id: string;
    isPresent: boolean;
    checkedInAt: string;
    checkedInByUser: {
      firstName: string;
      lastName: string;
    };
  }[];
}

interface Team {
  id: string;
  teamName: string;
  teamId: string;
  leaderId: string | null;
  members: TeamMember[];
}

interface AttendanceScheduleData {
  id: string;
  day: number;
  checkInTime: string;
  description: string | null;
  hackathon: {
    id: string;
    name: string;
    start_date: string;
    teams: Team[];
  };
  attendanceRecords: any[];
}

interface Stats {
  totalMembers: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
  totalTeams: number;
  presentTeams: number;
  absentTeams: number;
}

interface AttendanceDetailsProps {
  scheduleId: string;
  scheduleInfo: any;
}

export default function AttendanceDetails({ scheduleId }: AttendanceDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<AttendanceScheduleData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [exportLoading, setExportLoading] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [processingQr, setProcessingQr] = useState(false);
  const processingRef = useRef(false);
  const scannerRef = useRef<any>(null);
  const scannerDivId = "html5-qr-code-scanner";
  const router = useRouter();

  // QR scanner styles
  const qrScannerStyles = `
    .qr-scanner-container {
      width: 100%;
      margin: 0 auto;
      max-height: 70vh;
    }
    .qr-scanner-container section {
      width: 100% !important;
    }
    .qr-scanner-container section div:first-child {
      margin: 0 auto !important;
    }
    .qr-scanner-container button {
      border-radius: 0.375rem;
      padding: 0.5rem 1rem;
      font-weight: 500;
      background-color: hsl(var(--primary) / 0.9);
      color: hsl(var(--primary-foreground));
      margin: 0.25rem;
    }
    .qr-scanner-container button:hover {
      background-color: hsl(var(--primary));
    }
    .qr-scanner-container select {
      border-radius: 0.375rem;
      padding: 0.5rem;
      margin-bottom: 0.5rem;
      border: 1px solid hsl(var(--border));
    }
    /* Mobile optimizations */
    @media (max-width: 640px) {
      .qr-scanner-container section {
        padding: 0 !important;
      }
      .qr-scanner-container section > div {
        flex-direction: column !important;
      }
      .qr-scanner-container video {
        max-height: 40vh !important;
      }
      .qr-scanner-container button {
        margin: 0.25rem 0;
        width: 100%;
      }
    }
  `;

  // QR scanner functions
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

      if (!attendanceData) {
        toast.error("Attendance data not loaded");
        return;
      }

      // Call the attendance API
      const res = await axios.post("/api/hackathons/attendance-single", {
        sheduleId: attendanceData.id,
        studentId: userId,
        teamId: teamId,
      });

      const data = res.data;

      if (data.success) {
        // Show success animation overlay before toast
        const successOverlay = document.createElement('div');
        successOverlay.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm';
        successOverlay.innerHTML = `
          <div class="bg-background rounded-lg p-6 shadow-lg flex flex-col items-center animate-in zoom-in-90 duration-300">
            <div class="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 class="text-lg font-medium">Attendance Marked!</h3>
            <p class="text-sm text-muted-foreground mt-2">${data.message || 'Participant attendance recorded successfully'}</p>
          </div>
        `;
        document.body.appendChild(successOverlay);

        // Remove after animation
        setTimeout(() => {
          successOverlay.classList.add('animate-out', 'fade-out');
          setTimeout(() => {
            document.body.removeChild(successOverlay);
          }, 300);
        }, 1500);

        // Refresh the data to update the attendance status
        setTimeout(() => {
          // Use SWR to refresh data instead of refreshing the whole page
          const refreshUrl = `/api/hackathons/attendance-details/${scheduleId}`;
          fetch(refreshUrl, { method: 'GET' })
            .then(response => response.json())
            .then(refreshedData => {
              if (refreshedData.success) {
                setAttendanceData(refreshedData.attendanceSchedule);
                setStats(refreshedData.stats);
              }
            })
            .catch(err => {
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

  interface AttendanceDetailsResponse {
    success: boolean;
    attendanceSchedule: AttendanceScheduleData;
    stats: Stats;
    error?: string;
  }

  const { data, error, isLoading } = useSWR<AttendanceDetailsResponse>(
    `/api/hackathons/attendance-details/${scheduleId}`,
    fetcher
  );

  useEffect(() => {
    if (data) {
      if (data.success) {
        setAttendanceData(data.attendanceSchedule);
        setStats(data.stats);
      } else {
        toast.error(data.error || "Failed to load attendance data");
      }
    }
    if (error) {
      console.error("Error fetching attendance data:", error);
      toast.error("Something went wrong while fetching attendance data");
    }
    setLoading(isLoading);
  }, [data, error, isLoading]);


  const handleExport = async (format: 'pdf') => {
    if (!attendanceData || !stats) return;

    setExportLoading(true);

    try {      // Sort teams by teamId and format data for PDF export
      const sortedTeams = [...attendanceData.hackathon.teams].sort((a, b) => 
        (a.teamId || "").localeCompare(b.teamId || "")
      );

      const exportData = sortedTeams.flatMap(team => {
        // Sort members so team leader comes first
        const sortedMembers = [...team.members].sort((a, b) => {
          const aIsLeader = team.leaderId === a.student.id ? 0 : 1;
          const bIsLeader = team.leaderId === b.student.id ? 0 : 1;
          return aIsLeader - bIsLeader;
        });

        return sortedMembers.map(member => {
          const attendanceRecord = member.attendanceRecords[0];
          const isTeamLeader = team.leaderId === member.student.id;
          
          return {
            teamName: team.teamName,
            teamId: team.teamId || "-",
            studentName: `${member.student.user.firstName} ${member.student.user.lastName}`,
            phoneNumber: member.student.user.phone || "-",
            email: member.student.user.email,
            status: attendanceRecord?.isPresent ? "Present" : "Absent",
            checkInTime: attendanceRecord?.isPresent
              ? formatDate(new Date(attendanceRecord.checkedInAt), "PPp")
              : undefined,
            checkedBy: attendanceRecord?.isPresent
              ? `${attendanceRecord.checkedInByUser.firstName} ${attendanceRecord.checkedInByUser.lastName}`
              : undefined,
            isTeamLeader: isTeamLeader
          };
        });
      });

      const filename = `attendance_${attendanceData.hackathon.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_day${attendanceData.day}_${new Date().toISOString().split('T')[0]}`;

      // PDF Export
      const pdfData = {
        hackathon: {
          name: attendanceData.hackathon.name,
          start_date: attendanceData.hackathon.start_date,
        },
        schedule: {
          day: attendanceData.day,
          checkInTime: attendanceData.checkInTime,
          description: attendanceData.description || undefined,
        },
        stats: stats,        attendanceList: exportData.map(row => ({
          teamName: row.teamName,
          teamId: row.teamId,
          studentName: row.studentName,
          phoneNumber: row.phoneNumber,
          email: row.email,
          status: row.status as 'Present' | 'Absent',
          checkInTime: row.checkInTime,
          checkedBy: row.checkedBy,
          isTeamLeader: row.isTeamLeader,
        }))
      };

      const pdfBlob = await pdf(<AttendanceExportPDF data={pdfData} />).toBlob();
      saveAs(pdfBlob, `${filename}.pdf`);
      toast.success("Attendance data exported to PDF successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export attendance data");
    } finally {
      setExportLoading(false);
    }
  };

  // Filter and search functions
  const getFilteredMembers = () => {
    if (!attendanceData) return [];

    const filteredMembers: { team: Team; member: TeamMember }[] = [];

    attendanceData.hackathon.teams.forEach(team => {
      if (teamFilter === "all" || team.id === teamFilter) {
        team.members.forEach(member => {
          const attendanceRecord = member.attendanceRecords[0];
          const status = attendanceRecord?.isPresent ? "present" : "absent";

          if (statusFilter === "all" || statusFilter === status) {
            // Check if matches search query
            const fullName = `${member.student.user.firstName} ${member.student.user.lastName}`.toLowerCase();
            const email = member.student.user.email.toLowerCase();
            const teamName = team.teamName.toLowerCase();
            const query = searchQuery.toLowerCase();

            if (
              query === "" ||
              fullName.includes(query) ||
              email.includes(query) ||
              teamName.includes(query)
            ) {
              filteredMembers.push({ team, member });
            }
          }
        });
      }
    });

    return filteredMembers;
  };

  const renderScheduleDate = () => {
    if (!attendanceData) return "";

    const scheduleDate = addDays(
      new Date(attendanceData.hackathon.start_date),
      attendanceData.day - 1
    );

    return format(scheduleDate, "EEEE, MMMM d, yyyy");
  };

  // Initialize QR scanner when dialog opens
  useEffect(() => {
    let styleEl: HTMLStyleElement | null = null;

    if (qrScannerOpen && !scannerRef.current) {
      // Add custom styles for the QR scanner
      styleEl = document.createElement('style');
      styleEl.innerHTML = qrScannerStyles;
      document.head.appendChild(styleEl);

      // Dynamically import the HTML5QrCode library
      import('html5-qrcode').then(({ Html5QrcodeScanner: Scanner }) => {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          try {
            const scanner = new Scanner(
              scannerDivId,
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1,
                formatsToSupport: [0], // QR_CODE only
              },
              /* verbose= */ false
            );

            scanner.render(
              // Success callback
              (qrMessage: string) => {
                if (!processingRef.current) processQrCode(qrMessage);
              },
              // Error callback
              (errorMessage: string) => {
                // This is called continuously when scanning is ongoing, so we don't want to show errors
                console.debug("QR error:", errorMessage);
              }
            );

            scannerRef.current = scanner;
          } catch (error) {
            console.error("Error initializing QR scanner:", error);
            toast.error("Failed to initialize QR scanner");
            stopQrScanner();
          }
        }, 100);
      }).catch(error => {
        console.error("Error loading QR scanner library:", error);
        toast.error("Failed to load QR scanner library");
        stopQrScanner();
      });
    }

    return () => {
      // Clean up style element on unmount
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, [qrScannerOpen]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p>Loading attendance details...</p>
      </div>
    );
  }

  if (!attendanceData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-destructive">Failed to load attendance data</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.back()}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const filteredMembers = getFilteredMembers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance Details</h1>
          <p className="text-muted-foreground">
            {attendanceData.hackathon.name} - Day {attendanceData.day} ({renderScheduleDate()})
          </p>
          <p className="text-sm">
            Schedule: {format(new Date(attendanceData.checkInTime), "h:mm a")}
            {attendanceData.description && ` - ${attendanceData.description}`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant={isScanning ? "destructive" : "default"}
            onClick={isScanning ? stopQrScanner : startQrScanner}
            className="w-full sm:w-auto"
          >
            <QrCode className="mr-2 h-4 w-4" />
            {isScanning ? "Stop Scanner" : "Scan Attendance"}
          </Button>

          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Hackathon
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
            <p className="text-sm text-muted-foreground">Total Participants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats?.presentCount || 0}</div>
            <p className="text-sm text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats?.absentCount || 0}</div>
            <p className="text-sm text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats?.attendancePercentage || 0}%</div>
              <Progress value={stats?.attendancePercentage || 0} className="h-2 w-20" />
            </div>
            <p className="text-sm text-muted-foreground">Attendance Rate</p>
          </CardContent>
        </Card>
      </div>      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <CardTitle>Attendance List</CardTitle>
              <CardDescription>
                View and filter attendance records for this schedule
              </CardDescription>
            </div>            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or enrollment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={teamFilter}
                onValueChange={setTeamFilter}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {attendanceData.hackathon.teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Attendance Table */}
          <div className="border rounded-md max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="hidden lg:table-cell">Department</TableHead>
                  <TableHead className="hidden md:table-cell">Check-in Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map(({ team, member }) => {
                    const attendanceRecord = member.attendanceRecords[0];
                    const isPresent = attendanceRecord?.isPresent || false;

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Badge variant={isPresent ? "default" : "destructive"}>
                            {isPresent ? "Present" : "Absent"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {member.student.user.firstName} {member.student.user.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground lg:hidden">
                            {member.student.department?.name || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{team.teamName}</span>
                          <div className="text-xs text-muted-foreground">
                            ID: {team.teamId || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {member.student.department?.name || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {isPresent ? (
                            <div>
                              <div>{format(new Date(attendanceRecord.checkedInAt), "h:mm a")}</div>
                              <div className="text-xs text-muted-foreground">
                                by {attendanceRecord.checkedInByUser.firstName} {attendanceRecord.checkedInByUser.lastName}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No records match your search criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>        <CardFooter className="flex justify-between border-t p-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredMembers.length} of {stats?.totalMembers || 0} participants
          </div>
        </CardFooter>
      </Card>
      {/* QR Scanner Dialog */}
      <Dialog open={qrScannerOpen} onOpenChange={setQrScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Attendance QR Code</DialogTitle>
          </DialogHeader>
          <div className="qr-scanner-container">
            <div id={scannerDivId}></div>
          </div>
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={stopQrScanner}
            >
              Close Scanner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
