"use client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@marsidev/react-turnstile";
import { loginSchema, LoginSchema } from "@/schemas/loginSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { login } from "./loginAction";
import { toast } from "sonner";
import { getDashboardPath } from "@/utils/functions/getDashboardPath";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { CheckIcon, EyeIcon, EyeOffIcon, Loader, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { signInWithGoogleAction } from "../register/loginWithGoogleAction";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginForm() {
  const [captchaToken, setCaptchaToken] = useState("");
  const turnstileRef = useRef<any>(null);
  const [googleLoading, setGoogleLoading] = useState(false); // Add loading state
  const [showPassword, setShowPassword] = useState(false);
  const { refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle error messages from URL parameters (e.g., from direct logout)
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      switch (error) {
        case 'role_mismatch':
          toast.error("Your session was terminated due to a security concern. Please log in again.");
          break;
        case 'validation_error':
          toast.error("Session validation failed. Please log in again.");
          break;
        case 'user_initiated':
          toast.success("You have been logged out successfully.");
          break;
        case 'logout_failed':
          toast.error("Logout failed. Please try again.");
          break;
        case 'security_logout_failed':
          toast.error("Security logout failed. Please contact support if this persists.");
          break;
        default:
          toast.error("An error occurred. Please log in again.");
      }
    }
  }, [searchParams]);

  async function onSubmit(data: LoginSchema) {
    if (!captchaToken) {
      toast.error("Please complete the captcha verification.");
      return;
    }
    try {
      const response = await login(data, captchaToken);
      if (turnstileRef.current) {
        turnstileRef.current.reset();
        setCaptchaToken("");
      }
      if (response.error) {
        toast.error(response.error);
      } else {
        await refreshUser(); // Refresh user context after login
        toast.success("Logged in successfully");
        const dashboardPath = getDashboardPath(response.message);
        router.push(dashboardPath);
      }
    } catch {
      toast.error("Something went wrong. Please check your connection and try again.");
      if (turnstileRef.current) {
        turnstileRef.current.reset();
        setCaptchaToken("");
      }
    }
  }

  async function handleContinueWithGoogle() {
    setGoogleLoading(true);
    try {
      const response = await signInWithGoogleAction();
      if (response?.error) {
        toast.error(response.error);
        setGoogleLoading(false);
      }
    } catch {
      // redirect() throws a NEXT_REDIRECT error — this is expected
      // Only reset loading if we're still on the page (i.e. redirect didn't happen)
      setGoogleLoading(false);
    }
  }

  return (
    <div className={"flex flex-col gap-6"}>
      <Card className="border-none shadow-none">
        <CardHeader className="text-left">
          <CardTitle className="text-3xl">Welcome back</CardTitle>
          <CardDescription>Login in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleContinueWithGoogle}
                disabled={googleLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                Login with Google
              </Button>
            </div>

            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-card text-muted-foreground relative z-10 px-2">
                Or continue with
              </span>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="container mx-auto flex flex-col gap-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="your@email.com"
                          type="email"
                        />
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
                    ];
                    const strength = requirements.map((req) => ({
                      met: req.regex.test(field.value || ""),
                      text: req.text,
                    }));
                    const strengthScore = strength.filter(
                      (req) => req.met
                    ).length;
                    const getStrengthColor = (score: number) => {
                      if (score === 0) return "bg-border";
                      if (score <= 1) return "bg-red-500";
                      if (score <= 2) return "bg-orange-500";
                      if (score === 3) return "bg-amber-500";
                      return "bg-emerald-500";
                    };
                    const getStrengthText = (score: number) => {
                      if (score === 0) return "Enter a password";
                      if (score <= 2) return "Weak password";
                      if (score === 3) return "Medium password";
                      return "Strong password";
                    };

                    return (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          <span>Password</span>
                          <Link
                            href="/reset-password"
                            className="text-xs hover:underline"
                          >
                            Forgot password?
                          </Link>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              className={cn(
                                "hide-password-toggle pr-10",
                                field.value ? "has-value" : ""
                              )}
                              aria-describedby="password-strength-desc"
                              placeholder="••••••••"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword((prev) => !prev)}
                              disabled={form.formState.isSubmitting}
                              tabIndex={-1}
                              aria-label={
                                showPassword ? "Hide password" : "Show password"
                              }
                            >
                              {showPassword && !form.formState.isSubmitting ? (
                                <EyeIcon
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              ) : (
                                <EyeOffIcon
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              )}
                              <span className="sr-only">
                                {showPassword
                                  ? "Hide password"
                                  : "Show password"}
                              </span>
                            </Button>
                          </div>
                        </FormControl>
                        {/* AnimatePresence for smooth show/hide */}
                        <AnimatePresence>
                          {field.value && (
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
                                  className={`h-full ${getStrengthColor(
                                    strengthScore
                                  )} transition-all duration-500 ease-out`}
                                  style={{
                                    width: `${(strengthScore / 4) * 100}%`,
                                  }}
                                ></div>
                              </div>
                              <p
                                id="password-strength-desc"
                                className="text-foreground mb-2 text-sm font-medium"
                              >
                                {getStrengthText(strengthScore)}. Must contain:
                              </p>
                              <ul
                                className="space-y-1.5 mb-2"
                                aria-label="Password requirements"
                              >
                                {strength.map((req, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-center gap-2"
                                  >
                                    {req.met ? (
                                      <CheckIcon
                                        size={16}
                                        className="text-emerald-500"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <XIcon
                                        size={16}
                                        className="text-muted-foreground/80"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <span
                                      className={`text-xs ${req.met
                                          ? "text-emerald-600"
                                          : "text-muted-foreground"
                                        }`}
                                    >
                                      {req.text}
                                      <span className="sr-only">
                                        {req.met
                                          ? " - Requirement met"
                                          : " - Requirement not met"}
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
                  }}
                />

                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  options={{
                    retry: "auto",
                  }}
                  onSuccess={(token) => {
                    setCaptchaToken(token);
                  }}
                />

                <Button
                  variant={"default"}
                  size={"lg"}
                  type="submit"
                  disabled={form.formState.isSubmitting || !captchaToken}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader className="ml-2 size-4 animate-spin" />
                    </>
                  ) : (
                    <>Login</>
                  )}
                </Button>
              </form>
            </Form>
          </div>
          <div className="mt-5 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-foreground underline">
                Register
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
