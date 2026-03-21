"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addDays, differenceInDays } from "date-fns";
import {
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  Users,
  Edit,
  Download,
  FileSpreadsheet,
  Award,
  FileText,
  ChevronDown,
  DoorClosed,
  DoorOpen,
  Captions,
  CaptionsOff,
  QrCode,
  List,
  Plus,
  Trash2,
  Loader2,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  exportToCSV,
  exportToXLSX,
  exportToPDF,
  formatTeamData,
  ExportData
} from "@/utils/functions/exportUtils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toggleHackathonRegistration } from "./hackathonRegistrationTogglerAction";
import { toggleHackathonSubmission } from "./hackathonSubmissionsTogglerAction";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AttendanceSchedule } from "@/types/attendance";

interface ProblemStatement {
  id: string;
  code: string;
  title: string;
  description: string;
}

interface Rule {
  id: string;
  rule: string;
}

interface TeamMember {
  id: string;
  studentId: string;
  student: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    department: {
      name: string;
    };
    enrollment: string;
    university?: string; // <-- add university field if available
  };
  attended: boolean;
  qrCode?: string;
  qrCodeData?: string;
}

interface HackathonTeam {
  id: string;
  teamName: string;
  teamId: string | null;
  mentor?: string | null;
  mentor_mail?: string | null;
  disqualified: boolean;
  submissionUrl?: string | null;
  leaderId?: string | null;
  members: TeamMember[];
  problemStatement?: {
    id: string;
    code: string;
    title: string;
  };
}

// Remove interface as it will come from hackathon type

import { z } from "zod";

export interface MasterHackathonDetailProps {
  hackathon: {
    id: string;
    name: string;
    description: string;
    poster_url: string;
    location: string;
    mode: "ONLINE" | "OFFLINE";
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    registration_start_date: string;
    registration_end_date: string;
    registration_limit: number | null;
    status: "UPCOMING" | "COMPLETED" | "CANCELLED" | "OTHER";
    team_size_limit: number | null;
    tags: string[];
    organizer_name: string;
    organizer_contact: string | null;
    evaluationCriteria: string[];
    open_submissions: boolean;
    open_registrations: boolean;
    rules: Rule[];
    problemStatements: ProblemStatement[];
    created_at: string;
    teams: HackathonTeam[];
    qrCode?: string;
    qrCodeData?: string;
    attendanceSchedules: AttendanceSchedule[];
  };
  onTeamClick?: (team: HackathonTeam) => void;
  onEditTeamClick?: (team: HackathonTeam) => void;
  onDeleteTeam?: (team: HackathonTeam) => void;
  onMutate?: () => void;
}

// Schema for attendance schedule form
const attendanceScheduleSchema = z.object({
  day: z.coerce.number().min(1, "Day must be at least 1"),
  checkInTime: z.string().min(1, "Check-in time is required"),
  description: z.string().optional(),
});

type AttendanceScheduleFormValues = z.infer<typeof attendanceScheduleSchema>;

export default function MasterHackathonDetail({
  hackathon,
  onTeamClick,
  onEditTeamClick,
  onDeleteTeam,
  onMutate,
}: MasterHackathonDetailProps) {
  const [universityFilter, setUniversityFilter] = useState<"ALL" | "ATMIYA" | "OTHER">("ALL");
  const [activeTab, setActiveTab] = useState("details");
  const [teamStatusFilter, setTeamStatusFilter] = useState<'ALL' | 'QUALIFIED' | 'DISQUALIFIED'>('ALL');
  const [teamsPage, setTeamsPage] = useState(1);
  const teamsPerPage = 10;
  const [isExporting, setIsExporting] = useState(false);
  const [teamSearch, setTeamSearch] = useState(""); // <-- search state
  const [teamIdSearch, setTeamIdSearch] = useState("");
  const [mentorSearch, setMentorSearch] = useState("");
  const [problemStatementFilter, setProblemStatementFilter] = useState("ALL");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [processingQr, setProcessingQr] = useState(false);
  const processingRef = useRef(false);
  const [selectedScanScheduleId, setSelectedScanScheduleId] = useState<string | null>(null);
  const [selectedQrScheduleId, setSelectedQrScheduleId] = useState<string | null>(null);
  const [generatedQrBase64, setGeneratedQrBase64] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerDivId = "html5-qr-code-scanner";
  const router = useRouter();

  // Form for managing attendance schedules
  const attendanceForm = useForm<AttendanceScheduleFormValues>({
    resolver: zodResolver(attendanceScheduleSchema),
    defaultValues: {
      day: 1,
      checkInTime: '',
      description: '',
    },
  });

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(dateString);
    const time = new Date(timeString);
    date.setHours(time.getHours(), time.getMinutes());
    return format(date, "PPP 'at' p");
  };

  const editHackathon = () => {
    router.push(`/master/hackathons/edit/${hackathon.id}`);
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf' | 'signature-sheet') => {
    if (!hackathon.teams || hackathon.teams.length === 0) {
      toast.error("No team data available to export");
      return;
    }

    setIsExporting(true);

    try {
      // Separate teams
      const nonDisqTeams = hackathon.teams.filter(t => !t.disqualified);
      const disqTeams = hackathon.teams.filter(t => t.disqualified);
      const formattedNonDisq = formatTeamData(nonDisqTeams as unknown as Record<string, unknown>[]);
      const formattedDisq = formatTeamData(disqTeams as unknown as Record<string, unknown>[]);

      const filename = `${hackathon.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_teams_${new Date().toISOString().split('T')[0]}`;

      switch (format) {
        case 'csv': {
          // Export non-disqualified teams
          await exportToCSV({ teams: formattedNonDisq }, filename, 'teams');
          // Export disqualified teams if any
          if (formattedDisq.length > 0) {
            await exportToCSV({ teams: formattedDisq }, filename + '_disqualified', 'teams');
            toast.success("Exported: main teams + disqualified teams CSV");
          } else {
            toast.success("Team data exported to CSV successfully!");
          }
          break;
        }
        case 'xlsx': {
          // Export three sheets: Teams, Team Members, Disqualified Teams
          const ExportXLSXWithDisqAndMembers = async () => {
            try {
              const xlsxImport = await import('xlsx');
              const XLSX = xlsxImport.default || xlsxImport;
              if (!XLSX || !XLSX.utils) {
                throw new Error('XLSX import failed or missing utils');
              }
              const workbook = XLSX.utils.book_new();
              // 1. Team overview (non-disqualified)
              const teamOverview = formattedNonDisq.map(team => ({
                'Team ID': team.teamId,
                'Team Name': team.teamName,
                'Problem Code': team.problemCode,
                'Problem Statement': team.problemStatement,
                'Member Count': team.memberCount,
                'Has Submission': team.hasSubmission,
                'Submission URL': team.submissionUrl
              }));
              const teamWs = XLSX.utils.json_to_sheet(teamOverview);
              XLSX.utils.book_append_sheet(workbook, teamWs, 'Teams');

              // 2. Team member-wise data (non-disqualified)
              const memberDetails: {
                'Team ID': string | null;
                'Team Name': string;
                'Member Name': string;
                'Email': string;
                'Phone Number': string;
                'Role': string;
                'University': string;
                'Attended': string;
              }[] = [];
              formattedNonDisq.forEach(team => {
                if (team.members && team.members.length > 0) {
                  team.members.forEach(member => {
                    memberDetails.push({
                      'Team ID': team.teamId,
                      'Team Name': team.teamName,
                      'Member Name': member.name,
                      'Email': member.email || 'N/A',
                      'Phone Number': member.phoneNumber || 'N/A',
                      'Role': member.isTeamAdmin ? 'Team Leader' : 'Member',
                      'University': member.university || 'N/A',
                      'Attended': member.attended ? 'Yes' : 'No'
                    });
                  });
                }
              });
              const memberWs = XLSX.utils.json_to_sheet(memberDetails);
              XLSX.utils.book_append_sheet(workbook, memberWs, 'Team Members');

              // 3. Disqualified teams
              if (formattedDisq.length > 0) {
                const disqOverview = formattedDisq.map(team => ({
                  'Team ID': team.teamId,
                  'Team Name': team.teamName,
                  'Problem Code': team.problemCode,
                  'Problem Statement': team.problemStatement,
                  'Member Count': team.memberCount,
                  'Has Submission': team.hasSubmission,
                  'Submission URL': team.submissionUrl
                }));
                const disqWs = XLSX.utils.json_to_sheet(disqOverview);
                XLSX.utils.book_append_sheet(workbook, disqWs, 'Disqualified Teams');

                // 4. Disqualified team member-wise data
                const disqMemberDetails: {
                  'Team ID': string | null;
                  'Team Name': string;
                  'Member Name': string;
                  'Email': string;
                  'Phone Number': string;
                  'Role': string;
                  'University': string;
                  'Attended': string;
                }[] = [];
                formattedDisq.forEach(team => {
                  if (team.members && team.members.length > 0) {
                    team.members.forEach(member => {
                      disqMemberDetails.push({
                        'Team ID': team.teamId,
                        'Team Name': team.teamName,
                        'Member Name': member.name,
                        'Email': member.email || 'N/A',
                        'Phone Number': member.phoneNumber || 'N/A',
                        'Role': member.isTeamAdmin ? 'Team Leader' : 'Member',
                        'University': member.university || 'N/A',
                        'Attended': member.attended ? 'Yes' : 'No'
                      });
                    });
                  }
                });
                const disqMemberWs = XLSX.utils.json_to_sheet(disqMemberDetails);
                XLSX.utils.book_append_sheet(workbook, disqMemberWs, 'Disqualified Team Members');
              }
              XLSX.writeFile(workbook, `${filename}.xlsx`);
            } catch (err) {
              console.error('ExportXLSXWithDisqAndMembers error:', err);
              toast.error('Failed to export Excel: ' + (err instanceof Error ? err.message : 'Unknown error'));
              throw err;
            }
          };
          await ExportXLSXWithDisqAndMembers();
          toast.success("Team data exported to Excel (Teams, Team Members, Disqualified Teams)!");
          break;
        }
        case 'pdf':
          // Only non-disqualified teams in PDF
          await exportToPDF({ teams: formattedNonDisq }, filename, 'teams', hackathon.name);
          toast.success("Team data exported to PDF successfully!");
          break;
        case 'signature-sheet':
          await exportToPDF({ teams: formattedNonDisq }, filename, 'signature-sheet', hackathon.name);
          toast.success("Team data exported to Signature Sheet successfully!");
          break;
        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export team data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
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

  const handleToggleRegistrations = async () => {
    const res = await toggleHackathonRegistration(hackathon.id);
    if (res.success) {
      toast.success(res.message);
      onMutate?.();
    } else {
      toast.error(res.message);
    }
  }

  const handleToggleSubmissions = async () => {
    const res = await toggleHackathonSubmission(hackathon.id);
    if (res.success) {
      toast.success(res.message);
      onMutate?.();
    } else {
      toast.error(res.message);
    }
  }

  // Add QR scanner styles
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
    if (!selectedScanScheduleId) {
      toast.error("Please select an attendance schedule first");
      return;
    }
    setIsScanning(true);
  };

  const stopQrScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }

    setIsScanning(false);
    setQrScannerOpen(false);
    setSelectedScanScheduleId(null);
  };

  // Initialize QR scanner when scanning starts (after schedule is selected)
  useEffect(() => {
    let styleEl: HTMLStyleElement | null = null;

    if (isScanning && !scannerRef.current) {
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
  }, [isScanning]);

  const processQrCode = async (qrData: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      setProcessingQr(true);

      // Parse the QR code data
      let userId;
      let teamId;
      try {
        const userData = JSON.parse(qrData.trim());
        userId = userData.userId;
        teamId = userData.teamId;
      } catch (error) {
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

      if (!selectedScanScheduleId) {
        toast.error("No attendance schedule selected");
        return;
      }

      // Call the schedule-aware attendance API
      const response = await fetch(`/api/hackathons/attendance-single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sheduleId: selectedScanScheduleId, studentId: userId, teamId }),
      });

      const data = await response.json();

      if (data.success) {
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

        setTimeout(() => {
          successOverlay.classList.add('animate-out', 'fade-out');
          setTimeout(() => {
            document.body.removeChild(successOverlay);
          }, 300);
        }, 1500);

        setTimeout(() => {
          router.refresh();
        }, 2000);
      } else {
        toast.error(data.message || data.error || "Failed to mark attendance");
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      toast.error("An error occurred while processing the QR code");
    } finally {
      setTimeout(() => {
        processingRef.current = false;
        setProcessingQr(false);
      }, 3000);
    }
  };

  const handleOpenQrDialog = () => {
    setSelectedQrScheduleId(null);
    setGeneratedQrBase64(null);
    setQrDialogOpen(true);
  };

  const handleGenerateScheduleQr = async () => {
    if (!selectedQrScheduleId) {
      toast.error("Please select an attendance schedule");
      return;
    }
    setGeneratingQr(true);
    try {
      const QRCodeLib = (await import('qrcode')).default;
      const payload = JSON.stringify({
        type: "hackathon-attendance",
        hackathonId: hackathon.id,
        scheduleId: selectedQrScheduleId,
      });
      const dataUrl = await QRCodeLib.toDataURL(payload, { width: 300, margin: 1 });
      setGeneratedQrBase64(dataUrl);
    } catch (error) {
      console.error("Error generating schedule QR:", error);
      toast.error("Failed to generate QR code");
    } finally {
      setGeneratingQr(false);
    }
  };


  // In the component function, add this function to handle attendance schedule form submission
  const onAttendanceSubmit = async (values: AttendanceScheduleFormValues) => {
    setAttendanceLoading(true);

    try {
      // Format the date-time properly
      const checkInDateTime = new Date(values.checkInTime);

      // Prepare API payload
      const payload = {
        hackathonId: hackathon.id,
        day: values.day,
        checkInTime: checkInDateTime.toISOString(),
        description: values.description || null,
      };

      const url = isEditingSchedule
        ? `/api/hackathons/attendance-schedule/${editingScheduleId}`
        : `/api/hackathons/attendance-schedule`;

      const method = isEditingSchedule ? 'PUT' : 'POST';

      // Call API to create or update attendance schedule
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save attendance schedule');
      }

      // Success handling
      toast.success(isEditingSchedule
        ? 'Attendance schedule updated successfully'
        : 'Attendance schedule created successfully'
      );

      // Close dialog and refresh page
      setAttendanceDialogOpen(false);
      router.refresh();

    } catch (error) {
      console.error('Error saving attendance schedule:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setAttendanceLoading(false);
    }
  };
  // Static data for Core Team
  const coreTeamMembers = [
    "Jenil Desai",
    "Cheshta Trivedi",
    "Kishan Viradiya",
    "Punit Gondaliya",
    "Dev Kacha",
    "Anand Trambadiya",
    "Krishna Dharsandia"
  ];

  // Static data for Volunteers
  const volunteerMembers = [
    "Khilan Vachhani",
    "Meet Vanpariya",
    "Abhi Sanepara",
    "Prit Vekariya",
    "Jenil Vachhani",
    "Viraj Garacha",
    "Meetraj Chauhan",
    "Radhika Modhvadiya",
    "Yashvi Bhuva",
    "Jayshan Hirani",

    "Ridhi Sharma",
    "Urvashi Chandani",
    "Suhani Kadecha",
    "Rishu Kumari",
    "Bhautik Parmar",
    "Apurva Vyas",
    "Veelan Nakum",
    "Raksha Shiyani",
    "Vidhya Shiyani",
    "Om Trivedi",

    "Keval Chauhan",
    "Kruti Vyas",
    "Ravi Gehlot",
    "Heer Chokshi",
    "Dhruvi Kachalia",
    "Dhara Vaghela",
    "Prashant Bhuva",


    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];

  const handleDownloadCoreTeamIDCards = async () => {
    try {
      toast.loading("Generating Core Team ID cards, please wait...");

      const participants = coreTeamMembers.map(name => ({
        name,
        userType: 'Core Team'
      }));

      if (participants.length === 0) {
        toast.dismiss();
        toast.error("No core team members found");
        return;
      }

      // Import the HackthonICARDBunch component dynamically
      const { pdf } = await import('@react-pdf/renderer');
      const { HackthonICARDBunch } = await import('@/components/export/HacktthonVolunteerICARDBunch');

      // Generate PDF
      const pdfDoc = <HackthonICARDBunch participants={participants} />;
      const pdfBlob = await pdf(pdfDoc).toBlob();

      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${hackathon.name}_Core_Team_ID_Cards.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success(`Successfully generated Core Team ID cards for ${participants.length} members!`);

    } catch (error) {
      console.error('Error generating Core Team ID cards:', error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "Failed to download Core Team ID cards");
    }
  };

  const handleDownloadVolunteerIDCards = async () => {
    try {
      toast.loading("Generating Volunteer ID cards, please wait...");

      const participants = volunteerMembers.map(name => ({
        name,
        userType: 'Volunteer'
      }));

      if (participants.length === 0) {
        toast.dismiss();
        toast.error("No volunteers found");
        return;
      }

      // Import the HackthonICARDBunch component dynamically
      const { pdf } = await import('@react-pdf/renderer');
      const { HackthonICARDBunch } = await import('@/components/export/HacktthonVolunteerICARDBunch');

      // Generate PDF
      const pdfDoc = <HackthonICARDBunch participants={participants} />;
      const pdfBlob = await pdf(pdfDoc).toBlob();

      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${hackathon.name}_Volunteer_ID_Cards.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success(`Successfully generated Volunteer ID cards for ${participants.length} members!`);

    } catch (error) {
      console.error('Error generating Volunteer ID cards:', error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "Failed to download Volunteer ID cards");
    }
  };

  const handleDownloadHackathonIDCards = async () => {
    try {
      toast.loading("Generating ID cards, please wait...");

      // Get all participants from hackathon teams
      if (!hackathon.teams || hackathon.teams.length === 0) {
        toast.dismiss();
        toast.error("No teams found for this hackathon");
        return;
      }

      // Flatten all team members into participants array
      const participants: Array<{
        name: string;
        teamName: string;
        teamId: string | null;
        participantId: string;
        participantRole: string;
        userType: string;
        qrCode: string;
      }> = [];

      console.log(`Processing ${hackathon.teams.length} teams for ID cards...`);

      // Process each team and their members
      for (const team of hackathon.teams) {
        if (team.members && team.members.length > 0) {
          for (let memberIndex = 0; memberIndex < team.members.length; memberIndex++) {
            const member = team.members[memberIndex];
            try {
              // Get QR code directly from team member
              let qrCodeBase64 = member.qrCode;

              // Add base64 prefix if QR code exists and doesn't already have it
              if (qrCodeBase64 && !qrCodeBase64.startsWith('data:image/png;base64,')) {
                qrCodeBase64 = `data:image/png;base64,${qrCodeBase64}`;
              }

              // Generate QR code if not available
              if (!qrCodeBase64) {
                console.log(`Generating QR code for ${member.student.user.firstName} ${member.student.user.lastName}`);
                // Call API to generate QR code (don't save to database for ID card generation)
                const response = await fetch('/api/qr-code/generate', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    type: 'teamMember',
                    teamMemberId: member.id,
                    studentId: member.studentId,
                    teamId: team.teamId || '',
                    hackathonId: hackathon.id,
                    saveToDatabase: true,
                  }),
                });

                if (!response.ok) {
                  throw new Error('Failed to generate QR code');
                }

                const qrResult = await response.json();
                qrCodeBase64 = `data:image/png;base64,${qrResult.qrCode}`;
              }
              participants.push({
                name: `${member.student.user.firstName} ${member.student.user.lastName}`.trim(),
                teamName: team.teamName,
                teamId: team.teamId,
                participantId: member.student.id,
                participantRole: member.student.id === team.leaderId ? 'Team Leader' : 'Member',
                userType: 'Participant',
                qrCode: qrCodeBase64,
              });
            } catch (error) {
              console.error(`Error processing member ${member.student.user.firstName}:`, error);
              continue;
            }
          }
        }
      }

      if (participants.length === 0) {
        toast.dismiss();
        toast.error("No participants found to generate ID cards");
        return;
      }

      toast.dismiss();
      toast.loading(`Generating ID cards for ${participants.length} participants...`);

      // Import the export function dynamically
      const { exportBatchIdCardsToPDF } = await import('@/utils/functions/exportUtils');

      // Export batch ID cards
      await exportBatchIdCardsToPDF(
        participants,
        hackathon.name,
        (current, total) => {
          toast.loading(`Generating batch ${current} of ${total}...`);
        }
      );

      toast.dismiss();
      toast.success(`Successfully generated ID cards for ${participants.length} participants!`);

    } catch (error) {
      console.error('Error generating ID cards:', error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "Failed to download ID cards");
    }
  }

  return (
    <div className="container mx-auto py-8 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold break-words">{hackathon.name}</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant={isScanning ? "destructive" : "outline"} onClick={isScanning ? stopQrScanner : () => setQrScannerOpen(true)} className="w-full sm:w-auto">
            <QrCode className="mr-2 h-4 w-4" />
            {isScanning ? "Stop Scanner" : "Scan Attendance"}
          </Button>
          <Button variant="outline" onClick={editHackathon} className="w-full sm:w-auto">
            <Edit className="mr-2 h-4 w-4" />
            Edit Hackathon
          </Button>          <Button variant="outline" onClick={handleOpenQrDialog} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Download QR
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadHackathonIDCards}
            className="w-full sm:w-auto"
            disabled={!hackathon.teams || hackathon.teams.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Download ID Cards
          </Button>
          <Button variant="outline" onClick={handleOpenQrDialog} className="w-full sm:w-auto">
            <QrCode className="mr-2 h-4 w-4" />
            Scan QR
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isExporting || !hackathon.teams || hackathon.teams.length === 0} className="w-full sm:w-auto">
                {isExporting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </div>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Teams
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <Download className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('signature-sheet')}>
                <Download className="mr-2 h-4 w-4" />
                Export as Signature sheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column (main content) */}
        <div className="md:col-span-2 space-y-6">
          <div className="relative">
            <img
              src={hackathon.poster_url}
              alt={hackathon.name}
              className="w-full h-48 sm:h-64 object-cover rounded-lg"
            />
            <Badge
              className="absolute top-4 right-4"
              variant={getStatusColor(hackathon.status)}
            >
              {hackathon.status}
            </Badge>
          </div>

          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto">
              <TabsList className="flex-nowrap min-w-[700px] sm:min-w-0">
                <TabsTrigger value="details" className="flex-shrink-0">
                  Details
                </TabsTrigger>
                <TabsTrigger value="problems" className="flex-shrink-0">
                  Problem Statements
                </TabsTrigger>
                <TabsTrigger value="rules" className="flex-shrink-0">
                  Rules
                </TabsTrigger>
                <TabsTrigger value="teams" className="flex-shrink-0">
                  Teams
                </TabsTrigger>
                <TabsTrigger value="attendance" className="flex-shrink-0">
                  Attendance
                </TabsTrigger>
                <TabsTrigger value="statistics" className="flex-shrink-0">
                  Statistics
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex-shrink-0">
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <p className="text-muted-foreground whitespace-pre-wrap break-words">
                      {hackathon.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Start Date & Time</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(hackathon.start_date, hackathon.start_time)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">End Date & Time</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(hackathon.end_date, hackathon.end_time)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Mode</p>
                          <p className="text-sm text-muted-foreground">
                            {hackathon.mode} {hackathon.location && `- ${hackathon.location}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Organizer</p>
                          <p className="text-sm text-muted-foreground">
                            {hackathon.organizer_name}
                            {hackathon.organizer_contact && ` - ${hackathon.organizer_contact}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-2">Evaluation Criteria</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {hackathon.evaluationCriteria.map((criterion, index) => (
                          <li key={index} className="text-muted-foreground">
                            {criterion}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-2">Registration Period</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium">Registration Opens</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(hackathon.registration_start_date), "PPP")}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Registration Closes</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(hackathon.registration_end_date), "PPP")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="problems" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {hackathon.problemStatements.map((problem, index) => (
                    <div
                      key={problem.id}
                      className={`border rounded-lg p-4 ${index !== hackathon.problemStatements.length - 1 ? "mb-4" : ""}`}
                    >
                      <h3 className="text-lg font-medium mb-1 break-words">
                        {problem.code}: {problem.title}
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-wrap break-words">
                        {problem.description}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rules" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-4">Hackathon Rules</h3>
                  <ul className="list-decimal list-inside space-y-2">
                    {hackathon.rules.map((rule) => (
                      <li key={rule.id} className="text-muted-foreground break-words">
                        {rule.rule}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teams" className="mt-4">
              <Card>
                <CardHeader>
                                      <Select value={universityFilter} onValueChange={v => setUniversityFilter(v as 'ALL' | 'ATMIYA' | 'OTHER')}>
                                        <SelectTrigger className="max-w-xs w-full">
                                          <SelectValue placeholder="Filter by university" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="ALL">All Universities</SelectItem>
                                          <SelectItem value="ATMIYA">Atmiya University</SelectItem>
                                          <SelectItem value="OTHER">Other Universities</SelectItem>
                                        </SelectContent>
                                      </Select>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <CardTitle>Registered Teams</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isExporting || !hackathon.teams || hackathon.teams.length === 0}
                          className="w-full md:w-auto"
                        >
                          {isExporting ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                              Exporting...
                            </div>
                          ) : (
                            <>
                              <FileSpreadsheet className="mr-2 h-4 w-4" />
                              Export
                              <ChevronDown className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExport('csv')}>
                          <FileText className="mr-2 h-4 w-4" />
                          CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('pdf')}>
                          <Download className="mr-2 h-4 w-4" />
                          PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Search inputs for team name and team ID */}
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                        <Select value={teamStatusFilter} onValueChange={v => setTeamStatusFilter(v as 'ALL' | 'QUALIFIED' | 'DISQUALIFIED')}>
                                          <SelectTrigger className="max-w-xs w-full">
                                            <SelectValue placeholder="Filter by team status" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="ALL">All Teams</SelectItem>
                                            <SelectItem value="QUALIFIED">Qualified Teams</SelectItem>
                                            <SelectItem value="DISQUALIFIED">Disqualified Teams</SelectItem>
                                          </SelectContent>
                                        </Select>
                    <Input
                      placeholder="Search by team name..."
                      value={teamSearch}
                      onChange={e => setTeamSearch(e.target.value)}
                      className="max-w-xs w-full"
                    />
                    <Input
                      placeholder="Filter by team ID..."
                      value={teamIdSearch}
                      onChange={e => setTeamIdSearch(e.target.value)}
                      className="max-w-xs w-full"
                    />
                    <Input
                      placeholder="Search by mentor name..."
                      value={mentorSearch}
                      onChange={e => setMentorSearch(e.target.value)}
                      className="max-w-xs w-full"
                    />
                    <Select value={problemStatementFilter} onValueChange={setProblemStatementFilter}>
                      <SelectTrigger className="max-w-xs w-full">
                        <SelectValue placeholder="Filter by problem statement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Problem Statements</SelectItem>
                        <SelectItem value="NONE">Not Selected</SelectItem>
                        {hackathon.problemStatements.map((ps) => (
                          <SelectItem key={ps.id} value={ps.id}>
                            {ps.code}: {ps.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {hackathon.teams && hackathon.teams.length > 0 ? (
                    (() => {
                      const filteredTeams = hackathon.teams.filter(team =>
                        team.teamName.toLowerCase().includes(teamSearch.toLowerCase()) &&
                        (teamIdSearch === "" || (team.teamId != null && String(team.teamId).includes(teamIdSearch))) &&
                        (mentorSearch === "" || (team.mentor && team.mentor.toLowerCase().includes(mentorSearch.toLowerCase()))) &&
                        (problemStatementFilter === "ALL" || (problemStatementFilter === "NONE" ? !team.problemStatement : team.problemStatement?.id === problemStatementFilter)) &&
                        (teamStatusFilter === 'ALL' || (teamStatusFilter === 'QUALIFIED' ? !team.disqualified : team.disqualified)) &&
                        (universityFilter === 'ALL' || (
                          universityFilter === 'ATMIYA'
                            ? team.members.some(m => ((m.student.university || '').toLowerCase().includes('atmiya')))
                            : team.members.every(m => (m.student.university || '').toLowerCase() && !(m.student.university || '').toLowerCase().includes('atmiya'))
                        ))
                      );
                      const totalPages = Math.ceil(filteredTeams.length / teamsPerPage);
                      const paginatedTeams = filteredTeams.slice((teamsPage - 1) * teamsPerPage, teamsPage * teamsPerPage);
                      return (
                        <>
                          <div className="rounded-md border max-h-[500px] overflow-auto">
                            <table className="w-full caption-bottom text-sm min-w-[700px]">
                              <thead className="sticky top-0 bg-background z-10 [&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50">
                                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Team ID</th>
                                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Team Name</th>
                                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Problem Statement</th>
                                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Mentor</th>
                                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Members</th>
                                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Submission</th>
                                  <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="[&_tr:last-child]:border-0">
                                {paginatedTeams.map((team) => (
                                  <tr key={team.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-2 align-middle text-muted-foreground">
                                      {team.teamId ?? "-"}
                                    </td>
                                    <td className="p-2 align-middle font-medium">
                                      {team.teamName}
                                    </td>
                                    <td className="p-2 align-middle">
                                      {team.problemStatement ?
                                        `${team.problemStatement.code}: ${team.problemStatement.title}` :
                                        "Not selected"}
                                    </td>
                                    <td className="p-2 align-middle">{team.mentor || "-"}</td>
                                    <td className="p-2 align-middle">{team.members.length}</td>
                                    <td className="p-2 align-middle">
                                      {team.submissionUrl ? (
                                        <Button variant="link" asChild size="sm" className="p-0 h-auto">
                                          <a href={team.submissionUrl} target="_blank" rel="noopener noreferrer">
                                            View Submission
                                          </a>
                                        </Button>
                                      ) : (
                                        <span className="text-muted-foreground">No submission yet</span>
                                      )}
                                    </td>
                                    <td className="p-2 align-middle text-right">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Actions</span>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => onTeamClick && onTeamClick(team)}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Team
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => onEditTeamClick && onEditTeamClick(team)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit Team
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDeleteTeam && onDeleteTeam(team)}>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Team
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {totalPages > 1 && (
                            <div className="flex flex-wrap justify-center items-center mt-4 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={teamsPage === 1}
                                onClick={() => setTeamsPage(teamsPage - 1)}
                              >
                                Previous
                              </Button>
                              <span className="px-2 text-sm text-muted-foreground">
                                Page {teamsPage} of {totalPages} | Showing {paginatedTeams.length} of {filteredTeams.length} records
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={teamsPage === totalPages}
                                onClick={() => setTeamsPage(teamsPage + 1)}
                              >
                                Next
                              </Button>
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground">
                        No teams have registered for this hackathon yet
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Attendance Schedules</CardTitle>
                    <CardDescription>
                      Manage attendance check-ins for each day of the hackathon
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    setIsEditingSchedule(false);
                    setEditingScheduleId(null);
                    attendanceForm.reset({
                      day: 1,
                      checkInTime: '',
                      description: ''
                    });
                    setAttendanceDialogOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Schedule
                  </Button>
                </CardHeader>
                <CardContent>
                  {(hackathon.attendanceSchedules ?? []).length > 0 ? (
                    <div className="space-y-6">
                      {/* Group schedules by day */}
                      {Array.from(
                        new Set(hackathon.attendanceSchedules?.map((schedule) => schedule.day) || [])
                      ).sort((a, b) => a - b).map((day) => (
                        <div key={day} className="rounded-lg border">
                          <div className="bg-muted px-4 py-3 rounded-t-lg">
                            <h3 className="font-medium">Day {day}</h3>
                            <p className="text-sm text-muted-foreground">
                              {format(addDays(new Date(hackathon.start_date), day - 1), 'EEEE, MMMM d, yyyy')}
                            </p>
                          </div>

                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Attendance Status</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {hackathon.attendanceSchedules?.
                                filter((schedule) => schedule.day === day)
                                .sort((a, b) =>
                                  new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime()
                                )
                                .map((schedule) => {
                                  // Only consider qualified (non-disqualified) teams for attendance
                                  const qualifiedTeams = hackathon.teams.filter(team => !team.disqualified);
                                  const totalMembers = qualifiedTeams.reduce(
                                    (count, team) => count + (team.members?.length || 0),
                                    0
                                  );
                                  // Only count attendance for members of qualified teams
                                  const qualifiedMemberIds = new Set(qualifiedTeams.flatMap(team => team.members.map(m => m.id)));
                                  const attendedCount = schedule.attendanceRecords?.filter(
                                    record => record.isPresent && qualifiedMemberIds.has(record.teamMemberId)
                                  ).length || 0;
                                  const attendancePercentage = totalMembers > 0
                                    ? Math.round((attendedCount / totalMembers) * 100)
                                    : 0;

                                  return (
                                    <TableRow key={schedule.id}>
                                      <TableCell>
                                        {format(new Date(schedule.checkInTime), 'h:mm a')}
                                      </TableCell>
                                      <TableCell>{schedule.description || '-'}</TableCell>
                                      <TableCell>
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <Progress value={attendancePercentage} className="h-2" />
                                            <span className="text-xs font-medium">{attendancePercentage}%</span>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            {attendedCount} / {totalMembers} qualified members checked in
                                          </p>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setIsEditingSchedule(true);
                                              setEditingScheduleId(schedule.id);
                                              attendanceForm.reset({
                                                day: schedule.day,
                                                checkInTime: format(new Date(schedule.checkInTime), "yyyy-MM-dd'T'HH:mm"),
                                                description: schedule.description || undefined,
                                              });
                                              setAttendanceDialogOpen(true);
                                            }}
                                          >
                                            <Edit className="h-4 w-4" />
                                            <span className="sr-only">Edit</span>
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              router.push(`/master/hackathons/attendance/${schedule.id}`);
                                            }}
                                          >
                                            <Eye className="h-4 w-4" />
                                            <span className="sr-only">View</span>
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={async () => {
                                              if (confirm("Are you sure you want to delete this attendance schedule? This action cannot be undone.")) {
                                                try {
                                                  const loadingToast = toast.loading("Deleting schedule...");

                                                  const { deleteAttendanceSchedule } = await import("@/utils/functions/attendanceScheduleUtils");
                                                  const result = await deleteAttendanceSchedule(schedule.id);

                                                  toast.dismiss(loadingToast);

                                                  if (result.success) {
                                                    toast.success(result.message);
                                                    router.refresh();
                                                  } else {
                                                    toast.error(result.message);
                                                  }
                                                } catch (error) {
                                                  toast.error("An error occurred while deleting the schedule");
                                                  console.error("Error deleting schedule:", error);
                                                }
                                              }
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                            <span className="sr-only">Delete</span>
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="rounded-full bg-muted p-3">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium">No Attendance Schedules</h3>
                      <p className="mt-2 text-center text-muted-foreground max-w-sm">
                        You haven't created any attendance schedules for this hackathon yet.
                        Add schedules to track participant attendance.
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => {
                          setAttendanceDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add First Schedule
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics" className="mt-4">
              <div className="w-full space-y-4">
                <div className="border rounded-lg p-4 sm:p-6 w-full">
                  <h3 className="text-lg font-medium mb-4">Registration Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Teams:</span>
                      <Badge variant="outline">{hackathon.teams?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Teams Not Disqualified:</span>
                      <Badge variant="outline">{hackathon.teams?.filter(team => !team.disqualified).length || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Participants:</span>
                      <Badge variant="outline">
                        {hackathon.teams?.reduce(
                          (acc, team) => acc + team.members.length, 0
                        ) || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Participants (Non-Disqualified Teams):</span>
                      <Badge variant="outline">
                        {hackathon.teams?.filter(team => !team.disqualified)
                          .reduce((acc, team) => acc + team.members.length, 0) || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Teams with Submissions:</span>
                      <Badge variant="outline">
                        {hackathon.teams?.filter(team => team.submissionUrl).length || 0}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 sm:p-6 w-full">
                  <h3 className="text-lg font-medium mb-4">Problem Statement Distribution</h3>
                  {(Array.isArray(hackathon.problemStatements) ? hackathon.problemStatements : []).map(problem => (
                    <div key={problem.id} className="flex justify-between items-center mb-2">
                      <span className="truncate max-w-[70%]">{problem.code}: {problem.title}</span>
                      <Badge variant="outline">
                        {hackathon.teams?.filter(
                          team => team.problemStatement?.id === problem.id
                        ).length || 0} teams
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* 0. Participation by University Pie Chart */}
                <Card className="flex flex-col col-span-2">
                  <CardHeader className="items-center pb-0">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-center flex-1">
                        <CardTitle>Participation by University</CardTitle>
                        <CardDescription>Distribution of participants by university</CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <List className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                          <DialogHeader className="flex-shrink-0">
                            <DialogTitle>University Distribution Details</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto px-1">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>University</TableHead>
                                  <TableHead className="text-right">Participant Count</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(() => {
                                  const uniCount: Record<string, number> = {};
                                  hackathon.teams?.forEach(team => {
                                    team.members.forEach(member => {
                                      const uni = (member.student as any).university || "Unknown";
                                      uniCount[uni] = (uniCount[uni] || 0) + 1;
                                    });
                                  });
                                  return Object.entries(uniCount).map(([name, value]) => (
                                    <TableRow key={name}>
                                      <TableCell className="font-medium">{name}</TableCell>
                                      <TableCell className="text-right">{value}</TableCell>
                                    </TableRow>
                                  ));
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0">
                    <ChartContainer config={{}} className="mx-auto aspect-square max-h-[250px]">
                      <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie data={(() => {
                          const uniCount: Record<string, number> = {};
                          hackathon.teams?.forEach(team => {
                            team.members.forEach(member => {
                              const uni = (member.student as any).university || "Unknown";
                              uniCount[uni] = (uniCount[uni] || 0) + 1;
                            });
                          });
                          return Object.entries(uniCount).map(([name, value]) => ({ name, value }));
                        })()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {(() => {
                            const uniCount: Record<string, number> = {};
                            hackathon.teams?.forEach(team => {
                              team.members.forEach(member => {
                                const uni = (member.student as any).university || "Unknown";
                                uniCount[uni] = (uniCount[uni] || 0) + 1;
                              });
                            });
                            return Object.keys(uniCount).map((uni, idx) => (
                              <Cell key={uni} fill={`var(--chart-${(idx % 5) + 1})`} />
                            ));
                          })()}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2 leading-none">
                      University-wide distribution
                    </div>
                    <div className="text-muted-foreground leading-none">Showing all universities</div>
                  </CardFooter>
                </Card>
                {/* 1. Participation by Department Pie Chart */}
                <Card className="flex flex-col">
                  <CardHeader className="items-center pb-0">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-center flex-1">
                        <CardTitle>Participation by Department</CardTitle>
                        <CardDescription>Distribution of participants by department</CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <List className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                          <DialogHeader className="flex-shrink-0">
                            <DialogTitle>Department Distribution Details</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto px-1">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Department</TableHead>
                                  <TableHead className="text-right">Participant Count</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(() => {
                                  const deptCount: Record<string, number> = {};
                                  hackathon.teams?.forEach(team => {
                                    team.members.forEach(member => {
                                      const dept = member.student.department?.name || "Unknown";
                                      deptCount[dept] = (deptCount[dept] || 0) + 1;
                                    });
                                  });
                                  return Object.entries(deptCount).map(([name, value]) => (
                                    <TableRow key={name}>
                                      <TableCell className="font-medium">{name}</TableCell>
                                      <TableCell className="text-right">{value}</TableCell>
                                    </TableRow>
                                  ));
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0">
                    <ChartContainer config={{}} className="mx-auto aspect-square max-h-[250px]">
                      <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie data={(() => {
                          const deptCount: Record<string, number> = {};
                          hackathon.teams?.forEach(team => {
                            team.members.forEach(member => {
                              const dept = member.student.department?.name || "Unknown";
                              deptCount[dept] = (deptCount[dept] || 0) + 1;
                            });
                          });
                          return Object.entries(deptCount).map(([name, value]) => ({ name, value }));
                        })()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {(() => {
                            const deptCount: Record<string, number> = {};
                            hackathon.teams?.forEach(team => {
                              team.members.forEach(member => {
                                const dept = member.student.department?.name || "Unknown";
                                deptCount[dept] = (deptCount[dept] || 0) + 1;
                              });
                            });
                            return Object.keys(deptCount).map((dept, idx) => (
                              <Cell key={dept} fill={`var(--chart-${(idx % 5) + 1})`} />
                            ));
                          })()}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2 leading-none">
                      Platform-wide distribution
                    </div>
                    <div className="text-muted-foreground leading-none">Showing all departments</div>
                  </CardFooter>
                </Card>
                {/* 2. Problem Statement Distribution Pie Chart */}
                <Card className="flex flex-col">
                  <CardHeader className="items-center pb-0">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-center flex-1">
                        <CardTitle>Problem Statement Distribution</CardTitle>
                        <CardDescription>Teams per problem statement</CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <List className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                          <DialogHeader className="flex-shrink-0">
                            <DialogTitle>Problem Statement Distribution Details</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto px-1">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Problem Statement</TableHead>
                                  <TableHead className="text-right">Team Count</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(() => {
                                  const psMap: Record<string, string> = {};
                                  hackathon.problemStatements.forEach(ps => {
                                    psMap[ps.id] = `${ps.code}: ${ps.title}`;
                                  });
                                  const counts: Record<string, number> = {};
                                  hackathon.teams?.forEach(team => {
                                    const psId = team.problemStatement?.id || "None";
                                    counts[psId] = (counts[psId] || 0) + 1;
                                  });
                                  return Object.entries(counts).map(([id, count]) => (
                                    <TableRow key={id}>
                                      <TableCell className="font-medium">{psMap[id] || "None"}</TableCell>
                                      <TableCell className="text-right">{count}</TableCell>
                                    </TableRow>
                                  ));
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0">
                    <ChartContainer config={{}} className="mx-auto aspect-square max-h-[250px]">
                      <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie data={(() => {
                          const psMap: Record<string, string> = {};
                          hackathon.problemStatements.forEach(ps => {
                            psMap[ps.id] = `${ps.code}: ${ps.title}`;
                          });
                          const counts: Record<string, number> = {};
                          hackathon.teams?.forEach(team => {
                            const psId = team.problemStatement?.id || "None";
                            counts[psId] = (counts[psId] || 0) + 1;
                          });
                          return Object.entries(counts).map(([id, value]) => ({ name: psMap[id] || "None", value }));
                        })()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {(() => {
                            const psMap: Record<string, string> = {};
                            hackathon.problemStatements.forEach(ps => {
                              psMap[ps.id] = `${ps.code}: ${ps.title}`;
                            });
                            const counts: Record<string, number> = {};
                            hackathon.teams?.forEach(team => {
                              const psId = team.problemStatement?.id || "None";
                              counts[psId] = (counts[psId] || 0) + 1;
                            });
                            return Object.keys(counts).map((id, idx) => (
                              <Cell key={id} fill={`var(--chart-${(idx % 5) + 1})`} />
                            ));
                          })()}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2 leading-none">
                      Problem statement breakdown
                    </div>
                    <div className="text-muted-foreground leading-none">All problem statements</div>
                  </CardFooter>
                </Card>
                {/* 3. Total Submissions Distribution Pie Chart */}
                <Card className="flex flex-col">
                  <CardHeader className="items-center pb-0">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-center flex-1">
                        <CardTitle>Total Submissions Distribution</CardTitle>
                        <CardDescription>Teams with/without submissions</CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <List className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                          <DialogHeader className="flex-shrink-0">
                            <DialogTitle>Submission Distribution Details</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto px-1">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Submission Status</TableHead>
                                  <TableHead className="text-right">Team Count</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(() => {
                                  let withSub = 0, noSub = 0;
                                  hackathon.teams?.forEach(team => {
                                    if (team.submissionUrl) withSub++;
                                    else noSub++;
                                  });
                                  return [
                                    <TableRow key="with-submissions">
                                      <TableCell className="font-medium">With Submissions</TableCell>
                                      <TableCell className="text-right">{withSub}</TableCell>
                                    </TableRow>,
                                    <TableRow key="without-submissions">
                                      <TableCell className="font-medium">Without Submissions</TableCell>
                                      <TableCell className="text-right">{noSub}</TableCell>
                                    </TableRow>
                                  ];
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0">
                    <ChartContainer config={{}} className="mx-auto aspect-square max-h-[250px]">
                      <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie data={(() => {
                          let withSub = 0, noSub = 0;
                          hackathon.teams?.forEach(team => {
                            if (team.submissionUrl) withSub++; else noSub++;
                          });
                          return [
                            { name: "With Submission", value: withSub },
                            { name: "No Submission", value: noSub },
                          ];
                        })()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          <Cell fill="var(--chart-1)" />
                          <Cell fill="var(--chart-2)" />
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2 leading-none">
                      Submission status
                    </div>
                    <div className="text-muted-foreground leading-none">All teams</div>
                  </CardFooter>
                </Card>
                {/* 4. Team Disqualified Distribution Pie Chart */}
                <Card className="flex flex-col">
                  <CardHeader className="items-center pb-0">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-center flex-1">
                        <CardTitle>Team Disqualified Distribution</CardTitle>
                        <CardDescription>Disqualified vs Not Disqualified</CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <List className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                          <DialogHeader className="flex-shrink-0">
                            <DialogTitle>Disqualification Status Details</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto px-1">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Disqualification Status</TableHead>
                                  <TableHead className="text-right">Team Count</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(() => {
                                  let dq = 0, notDq = 0;
                                  hackathon.teams?.forEach((team: any) => {
                                    if (team.disqualified) dq++; else notDq++;
                                  });
                                  return [
                                    <TableRow key="disqualified">
                                      <TableCell className="font-medium">Disqualified</TableCell>
                                      <TableCell className="text-right">{dq}</TableCell>
                                    </TableRow>,
                                    <TableRow key="not-disqualified">
                                      <TableCell className="font-medium">Not Disqualified</TableCell>
                                      <TableCell className="text-right">{notDq}</TableCell>
                                    </TableRow>
                                  ];
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0">
                    <ChartContainer config={{}} className="mx-auto aspect-square max-h-[250px]">
                      <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie data={(() => {
                          let dq = 0, notDq = 0;
                          hackathon.teams?.forEach((team: any) => {
                            if (team.disqualified) dq++; else notDq++;
                          });
                          return [
                            { name: "Disqualified", value: dq },
                            { name: "Not Disqualified", value: notDq },
                          ];
                        })()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          <Cell fill="var(--chart-1)" />
                          <Cell fill="var(--chart-2)" />
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2 leading-none">
                      Disqualification status
                    </div>
                    <div className="text-muted-foreground leading-none">All teams</div>
                  </CardFooter>
                </Card>
                {/* 5. Team Count by Department Bar Chart */}
                <Card className="flex flex-col">
                  <CardHeader className="items-center pb-0">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-center flex-1">
                        <CardTitle>Team Count by Department</CardTitle>
                        <CardDescription>Number of teams per department</CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <List className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                          <DialogHeader className="flex-shrink-0">
                            <DialogTitle>Team Count by Department Details</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto px-1">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Department</TableHead>
                                  <TableHead className="text-right">Team Count</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(() => {
                                  // Count teams by department
                                  const deptTeams: Record<string, number> = {};
                                  hackathon.teams?.forEach(team => {
                                    // For each team, find the departments represented
                                    const deptSet = new Set<string>();
                                    team.members.forEach(member => {
                                      const dept = member.student.department?.name || "Unknown";
                                      deptSet.add(dept);
                                    });
                                    // Count each department once per team
                                    deptSet.forEach(dept => {
                                      deptTeams[dept] = (deptTeams[dept] || 0) + 1;
                                    });
                                  });
                                  return Object.entries(deptTeams)
                                    .sort((a, b) => b[1] - a[1]) // Sort by count (descending)
                                    .map(([name, count]) => (
                                      <TableRow key={name}>
                                        <TableCell className="font-medium">{name}</TableCell>
                                        <TableCell className="text-right">{count}</TableCell>
                                      </TableRow>
                                    ));
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0">
                    <ChartContainer config={{}} className="mx-auto w-full max-h-[250px]">
                      <BarChart data={(() => {
                        const deptCount: Record<string, number> = {};
                        hackathon.teams?.forEach(team => {
                          const dept = team.members[0]?.student?.department?.name || "Unknown";
                          deptCount[dept] = (deptCount[dept] || 0) + 1;
                        });
                        return Object.entries(deptCount).map(([name, value]) => ({ name, value }));
                      })()} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value">
                          {(() => {
                            const deptCount: Record<string, number> = {};
                            hackathon.teams?.forEach(team => {
                              const dept = team.members[0]?.student?.department?.name || "Unknown";
                              deptCount[dept] = (deptCount[dept] || 0) + 1;
                            });
                            return Object.keys(deptCount).map((dept, idx) => (
                              <Cell key={dept} fill={`var(--chart-${(idx % 5) + 1})`} />
                            ));
                          })()}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2 leading-none">
                      Team count by department
                    </div>
                    <div className="text-muted-foreground leading-none">All teams</div>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        {/* Right sidebar: always show status, quick actions, info */}
        <div className="space-y-6 mt-6 md:mt-0">
          {/* Hackathon status */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Hackathon Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  <Badge variant={getStatusColor(hackathon.status)}>{hackathon.status}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Registration:</span>
                  <Badge variant="outline">
                    {new Date() < new Date(hackathon.registration_start_date)
                      ? "Not Started"
                      : new Date() > new Date(hackathon.registration_end_date)
                        ? "Closed"
                        : "Open"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Teams:</span>
                  <Badge variant="outline">
                    {hackathon.teams?.length || 0}
                    {hackathon.registration_limit
                      ? ` / ${hackathon.registration_limit}`
                      : ""}
                  </Badge>
                </div>
              </div>
              <div className="mt-4">
                <Button className="w-full" onClick={editHackathon}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Hackathon
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* Quick actions */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant={"outline"} className="w-full justify-start" onClick={handleToggleRegistrations}>
                  {hackathon.open_registrations ? (
                    <DoorClosed className="mr-2 h-4 w-4" />
                  ) : (
                    <DoorOpen className="mr-2 h-4 w-4" />
                  )}
                  {hackathon.open_registrations ? "Close Registrations" : "Open Registrations"}
                </Button>
                <Button variant={"outline"} className="w-full justify-start" onClick={handleToggleSubmissions}>
                  {hackathon.open_submissions ? (
                    <Captions className="mr-2 h-4 w-4" />
                  ) : (
                    <CaptionsOff className="mr-2 h-4 w-4" />
                  )}
                  {hackathon.open_submissions ? "Close Submissions" : "Open Submissions"}
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Attendance
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Award className="mr-2 h-4 w-4" />
                  Manage Winners
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleOpenQrDialog}>
                  <Download className="mr-2 h-4 w-4" />
                  Download QR Code
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      disabled={isExporting || !hackathon.teams || hackathon.teams.length === 0}
                    >
                      {isExporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Export Team Data
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => handleExport('csv')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                      <Download className="mr-2 h-4 w-4" />
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      {isExporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Export ID Cards
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem onClick={() => handleDownloadHackathonIDCards()}>
                      <FileText className="mr-2 h-4 w-4" />
                      Participant ID Cards
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadCoreTeamIDCards()}>
                      <Users className="mr-2 h-4 w-4" />
                      Core Team ID Cards
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadVolunteerIDCards()}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      Volunteer ID Cards
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
          {/* Hackathon info */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Hackathon Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Mode:</span>
                  <span className="font-medium">{hackathon.mode}</span>
                </div>
                {hackathon.location && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Location:</span>
                    <span className="font-medium">{hackathon.location}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Team Size Limit:</span>
                  <span className="font-medium">{hackathon.team_size_limit || "No limit"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Registration Limit:</span>
                  <span className="font-medium">{hackathon.registration_limit || "No limit"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duration:</span>
                  <span className="font-medium">
                    {Math.ceil(
                      (new Date(hackathon.end_date).getTime() -
                        new Date(hackathon.start_date).getTime()) /
                      (1000 * 60 * 60 * 24)
                    )} days
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Code Dialog — Schedule-specific QR for participants to scan */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Attendance QR Code
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" className="absolute top-4 right-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </DialogClose>
          </DialogHeader>

          {/* Schedule selector */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-1 block">Select Attendance Schedule</label>
            <Select value={selectedQrScheduleId || ""} onValueChange={(val) => { setSelectedQrScheduleId(val); setGeneratedQrBase64(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a schedule..." />
              </SelectTrigger>
              <SelectContent>
                {hackathon.attendanceSchedules.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    Day {s.day} — {format(new Date(s.checkInTime), "h:mm a")}{s.description ? ` (${s.description})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedQrScheduleId && (
            <p className="text-center text-sm text-muted-foreground">Select a schedule to generate a QR code for participants to scan.</p>
          )}

          {selectedQrScheduleId && !generatedQrBase64 && (
            <div className="flex justify-center">
              <Button onClick={handleGenerateScheduleQr} disabled={generatingQr}>
                {generatingQr ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><QrCode className="mr-2 h-4 w-4" /> Generate QR Code</>
                )}
              </Button>
            </div>
          )}

          {generatedQrBase64 && (
            <>
              <div className="flex justify-center mb-4">
                <img
                  src={generatedQrBase64}
                  alt="Attendance QR Code"
                  className="w-full h-auto max-w-[300px] rounded-md"
                />
              </div>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    const selectedSchedule = hackathon.attendanceSchedules?.find((s: any) => s.id === selectedQrScheduleId);
                    const scheduleName = selectedSchedule ? `day${selectedSchedule.day}` : 'schedule';
                    const link = document.createElement('a');
                    link.href = generatedQrBase64!;
                    link.download = `${hackathon.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${scheduleName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success("QR code downloaded");
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download QR Code
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Scanner Dialog */}
      {qrScannerOpen && (
        <Dialog open={qrScannerOpen} onOpenChange={(open) => {
          if (!open) stopQrScanner();
          setQrScannerOpen(open);
        }}>
          <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
            <DialogHeader className="space-y-2">
              <DialogTitle>Scan Hackathon Attendance QR Code</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {isScanning
                  ? "Scan a participant\u2019s QR code to mark their attendance."
                  : "Select an attendance schedule, then start scanning."}
              </p>
            </DialogHeader>

            {/* Schedule selector — always visible */}
            <div className="mb-2">
              <label className="text-sm font-medium mb-1 block">Attendance Schedule</label>
              <Select
                value={selectedScanScheduleId || ""}
                onValueChange={(val) => setSelectedScanScheduleId(val)}
                disabled={isScanning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a schedule..." />
                </SelectTrigger>
                <SelectContent>
                  {hackathon.attendanceSchedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      Day {s.day} — {format(new Date(s.checkInTime), "h:mm a")}{s.description ? ` (${s.description})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scanner area — only when scanning */}
            {isScanning ? (
              <div className="flex flex-col items-center mt-2">
                <div className="qr-scanner-container border rounded-md overflow-hidden">
                  <div id={scannerDivId}></div>
                </div>
                <div className="mt-4 w-full">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={stopQrScanner}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Stop Scanning
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center mt-2">
                <Button onClick={startQrScanner} disabled={!selectedScanScheduleId} className="w-full">
                  <QrCode className="mr-2 h-4 w-4" />
                  Start Scanner
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Attendance Schedule Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditingSchedule ? 'Edit Attendance Schedule' : 'New Attendance Schedule'}
            </DialogTitle>
            <DialogDescription>
              Set up when attendance should be marked during the hackathon.
            </DialogDescription>
          </DialogHeader>

          <Form {...attendanceForm}>
            <form onSubmit={attendanceForm.handleSubmit(onAttendanceSubmit)} className="space-y-4 py-2">
              <FormField
                control={attendanceForm.control}
                name="day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={
                          differenceInDays(
                            new Date(hackathon.end_date),
                            new Date(hackathon.start_date)
                          ) + 1
                        }
                        placeholder="1"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Which day of the hackathon (Day 1, Day 2, etc.)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={attendanceForm.control}
                name="checkInTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      When attendees should check in
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={attendanceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Morning Check-in"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      A label to identify this check-in (e.g., "Morning", "Lunch")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAttendanceDialogOpen(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={attendanceLoading}>
                  {attendanceLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditingSchedule ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    isEditingSchedule ? 'Update Schedule' : 'Create Schedule'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
