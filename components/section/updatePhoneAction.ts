"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin-server";
import { prisma } from "@/lib/prisma";

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

  // Ensure User record exists in Prisma DB (fallback if webhook didn't fire)
  const currentUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!currentUser) {
    const fullName = user.user_metadata?.full_name || "";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || user.email?.split("@")[0] || "";
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : "user";

    await prisma.user.create({
      data: {
        supabaseId: user.id,
        email: user.email!,
        firstName,
        lastName,
        role: "STUDENT",
        students: {
          create: {},
        },
      },
    });
  }

  
  // Check if phone number is already used by another user
  const existingUser = await prisma.user.findUnique({
    where: { phone },
    select: { supabaseId: true },
  });

  if (existingUser && existingUser.supabaseId !== user.id) {
    return { error: "This phone number is already registered to another account." };
  }

  try {
    // Ensure User record exists in Prisma DB (it may not exist yet during onboarding)
    // Check by supabaseId first, then fall back to email (record may exist with different supabaseId)
    let userRecord = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!userRecord && user.email) {
      userRecord = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (userRecord) {
        // Record exists by email but supabaseId doesn't match — update the supabaseId
        await prisma.user.update({
          where: { email: user.email },
          data: { supabaseId: user.id, phone },
        });
      }
    }

    if (!userRecord) {
      // User record doesn't exist at all — create it
      const fullName = user.user_metadata?.full_name || "";
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || user.email?.split("@")[0] || "";
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email!,
          firstName,
          lastName,
          role: "STUDENT",
          phone,
          students: {
            create: {},
          },
        },
      });
    } else if (userRecord.supabaseId === user.id) {
      // Normal case — record exists and supabaseId matches
      await prisma.user.update({
        where: { supabaseId: user.id },
        data: { phone },
      });
    }

    // Then update Supabase metadata
    const adminSupabase = await createAdminClient();
    const { error } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        phone,
      },
    });
    if (error) {
      console.error("Supabase metadata update error:", error);
      // Rollback Prisma update
      await prisma.user.update({
        where: { supabaseId: user.id },
        data: { phone: null },
      });
      return { error: "Failed to update phone number." };
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
