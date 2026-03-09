"use server";

import { editTeamSchema } from "@/schemas/team";
import { prisma } from "@/lib/prisma";

export async function editTeamAction(input: unknown) {
  const parsed = editTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }
  const data = parsed.data;
  try {
    // Fetch current members
    const existingTeam = await prisma.hackathonTeam.findUnique({
      where: { id: data.id },
      include: { members: true },
    });
    if (!existingTeam) return { error: 'Team not found' };

    const existingMemberIds = new Set(existingTeam.members.map((m) => m.studentId));
    const newMemberIds = new Set(data.members.map((m: any) => m.studentId));

    // Members to remove
    const membersToRemove = existingTeam.members.filter((m) => !newMemberIds.has(m.studentId));
    // Members to update
    const membersToUpdate = data.members.filter((m: any) => existingMemberIds.has(m.studentId));

    // Update team (including leaderId)
    await prisma.hackathonTeam.update({
      where: { id: data.id },
      data: {
        mentor: data.mentor,
        mentor_mail: data.mentor_mail,
        disqualified: data.disqualified,
        problemStatementId: data.problemStatementId || null,
        teamName: data.teamName,
        leaderId: data.leaderId || null,
      },
    });

    // Remove members
    for (const member of membersToRemove) {
      await prisma.hackathonTeamMember.delete({ where: { id: member.id } });
    }

    // Update attended for existing members
    for (const member of membersToUpdate) {
      await prisma.hackathonTeamMember.updateMany({
        where: { teamId: data.id, studentId: member.studentId },
        data: { attended: member.attended ?? false },
      });
    }

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
