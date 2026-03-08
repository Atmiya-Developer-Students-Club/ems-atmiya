import { createAdminClient } from "@/utils/supabase/admin-server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const supabase = await createAdminClient();

  const token = searchParams.get("token");

  if (token !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  switch (body.type) {
    case "INSERT": {
      const { id, email, raw_user_meta_data, raw_app_meta_data } = body.record;

      console.log("Processing INSERT webhook for user:", {
        id,
        email,
        raw_app_meta_data,
      });

      // if (
      //   raw_app_meta_data.provider !== "google" &&
      //   raw_app_meta_data.role !== "STUDENT"
      // ) {
      //   console.error("Invalid role assignment attempt:", {
      //     provider: raw_app_meta_data.provider,
      //     attemptedRole: raw_app_meta_data.role,
      //     email: email
      //   });
      //   return NextResponse.json({ error: "Invalid role assignment" }, { status: 403 });
      // }

      // if (raw_app_meta_data.provider === "google" && raw_app_meta_data.role && raw_app_meta_data.role !== "STUDENT") {
      //   console.error("Unauthorized role assignment for Google user:", {
      //     provider: raw_app_meta_data.provider,
      //     attemptedRole: raw_app_meta_data.role,
      //     email: email
      //   });
      //   return NextResponse.json({ error: "Unauthorized role assignment" }, { status: 403 });
      // }

      const { error } = await supabase.auth.admin.updateUserById(id, {
        app_metadata: {
          role: "STUDENT",
          onboarding_complete: false,
        }
      });

      if (error) {
        console.error("Error setting user role during webhook processing:", error);
        return NextResponse.json({ error: "Failed to set user role" }, { status: 500 });
      }

      const fullName = raw_user_meta_data?.full_name || "";
      const nameParts = fullName.trim().split(/\s+/); // Split on any whitespace
      const firstName = nameParts[0] || "";
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "user";

      if (!id || !email) {
        console.error("Missing required fields:", { id, email });
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      try {
        const result = await prisma.user.create({
          data: {
            supabaseId: id,
            email: email,
            firstName: firstName,
            lastName: lastName,
            role: "STUDENT",
            students: {
              create: {},
            },
          },
          include: {
            students: true,
          },
        });
        console.log("Successfully created user and student:", result);
        return NextResponse.json({ success: true }, { status: 200 });
      } catch (error) {
        console.error("Error processing webhook:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    }

    case "DELETE": {
      const { id } = body.old_record;

      if (!id) {
        return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
      }
      try {
        await prisma.user.delete({
          where: {
            supabaseId: id,
          },
        });

        return NextResponse.json({ success: true }, { status: 200 });
      } catch (error) {
        console.error("Error processing webhook:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    }

    default: {
      return NextResponse.json({ error: "Unhandled event type" }, { status: 400 });
    }
  }
}
