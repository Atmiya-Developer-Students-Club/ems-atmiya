"use server";

import { programSchema, ProgramSchema } from "@/schemas/program";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function createProgram(data: ProgramSchema) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const validatedData = programSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "Invalid data", issues: validatedData.error.issues };
  }

  const { name, departmentId } = validatedData.data;

  try {
    await prisma.program.create({
      data: {
        name,
        departmentId,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating program:", error);
    return { error: "Internal Server Error" };
  }
}
