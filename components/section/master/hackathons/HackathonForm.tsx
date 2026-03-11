"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Plus, Info, MapPin, Clock, User, Link, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { hackathonSchema, HackathonSchema } from "@/schemas/hackathon";
import { createHackathonAction } from "./createHackathonAction";
import { updateHackathonAction } from "./updateHackathonAction";

const FORM_STEPS = [
  {
    id: 1,
    title: "Basic Info",
    description: "Hackathon name, description, & poster details",
    icon: Info,
  },
  {
    id: 2,
    title: "Hackathon Details",
    description: "Mode, location, and organizer info",
    icon: MapPin,
  },
  {
    id: 3,
    title: "Dates & Times",
    description: "Event dates, registration period, and timing",
    icon: Clock,
  },
  {
    id: 4,
    title: "Problem Statements",
    description: "Define hackathon challenges",
    icon: User,
  },
  {
    id: 5,
    title: "Rules & Criteria",
    description: "Set rules and evaluation criteria",
    icon: CreditCard,
  },
  {
    id: 6,
    title: "Additional Details",
    description: "Tags and team size settings",
    icon: Link,
  },
];

interface HackathonProblemStatementSchema {
  code: string;
  title: string;
  description: string;
}

interface HackathonFormProps {
  id?: string;
}

export default function HackathonForm({ id }: HackathonFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [rules, setRules] = useState<string[]>([""]);
  const [evaluationCriteria, setEvaluationCriteria] = useState<string[]>([""]);
  const [problemStatements, setProblemStatements] = useState<HackathonProblemStatementSchema[]>([
    { code: "", title: "", description: "" },
  ]);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = Boolean(id);
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(hackathonSchema),
    defaultValues: {
      name: "",
      description: "",
      poster_url: undefined,
      location: "",
      start_date: new Date(),
      end_date: new Date(),
      start_time: new Date(),
      end_time: new Date(),
      registration_start_date: new Date(),
      registration_end_date: new Date(),
      registration_limit: undefined,
      mode: "OFFLINE" as const,
      status: "UPCOMING" as const,
      team_size_limit: 5,
      allow_external_students: true,
      organizer_name: "",
      organizer_contact: "",
      rules: [""],
      evaluationCriteria: [""],
      problemStatements: [],
      tags: [],
    },
  });

  const watchMode = form.watch("mode");

  // Fetch hackathon data if in edit mode
  useEffect(() => {
    const fetchHackathonData = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        // Fetch hackathon data here
        const response = await fetch(`/api/hackathons/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch hackathon data");
        }

        const data = await response.json();
        const hackathonData = data.hackathon;
        console.log("Fetched hackathon data:", hackathonData);
        
        if (!hackathonData) {
          throw new Error("No hackathon data received");
        }
        // Populate form with hackathon data
        form.reset({
          name: hackathonData.name || "",
          description: hackathonData.description || "",
          poster_url: hackathonData.poster_url || "",
          location: hackathonData.location || "",
          start_date: hackathonData.start_date ? new Date(hackathonData.start_date) : new Date(),
          end_date: hackathonData.end_date ? new Date(hackathonData.end_date) : new Date(),
          start_time: hackathonData.start_time ? new Date(hackathonData.start_time) : new Date(),
          end_time: hackathonData.end_time ? new Date(hackathonData.end_time) : new Date(),
          registration_start_date: hackathonData.registration_start_date ? new Date(hackathonData.registration_start_date) : new Date(),
          registration_end_date: hackathonData.registration_end_date ? new Date(hackathonData.registration_end_date) : new Date(),
          registration_limit: hackathonData.registration_limit || undefined,
          mode: hackathonData.mode || "OFFLINE",
          status: hackathonData.status || "UPCOMING",
          team_size_limit: hackathonData.team_size_limit || 5,
          allow_external_students: hackathonData.allow_external_students ?? true,
          organizer_name: hackathonData.organizer_name || "",
          organizer_contact: hackathonData.organizer_contact || "",
        });

        // Set rules - handle both array of strings and array of objects
        if (hackathonData.rules && hackathonData.rules.length > 0) {
          const rulesArray = hackathonData.rules.map((rule: any) => 
            typeof rule === 'string' ? rule : rule.rule
          );
          setRules(rulesArray);
        }

        // Set evaluation criteria
        if (hackathonData.evaluationCriteria && hackathonData.evaluationCriteria.length > 0) {
          setEvaluationCriteria(hackathonData.evaluationCriteria);
        }

        // Set problem statements
        if (hackathonData.problemStatements && hackathonData.problemStatements.length > 0) {
          setProblemStatements(hackathonData.problemStatements);
        }

        // Set tags
        if (hackathonData.tags && hackathonData.tags.length > 0) {
          setTags(hackathonData.tags);
        }

        // Set poster preview if available
        if (hackathonData.poster_url) {
          setPosterPreview(hackathonData.poster_url);
        }

      } catch (error) {
        console.error("Error fetching hackathon data:", error);
        toast.error("Failed to load hackathon data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHackathonData();
  }, [id, form]);

  async function handleSubmit(data: HackathonSchema) {
    console.log("Form submitted with data:", data);
    toast.success(
      `Form submission started for ${
        isEditMode ? "updating" : "creating"
      } hackathon`
    );

    try {
      setIsSubmitting(true);

      // Ensure we have valid rules
      const validRules = rules.filter((rule) => rule.trim() !== "");
      if (validRules.length === 0) {
        toast.error("Please add at least one rule for the hackathon");
        return;
      }

      // Ensure we have valid evaluation criteria
      const validCriteria = evaluationCriteria.filter((criteria) => criteria.trim() !== "");
      if (validCriteria.length === 0) {
        toast.error("Please add at least one evaluation criterion");
        return;
      }

      // Ensure we have valid problem statements
      const validProblemStatements = problemStatements.filter(
        (ps) => ps.code.trim() !== "" && ps.title.trim() !== "" && ps.description.trim() !== ""
      );
      if (validProblemStatements.length === 0) {
        toast.error("Please add at least one problem statement");
        return;
      }

      const supabase = createClient();

      // Check for required fields based on conditional logic
      if (data.mode === "OFFLINE" && !data.location?.trim()) {
        toast.error("Location is required for offline hackathons");
        return;
      }

      let posterUrl = data.poster_url || "";

      // Handle poster upload (only if new file is provided)
      if (posterFile) {
        const fileExt = posterFile.name.split(".").pop();
        const filePath = `hackathon_posters/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error } = await supabase.storage
          .from("hackathons")
          .upload(filePath, posterFile);

        if (error) {
          console.error("Error uploading poster:", error);
          toast.error("Failed to upload poster image. Please try again.");
          return;
        }

        // Get public URL for the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from("hackathons")
          .getPublicUrl(filePath);

        posterUrl = publicUrlData.publicUrl;
      } else if (!isEditMode && !posterUrl) {
        toast.error("Please upload a poster image for the hackathon");
        return;
      }

      // Before creating the formatted data, ensure form values are updated
      form.setValue("rules", validRules);
      form.setValue("evaluationCriteria", validCriteria);
      form.setValue("problemStatements", validProblemStatements);
      form.setValue("tags", tags);

      const formattedData = {
        ...data,
        poster_url: posterUrl,
        rules: validRules,
        evaluationCriteria: validCriteria,
        problemStatements: validProblemStatements,
        tags: tags,
      };

      // Use appropriate action based on mode
      try {
        console.log("Submitting form data:", JSON.stringify(formattedData, null, 2));

        const response = isEditMode
          ? await updateHackathonAction(id!, formattedData)
          : await createHackathonAction(formattedData);

        console.log(
          `Response from ${isEditMode ? "update" : "create"}HackathonAction:`,
          response
        );

        if (response && response.error) {
          toast.error(`Error: ${response.error}`);
          setIsSubmitting(false);
        } else if (response && response.success) {
          toast.success(`Hackathon ${isEditMode ? "updated" : "created"} successfully!`);
          // Short delay before navigation to ensure toast is seen
          setTimeout(() => {
            router.push("/master/hackathons");
          }, 1000);
        } else {
          toast.error("Received invalid response from server");
          setIsSubmitting(false);
        }
      } catch (actionError) {
        console.error("Action execution error:", actionError);
        toast.error(`Error executing action: ${actionError instanceof Error ? actionError.message : "Unknown error"}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.log(
        `JSON Error ${isEditMode ? "updating" : "creating"} hackathon:`,
        JSON.stringify(error)
      );
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} hackathon:`,
        typeof error,
        error
      );
      toast.error(
        `Failed to ${isEditMode ? "update" : "create"} hackathon. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Rules management functions
  const addRule = () => {
    setRules([...rules, ""]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, value: string) => {
    const updated = [...rules];
    updated[index] = value;
    setRules(updated);
    form.setValue(
      "rules",
      updated.filter((r) => r.trim() !== "")
    );
  };

  // Evaluation criteria management functions
  const addCriterion = () => {
    setEvaluationCriteria([...evaluationCriteria, ""]);
  };

  const removeCriterion = (index: number) => {
    setEvaluationCriteria(evaluationCriteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, value: string) => {
    const updated = [...evaluationCriteria];
    updated[index] = value;
    setEvaluationCriteria(updated);
    form.setValue(
      "evaluationCriteria",
      updated.filter((c) => c.trim() !== "")
    );
  };

  // Problem statement management functions
  const addProblemStatement = () => {
    setProblemStatements([...problemStatements, { code: "", title: "", description: "" }]);
  };

  const removeProblemStatement = (index: number) => {
    if (problemStatements.length > 1) {
      setProblemStatements(problemStatements.filter((_, i) => i !== index));
    }
  };

  const updateProblemStatement = (
    index: number,
    field: keyof HackathonProblemStatementSchema,
    value: string
  ) => {
    const updated = [...problemStatements];
    updated[index] = { ...updated[index], [field]: value };
    setProblemStatements(updated);

    // Update form value with valid problem statements
    const validProblemStatements = updated.filter(
      (ps) => ps.code.trim() !== "" && ps.title.trim() !== "" && ps.description.trim() !== ""
    );
    form.setValue("problemStatements", validProblemStatements);
  };

  // Tag management functions
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

  // Navigation functions
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

  // Comprehensive form validation before submission
  const validateForm = (): boolean => {
    let isValid = true;
    const formValues = form.getValues();

    // Basic required fields
    if (!formValues.name?.trim()) {
      form.setError("name", {
        type: "manual",
        message: "Hackathon name is required",
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
    if (!posterFile && !formValues.poster_url && !isEditMode) {
      form.setError("poster_url", {
        type: "manual",
        message: "Hackathon poster is required",
      });
      isValid = false;
    }

    // Check conditional fields
    if (formValues.mode === "OFFLINE" && !formValues.location?.trim()) {
      form.setError("location", {
        type: "manual",
        message: "Location is required for offline hackathons",
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
        message: "End date must be after start date",
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
        message: "End time must be after start time",
      });
      isValid = false;
    }

    if (
      formValues.registration_end_date &&
      formValues.registration_start_date &&
      new Date(formValues.registration_end_date) < new Date(formValues.registration_start_date)
    ) {
      form.setError("registration_end_date", {
        type: "manual",
        message: "Registration end date must be after registration start date",
      });
      isValid = false;
    }

    if (
      formValues.registration_end_date &&
      formValues.start_date &&
      new Date(formValues.registration_end_date) > new Date(formValues.start_date)
    ) {
      form.setError("registration_end_date", {
        type: "manual",
        message: "Registration should end before hackathon starts",
      });
      isValid = false;
    }

    // Rules validation
    const validRules = rules.filter((r) => r.trim() !== "");
    if (validRules.length === 0) {
      form.setError("rules", {
        type: "manual",
        message: "At least one rule is required",
      });
      isValid = false;
    }

    // Evaluation criteria validation
    const validCriteria = evaluationCriteria.filter((c) => c.trim() !== "");
    if (validCriteria.length === 0) {
      form.setError("evaluationCriteria", {
        type: "manual",
        message: "At least one evaluation criterion is required",
      });
      isValid = false;
    }

    // Problem statements validation
    const validProblemStatements = problemStatements.filter(
      (ps) => ps.code.trim() !== "" && ps.title.trim() !== "" && ps.description.trim() !== ""
    );
    if (validProblemStatements.length === 0) {
      form.setError("problemStatements", {
        type: "manual",
        message: "At least one problem statement is required",
      });
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {isEditMode ? "Edit Hackathon" : "Create New Hackathon"}
        </h1>
        <p className="text-muted-foreground">
          {isEditMode
            ? "Update hackathon details and settings"
            : "Fill out the form to create a new hackathon"}
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Progress value={progress} className="h-2" />
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of {FORM_STEPS.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {FORM_STEPS.map((step) => (
            <Button
              key={step.id}
              variant={currentStep === step.id ? "default" : "outline"}
              className={cn(
                "flex flex-col h-20 items-center justify-center text-xs",
                currentStep === step.id
                  ? "border-2 border-primary"
                  : "border border-input"
              )}
              onClick={() => goToStep(step.id)}
            >
              <step.icon className="h-4 w-4 mb-1" />
              <div className="font-medium">{step.title}</div>
            </Button>
          ))}
        </div>

        {currentStepData && (
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">
              {currentStepData.description}
            </p>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hackathon Name*</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter the name of the hackathon"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description*</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter a detailed description of the hackathon"
                            className="min-h-32"
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
                        <FormLabel>Hackathon Poster*</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handlePosterUpload(e.target.files[0]);
                                }
                              }}
                              className="cursor-pointer"
                            />
                            {posterPreview && (
                              <div className="relative mt-2 inline-block">
                                <img
                                  src={posterPreview}
                                  alt="Poster preview"
                                  className="h-48 w-auto object-contain border rounded-md"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-6 w-6"
                                  onClick={() => {
                                    setPosterFile(null);
                                    setPosterPreview("");
                                    if (!isEditMode) {
                                      form.setValue("poster_url", undefined);
                                    }
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Upload a poster image for the hackathon (max 5MB).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Hackathon Details */}
          {currentStep === 2 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hackathon Mode*</FormLabel>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="offline"
                              value="OFFLINE"
                              checked={field.value === "OFFLINE"}
                              onChange={() => field.onChange("OFFLINE")}
                              className="radio"
                            />
                            <label htmlFor="offline" className="cursor-pointer">
                              Offline
                            </label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="online"
                              value="ONLINE"
                              checked={field.value === "ONLINE"}
                              onChange={() => field.onChange("ONLINE")}
                              className="radio"
                            />
                            <label htmlFor="online" className="cursor-pointer">
                              Online
                            </label>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchMode === "OFFLINE" && (
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter the location of the hackathon"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="organizer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organizer Name*</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter the name of the organizing entity"
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
                        <FormLabel>Organizer Contact</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter contact information for the organizer"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hackathon Status*</FormLabel>
                        <FormControl>
                          <select
                            className="w-full p-2 border rounded-md"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            <option value="UPCOMING">Upcoming</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Dates & Times */}
          {currentStep === 3 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date*</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={new Date(field.value)}
                                onSelect={(date) => field.onChange(date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date*</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={new Date(field.value)}
                                onSelect={(date) => field.onChange(date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time*</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              value={format(new Date(field.value), "HH:mm")}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value
                                  .split(":")
                                  .map(Number);
                                const newDate = new Date(field.value);
                                newDate.setHours(hours, minutes);
                                field.onChange(newDate);
                              }}
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
                          <FormLabel>End Time*</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              value={format(new Date(field.value), "HH:mm")}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value
                                  .split(":")
                                  .map(Number);
                                const newDate = new Date(field.value);
                                newDate.setHours(hours, minutes);
                                field.onChange(newDate);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Registration Period</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="registration_start_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Registration Start Date*</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(new Date(field.value), "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={new Date(field.value)}
                                  onSelect={(date) => field.onChange(date)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="registration_end_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Registration End Date*</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(new Date(field.value), "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={new Date(field.value)}
                                  onSelect={(date) => field.onChange(date)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="registration_limit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Limit (Teams)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Leave empty for no limit"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value
                                  ? parseInt(e.target.value, 10)
                                  : undefined;
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum number of teams that can register (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Problem Statements */}
          {currentStep === 4 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Problem Statements</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addProblemStatement}
                      className="flex items-center"
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add Problem
                    </Button>
                  </div>

                  {problemStatements.map((ps, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Problem Statement #{index + 1}</h4>
                        {problemStatements.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeProblemStatement(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Code*</label>
                          <Input
                            value={ps.code}
                            onChange={(e) =>
                              updateProblemStatement(index, "code", e.target.value)
                            }
                            placeholder="Problem code (e.g., P001)"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Title*</label>
                          <Input
                            value={ps.title}
                            onChange={(e) =>
                              updateProblemStatement(index, "title", e.target.value)
                            }
                            placeholder="Problem title"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description*</label>
                        <Textarea
                          value={ps.description}
                          onChange={(e) =>
                            updateProblemStatement(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Detailed description of the problem statement"
                          className="min-h-20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Rules & Criteria */}
          {currentStep === 5 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Hackathon Rules</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addRule}
                        className="flex items-center"
                      >
                        <Plus className="mr-1 h-4 w-4" /> Add Rule
                      </Button>
                    </div>

                    {rules.map((rule, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={rule}
                          onChange={(e) => updateRule(index, e.target.value)}
                          placeholder={`Rule ${index + 1}`}
                          className="flex-grow"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeRule(index)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {form.formState.errors.rules && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.rules.message}
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Evaluation Criteria</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCriterion}
                        className="flex items-center"
                      >
                        <Plus className="mr-1 h-4 w-4" /> Add Criterion
                      </Button>
                    </div>

                    {evaluationCriteria.map((criterion, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={criterion}
                          onChange={(e) => updateCriterion(index, e.target.value)}
                          placeholder={`Criterion ${index + 1}`}
                          className="flex-grow"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeCriterion(index)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {form.formState.errors.evaluationCriteria && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.evaluationCriteria.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Additional Details */}
          {currentStep === 6 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="team_size_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Size Limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value
                                ? parseInt(e.target.value, 10)
                                : undefined;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of members allowed in a team
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="allow_external_students"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Allow External Students</FormLabel>
                          <FormDescription>
                            When enabled, students from any university can enroll. When disabled, only Atmiya University students can participate.
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

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Tags</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag) => (
                        <Badge key={tag} className="px-2 py-1">
                          {tag}{" "}
                          <X
                            className="h-3 w-3 ml-1 cursor-pointer"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTag.trim()) {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addTag}
                        disabled={!newTag.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < FORM_STEPS.length ? (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={() => {
                  if (!validateForm()) {
                    toast.error(
                      "Please fix the errors in the form before submitting"
                    );
                    return;
                  }
                }}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : isEditMode ? (
                  "Update Hackathon"
                ) : (
                  "Create Hackathon"
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
