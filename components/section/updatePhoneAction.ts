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

  // Check if phone number is already used by another user
  const existingUser = await prisma.user.findUnique({
    where: { phone },
    select: { supabaseId: true },
  });

  if (existingUser && existingUser.supabaseId !== user.id) {
    return { error: "This phone number is already registered to another account." };
  }

  try {
    // Update Prisma DB first to catch unique constraint issues
    await prisma.user.update({
      where: { supabaseId: user.id },
      data: { phone },
    });

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
