import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    // Get all hackathons
    const hackathons = await prisma.hackathon.findMany({
      orderBy: {
        created_at: "desc",
      },
    });

    // Check for user registrations if user is logged in
    const userRegistrations: Record<string, boolean> = {};

    if (user) {
      // Find the student record
      const student = await prisma.student.findFirst({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
        },
      });

      if (student) {
        // Get all teams the student is a member of
        const teamMemberships = await prisma.hackathonTeamMember.findMany({
          where: {
            studentId: student.id,
          },
          include: {
            team: {
              select: {
                hackathonId: true,
              },
            },
          },
        });

        // Map hackathon IDs to registration status
        teamMemberships.forEach((membership) => {
          userRegistrations[membership.team.hackathonId] = true;
        });
      }
    }

    return NextResponse.json({
      hackathons,
      userRegistrations,
    });
  } catch (error) {
    console.error("Error fetching hackathons:", error);
    return NextResponse.json(
      { error: "Failed to fetch hackathons" },
      { status: 500 }
    );
  }
}
