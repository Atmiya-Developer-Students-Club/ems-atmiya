"use server";

import { createAdminClient } from "@/utils/supabase/admin-server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function destroyStudent(id: string) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

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

    if (!dbUser || !["ADMIN", "MASTER"].includes(dbUser.role)) {
      return { error: "Insufficient permissions to delete students" };
    }

    // ✅ SECURITY FIX: Validate input
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return { error: "Invalid student ID" };
    }

    await adminSupabase.auth.admin.deleteUser(id);

    return { success: true };
  } catch (error) {
    console.error("Error deleting student:", error);
    return { error: "Failed to delete student" };
  }
}
