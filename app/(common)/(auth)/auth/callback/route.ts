import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const currentMetadata = user.app_metadata;

        if (!currentMetadata?.role) {
          // This is a new user without role — set it in app_metadata (where middleware reads it)
          const adminSupabase = await createAdminClient();
          const { error: updateError } =
            await adminSupabase.auth.admin.updateUserById(user.id, {
              app_metadata: {
                role: "STUDENT",
                onboarding_complete: false,
              },
            });

          if (updateError) {
            console.error("Error updating user app_metadata:", updateError);
          } else {
            console.log("Successfully set role for Google user:", user.id);
          }
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
