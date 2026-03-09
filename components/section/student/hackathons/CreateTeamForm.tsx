"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTeamAction } from "./createTeamAction";
import { Hackathon, HackathonProblemStatement } from "@prisma/client";
import { TeamSchema, teamSchema } from "@/schemas/hackathon";

interface CreateTeamProps {
  hackathon: Hackathon & { problemStatements: HackathonProblemStatement[] };
  userIsRegistered: boolean;
  onTeamCreated?: () => void;
  trigger?: React.ReactNode;
}

export function CreateTeamForm({ hackathon, userIsRegistered, onTeamCreated, trigger }: CreateTeamProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      teamName: "",
      problemStatementId: "",
      mentor: "",
      mentorMail: "",
    },
  });

  async function onSubmit(data: TeamSchema) {
    setIsSubmitting(true);
    try {
      const response = await createTeamAction(
        data,
        hackathon.id,
      );

      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("Team created successfully!");
        form.reset();

        // Close dialog and call the callback if provided, otherwise reload the page
        setIsDialogOpen(false);
        if (onTeamCreated) {
          onTeamCreated();
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error("Failed to create team. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // If user is already registered, show a message instead of the form
  if (userIsRegistered) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-700">
              You are already registered in a team for this hackathon. You cannot create or join another team.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if registration is open
  const now = new Date();
  const registrationStartDate = new Date(hackathon.registration_start_date);
  const registrationEndDate = new Date(hackathon.registration_end_date);
  const isRegistrationOpen = now >= registrationStartDate && now <= registrationEndDate;

  if (!isRegistrationOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-700">
              Registration is {now < registrationStartDate ? "not yet open" : "closed"} for this hackathon.
              {now < registrationStartDate
                ? ` Registration opens on ${registrationStartDate.toLocaleDateString()}.`
                : ""}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full">
            Create Team
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Team for {hackathon.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="teamName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your team name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="problemStatementId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Problem Statement*</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a problem statement" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hackathon.problemStatements.map((problem) => (
                        <SelectItem key={problem.id} value={problem.id}>
                          {problem.code}: {problem.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mentor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mentor Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter mentor's name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mentorMail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mentor Email*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter mentor's email" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Team"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
