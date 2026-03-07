"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin-server";

export async function updatePhone(phone: string) {
  if (!phone || !/^\d{10}$/.test(phone)) {
    return { error: "Invalid phone number" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !user) {
    return { error: "User not authenticated" };
  }

  if (user.user_metadata.phone) {
    return { success: true };
  }

  try {
    // Update Supabase metadata first (more reliable, and what PhoneDialog checks)
    const adminSupabase = await createAdminClient();
    const { error } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        phone,
      },
    });
    if (error) {
      console.error("Supabase metadata update error:", error);
      return { error: "Failed to update phone number." };
    }

    // Best-effort sync to Prisma DB (dynamic import to avoid module-level DB connection)
    try {
      const { prisma } = await import("@/lib/prisma");
      await Promise.race([
        prisma.user.update({
          where: { supabaseId: user.id },
          data: { phone },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DB sync timeout")), 5000)
        ),
      ]);
    } catch (dbError) {
      console.error("Prisma phone sync failed (phone saved in Supabase):", dbError);
    }

    return { success: true };
  } catch (error) {
    console.error("Phone update error:", error);
    return {
      error:
        "Failed to update phone number. " +
        (error instanceof Error ? error.message : ""),
    };
  }
}
