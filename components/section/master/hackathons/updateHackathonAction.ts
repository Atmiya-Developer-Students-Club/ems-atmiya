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
      include: {
        problemStatements: true,
      },
    });

    if (!existingHackathon) {
      return { error: "Hackathon not found" };
    }

    // Update the hackathon with transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // --- Problem Statements: smart diff instead of delete-all ---
      const existingPS = existingHackathon.problemStatements;
      const incomingCodes = new Set(problemStatements.map((ps) => ps.code));
      const existingCodes = new Set(existingPS.map((ps) => ps.code));

      // Problem statements to delete (exist in DB but not in incoming data)
      const psToDelete = existingPS.filter((ps) => !incomingCodes.has(ps.code));
      // Problem statements to update (exist in both)
      const psToUpdate = problemStatements.filter((ps) => existingCodes.has(ps.code));
      // Problem statements to create (new ones not in DB)
      const psToCreate = problemStatements.filter((ps) => !existingCodes.has(ps.code));

      // Nullify problemStatementId on teams referencing deleted problem statements,
      // then delete the problem statements
      if (psToDelete.length > 0) {
        const psIdsToDelete = psToDelete.map((ps) => ps.id);
        await tx.hackathonTeam.updateMany({
          where: { problemStatementId: { in: psIdsToDelete } },
          data: { problemStatementId: null },
        });
        await tx.hackathonProblemStatement.deleteMany({
          where: { id: { in: psIdsToDelete } },
        });
      }

      // Update existing problem statements
      for (const ps of psToUpdate) {
        const existing = existingPS.find((e) => e.code === ps.code);
        if (existing) {
          await tx.hackathonProblemStatement.update({
            where: { id: existing.id },
            data: {
              title: ps.title,
              description: ps.description,
            },
          });
        }
      }

      // --- Rules: safe to delete-all and recreate (no cascade risk) ---
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
          allow_external_students: validatedData.data.allow_external_students ?? true,
          organizer_name: validatedData.data.organizer_name,
          organizer_contact: validatedData.data.organizer_contact,
          tags: validatedData.data.tags || [],
          evaluationCriteria: validatedData.data.evaluationCriteria || [],
          // Create only new problem statements
          problemStatements: {
            create: psToCreate.map((ps) => ({
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
