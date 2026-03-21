import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {

    const { scheduleId } = await params;

    // Get the attendance schedule with related data
    const attendanceSchedule = await prisma.hackathonAttendanceSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        hackathon: {
          select: {
            id: true,
            name: true,
            start_date: true,
            mode: true,
            teams: {
              select: {
                id: true,
                teamName: true,
                teamId: true,
                leaderId: true,
                disqualified: true,
                members: {
                  select: {
                    id: true,
                    studentId: true,
                    attended: true,
                    student: {
                      select: {
                        id: true,
                        user: {
                          select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                          },
                        },
                        department: {
                          select: {
                            name: true,
                          },
                        },
                      },
                    },
                    attendanceRecords: {
                      where: {
                        attendanceScheduleId: scheduleId,
                      },
                      select: {
                        id: true,
                        isPresent: true,
                        checkedInAt: true,
                        checkedInByUser: {
                          select: {
                            firstName: true,
                            lastName: true,
                          },
                        },
                      },
                    },
                  },
                  orderBy: [
                    {
                      student: {
                        user: {
                          firstName: 'asc'
                        }
                      }
                    }
                  ]
                },
              },
              orderBy: {
                teamId: 'asc'
              }
            },
          },
        },
        attendanceRecords: {
          include: {
            teamMember: {
              include: {
                student: {
                  include: {
                    user: true,
                    department: true,
                  },
                },
                team: true,
              },
            },
            checkedInByUser: true,
          },
        },
      },
    });

    if (!attendanceSchedule) {
      return NextResponse.json(
        { error: "Attendance schedule not found" },
        { status: 404 }
      );
    }

    // Only consider qualified (non-disqualified) teams
    const qualifiedTeams = attendanceSchedule.hackathon.teams.filter(team => !team.disqualified);

    const totalMembers = qualifiedTeams.reduce(
      (count, team) => count + team.members.length,
      0
    );

    // Only count present for qualified team members
    const qualifiedMemberIds = new Set(qualifiedTeams.flatMap(team => team.members.map(m => m.id)));
    const presentCount = attendanceSchedule.attendanceRecords.filter(
      (record) => record.isPresent && qualifiedMemberIds.has(record.teamMemberId)
    ).length;

    const attendancePercentage = totalMembers > 0
      ? Math.round((presentCount / totalMembers) * 100)
      : 0;

    // Calculate team stats for qualified teams
    const totalTeams = qualifiedTeams.length;
    const presentTeams = qualifiedTeams.filter(team => {
      return team.members.some(member => {
        return member.attendanceRecords.some(record => record.isPresent);
      });
    }).length;

    const stats = {
      totalMembers,
      presentCount,
      absentCount: totalMembers - presentCount,
      attendancePercentage,
      totalTeams,
      presentTeams,
      absentTeams: totalTeams - presentTeams,
    };

    // Return only qualified teams in the response
    const attendanceScheduleFiltered = {
      ...attendanceSchedule,
      hackathon: {
        ...attendanceSchedule.hackathon,
        teams: qualifiedTeams,
      },
    };

    return NextResponse.json({
      success: true,
      attendanceSchedule: attendanceScheduleFiltered,
      stats,
    });
  } catch (error) {
    console.error("Error fetching attendance details:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance details" },
      { status: 500 }
    );
  }
}
