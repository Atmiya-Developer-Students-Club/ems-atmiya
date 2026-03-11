"use client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { updatePhone } from "./updatePhoneAction";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { usePathname } from "next/navigation";

const phoneSchema = z.object({
  phone: z.string().length(10, "Phone number must be exactly 10 digits").regex(/^\d{10}$/, "Phone number must be numeric")
});

type PhoneFormValues = z.infer<typeof phoneSchema>;

export function PhoneDialog() {
  const [open, setOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, refreshUser } = useAuth();
  const pathname = usePathname();

  // Don't show the dialog on the onboarding page — phone is collected there
  const isOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (!open && !user?.user_metadata.phone && !isOnboarding) {
      const id = setInterval(() => {
        setOpen(true);
      }, 5000);
      return () => clearInterval(id);
    }
    return undefined;
  }, [open, user?.user_metadata.phone, isOnboarding]);

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  // Wait for fresh user data (getUser) before deciding to show the dialog
  // Also skip if on onboarding page
  if (loading || !user || user.user_metadata.phone || isOnboarding) return null;

  const handleSubmit = async (values: PhoneFormValues) => {
    setSubmitting(true);
    try {
      const res = await updatePhone(values.phone);
      if (res.success) {
        await refreshUser();
        toast.success("Phone number updated successfully.");
        setOpen(false);
      } else {
        toast.error(res.error ?? "Failed to update phone number. Please try again.");
        form.reset();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      form.reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog defaultOpen open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Your Phone Number</DialogTitle>
          <DialogDescription>
            Please add your phone number correctly to receive important updates and notifications regarding your event registrations. This will help us ensure you stay informed about any changes or announcements related to the events you are interested in.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="text" maxLength={10} placeholder="Enter your phone number" disabled={submitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
