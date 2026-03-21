"use client";

import { Heading } from "@/components/global/heading/Heading";
import { EventFeedbackTable } from "@/components/section/master/events/details/feedbacks/EventFeedback";
import { EventRegistrationTable } from "@/components/section/master/events/details/registrations/EventRegistration";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { sidebarBreadcrumbs } from "@/store/sidebar";
import { useSetAtom } from "jotai";
import { use, useEffect, useState, useRef } from "react";
import { FileDown, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "@/fetcher";
import {
  exportToCSV,
  exportToXLSX,
  exportToPDF,
  formatRegistrationData,
  formatFeedbackData,
  type ExportData
} from "@/utils/functions/exportUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Add styles for QR scanner
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

type ExportType = "registrations" | "feedbacks" | "both";
type ExportFormat = "xlsx" | "csv" | "pdf";

interface EventData {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface RegistrationData {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    students?: Array<{
      registrationNumber?: string;
      department?: { name: string };
      program?: { name: string };
      currentSemester?: number;
      currentYear?: number;
    }>;
    admins?: Array<{
      department?: { name: string };
      program?: { name: string };
    }>;
  };
  attended: boolean;
  createdAt: string;
  [key: string]: unknown;
}

interface FeedbackData {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  rating: number;
  createdAt: string;
  [key: string]: unknown;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const setCurrentBreadcrumb = useSetAtom(sidebarBreadcrumbs);
  const [exportType, setExportType] = useState<ExportType>("registrations");
  const [isExporting, setIsExporting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [processingQr, setProcessingQr] = useState(false);
  const processingRef = useRef(false);
  const scannerRef = useRef<any>(null);
  const scannerDivId = "html5-qr-code-scanner";

  // Fetch event details for filename
  const { data: eventData } = useSWR<EventData>(`/api/events/${id}`, fetcher);

  // Fetch registrations and feedbacks data
  const { data: registrations, mutate: mutateRegistrations } = useSWR<RegistrationData[]>(
    (exportType === "registrations" || exportType === "both") ? `/api/events/details/registrations?id=${id}` : null,
    fetcher
  );

  const { data: feedbacks } = useSWR<FeedbackData[]>(
    (exportType === "feedbacks" || exportType === "both") ? `/api/events/details/feedbacks?id=${id}` : null,
    fetcher
  );

  useEffect(() => {
    setCurrentBreadcrumb([
      { label: "Dashboard", href: "/master" },
      { label: "Events", href: "/master/events" },
      { label: "Event Details", href: `/master/events/details/${id}` },
    ]);
  }, [id, setCurrentBreadcrumb]);

  // Initialize and clean up QR scanner
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  const startQrScanner = () => {
    setQrScannerOpen(true);
    setIsScanning(true);
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
                aspectRatio: 1.0,
                rememberLastUsedCamera: true,
                showTorchButtonIfSupported: true,
                videoConstraints: {
                  facingMode: { ideal: "environment" } // Prefer back camera on mobile
                },
                // Let scanner use all supported formats
              },
              false // verbose
            );

            scanner.render(
              (qrData: string) => {
                // Success callback
                if (!processingRef.current) {
                  processQrCode(qrData);
                }
              },
              (error: any) => {
                // Error callback - we don't need to show these errors to users
                console.log("QR scanning error:", error);
              }
            );

            scannerRef.current = scanner;
          } catch (error) {
            console.error("Error initializing QR scanner:", error);
            toast.error("Failed to initialize the QR scanner");
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
      try {
        const userData = JSON.parse(qrData.trim());
        userId = userData.userId;
      } catch (error) {
        // If not JSON, try using the raw data as userId
        userId = qrData.trim();
      }

      if (!userId) {
        toast.error("Invalid QR code data");
        return;
      }

      // Call the attendance API
      const response = await fetch(`/api/events/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, eventId: id }),
      });

      const data = await response.json();

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
          </div>
        `;
        document.body.appendChild(successOverlay);

        // Remove after animation
        setTimeout(() => {
          successOverlay.classList.add('animate-out', 'fade-out');
          setTimeout(() => {
            document.body.removeChild(successOverlay);
            toast.success("Attendance marked successfully!");
            mutateRegistrations();
          }, 300);
        }, 1000);
      } else {
        toast.error(data.error || "Failed to mark attendance");
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

  if (!id) {
    return <div>Error: Event ID is required for editing.</div>;
  }

  const generateFilename = () => {
    const eventName = eventData?.name || "Event";
    const timestamp = new Date().toISOString().split('T')[0];
    const typeLabel = exportType === "both" ? "Complete" : exportType;
    return `${eventName}_${typeLabel}_${timestamp}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  const prepareExportData = (): ExportData => {
    const exportData: ExportData = {};

    if ((exportType === "registrations" || exportType === "both") && registrations) {
      exportData.registrations = formatRegistrationData(registrations as Record<string, unknown>[]);
    }

    if ((exportType === "feedbacks" || exportType === "both") && feedbacks) {
      exportData.feedbacks = formatFeedbackData(feedbacks as Record<string, unknown>[]);
    }

    return exportData;
  };

  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return;

    try {
      setIsExporting(true);

      // Check if we have data to export
      const hasRegistrations = (exportType === "registrations" || exportType === "both") &&
                               registrations && registrations.length > 0;
      const hasFeedbacks = (exportType === "feedbacks" || exportType === "both") &&
                           feedbacks && feedbacks.length > 0;

      if (!hasRegistrations && !hasFeedbacks) {
        toast.error("No data available to export for the selected type.");
        return;
      }

      const filename = generateFilename();
      const exportData = prepareExportData();

      toast.info(`Preparing ${format.toUpperCase()} export...`);

      switch (format) {
        case "csv":
          exportToCSV(exportData, filename, exportType);
          break;
        case "xlsx":
          exportToXLSX(exportData, filename, exportType);
          break;
        case "pdf":
          await exportToPDF(exportData, filename, exportType, eventData?.name);
          break;
      }

      toast.success(`${format.toUpperCase()} export completed successfully!`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(`Failed to export ${format.toUpperCase()} file. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Heading title={`Event Details`} description="Manage Event Details" />

        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          <Button
            variant={isScanning ? "destructive" : "outline"}
            onClick={isScanning ? stopQrScanner : startQrScanner}
            className="flex-1 sm:flex-none"
          >
            <QrCode className="mr-2 h-4 w-4" />
            {isScanning ? "Stop Scanning" : "Scan QR Codes"}
          </Button>

          <div className="flex flex-1 sm:flex-none gap-2 w-full sm:w-auto">
            <Select value={exportType} onValueChange={(value: ExportType) => setExportType(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select export type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="registrations">Registrations Only</SelectItem>
                <SelectItem value="feedbacks">Feedbacks Only</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isExporting} className="flex-1 sm:flex-none">
                  {isExporting ? (
                    <>
                      <Download className="mr-2 h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Exporting...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                      <span className="sm:hidden">Export</span>
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as XLSX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="space-y-8 min-w-0">
        <div className="overflow-hidden rounded-lg border">
          <div className="p-2 sm:p-6 min-w-0 overflow-hidden">
            <EventRegistrationTable id={id} />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="p-2 sm:p-6 min-w-0 overflow-hidden">
            <EventFeedbackTable id={id} />
          </div>
        </div>
      </div>

      {/* QR Scanner Dialog */}
      <Dialog open={qrScannerOpen} onOpenChange={(open) => {
        if (!open) stopQrScanner();
        setQrScannerOpen(open);
      }}>
        <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold">Scan QR Code for Attendance</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Position the QR code within the camera view
            </p>
          </DialogHeader>
          <div className="flex flex-col items-center mt-4">
            <div className="relative w-full">
              {/* The html5-qrcode scanner will be rendered in this div */}
              <div id={scannerDivId} className="qr-scanner-container rounded-lg overflow-hidden"></div>

              {processingQr && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 rounded-lg backdrop-blur-sm">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  <p className="text-sm font-medium text-white">Processing...</p>
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
    </>
  );
}
