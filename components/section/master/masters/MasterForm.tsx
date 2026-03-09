"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MasterSchema, masterSchema } from "@/schemas/master";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useTransition } from "react";
import { createMasterAction } from "./createMasterAction";
import { Turnstile } from "@marsidev/react-turnstile";

export function MasterForm() {
  const [loading, startTransition] = useTransition();
  const [captchaToken, setCaptchaToken] = useState("");

  const form = useForm<z.infer<typeof masterSchema>>({
    resolver: zodResolver(masterSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: MasterSchema) {
    startTransition(async () => {
      const response = await createMasterAction(data, captchaToken);

      if (response.error) {
        toast.error(response.error);
        return;
      } else {
        toast.success("Master created successfully!");
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
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} placeholder="Enter password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onSuccess={(token) => {
            setCaptchaToken(token);
          }}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Creating Master..." : "Create Master"}
        </Button>
      </form>
    </Form>
  );
}
