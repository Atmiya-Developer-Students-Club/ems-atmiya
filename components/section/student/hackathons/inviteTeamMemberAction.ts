"use server";

import { sendMail } from "@/utils/functions/sendMail";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateHackathonInvitationEmail } from "./mail/template";

export async function inviteTeamMemberAction(teamId: string, studentEmail: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "User not authenticated" };
  }

  try {
    // Check if the team exists
    const team = await prisma.hackathonTeam.findUnique({
      where: { id: teamId },
      include: {
        hackathon: true,
        members: true,
        invites: true,
      },
    });

    if (!team) {
      return { error: "Team not found" };
    }

    if (team.disqualified) {
      return { error: "This team has been disqualified and cannot invite new members." };
    }

    if (!team.hackathon.open_registrations) {
      return { error: "Hackathon registrations are closed" };
    }

    // Check if hackathon restricts to Atmiya students only
    if (!team.hackathon.allow_external_students) {
      // We'll validate the invited student later when we find their profile
    }

    // Check if the current user is a member of the team
    const currentStudent = await prisma.student.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!currentStudent) {
      return { error: "Only students can invite team members" };
    }

    const isTeamMember = team.members.some(
      (member) => member.studentId === currentStudent.id
    );

    if (!isTeamMember) {
      return { error: "You must be a team member to invite others" };
    }

    // Check team size limit
    const maxTeamSize = team.hackathon.team_size_limit || 5;
    if (team.members.length >= maxTeamSize) {
      return { error: "Team has reached maximum size" };
    }

    // Find the student by email
    const invitedUser = await prisma.user.findFirst({
      where: {
        email: studentEmail,
        role: "STUDENT",
      },
      include: {
        students: true,
      },
    });

    if (!invitedUser) {
      await prisma.hackathonTemporaryInvite.create({
        data: {
          email: studentEmail,
          teamId: teamId,
        },
      })

      await sendMail({
        to: studentEmail,
        subject: `Invitation to join hackathon team "${team.teamName}"`,
        html: generateHackathonInvitationEmail({
          hackathonName: team.hackathon.name,
          hackathonId: team.hackathon.id,
          hackathonStartDate: team.hackathon.start_date,
          hackathonEndDate: team.hackathon.end_date,
          registrationStartDate: team.hackathon.registration_start_date,
          registrationEndDate: team.hackathon.registration_end_date,
          name: "User",
          email: studentEmail,
        }),
      })

      return { error: `No student found with email ${studentEmail}. An invitation has been sent to this email address. If the user registers as a student, they will be able to join the team.` };
    }

    if (!invitedUser.students || !invitedUser.students) {
      return {
        error: `Student profile not found for ${studentEmail}. This user exists but has no student record. Please ask an administrator to complete their student profile setup.`
      };
    }

    const invitedStudent = invitedUser.students;

    // Check if hackathon restricts to Atmiya students only
    if (!team.hackathon.allow_external_students && !invitedStudent.departmentId) {
      return { error: "This hackathon is restricted to Atmiya University students only. External students cannot be invited." };
    }

    // Check if student is already a member of the team
    const isAlreadyMember = team.members.some(
      (member) => member.studentId === invitedStudent.id
    );

    if (isAlreadyMember) {
      return { error: "This student is already a member of the team" };
    }

    // Check if there's already a pending invite for this student
    const existingInvite = await prisma.hackathonTeamInvite.findFirst({
      where: {
        teamId: team.id,
        studentId: invitedStudent.id,
        status: "PENDING",
      },
    });

    if (existingInvite) {
      return { error: "An invitation has already been sent to this student" };
    }

    // Check if student is already in another team for this hackathon
    const otherTeamMembership = await prisma.hackathonTeamMember.findFirst({
      where: {
        studentId: invitedStudent.id,
        team: {
          hackathonId: team.hackathon.id,
        },
      },
    });

    if (otherTeamMembership) {
      return { error: "This student is already a member of another team in this hackathon" };
    }

    // Create the invitation
    await prisma.hackathonTeamInvite.create({
      data: {
        teamId: team.id,
        studentId: invitedStudent.id,
        status: "PENDING",
      },
    });

    // In a real application, you would send an email notification here
    // For now, we'll just return success

    return { success: true };
  } catch (error) {
    console.error("Error inviting team member:", error);
    return { error: "Failed to invite team member" };
  }
}
