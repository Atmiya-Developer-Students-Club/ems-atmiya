"use server";

import { prisma } from "@/lib/prisma";

export async function deleteAttendance(registrationId: string) {
  try {
    await prisma.eventRegistration.delete({
      where: { id: registrationId },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
