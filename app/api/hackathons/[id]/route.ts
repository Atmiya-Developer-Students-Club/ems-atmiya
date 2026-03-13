import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HackathonTeam } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = req.nextUrl.searchParams;
  const includeMasterDetails = searchParams.get('includeMasterDetails') === 'true';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const hackathonId = id;

    // Run hackathon query and student lookup in parallel
    const [hackathon, student] = await Promise.all([
      prisma.hackathon.findUnique({
        where: { id: hackathonId },
        include: {
          ...(includeMasterDetails ? {
            attendanceSchedules: {
              include: {
                attendanceRecords: {
                  include: {
                    teamMember: {
                      include: {
                        student: {
                          include: {
                            user: {
                              select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                              },
                            },
                          },
                        },
                      },
                    },
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
            },
          } : {
            attendanceSchedules: {
              select: {
                id: true,
                day: true,
                checkInTime: true,
                description: true,
              },
              orderBy: [
                { day: 'asc' },
                { checkInTime: 'asc' }
              ]
            },
          }),
          problemStatements: true,
          rules: true,
          ...(includeMasterDetails ? {
            teams: {
              select: {
                id: true,
                teamName: true,
                teamId: true,
                disqualified: true,
                submissionUrl: true,
                leaderId: true,
                mentor: true,
                mentor_mail: true,
                members: {
                  select: {
                    id: true,
                    studentId: true,
                    attended: true,
                    qrCode: true,
                    qrCodeData: true,
                    student: {
                      include: {
                        user: {
                          select: {
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
                  },
                },
                problemStatement: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
                  },
                },
              },
              orderBy: {
                teamId: 'asc'
              },
            },
          } : {}),
        },
      }),
      user?.id
        ? prisma.student.findFirst({
            where: { userId: user.id },
            select: { id: true },
          })
        : null,
    ]);

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // Find if the current user is in a team for this hackathon
    let userTeam: HackathonTeam | null = null;
    let pendingInvites: { teamId: string; teamName: string }[] = [];

    if (student) {
      // Run team membership and pending invites queries in parallel
      const [teamMembership, invites] = await Promise.all([
        prisma.hackathonTeamMember.findFirst({
          where: {
            studentId: student.id,
            team: {
              hackathonId,
            },
          },
          include: {
            team: {
              include: {
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
                  }
                }
              },
            },
          },
        }),
        prisma.hackathonTeamInvite.findMany({
          where: {
            studentId: student.id,
            team: {
              hackathonId,
            },
            status: "PENDING",
          },
          include: {
            team: {
              select: {
                id: true,
                teamName: true,
              },
            },
          },
        }),
      ]);

      if (teamMembership) {
        userTeam = teamMembership.team;
      }

      if (!teamMembership) {
        pendingInvites = invites.map((invite) => ({
          teamId: invite.teamId,
          teamName: invite.team.teamName,
        }));
      }
    }

    return NextResponse.json({
      hackathon,
      userTeam,
      pendingInvites,
    });
  } catch (error) {
    console.error("Error fetching hackathon details:", error);
    return NextResponse.json(
      { error: "Failed to fetch hackathon details" },
      { status: 500 }
    );
  }
}
