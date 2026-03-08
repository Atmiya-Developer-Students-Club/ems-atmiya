import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { MarkAttendancePayload } from "@/types/attendance";

// Mark attendance for a specific schedule
export async function POST(req: NextRequest) {
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
        { error: "Only master users can mark attendance" },
        { status: 403 }
      );
    }

    // Parse request body
    const body: MarkAttendancePayload = await req.json();
    const { teamMemberId, scheduleId, isPresent } = body;

    // Validate required fields
    if (!teamMemberId || !scheduleId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if the team member exists
    const teamMember = await prisma.hackathonTeamMember.findUnique({
      where: { id: teamMemberId },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
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

    // Check if an attendance record already exists
    const existingRecord = await prisma.hackathonAttendance.findUnique({
      where: {
        attendanceScheduleId_teamMemberId: {
          attendanceScheduleId: scheduleId,
          teamMemberId: teamMemberId
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
          isPresent: isPresent ?? true,
          checkedInAt: new Date(),
          checkedInBy: user.id
        }
      });
    } else {
      // Create new attendance record
      attendanceRecord = await prisma.hackathonAttendance.create({
        data: {
          teamMemberId: teamMemberId,
          attendanceScheduleId: scheduleId,
          isPresent: isPresent ?? true,
          checkedInAt: new Date(),
          checkedInBy: user.id
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Attendance ${existingRecord ? 'updated' : 'marked'} successfully`,
      data: attendanceRecord
    });

  } catch (error) {
    console.error("Error marking attendance:", error);
    return NextResponse.json(
      { error: "Failed to mark attendance" },
      { status: 500 }
    );
  }
}

// Get attendance records for a specific schedule
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const scheduleId = url.searchParams.get('scheduleId');
  const teamId = url.searchParams.get('teamId');

  if (!scheduleId) {
    return NextResponse.json(
      { error: "Schedule ID is required" },
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
    // Check if user is a Master or relevant Student
    const master = await prisma.master.findFirst({
      where: {
        userId: user.id,
      },
    });

    const student = !master ? await prisma.student.findFirst({
      where: {
        userId: user.id,
      },
    }) : null;

    if (!master && !student) {
      return NextResponse.json(
        { error: "Unauthorized to access attendance records" },
        { status: 403 }
      );
    }

    // If user is a student, they should only see their team's attendance
    const whereClause: any = {
      attendanceScheduleId: scheduleId,
    };

    if (student && !master) {
      if (!teamId) {
        return NextResponse.json(
          { error: "Team ID is required for student users" },
          { status: 400 }
        );
      }

      // Verify student is a member of the team
      const isMember = await prisma.hackathonTeamMember.findFirst({
        where: {
          teamId: teamId,
          studentId: student.id,
        },
      });

      if (!isMember) {
        return NextResponse.json(
          { error: "You are not authorized to view this team's attendance" },
          { status: 403 }
        );
      }

      whereClause.teamMember = {
        teamId: teamId,
      };
    } else if (teamId) {
      // If master specifies a team ID, filter by that team
      whereClause.teamMember = {
        teamId: teamId,
      };
    }

    // Get attendance records
    const attendanceRecords = await prisma.hackathonAttendance.findMany({
      where: whereClause,
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
                  },
                },
              },
            },
            team: {
              select: {
                teamName: true,
                teamId: true
              }
            }
          },
        },
        attendanceSchedule: true,
        checkedInByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: attendanceRecords
    });

  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records" },
      { status: 500 }
    );
  }
}
