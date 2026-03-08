"use server";

import { formattedHackathonSchema, FormattedHackathonSchema } from "@/schemas/hackathon";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function updateHackathonAction(id: string, data: FormattedHackathonSchema) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const validatedData = formattedHackathonSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "Invalid hackathon data" };
  }

  const { problemStatements, rules, evaluationCriteria } = validatedData.data;

  try {
    // Check if hackathon exists
    const existingHackathon = await prisma.hackathon.findUnique({
      where: { id },
    });

    if (!existingHackathon) {
      return { error: "Hackathon not found" };
    }

    // Update the hackathon with transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete existing problem statements, rules
      await tx.hackathonProblemStatement.deleteMany({
        where: { hackathonId: id },
      });

      await tx.hackathonRules.deleteMany({
        where: { hackathonId: id },
      });

      // Update the hackathon
      await tx.hackathon.update({
        where: { id },
        data: {
          name: validatedData.data.name,
          description: validatedData.data.description,
          poster_url: validatedData.data.poster_url ?? "",
          location: validatedData.data.location ?? "",
          start_date: validatedData.data.start_date,
          end_date: validatedData.data.end_date,
          start_time: validatedData.data.start_time,
          end_time: validatedData.data.end_time,
          registration_start_date: validatedData.data.registration_start_date,
          registration_end_date: validatedData.data.registration_end_date,
          registration_limit: validatedData.data.registration_limit,
          mode: validatedData.data.mode,
          status: validatedData.data.status,
          team_size_limit: validatedData.data.team_size_limit,
          organizer_name: validatedData.data.organizer_name,
          organizer_contact: validatedData.data.organizer_contact,
          tags: validatedData.data.tags || [],
          evaluationCriteria: validatedData.data.evaluationCriteria || [],
          // Create new problem statements
          problemStatements: {
            create: problemStatements.map((ps) => ({
              code: ps.code,
              title: ps.title,
              description: ps.description,
            })),
          },
          // Create new rules
          rules: {
            create: rules.map((rule) => ({
              rule,
            })),
          },
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating hackathon:", error);
    return { error: "Failed to update hackathon" };
  }
}
