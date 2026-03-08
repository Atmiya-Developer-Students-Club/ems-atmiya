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

    // Different query based on if master details are requested
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      include: {
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
    });

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // Find if the current user is in a team for this hackathon
    let userTeam: HackathonTeam | null = null;
    let pendingInvites: { teamId: string; teamName: string }[] = [];

    // Find the student record
    const student = await prisma.student.findFirst({
      where: {
        userId: user?.id,
      },
      select: {
        id: true,
      },
    });

    if (student) {
      // Check for team membership
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
      });

      if (teamMembership) {
        userTeam = teamMembership.team;
      } else {
        // Check for pending invites
        const invites = await prisma.hackathonTeamInvite.findMany({
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
        });

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
