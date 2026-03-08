"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function destroyAdmin(id: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "User not authenticated" };
  }

  try {
    // ✅ SECURITY FIX: Check role in database, not Supabase metadata
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { role: true }
    });

    if (!dbUser || dbUser.role !== "MASTER") {
      return { error: "Only masters can delete admins" };
    }

    // ✅ SECURITY FIX: Validate input
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return { error: "Invalid admin ID" };
    }

    await prisma.admin.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting admin:", error);
    return { error: "Failed to delete admin" };
  }
}
