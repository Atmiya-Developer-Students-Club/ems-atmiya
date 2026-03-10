"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/client";
import MasterHackathonDetail, {
  MasterHackathonDetailProps,
} from "@/components/section/master/hackathons/details/MasterHackathonDetail";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { editTeamSchema, EditTeamInput } from "@/schemas/team";
import { editTeamAction, deleteTeamAction } from "./actions";
import useSWR from "swr";
import { fetcher } from "@/fetcher";
import { toast } from "sonner";

export default function MasterHackathonDetailPage() {
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [hackathonData, setHackathonData] = useState<
    MasterHackathonDetailProps["hackathon"] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [editTeam, setEditTeam] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const supabase = createClient();

  // swr-fetcher import

  // Authenticate user and fetch hackathon data with SWR
  useEffect(() => {
    const checkAuth = async () => {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError || !authData.user) {
        setError("Failed to authenticate user");
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [supabase.auth]);

  const {
    data,
    error: swrError,
    isLoading: swrLoading,
  } = useSWR<MasterHackathonDetailProps>(
    params.id ? `/api/hackathons/${params.id}?includeMasterDetails=true` : null,
    fetcher
  );

  useEffect(() => {
    if (data) {
      setHackathonData(data.hackathon);
      setIsLoading(false);
    }
    if (swrError) {
      if (swrError.status === 404) {
        notFound();
      }
      setError("Failed to load hackathon details. Please try again later.");
      setIsLoading(false);
    }
    if (swrLoading) {
      setIsLoading(true);
    }
  }, [data, swrError, swrLoading]);

  const handleTeamClick = (team: any) => {
    setSelectedTeam(team);
    setIsDialogOpen(true);
  };

  const handleEditTeamClick = (team: any) => {
    setEditTeam(team);
    setEditForm({
      mentor: team.mentor,
      mentor_mail: team.mentor_mail,
      disqualified: team.disqualified,
      problemStatementId: team.problemStatement?.id || "",
      teamName: team.teamName,
      members: team.members.map((m: any) => m),
    });
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedTeam(null);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditTeam(null);
    setEditForm({});
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditTeamInput>({
    resolver: zodResolver(editTeamSchema),
    defaultValues: editForm,
  });

  useEffect(() => {
    if (editTeam) {
      reset({
        id: editTeam.id,
        mentor: editTeam.mentor,
        mentor_mail: editTeam.mentor_mail,
        disqualified: editTeam.disqualified,
        problemStatementId: editTeam.problemStatement?.id || "",
        teamName: editTeam.teamName,
        members: editTeam.members.map((m: any) => ({
          id: m.id,
          studentId: m.studentId,
          attended: m.attended,
          student: m.student,
        })),
      });
    }
  }, [editTeam, reset]);

  const onEditSubmit = async (data: EditTeamInput) => {
    const result = await editTeamAction(data);
    if (result.success) {
      setIsEditDialogOpen(false);
      setEditTeam(null);
      reset();
    } else {
    }
  };

  const handleDeleteTeam = async (team: any) => {
    if (!confirm(`Are you sure you want to delete team "${team.teamName}"? This will remove all members, invites, and attendance records. This action cannot be undone.`)) {
      return;
    }
    const loadingToast = toast.loading("Deleting team...");
    try {
      const result = await deleteTeamAction(team.id);
      toast.dismiss(loadingToast);
      if (result.success) {
        toast.success(`Team "${team.teamName}" deleted successfully`);
        // Remove team from local state
        if (hackathonData) {
          setHackathonData({
            ...hackathonData,
            teams: hackathonData.teams.filter((t) => t.id !== team.id),
          });
        }
      } else {
        toast.error(typeof result.error === "string" ? result.error : "Failed to delete team");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("An error occurred while deleting the team");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-10 w-full sm:w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="w-full h-48 sm:h-64" />
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
          <div className="space-y-6 mt-6 md:mt-0">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
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
    <>
      <MasterHackathonDetail
        hackathon={hackathonData}
        onTeamClick={handleTeamClick}
        onEditTeamClick={handleEditTeamClick}
        onDeleteTeam={handleDeleteTeam}
      />
      {/* View Team Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Team Details</DialogTitle>
            <DialogClose onClick={handleDialogClose} />
          </DialogHeader>
          {selectedTeam && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Team ID</Label>
                  <div className="font-medium">{selectedTeam.teamId}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Team Name</Label>
                  <div className="font-medium">{selectedTeam.teamName}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Team DB ID</Label>
                  <div className="font-medium">{selectedTeam.id}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Mentor Name</Label>
                  <div>
                    {selectedTeam.mentor || (
                      <span className="text-muted-foreground">
                        Not assigned
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Mentor Email</Label>
                  <div>
                    {selectedTeam.mentor_mail || (
                      <span className="text-muted-foreground">
                        Not assigned
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Problem Statement
                  </Label>
                  <div>
                    {selectedTeam.problemStatement ? (
                      `${selectedTeam.problemStatement.code}: ${selectedTeam.problemStatement.title}`
                    ) : (
                      <span className="text-muted-foreground">
                        Not selected
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Disqualified</Label>
                  <div>
                    {selectedTeam.disqualified ? (
                      <span className="text-red-600 font-semibold">Yes</span>
                    ) : (
                      <span className="text-green-600 font-semibold">No</span>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Team Leader</Label>
                  <div>
                    {(() => {
                      const leader = selectedTeam.members.find(
                        (m: any) => m.studentId === selectedTeam.leaderId
                      );
                      return leader ? (
                        <span>
                          {leader.student?.user?.firstName}{" "}
                          {leader.student?.user?.lastName}
                          <span className="ml-2 text-muted-foreground">
                            ({leader.student?.user?.email})
                          </span>
                          {leader.student?.user?.phone && (
                            <span className="ml-2 text-muted-foreground">
                              ({leader.student?.user?.phone})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Not selected
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Members</Label>
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm mt-2">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Phone</th>
                        <th className="p-2 text-left">Attended</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTeam.members.map((member: any) => (
                        <tr key={member.id} className="border-t">
                          <td className="p-2">
                            {member.student?.user?.firstName}{" "}
                            {member.student?.user?.lastName}
                          </td>
                          <td className="p-2">{member.student?.user?.email}</td>
                          <td className="p-2">
                            {member.student?.user?.phone || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {member.attended ? (
                              <span className="text-green-600 font-semibold">
                                Yes
                              </span>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {selectedTeam.submissionUrl && (
                <div>
                  <Label className="text-muted-foreground">Submission</Label>
                  <div>
                    <a
                      href={selectedTeam.submissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View Submission
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogClose onClick={handleEditDialogClose} />
          </DialogHeader>
          {editTeam && (
            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
              <input type="hidden" {...register("id")} />
              <div className="space-y-2">
                <Label htmlFor="mentor">Mentor Name</Label>
                <Input id="mentor" {...register("mentor")} />
                {errors.mentor && (
                  <p className="text-red-500 text-xs">
                    {errors.mentor.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mentor_mail">Mentor Email</Label>
                <Input
                  id="mentor_mail"
                  type="email"
                  {...register("mentor_mail")}
                />
                {errors.mentor_mail && (
                  <p className="text-red-500 text-xs">
                    {errors.mentor_mail.message}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Controller
                  name="disqualified"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="disqualified"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="disqualified">Disqualified</Label>
                {errors.disqualified && (
                  <p className="text-red-500 text-xs">
                    {errors.disqualified.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="problemStatementId">Problem Statement</Label>
                <Controller
                  name="problemStatementId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="problemStatementId">
                        <SelectValue placeholder="Select Problem Statement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {hackathonData?.problemStatements?.map((ps: any) => (
                          <SelectItem key={ps.id} value={ps.id}>
                            {ps.code}: {ps.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.problemStatementId && (
                  <p className="text-red-500 text-xs">
                    {errors.problemStatementId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input id="teamName" {...register("teamName")} />
                {errors.teamName && (
                  <p className="text-red-500 text-xs">
                    {errors.teamName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaderId">Team Leader</Label>
                <Controller
                  name="leaderId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="leaderId">
                        <SelectValue placeholder="Select Team Leader" />
                      </SelectTrigger>
                      <SelectContent>
                        {control._formValues.members?.map((member: any) => (
                          <SelectItem
                            key={member.studentId}
                            value={member.studentId}
                          >
                            {member.student?.user?.firstName}{" "}
                            {member.student?.user?.lastName} (
                            {member.student?.user?.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.leaderId && (
                  <p className="text-red-500 text-xs">
                    {errors.leaderId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Members</Label>
                <div
                  className="overflow-x-auto"
                  style={{ maxHeight: 300, overflowY: "auto" }}
                >
                  <table className="min-w-full border text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Attended</th>
                        <th className="p-2 text-left">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {control._formValues.members?.map(
                        (member: any, idx: number) => (
                          <tr key={member.id} className="border-t">
                            <td className="p-2">
                              {member.student?.user?.firstName}{" "}
                              {member.student?.user?.lastName}
                            </td>
                            <td className="p-2">
                              {member.student?.user?.email}
                            </td>
                            <td className="p-2">
                              <Controller
                                name={`members.${idx}.attended`}
                                control={control}
                                render={({ field }) => (
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                )}
                              />
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const newMembers = [
                                    ...control._formValues.members,
                                  ];
                                  newMembers.splice(idx, 1);
                                  setValue("members", newMembers);
                                }}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
                {errors.members && (
                  <p className="text-red-500 text-xs">
                    {errors.members.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEditDialogClose}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Save
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
