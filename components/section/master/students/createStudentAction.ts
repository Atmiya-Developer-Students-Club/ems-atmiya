"use server";

import { QRCodeService } from "@/lib/qr-code";
import { studentSchema, StudentSchema } from "@/schemas/student";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function createStudentAction(data: StudentSchema, captchaToken: string) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const validatedData = studentSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "Invalid student data" };
  }

  const { firstName, lastName, email, password, departmentId, programId, currentSemester, currentYear, registrationNumber, dateOfBirth } = validatedData.data;

  const { data: userData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "STUDENT",
        onboarding_complete: true,
        full_name: `${firstName} ${lastName}`,
      },
      emailRedirectTo: `${process.env.BASE_URL}/student`,
      captchaToken,
    },
  });

  // Generate QR code for the user

  if (error || !userData || !userData.user) {
    return { error: error ? error.message : "Failed to register user with Supabase" };
  }

  try {
    if (registrationNumber) {
      const existing = await prisma.student.findUnique({
        where: { registrationNumber },
      });
      if (existing) {
        return { error: "A student with this registration number already exists." };
      }
    }

    const { qrCode, qrCodeData } = await QRCodeService.generateUserQRCode(userData.user.id);

    // Update user with QR code
    await prisma.user.update({
      where: { supabaseId: userData.user.id },
      data: {
        qrCode,
        qrCodeData
      }
    });

    await prisma.user.create({
      data: {
        supabaseId: userData.user.id,
        firstName,
        lastName,
        email,
        role: "STUDENT",
        students: {
          create: {
            departmentId,
            programId,
            currentSemester,
            currentYear,
            dateOfBirth,
            registrationNumber,
          },
        },
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating student in Prisma:", error);
    return { error: "Failed to create student" };
  }
}
