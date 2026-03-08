import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Bulk mark attendance for all team members
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.app_metadata.role === 'STUDENT') {
    return NextResponse.json(
      { error: "Only master users can mark bulk attendance" },
      { status: 403 }
    );
  }
  try {

    // Parse request body
    const body = await req.json();
    const { scheduleId, teamId, isPresent = true } = body;

    // Validate required fields
    if (!scheduleId || !teamId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if the schedule exists
    const schedule = await prisma.hackathonAttendanceSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Attendance schedule not found" },
        { status: 404 }
      );
    }

    // Check if the team exists
    const team = await prisma.hackathonTeam.findUnique({
      where: { id: teamId },
      include: {
        members: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Mark attendance for all team members
    const now = new Date();
    const results = [];

    for (const member of team.members) {
      // Check if an attendance record already exists
      const existingRecord = await prisma.hackathonAttendance.findUnique({
        where: {
          attendanceScheduleId_teamMemberId: {
            attendanceScheduleId: scheduleId,
            teamMemberId: member.id
          }
        }
      });

      let attendanceRecord;

      if (existingRecord) {
        // Update existing attendance record
        attendanceRecord = await prisma.hackathonAttendance.update({
          where: {
            id: existingRecord.id
          },
          data: {
            isPresent,
            checkedInAt: now,
            checkedInBy: user.id
          }
        });
      } else {
        // Create new attendance record
        attendanceRecord = await prisma.hackathonAttendance.create({
          data: {
            teamMemberId: member.id,
            attendanceScheduleId: scheduleId,
            isPresent,
            checkedInAt: now,
            checkedInBy: user.id
          }
        });
      }

      results.push(attendanceRecord);
    }

    return NextResponse.json({
      success: true,
      message: `Bulk attendance marked successfully for ${results.length} team members`,
      data: {
        teamName: team.teamName,
        teamId: team.teamId || team.id,
        memberCount: results.length,
        records: results
      }
    });

  } catch (error) {
    console.error("Error marking bulk attendance:", error);
    return NextResponse.json(
      { error: "Failed to mark bulk attendance" },
      { status: 500 }
    );
  }
}

// Get a list of teams with their attendance status for a specific schedule
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const scheduleId = url.searchParams.get('scheduleId');
  const hackathonId = url.searchParams.get('hackathonId');

  if (!scheduleId && !hackathonId) {
    return NextResponse.json(
      { error: "Either scheduleId or hackathonId is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is a Master
    const master = await prisma.master.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!master) {
      return NextResponse.json(
        { error: "Only master users can access team attendance summary" },
        { status: 403 }
      );
    }

    let scheduleIds: string[] = [];

    if (scheduleId) {
      scheduleIds = [scheduleId];
    } else if (hackathonId) {
      // Get all schedules for the hackathon
      const schedules = await prisma.hackathonAttendanceSchedule.findMany({
        where: { hackathonId },
        select: { id: true }
      });

      scheduleIds = schedules.map(s => s.id);
    }

    if (scheduleIds.length === 0) {
      return NextResponse.json(
        { error: "No schedules found" },
        { status: 404 }
      );
    }

    // Get teams and their attendance statistics
    const result = await Promise.all(scheduleIds.map(async (sid) => {
      // Get the schedule details
      const schedule = await prisma.hackathonAttendanceSchedule.findUnique({
        where: { id: sid },
        select: {
          id: true,
          day: true,
          checkInTime: true,
          description: true,
          hackathonId: true
        }
      });

      if (!schedule) return null;

      // Get teams for this hackathon
      const teams = await prisma.hackathonTeam.findMany({
        where: {
          hackathonId: schedule.hackathonId,
          disqualified: false
        },
        include: {
          members: {
            include: {
              student: {
                select: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Get attendance records for this schedule
      const attendanceRecords = await prisma.hackathonAttendance.findMany({
        where: {
          attendanceScheduleId: sid
        },
        include: {
          teamMember: {
            select: {
              teamId: true
            }
          }
        }
      });

      // Process the data to get team attendance stats
      const teamStats = teams.map(team => {
        const totalMembers = team.members.length;

        // Count present members for this team
        const presentMembers = attendanceRecords.filter(
          record => record.teamMember.teamId === team.id && record.isPresent
        ).length;

        // Calculate attendance percentage
        const attendancePercentage = totalMembers > 0
          ? Math.round((presentMembers / totalMembers) * 100)
          : 0;

        return {
          teamId: team.id,
          teamName: team.teamName,
          teamIdCode: team.teamId,
          totalMembers,
          presentMembers,
          attendancePercentage,
          members: team.members.map(member => {
            const record = attendanceRecords.find(
              r => r.teamMemberId === member.id
            );

            return {
              memberId: member.id,
              name: `${member.student.user.firstName} ${member.student.user.lastName || ''}`,
              isPresent: record ? record.isPresent : false,
              checkedInAt: record ? record.checkedInAt : null
            };
          })
        };
      });

      return {
        scheduleId: sid,
        day: schedule.day,
        time: schedule.checkInTime,
        description: schedule.description,
        teamStats
      };
    }));

    // Filter out null results
    const validResults = result.filter(Boolean);

    return NextResponse.json({
      success: true,
      data: validResults
    });

  } catch (error) {
    console.error("Error fetching team attendance summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch team attendance summary" },
      { status: 500 }
    );
  }
}
