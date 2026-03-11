"use server";

import { QRCodeService } from "@/lib/qr-code";
import { onboardingStudentSchema, OnboardingStudentSchema } from "@/schemas/onboardingStudentSchema";
import { createAdminClient } from "@/utils/supabase/admin-server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function onboardingStudent(data: OnboardingStudentSchema) {
  const validatedData = onboardingStudentSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "Onboarding data is invalid" };
  }

  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "User not found" };
  }

  try {
    // Ensure User record exists in Prisma DB (fallback if webhook didn't fire)
    const existingUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!existingUser) {
      const fullName = user.user_metadata?.full_name || "";
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || user.email?.split("@")[0] || "";
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "user";

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

    if (validatedData.data.studentType === "atmiya") {
      const { departmentId, programId, currentSemester, currentYear, registrationNumber } = validatedData.data;

      if (registrationNumber) {
        const existing = await prisma.student.findUnique({
          where: { registrationNumber },
        });
        if (existing && existing.userId !== user.id) {
          return { error: true, message: "A student with this registration number already exists." };
        }
      }

      await prisma.student.upsert({
        where: {
          userId: user.id,
        },
        update: {
          departmentId,
          programId,
          currentSemester,
          currentYear,
          registrationNumber,
          university: 'Atmiya University',
        },
        create: {
          userId: user.id,
          departmentId,
          programId,
          currentSemester,
          currentYear,
          registrationNumber,
          university: 'Atmiya University',
        },
      });
    } else if (validatedData.data.studentType === "other") {
      const { currentSemester, currentYear, universityName } = validatedData.data;
      await prisma.student.upsert({
        where: {
          userId: user.id,
        },
        update: {
          departmentId: null,
          programId: null,
          currentSemester,
          currentYear,
          registrationNumber: null,
          university: universityName,
        },
        create: {
          userId: user.id,
          departmentId: null,
          programId: null,
          currentSemester,
          currentYear,
          registrationNumber: null,
          university: universityName,
        },
      });
    }

    const { phone } = validatedData.data;

    // Generate QR code for the user
    const { qrCode, qrCodeData } = await QRCodeService.generateUserQRCode(user.id);

    // Update user with QR code and phone
    await prisma.user.update({
      where: { supabaseId: user.id },
      data: {
        qrCode,
        qrCodeData,
        phone,
      }
    });

    const invitedUser = await prisma.hackathonTemporaryInvite.findFirst({
      where: { email: user.email },
    })

    if (invitedUser) {
      const invitedStudent = await prisma.user.findFirst({
        where: { email: invitedUser.email },
        select: {
          students: {
            select: { id: true }
          }
        }
      })

      if (invitedStudent && invitedStudent.students) {
        await prisma.$transaction([
          prisma.hackathonTeamInvite.create({
            data: {
              teamId: invitedUser.teamId,
              studentId: invitedStudent.students.id,
            }
          }),
          prisma.hackathonTemporaryInvite.delete({
            where: { id: invitedUser.id }
          })
        ])
      }
    }

    // Single call to update both user_metadata (phone) and app_metadata (onboarding)
    await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        phone,
      },
      app_metadata: {
        role: "STUDENT",
        onboarding_complete: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error during onboarding:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return { error: "Failed to complete onboarding", message: errorMessage };
  }
}
