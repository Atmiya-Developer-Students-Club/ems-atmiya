import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDashboardPath as getAccessPath } from "../functions/getDashboardPath";

export const PUBLIC_ROUTES = [
  "/",
  "/events",
  "/hackathons",
  "/register",
  "/login",
  "/reset-password",
  "/update-password",
  "/legal",
  "/auth/confirm",
  "/auth/callback",
  "/auth/webhook",
];

// Routes that only authenticated users should NOT access
const AUTH_ROUTES = ["/login", "/register"];

function isPublicRoute(pathname: string) {
  return pathname.startsWith("/api/") || PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.includes(pathname);
}

function redirectTo(path: string, request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const currentPath = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Always allow access to API routes and certain public routes
  if (currentPath.startsWith("/api/") || currentPath === "/" || currentPath === "/events") {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Handle authenticated users
  if (user) {
    const onboardingComplete = user.app_metadata?.onboarding_complete;

    const accessPath = getAccessPath(user.app_metadata?.role);

    // If user is authenticated and tries to access login/register, redirect to dashboard
    if (isAuthRoute(currentPath)) {
      console.log("Authenticated user trying to access auth route, redirecting to dashboard");
      return redirectTo(accessPath, request);
    }

    // If onboarding is not complete, redirect to onboarding (except if already on onboarding)
    if (!onboardingComplete && currentPath !== "/onboarding") {
      console.log("Onboarding not complete, redirecting to onboarding");
      return redirectTo("/onboarding", request);
    }

    // If onboarding is complete and user is on onboarding page, redirect to dashboard
    if (onboardingComplete && currentPath === "/onboarding") {
      console.log("Onboarding complete, redirecting from onboarding to dashboard");
      return redirectTo(accessPath, request);
    }

    // Allow access to public routes even when authenticated
    if (isPublicRoute(currentPath)) {
      return response;
    }

    // If trying to access protected route that doesn't match their dashboard path
    if (onboardingComplete && !currentPath.startsWith(accessPath)) {
      console.log("User accessing wrong dashboard path, redirecting to correct dashboard");
      return redirectTo(accessPath, request);
    }

    return response;
  }

  // Handle unauthenticated users
  if (!user) {
    // Allow access to all public routes including login/register
    if (isPublicRoute(currentPath)) {
      return response;
    }

    // Redirect to login for protected routes
    console.log("User not authenticated, redirecting to login");
    return redirectTo("/login", request);
  }

  return response;
}
