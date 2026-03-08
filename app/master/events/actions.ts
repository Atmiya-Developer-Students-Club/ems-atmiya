"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function deleteEventAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (user.app_metadata.role !== Role.MASTER && user.app_metadata.role !== Role.ADMIN) {
    return { success: false, error: "Insufficient Permission" };
  }

  try {
    await prisma.event.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
