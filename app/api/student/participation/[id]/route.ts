import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: hackathonId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the student record
    const student = await prisma.student.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        user: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get hackathon details with attendance schedules
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      include: {
        problemStatements: true,
        rules: true,
        attendanceSchedules: {
          include: {
            attendanceRecords: {
              where: {
                teamMember: {
                  studentId: student.id
                }
              },
              include: {
                checkedInByUser: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: [
            { day: 'asc' },
            { checkInTime: 'asc' }
          ]
        }
      },
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // Check if student is a member of any team for this hackathon
    const teamMembership = await prisma.hackathonTeamMember.findFirst({
      where: {
        studentId: student.id,
        team: {
          hackathonId,
        },
      },
      include: {
        team: {
          include: {
            leader: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            members: {
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
            invites: {
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
            problemStatement: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
            hackathon: {
              select: {
                team_size_limit: true,
              },
            },
          },
        },
      },
    });

    if (!teamMembership) {
      return NextResponse.json(
        { error: "No team found for this student in this hackathon" },
        { status: 404 }
      );
    }

    const team = teamMembership.team;

    // Determine if current student is team leader
    const isTeamOwner = team.leaderId == student.id;

    // Transform hackathon data to match expected format
    const transformedHackathon = {
      ...hackathon,
      start_date: hackathon.start_date.toISOString(),
      end_date: hackathon.end_date.toISOString(),
      start_time: hackathon.start_time.toISOString(),
      end_time: hackathon.end_time.toISOString(),
      registration_start_date: hackathon.registration_start_date?.toISOString(),
      registration_end_date: hackathon.registration_end_date?.toISOString(),
      created_at: hackathon.created_at.toISOString(),
      // Transform attendance schedules
      attendanceSchedules: hackathon.attendanceSchedules.map(schedule => ({
        ...schedule,
        checkInTime: schedule.checkInTime.toISOString(),
        created_at: schedule.created_at.toISOString(),
        updated_at: schedule.updated_at.toISOString(),
        attendanceRecords: schedule.attendanceRecords.map(record => ({
          ...record,
          checkedInAt: record.checkedInAt.toISOString(),
          created_at: record.created_at.toISOString(),
          updated_at: record.updated_at.toISOString(),
        }))
      })),
    };

    return NextResponse.json({
      hackathon: transformedHackathon,
      team,
      isTeamOwner,
      studentId: student.id,
      currentUser: student.user,
    });
  } catch (error) {
    console.error("Error fetching team management data:", error);
    return NextResponse.json(
      { error: "Failed to load team management data" },
      { status: 500 }
    );
  }
}
