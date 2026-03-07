"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  ImageIcon,
  InfoIcon,
  ChevronLeft,
  ChevronRight,
  CheckIcon,
  HelpCircleIcon,
  MapPinIcon,
  ClockIcon,
  CreditCardIcon,
  LinkIcon,
  TagIcon,
  UploadIcon,
  SaveIcon,
} from "lucide-react";
import { format } from "date-fns";

import { eventSchema, EventSchema, EventSpeakerSchema } from "@/schemas/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { createEventAction } from "./createEventAction";
import { updateEventAction } from "./updateEventAction";
import { fetchEventById, EventWithDetails } from "./fetchEventById";
import { v4 } from "uuid";
import Image from "next/image";
import { useRouter } from "next/navigation";

const FORM_STEPS = [
  {
    id: 1,
    title: "Basic Info",
    description: "Event name, description, & poster details",
    icon: InfoIcon,
  },
  {
    id: 2,
    title: "Event Details",
    description: "Type, mode, and organizer info",
    icon: MapPinIcon,
  },
  {
    id: 3,
    title: "Event Dates",
    description: "Date, time, and location settings",
    icon: ClockIcon,
  },
  {
    id: 4,
    title: "Event Speakers",
    description: "Add speakers and their information",
    icon: UserIcon,
  },
  {
    id: 5,
    title: "Registration",
    description: "Registration and payment settings",
    icon: CreditCardIcon,
  },
  {
    id: 6,
    title: "Additional Details",
    description: "Links, tags, and final touches",
    icon: LinkIcon,
  },
];

interface EventFormProps {
  id?: string;
}

export default function EventForm({ id }: EventFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [keyHighlights, setKeyHighlights] = useState<string[]>([""]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [speakers, setSpeakers] = useState<EventSpeakerSchema[]>([
    { name: "", bio: "", photo_url: "" },
  ]);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>("");
  const [speakerFiles, setSpeakerFiles] = useState<{
    [key: number]: File | null;
  }>({});
  const [speakerPreviews, setSpeakerPreviews] = useState<{
    [key: number]: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setEventData] = useState<EventWithDetails | null>(null);

  const isEditMode = Boolean(id);

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      slug: "",
      name: "",
      description: "",
      key_highlights: [""],
      note: "",
      poster_url: undefined,
      speakers: [],
      mode: "OFFLINE" as const,
      address: "",
      start_date: new Date(),
      end_date: new Date(),
      start_time: new Date(),
      end_time: new Date(),
      event_type: "SESSION" as const,
      status: "UPCOMING" as const,
      registration_required: false,
      registration_link: undefined,
      registration_limit: undefined,
      recording_link: undefined,
      feedback_form_link: undefined,
      tags: [],
      organizer_name: "",
      organizer_contact: "",
      is_paid: false,
      ticket_price: undefined,
    },
  });

  const watchMode = form.watch("mode");
  const watchRegistrationRequired = form.watch("registration_required");
  const watchIsPaid = form.watch("is_paid");
  const supabase = createClient();
  const router = useRouter();

  // Fetch event data if in edit mode
  useEffect(() => {
    const fetchEventData = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const event = await fetchEventById(id);
        if (event) {
          setEventData(event);

          const {
            data: { publicUrl },
          } = supabase.storage
            .from("event-posters")
            .getPublicUrl(event.poster_url);
          // Pre-fill form with fetched data
          form.reset({
            slug: event.slug,
            name: event.name,
            description: event.description,
            key_highlights: event.key_highlights,
            note: event.note || "",
            poster_url: publicUrl,
            mode: event.mode,
            address: event.address || "",
            start_date: new Date(event.start_date),
            end_date: event.end_date ? new Date(event.end_date) : new Date(),
            start_time: new Date(event.start_time),
            end_time: event.end_time ? new Date(event.end_time) : new Date(),
            event_type: event.event_type,
            status: event.status,
            registration_required: event.registration_required,
            registration_link: event.registration_link || "",
            registration_limit: event.registration_limit || undefined,
            recording_link: event.recording_link || "",
            feedback_form_link: event.feedback_form_link || "",
            tags: event.tags,
            organizer_name: event.organizer_name,
            organizer_contact: event.organizer_contact || "",
            is_paid: event.is_paid,
            ticket_price: event.ticket_price || undefined,
            speakers: event.speakers.map((speaker) => ({
              name: speaker.name,
              bio: speaker.bio || "",
              photo_url: speaker.photo_url || "",
            })),
          });

          // Set state variables
          setKeyHighlights(
            event.key_highlights.length > 0 ? event.key_highlights : [""]
          );
          setTags(event.tags);
          setSpeakers(
            event.speakers.length > 0
              ? event.speakers.map((speaker) => ({
                name: speaker.name,
                bio: speaker.bio || "",
                photo_url: speaker.photo_url || "",
              }))
              : [{ name: "", bio: "", photo_url: "" }]
          );

          // Set poster preview if exists
          if (event.poster_url) {
            const supabase = createClient();
            const { data } = supabase.storage
              .from("event-posters")
              .getPublicUrl(event.poster_url);
            setPosterPreview(data.publicUrl);
          }

          // Set speaker previews if exist
          const newSpeakerPreviews: { [key: number]: string } = {};
          event.speakers.forEach((speaker, index) => {
            if (speaker.photo_url) {
              const supabase = createClient();
              const { data } = supabase.storage
                .from("event-speakers")
                .getPublicUrl(speaker.photo_url);
              newSpeakerPreviews[index] = data.publicUrl;
            }
          });
          setSpeakerPreviews(newSpeakerPreviews);
        } else {
          toast.error("Event not found");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        toast.error("Failed to fetch event data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [id, form]);

  async function handleSubmit(data: EventSchema) {
    console.log("Form submitted with data:", data);
    toast.success(
      `Form submission started for ${isEditMode ? "updating" : "creating"
      } event`
    );

    try {
      setIsSubmitting(true);

      // Ensure we have valid key highlights
      const validHighlights = keyHighlights.filter(
        (highlight) => highlight.trim() !== ""
      );
      if (validHighlights.length === 0) {
        validHighlights.push("Event details to be announced");
      }

      const supabase = createClient();

      // Check for required fields based on conditional logic
      if (data.mode === "OFFLINE" && !data.address?.trim()) {
        toast.error("Address is required for in-person events");
        return;
      }

      if (data.is_paid && !data.ticket_price) {
        toast.error("Ticket price is required for paid events");
        return;
      }

      let posterUrl = data.poster_url || "";

      // Handle poster upload (only if new file is provided)
      if (posterFile) {
        const posterId = v4();
        const { error } = await supabase.storage
          .from("event-posters")
          .upload(
            `posters/${posterId.toString()}.${posterFile.name
              .split(".")
              .pop()}`,
            posterFile as File
          );

        if (error) {
          toast.error("Failed to upload poster image");
          return;
        }
        posterUrl = `posters/${posterId.toString()}.${posterFile.name.split(".").pop()}`;
      } else if (!isEditMode) {
        toast.error("Please upload a poster image");
        return;
      }

      const updatedSpeakers = [...speakers];

      for (const [index, file] of Object.entries(speakerFiles)) {
        const idx = Number(index);
        if (file) {
          const speakersId = v4();
          const { error: speakerPhotoError } = await supabase.storage
            .from("event-speakers")
            .upload(
              `speakers/${speakersId}.${file.name.split(".").pop()}`,
              file
            );

          if (speakerPhotoError) {
            toast.error(
              `Failed to upload photo for speaker ${speakers[idx].name}`
            );
            return;
          }
          updatedSpeakers[idx].photo_url = `speakers/${speakersId}.jpg`;
        }
      }

      // Before creating the formatted data, ensure form values are updated
      form.setValue("key_highlights", validHighlights);
      form.setValue(
        "speakers",
        updatedSpeakers.filter((speaker) => speaker.name.trim() !== "")
      );
      form.setValue("tags", tags);

      const formattedData = {
        ...data,
        key_highlights: validHighlights,
        tags: tags,
        speakers: updatedSpeakers.filter(
          (speaker) => speaker.name.trim() !== ""
        ),
        poster_url: posterUrl,
        recording_link: data.recording_link?.trim() || undefined,
        feedback_form_link: data.feedback_form_link?.trim() || undefined,
        registration_link: data.registration_link?.trim() || undefined,
      };

      // Use appropriate action based on mode
      const response = isEditMode
        ? await updateEventAction(id!, formattedData)
        : await createEventAction(formattedData);

      console.log(
        `Response from ${isEditMode ? "update" : "create"}EventAction:`,
        response
      );

      if (response.error) {
        toast.error(response.error);
        return;
      } else {
        toast.success(
          `Event ${isEditMode ? "updated" : "created"} successfully!`
        );

        // Only reset form if creating new event
        if (!isEditMode) {
          form.reset();
          setPosterFile(null);
          setPosterPreview("");
          setSpeakerFiles({});
          setSpeakerPreviews({});
          setSpeakers([{ name: "", bio: "", photo_url: "" }]);
          setKeyHighlights([""]);
          setTags([]);
          setNewTag("");
          setCurrentStep(1);
        }

        if (!isEditMode) {
          router.push(`/events/${response.data?.id}`);
        } else {
          router.push(`/events/${id}`);
        }

      }
    } catch (error) {
      console.log(
        `JSON Error ${isEditMode ? "updating" : "creating"} event:`,
        JSON.stringify(error)
      );
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} event:`,
        typeof error,
        error
      );
      toast.error(
        `Failed to ${isEditMode ? "update" : "create"} event. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const addKeyHighlight = () => {
    setKeyHighlights([...keyHighlights, ""]);
  };

  const removeKeyHighlight = (index: number) => {
    setKeyHighlights(keyHighlights.filter((_, i) => i !== index));
  };

  const updateKeyHighlight = (index: number, value: string) => {
    const updated = [...keyHighlights];
    updated[index] = value;
    setKeyHighlights(updated);
    form.setValue(
      "key_highlights",
      updated.filter((h) => h.trim() !== "")
    );
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      form.setValue("tags", updatedTags);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(updatedTags);
    form.setValue("tags", updatedTags);
  };

  // Speaker management functions
  const addSpeaker = () => {
    const newSpeaker = { name: "", bio: "", photo_url: "" };
    setSpeakers([...speakers, newSpeaker]);
  };

  const removeSpeaker = (index: number) => {
    if (speakers.length > 1) {
      const updatedSpeakers = speakers.filter((_, i) => i !== index);
      setSpeakers(updatedSpeakers);
      form.setValue("speakers", updatedSpeakers);

      // Clean up file previews
      setSpeakerFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[index];
        return newFiles;
      });
      setSpeakerPreviews((prev) => {
        const newPreviews = { ...prev };
        delete newPreviews[index];
        return newPreviews;
      });
    }
  };

  const updateSpeaker = (
    index: number,
    field: keyof EventSpeakerSchema,
    value: string
  ) => {
    const updatedSpeakers = [...speakers];
    updatedSpeakers[index] = { ...updatedSpeakers[index], [field]: value };
    setSpeakers(updatedSpeakers);

    // Update form value with valid speakers (those with names)
    const validSpeakers = updatedSpeakers.filter(
      (speaker) => speaker.name.trim() !== ""
    );
    form.setValue("speakers", validSpeakers);

    // Clear any previous speaker-related errors
    form.clearErrors(`speakers.${index}.${field}`);
  };

  const nextStep = () => {
    if (currentStep < FORM_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    console.log("Navigating to step:", step);
    setCurrentStep(step);
  };

  const currentStepData = FORM_STEPS.find((step) => step.id === currentStep);
  const progress = (currentStep / FORM_STEPS.length) * 100;

  // File upload handlers
  const handlePosterUpload = (file: File) => {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Poster image is too large (max 5MB)");
      return;
    }

    setPosterFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPosterPreview(result);
      // Using a placeholder URL for validation purposes, the actual URL will be set after upload
      form.setValue("poster_url", "placeholder-will-be-uploaded");
      form.clearErrors("poster_url");
    };
    reader.readAsDataURL(file);
  };

  const handleSpeakerPhotoUpload = (speakerIndex: number, file: File) => {
    setSpeakerFiles((prev) => ({ ...prev, [speakerIndex]: file }));
    const reader = new FileReader();
    reader.onloadend = () => {
      setSpeakerPreviews((prev) => ({
        ...prev,
        [speakerIndex]: reader.result as string,
      }));
      updateSpeaker(speakerIndex, "photo_url", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Comprehensive form validation before submission
  const validateForm = (): boolean => {
    let isValid = true;
    const formValues = form.getValues();

    // Basic required fields
    if (!formValues.name?.trim()) {
      form.setError("name", {
        type: "manual",
        message: "Event name is required",
      });
      isValid = false;
    }

    if (!formValues.slug?.trim()) {
      form.setError("slug", { type: "manual", message: "Slug is required" });
      isValid = false;
    } else if (!/^[a-z0-9-]+$/.test(formValues.slug)) {
      form.setError("slug", {
        type: "manual",
        message:
          "Slug must contain only lowercase letters, numbers, and hyphens",
      });
      isValid = false;
    }

    if (!formValues.description?.trim() || formValues.description.length < 10) {
      form.setError("description", {
        type: "manual",
        message: "Description must be at least 10 characters",
      });
      isValid = false;
    }

    // Poster image validation
    if (!posterFile && !formValues.poster_url) {
      form.setError("poster_url", {
        type: "manual",
        message: "Event poster is required",
      });
      isValid = false;
    } else if (!isEditMode && !posterFile) {
      // For create mode, we need an uploaded file
      form.setError("poster_url", {
        type: "manual",
        message: "Please upload a poster image",
      });
      isValid = false;
    }

    // Check conditional fields
    if (formValues.mode === "OFFLINE" && !formValues.address?.trim()) {
      form.setError("address", {
        type: "manual",
        message: "Address is required for in-person events",
      });
      isValid = false;
    }

    // if (formValues.registration_required && !formValues.registration_link?.trim()) {
    //   form.setError("registration_link", {
    //     type: "manual",
    //     message: "Registration link is required when registration is enabled",
    //   });
    //   isValid = false;
    // }

    if (formValues.is_paid && !formValues.ticket_price) {
      form.setError("ticket_price", {
        type: "manual",
        message: "Ticket price is required for paid events",
      });
      isValid = false;
    }

    // Date and time validations
    if (
      formValues.end_date &&
      formValues.start_date &&
      new Date(formValues.end_date) < new Date(formValues.start_date)
    ) {
      form.setError("end_date", {
        type: "manual",
        message: "End date cannot be earlier than start date",
      });
      isValid = false;
    }

    if (
      formValues.end_time &&
      formValues.start_time &&
      new Date(formValues.end_time) < new Date(formValues.start_time)
    ) {
      form.setError("end_time", {
        type: "manual",
        message: "End time cannot be earlier than start time",
      });
      isValid = false;
    }

    // Key highlights validation
    const validHighlights = keyHighlights.filter((h) => h.trim() !== "");
    if (validHighlights.length === 0) {
      toast.error("Add at least one key highlight");
      isValid = false;
    }

    // Organizer validation
    if (!formValues.organizer_name?.trim()) {
      form.setError("organizer_name", {
        type: "manual",
        message: "Organizer name is required",
      });
      isValid = false;
    }

    return isValid;
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-3 py-4 sm:p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Loading Event...
          </h1>
          <p className="text-muted-foreground">
            Please wait while we fetch the event data
          </p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 py-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {isEditMode ? "Edit Event" : "Create New Event"}
        </h1>
        <p className="text-muted-foreground">
          Follow the steps below to{" "}
          {isEditMode ? "update the" : "create a comprehensive"} event
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span>
            Step {currentStep} of {FORM_STEPS.length}
          </span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {FORM_STEPS.map((step) => {
          const Icon = step.icon;
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(step.id)}
              disabled={false}
              className={cn(
                "group relative p-4 rounded-xl border text-left transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer",
                isCurrent && [
                  "border-primary bg-gradient-to-br from-primary/10 to-primary/5",
                  "shadow-md ring-2 ring-primary/10",
                ],
                isCompleted &&
                !isCurrent && [
                  "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50",
                  "hover:border-green-600 hover:shadow-green-100",
                ],
                !isCurrent &&
                !isCompleted && [
                  "border-border bg-background",
                  "hover:border-muted-foreground/40 hover:bg-muted/30",
                ]
              )}
            >
              {/* Step Number Badge */}
              <div
                className={cn(
                  "absolute -top-2 -left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors",
                  isCurrent &&
                  "bg-primary text-primary-foreground border-primary",
                  isCompleted && "bg-green-500 text-white border-green-500",
                  !isCurrent &&
                  !isCompleted &&
                  "bg-muted text-muted-foreground border-muted-foreground/20"
                )}
              >
                {isCompleted ? (
                  <CheckIcon className="h-3 w-3" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>

              {/* Icon and Title */}
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                    isCurrent && "bg-primary/10 text-primary",
                    isCompleted && "bg-green-100 text-green-600",
                    !isCurrent &&
                    !isCompleted &&
                    "bg-muted/50 text-muted-foreground group-hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className={cn(
                      "font-semibold text-sm leading-tight transition-colors",
                      isCurrent && "text-primary",
                      isCompleted && "text-green-700",
                      !isCurrent &&
                      !isCompleted &&
                      "text-foreground group-hover:text-foreground"
                    )}
                  >
                    {step.title}
                  </h4>
                </div>
              </div>

              {/* Description */}
              <p
                className={cn(
                  "text-xs leading-relaxed transition-colors hidden sm:block",
                  isCurrent && "text-primary/70",
                  isCompleted && "text-green-600/70",
                  !isCurrent &&
                  !isCompleted &&
                  "text-muted-foreground group-hover:text-muted-foreground/80"
                )}
              >
                {step.description}
              </p>

              {/* Progress Indicator */}
              <div
                className={cn(
                  "absolute bottom-0 left-0 h-1 rounded-b-xl transition-all duration-500",
                  isCurrent &&
                  "w-full bg-gradient-to-r from-primary/60 to-primary",
                  isCompleted &&
                  "w-full bg-gradient-to-r from-green-400 to-green-500",
                  !isCurrent && !isCompleted && "w-0 bg-muted-foreground/20"
                )}
              />
            </button>
          );
        })}
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            form.setValue(
              "key_highlights",
              keyHighlights.filter((h) => h.trim() !== "")
            );
            form.setValue("tags", tags);
            form.setValue(
              "speakers",
              speakers.filter((speaker) => speaker.name.trim() !== "")
            );

            // Run our comprehensive validation
            if (!validateForm()) {
              toast.error("Please fix all validation errors before submitting");
              e.preventDefault();
              return;
            }

            form.handleSubmit(
              (data) => {
                console.log("Form validation passed", data);
                handleSubmit(data);
              },
              (errors) => {
                console.error("Form validation failed", errors);
                console.log("Validation errors:", JSON.stringify(errors));
                toast.error("Please correct the form errors before submitting");

                // Find which step contains errors and navigate to it
                const errorKeys = Object.keys(errors);
                if (errorKeys.length > 0) {
                  // Navigation logic based on error fields
                  if (
                    errorKeys.some((k) =>
                      [
                        "name",
                        "slug",
                        "description",
                        "poster_url",
                        "key_highlights",
                        "note",
                      ].includes(k)
                    )
                  ) {
                    setCurrentStep(1);
                  } else if (
                    errorKeys.some((k) =>
                      [
                        "mode",
                        "event_type",
                        "status",
                        "address",
                        "organizer_name",
                        "organizer_contact",
                      ].includes(k)
                    )
                  ) {
                    setCurrentStep(2);
                  } else if (
                    errorKeys.some((k) =>
                      [
                        "start_date",
                        "end_date",
                        "start_time",
                        "end_time",
                      ].includes(k)
                    )
                  ) {
                    setCurrentStep(3);
                  } else if (errorKeys.some((k) => k.startsWith("speakers"))) {
                    setCurrentStep(4);
                  } else if (
                    errorKeys.some((k) =>
                      [
                        "registration_required",
                        "registration_link",
                        "is_paid",
                        "ticket_price",
                      ].includes(k)
                    )
                  ) {
                    setCurrentStep(5);
                  } else {
                    setCurrentStep(6);
                  }
                }
              }
            )(e);
          }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentStepData && (
                  <currentStepData.icon className="h-5 w-5" />
                )}
                {currentStepData?.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentStepData?.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter event name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel>Slug</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0"
                                >
                                  <HelpCircleIcon className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Event Slug</h4>
                                  <p className="text-sm text-muted-foreground">
                                    A URL-friendly identifier for your event.
                                    Use lowercase letters, numbers, and hyphens
                                    only. Example: &quot;ai-workshop-2024&quot;
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <FormControl>
                            <Input placeholder="Enter event slug" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormLabel>Description</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0"
                              >
                                <HelpCircleIcon className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-medium">
                                  Event Description
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Provide a detailed description of your event.
                                  Include what attendees will learn, the format,
                                  and any prerequisites. This will be visible to
                                  potential attendees.
                                </p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your event in detail. What will attendees learn or experience?"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="poster_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Event Poster
                        </FormLabel>
                        <div className="space-y-4">
                          {/* File Upload */}
                          <div className="flex items-center gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                document
                                  .getElementById("poster-upload")
                                  ?.click()
                              }
                              className="flex items-center gap-2"
                            >
                              <UploadIcon className="h-4 w-4" />
                              Upload Image
                            </Button>
                            <input
                              id="poster-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePosterUpload(file);
                              }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {posterFile
                                ? posterFile.name
                                : "No file selected"}
                            </span>
                          </div>

                          {/* URL Input as alternative */}
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">
                              Or enter image URL
                            </Label>
                            <FormControl>
                              <Input
                                placeholder="https://example.com/poster.jpg"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (e.target.value && !posterFile) {
                                    setPosterPreview(e.target.value);
                                  }
                                }}
                              />
                            </FormControl>
                          </div>

                          {/* Preview */}
                          {(posterPreview || field.value) && (
                            <div className="mt-4">
                              <Label className="text-sm text-muted-foreground">
                                Preview
                              </Label>
                              <div className="mt-2 border rounded-lg p-4 bg-muted/30">
                                <Image
                                  src={posterPreview || field.value || ""}
                                  alt="Poster preview"
                                  className="max-w-full h-48 object-cover rounded-md mx-auto"
                                  width={300}
                                  height={200}
                                  onError={() => {
                                    setPosterPreview("");
                                    if (posterFile) setPosterFile(null);
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <FormDescription>
                          Upload an image file or provide a URL for your event
                          poster
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Key Highlights */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Label>Key Highlights</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0"
                          >
                            <HelpCircleIcon className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Key Highlights</h4>
                            <p className="text-sm text-muted-foreground">
                              Add the most important points or benefits of
                              attending your event. These will be prominently
                              displayed to attract attendees.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {keyHighlights.map((highlight, index) => (
                      <div key={index} className="flex gap-3">
                        <Input
                          placeholder="Enter key highlight"
                          value={highlight}
                          onChange={(e) =>
                            updateKeyHighlight(index, e.target.value)
                          }
                          className="flex-1"
                        />
                        {keyHighlights.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeKeyHighlight(index)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addKeyHighlight}
                      className="w-full"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Highlight
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional notes or special instructions"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 2: Event Details */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Mode</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ONLINE">Online</SelectItem>
                              <SelectItem value="OFFLINE">In-Person</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="event_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SESSION">Session</SelectItem>
                              <SelectItem value="WORKSHOP">Workshop</SelectItem>
                              <SelectItem value="WEBINAR">Webinar</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="UPCOMING">Upcoming</SelectItem>
                              <SelectItem value="COMPLETED">
                                Completed
                              </SelectItem>
                              <SelectItem value="CANCELLED">
                                Cancelled
                              </SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Address (conditional) */}
                  {watchMode === "OFFLINE" && (
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPinIcon className="h-4 w-4" />
                            Event Address
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter the complete address where the event will be held"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Separator />

                  {/* Organizer Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      Organizer Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="organizer_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organizer Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter organizer name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="organizer_contact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organizer Contact (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone or email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Schedule */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Event Date Range</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  (!field.value ||
                                    !form.getValues("end_date")) &&
                                  "text-muted-foreground"
                                )}
                              >
                                {field.value && form.getValues("end_date") ? (
                                  `${format(field.value, "PPP")} - ${format(
                                    form.getValues("end_date")?.toString() ||
                                    new Date().toString(),
                                    "PPP"
                                  )}`
                                ) : (
                                  <span>Pick date range</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              captionLayout="dropdown"
                              mode="range"
                              selected={{
                                from: field.value,
                                to: form.getValues("end_date"),
                              }}
                              onSelect={(range) => {
                                field.onChange(range?.from || null);
                                form.setValue(
                                  "end_date",
                                  range?.to ?? undefined
                                );
                              }}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              value={
                                field.value ? format(field.value, "HH:mm") : ""
                              }
                              onChange={(e) =>
                                field.onChange(
                                  new Date(`1970-01-01T${e.target.value}`)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              value={
                                field.value ? format(field.value, "HH:mm") : ""
                              }
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? new Date(`1970-01-01T${e.target.value}`)
                                    : undefined
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Speakers */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  {speakers.map((speaker, index) => (
                    <Card key={index} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          Speaker {index + 1}
                        </h4>
                        {speakers.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSpeaker(index)}
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>

                      <div className="space-y-6">
                        {/* Speaker Name */}
                        <FormField
                          control={form.control}
                          name={`speakers.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Speaker Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter speaker name"
                                  value={speaker.name}
                                  onChange={(e) => {
                                    updateSpeaker(
                                      index,
                                      "name",
                                      e.target.value
                                    );
                                    field.onChange(e.target.value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Speaker Photo */}
                        <FormField
                          control={form.control}
                          name={`speakers.${index}.photo_url`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                Speaker Photo (Optional)
                              </FormLabel>
                              <div className="space-y-4">
                                {/* File Upload */}
                                <div className="flex items-center gap-4">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      document
                                        .getElementById(
                                          `speaker-photo-${index}`
                                        )
                                        ?.click()
                                    }
                                    className="flex items-center gap-2"
                                  >
                                    <UploadIcon className="h-4 w-4" />
                                    Upload Photo
                                  </Button>
                                  <input
                                    id={`speaker-photo-${index}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file)
                                        handleSpeakerPhotoUpload(index, file);
                                    }}
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {speakerFiles[index]
                                      ? speakerFiles[index]?.name
                                      : "No file selected"}
                                  </span>
                                </div>

                                {/* URL Input as alternative */}
                                <div className="space-y-2">
                                  <Label className="text-sm text-muted-foreground">
                                    Or enter image URL
                                  </Label>
                                  <FormControl>
                                    <Input
                                      placeholder="https://example.com/photo.jpg"
                                      value={speaker.photo_url || ""}
                                      onChange={(e) => {
                                        updateSpeaker(
                                          index,
                                          "photo_url",
                                          e.target.value
                                        );
                                        field.onChange(e.target.value);
                                        if (
                                          e.target.value &&
                                          !speakerFiles[index]
                                        ) {
                                          setSpeakerPreviews((prev) => ({
                                            ...prev,
                                            [index]: e.target.value,
                                          }));
                                        }
                                      }}
                                    />
                                  </FormControl>
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Speaker Bio */}
                        <FormField
                          control={form.control}
                          name={`speakers.${index}.bio`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Speaker Bio (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Brief bio about the speaker, their expertise, and background"
                                  value={speaker.bio || ""}
                                  onChange={(e) => {
                                    updateSpeaker(index, "bio", e.target.value);
                                    field.onChange(e.target.value);
                                  }}
                                  rows={3}
                                />
                              </FormControl>
                              <FormDescription>
                                Add speaker&apos;s background, expertise, and
                                credentials
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Speaker Preview */}
                        {(speakerPreviews[index] || speaker.photo_url) &&
                          speaker.name && (
                            <div className="mt-4">
                              <Label className="text-sm text-muted-foreground">
                                Speaker Preview
                              </Label>
                              <div className="mt-2 p-4 bg-muted/30 rounded-lg">
                                <div className="flex items-start gap-4">
                                  <Avatar className="h-16 w-16">
                                    <AvatarImage
                                      src={
                                        speakerPreviews[index] ||
                                        speaker.photo_url
                                      }
                                      alt={speaker.name}
                                      onError={() => {
                                        setSpeakerPreviews((prev) => {
                                          const newPreviews = { ...prev };
                                          delete newPreviews[index];
                                          return newPreviews;
                                        });
                                        if (speakerFiles[index]) {
                                          setSpeakerFiles((prev) => {
                                            const newFiles = { ...prev };
                                            delete newFiles[index];
                                            return newFiles;
                                          });
                                        }
                                      }}
                                    />
                                    <AvatarFallback className="text-lg">
                                      {speaker.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <h5 className="font-medium text-base">
                                      {speaker.name}
                                    </h5>
                                    {speaker.bio && (
                                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                                        {speaker.bio}
                                      </p>
                                    )}
                                    <Badge variant="secondary" className="mt-2">
                                      Speaker Preview
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSpeaker}
                    className="w-full"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Another Speaker
                  </Button>

                  {speakers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>
                        No speakers added yet. Click &quot;Add Speaker&quot; to
                        get started.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Registration & Payment */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  {/* Registration Settings */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="registration_required"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              Registration Required
                            </FormLabel>
                            <FormDescription>
                              Require users to register for this event
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {watchRegistrationRequired && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                        <FormField
                          control={form.control}
                          name="registration_link"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Registration Link</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://example.com/register"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="registration_limit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Registration Limit (Optional)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Maximum participants"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  {/* Payment Settings */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="is_paid"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium flex items-center gap-2">
                              <CreditCardIcon className="h-4 w-4" />
                              Paid Event
                            </FormLabel>
                            <FormDescription>
                              This is a paid event requiring ticket purchase
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {watchIsPaid && (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <FormField
                          control={form.control}
                          name="ticket_price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ticket Price (₹)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Price in INR"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 6: Additional Details */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="recording_link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" />
                            Recording Link (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/recording"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Link to event recording (can be added after the
                            event)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="feedback_form_link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feedback Form Link (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/feedback"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Link to collect feedback from attendees
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Tags */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Label className="flex items-center gap-2">
                        <TagIcon className="h-4 w-4" />
                        Tags
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0"
                          >
                            <HelpCircleIcon className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Event Tags</h4>
                            <p className="text-sm text-muted-foreground">
                              Add relevant tags to help categorize your event
                              and make it discoverable. Examples: AI, Machine
                              Learning, Web Development, etc.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/10 transition-colors"
                        >
                          {tag}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-auto p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeTag(tag)}
                          >
                            ×
                          </Button>
                        </Badge>
                      ))}
                      {tags.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No tags added yet
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag (e.g., AI, ML, Web Dev)"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && (e.preventDefault(), addTag())
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addTag}
                        disabled={!newTag.trim()}
                      >
                        Add Tag
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-8 -mx-3 px-3 sm:-mx-6 sm:px-6 py-6 mt-8 rounded-b-lg">
            {/* Previous Button */}
            <div className="flex-1 order-3 sm:order-none">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={prevStep}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group"
                >
                  <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground/70">
                      Previous
                    </div>
                    <div className="font-medium">
                      {FORM_STEPS.find((s) => s.id === currentStep - 1)?.title}
                    </div>
                  </div>
                </Button>
              ) : (
                <div />
              )}
            </div>

            {/* Step Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-4 order-2 sm:order-none">
              <div className="flex gap-1">
                {FORM_STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      step.id === currentStep && "w-8 bg-primary",
                      step.id < currentStep && "bg-green-500",
                      step.id > currentStep && "bg-muted-foreground/20"
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                {currentStep} of {FORM_STEPS.length}
              </span>
            </div>

            {/* Next/Submit Button */}
            <div className="flex-1 flex justify-end order-1 sm:order-none">
              {currentStep === FORM_STEPS.length ? (
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex items-center gap-2"
                    disabled={isSubmitting}
                    onClick={() => {
                      console.log("Submit button clicked");
                      // Make sure the form knows we're at the final step
                      setCurrentStep(FORM_STEPS.length);
                      // Focus on the button to ensure the form submission works
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        {isEditMode ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <SaveIcon className="h-4 w-4" />
                        {isEditMode ? "Update Event" : "Create Event"}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 group"
                >
                  Next
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
