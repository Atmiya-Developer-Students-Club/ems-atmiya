"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function toggleHackathonSubmission(hackathonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log("User not authenticated");
    return { success: false, message: "User not authenticated" };
  }

  if (user.app_metadata.role !== "MASTER") {
    console.log("User is not a master");
    return { success: false, message: "User is not a master" };
  }

  try {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (hackathon) {
      await prisma.hackathon.update({
        where: { id: hackathonId },
        data: {
          open_submissions: !hackathon.open_submissions,
        }
      });
    }

    return { success: true, message: "Hackathon submissions toggled successfully" };
  } catch (error) {
    console.error("Error toggling hackathon submissions:", error);
    return { success: false, message: "Error toggling hackathon submissions" };
  }
}
