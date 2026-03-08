"use server";
import { prisma } from "@/lib/prisma";

export async function toggleAttendance(registrationId: string) {
  try {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      select: { attended: true },
    });

    if (!registration) {
      throw new Error("Registration not found");
    }

    await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { attended: !registration.attended },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
