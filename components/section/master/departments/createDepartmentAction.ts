"use server";

import { departmentSchema, DepartmentSchema } from "@/schemas/department";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function createDepartment(data: DepartmentSchema) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const validatedData = departmentSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "Invalid data", issues: validatedData.error.issues };
  }

  const { name, faculty } = validatedData.data;

  try {
    await prisma.department.create({
      data: {
        name,
        faculty,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating department:", error);
    return { error: "Internal Server Error" };
  }
}
