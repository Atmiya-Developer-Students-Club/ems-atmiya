"use client";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RegisterStudentSchema, registerStudentSchema } from "@/schemas/registerSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { registerStudent } from "./registerAction";
import { Button } from "@/components/ui/button";
import { registerWithGoogleAction } from "./registerWithGoogleAction";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckIcon, EyeIcon, EyeOffIcon, Loader, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

export default function RegisterForm() {
  const [captchaToken, setCaptchaToken] = useState("");
  const turnstileRef = useRef<any>(null);
  const [googleLoading, setGoogleLoading] = useState(false); // Add loading state
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm({
    resolver: zodResolver(registerStudentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: RegisterStudentSchema) {

    if (!captchaToken) {
      toast.error("Please complete the CAPTCHA verification");
      return;
    }

    // Add validation for required fields
    if (!data.firstName || !data.lastName || !data.email || !data.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    const response = await registerStudent(data, captchaToken);

    if (turnstileRef.current) {
      turnstileRef.current.reset();
      setCaptchaToken("");
    }

    if (response.error) {
      toast.error(response.error);
    } else {
      toast.success("Registration successful! Please check your email for verification.");
      form.reset();
    }
  }

  async function handleContinueWithGoogle() {
    setGoogleLoading(true); // Start loading
    const response = await registerWithGoogleAction();

    // Simulate a delay for loading effect
    setTimeout(() => {
      setGoogleLoading(false);
    }, 1000);

    if (response.error) {
      toast.error(response.error);
    } else {
      toast.success("Redirecting to Google...");
    }
  }

  return (
    <div className={"flex flex-col gap-6"}>
      <Card className="border-none shadow-none">
        <CardHeader className="text-left">
          <CardTitle className="text-3xl">Get started</CardTitle>
          <CardDescription>Register account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleContinueWithGoogle}
                disabled={googleLoading} // Disable while loading
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                {googleLoading ? (
                  <>
                    <span>Continue with Google</span>
                    <Loader className="ml-2 size-4 animate-spin" />
                  </>
                ) : (
                  <>Continue with Google</>
                )}
              </Button>
            </div>

            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-card text-muted-foreground relative z-10 px-2">Or continue with</span>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="container mx-auto flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last Name"  {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="your@email.com"  {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => {
                    // Password strength logic
                    const requirements = [
                      { regex: /.{8,}/, text: "At least 8 characters" },
                      { regex: /[0-9]/, text: "At least 1 number" },
                      { regex: /[a-z]/, text: "At least 1 lowercase letter" },
                      { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
                      { regex: /[^A-Za-z0-9]/, text: "At least 1 special character" },
                    ];
                    const strength = requirements.map((req) => ({
                      met: req.regex.test(field.value || ""),
                      text: req.text,
                    }));
                    const strengthScore = strength.filter((req) => req.met).length;
                    const allMet = strengthScore === requirements.length;

                    const getStrengthColor = (score: number) => {
                      if (score === 0) return "bg-border";
                      if (score === 1) return "bg-red-500";
                      if (score === 2) return "bg-orange-500";
                      if (score === 3) return "bg-yellow-500";
                      if (score === 4) return "bg-blue-500";
                      return "bg-emerald-500";
                    };

                    const getStrengthText = (score: number) => {
                      if (score === 0) return "Enter a password";
                      if (score <= 2) return "Weak password";
                      if (score === 3) return "Medium password";
                      if (score >= 4) return "Strong password";
                    };

                    return (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              className={cn("hide-password-toggle pr-10", field.value ? "has-value" : "")}
                              aria-describedby="password-strength-desc"
                              placeholder="••••••••"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword((prev) => !prev)}
                              disabled={form.formState.isSubmitting}
                              tabIndex={-1}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword && !form.formState.isSubmitting ? (
                                <EyeIcon className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
                              )}
                              <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                            </Button>
                          </div>
                        </FormControl>
                        {/* AnimatePresence for smooth show/hide */}
                        <AnimatePresence>
                          {field.value && !allMet && (
                            <motion.div
                              key="password-strength"
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.25 }}
                            >
                              <div
                                className="bg-border mt-3 mb-2 h-1 w-full overflow-hidden rounded-full"
                                role="progressbar"
                                aria-valuenow={strengthScore}
                                aria-valuemin={0}
                                aria-valuemax={4}
                                aria-label="Password strength"
                              >
                                <div
                                  className={`h-full ${getStrengthColor(strengthScore)} transition-all duration-500 ease-out`}
                                  style={{ width: `${(strengthScore / requirements.length) * 100}%` }}
                                ></div>
                              </div>
                              <p id="password-strength-desc" className="text-foreground mb-2 text-sm font-medium">
                                {getStrengthText(strengthScore)}. Must contain:
                              </p>
                              <ul className="space-y-1.5 mb-2" aria-label="Password requirements">
                                {strength.map((req, idx) => (
                                  <li key={idx} className="flex items-center gap-2">
                                    {req.met ? (
                                      <CheckIcon size={16} className="text-emerald-500" aria-hidden="true" />
                                    ) : (
                                      <XIcon size={16} className="text-muted-foreground/80" aria-hidden="true" />
                                    )}
                                    <span className={`text-xs ${req.met ? "text-emerald-600" : "text-muted-foreground"}`}>
                                      {req.text}
                                      <span className="sr-only">
                                        {req.met ? " - Requirement met" : " - Requirement not met"}
                                      </span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <FormMessage />
                      </FormItem>
                    );
                  }
                  }
                />

                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  onSuccess={(token) => {
                    setCaptchaToken(token);
                  }}
                />

                <Button
                  variant={'default'}
                  size={'lg'}
                  type="submit"
                  disabled={form.formState.isSubmitting || !captchaToken}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader className="ml-2 size-4 animate-spin" />
                    </>
                  ) : (
                    <>Register</>
                  )}
                </Button>
              </form>
            </Form>
          </div>
          <div className="mt-5 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-foreground underline">
                Log in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
