"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin-server";
import { prisma } from "@/lib/prisma";

export default async function destroyMaster(id: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "User not authenticated" };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { role: true }
    });

    if (!dbUser || dbUser.role !== "MASTER") {
      return { error: "Only masters can delete other masters" };
    }

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return { error: "Invalid master ID" };
    }

    const masterToDelete = await prisma.master.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!masterToDelete) {
      return { error: "Master not found" };
    }

    if (masterToDelete.userId === user.id) {
      return { error: "Cannot remove your own master access" };
    }

    // Demote to STUDENT instead of deleting the account
    await prisma.$transaction(async (tx) => {
      // Delete the Master record
      await tx.master.delete({
        where: { id },
      });

      // Update user role to STUDENT
      await tx.user.update({
        where: { supabaseId: masterToDelete.userId },
        data: { role: "STUDENT" },
      });

      // Create Student record if it doesn't exist
      const existingStudent = await tx.student.findUnique({
        where: { userId: masterToDelete.userId },
      });

      if (!existingStudent) {
        await tx.student.create({
          data: { userId: masterToDelete.userId },
        });
      }
    });

    // Update Supabase app_metadata to reflect the new role
    const adminSupabase = await createAdminClient();
    await adminSupabase.auth.admin.updateUserById(masterToDelete.userId, {
      app_metadata: {
        role: "STUDENT",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Database error:", error);
    return { error: "Failed to remove master access" };
  }
}
