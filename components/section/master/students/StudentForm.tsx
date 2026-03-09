"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StudentSchema, studentSchema } from "@/schemas/student";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import { fetcher } from "@/fetcher";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useTransition } from "react";
import { createStudentAction } from "./createStudentAction";
import { Turnstile } from "@marsidev/react-turnstile";

export function StudentForm({ setIsFormOpen }: { isFormOpen: boolean; setIsFormOpen: (open: boolean) => void }) {
  const { data: departments, isLoading: loadingDepartments } = useSWR<{ name: string; id: string }[]>("/api/department", fetcher);
  const { data: programs, isLoading: loadingPrograms } = useSWR<{ name: string; id: string }[]>("/api/program", fetcher);
  const [loading, startTransition] = useTransition();
  const [captchaToken, setCaptchaToken] = useState("");

  const form = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      departmentId: "",
      programId: "",
      currentSemester: undefined,
      currentYear: undefined,
      registrationNumber: "",
      dateOfBirth: "",
    },
  });  async function onSubmit(data: StudentSchema) {
    startTransition(async () => {
      const response = await createStudentAction(data, captchaToken);
      if (response.error) {
        toast.error(response.error);
        return;
      } else {
        toast.success("Student created successfully!");
        form.reset();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            disabled={loading}
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter first name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            disabled={loading}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter last name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          disabled={loading}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter email address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          disabled={loading}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} placeholder="Enter password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="departmentId"
          disabled={loading}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl className="w-full">
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {!loadingDepartments && departments ? (
                    departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      Loading departments...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="programId"
          disabled={loading}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Program</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl className="w-full">
                  <SelectTrigger>
                    <SelectValue placeholder="Select Program" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {!loadingPrograms && programs ? (
                    programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      Loading programs...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">          <FormField
            control={form.control}
            name="currentSemester"
            disabled={loading}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Semester</FormLabel>
                <FormControl>
                  <Input type="number" {...field} placeholder="Semester" onChange={e => {
                    field.onChange(e);
                    const val = e.target.value === "" ? undefined : Number(e.target.value);
                    const semester = val && val > 0 ? val : undefined;
                    form.setValue("currentYear", semester ? Math.ceil(semester / 2) : undefined);
                  }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currentYear"
            disabled
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Year</FormLabel>
                <FormControl>
                  <Input type="number" {...field} placeholder="Year" disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="registrationNumber"
            disabled={loading}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Registration Number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateOfBirth"
            disabled={loading}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onSuccess={(token) => {
            setCaptchaToken(token);
          }}
        />


        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => {
            form.reset();
            setIsFormOpen(false);
          }} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating Student..." : "Create Student"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
