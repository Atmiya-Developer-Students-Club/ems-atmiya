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
    // Check if user is a Master or Admin
    const master = await prisma.master.findFirst({
      where: {
        userId: user.id,
      },
    });

    const admin = !master ? await prisma.admin.findFirst({
      where: {
        userId: user.id,
      },
    }) : null;

    if (!master && !admin) {
      return NextResponse.json(
        { error: "Unauthorized to access attendance statistics" },
        { status: 403 }
      );
    }

    // Check if the hackathon exists
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }

    // Get attendance schedules for the hackathon
    const schedules = await prisma.hackathonAttendanceSchedule.findMany({
      where: { hackathonId },
      orderBy: [
        { day: 'asc' },
        { checkInTime: 'asc' }
      ],
      include: {
        _count: {
          select: { attendanceRecords: true }
        }
      }
    });

    // Get all teams and team members for the hackathon
    const teams = await prisma.hackathonTeam.findMany({
      where: { hackathonId },
      include: {
        members: true,
        _count: {
          select: { members: true }
        }
      }
    });

    // Get all attendance records for the hackathon
    const attendanceRecords = await prisma.hackathonAttendance.findMany({
      where: {
        attendanceSchedule: {
          hackathonId
        }
      },
      include: {
        teamMember: {
          select: {
            teamId: true,
            studentId: true
          }
        },
        attendanceSchedule: {
          select: {
            day: true
          }
        }
      }
    });

    // Calculate statistics
    const totalTeams = teams.length;
    const totalTeamMembers = teams.reduce((sum, team) => sum + team._count.members, 0);
    const totalSchedules = schedules.length;
    const totalPossibleAttendances = totalTeamMembers * totalSchedules;
    const totalActualAttendances = attendanceRecords.filter(record => record.isPresent).length;
    const overallAttendancePercentage = totalPossibleAttendances > 0
      ? Math.round((totalActualAttendances / totalPossibleAttendances) * 100)
      : 0;

    // Group schedules by day for stats
    const daySchedules: Record<number, any> = {};
    schedules.forEach(schedule => {
      if (!daySchedules[schedule.day]) {
        daySchedules[schedule.day] = {
          day: schedule.day,
          schedules: [],
          totalPossibleAttendances: 0,
          totalActualAttendances: 0,
          attendancePercentage: 0
        };
      }

      // Get attendance records for this schedule
      const scheduleRecords = attendanceRecords.filter(
        record => record.attendanceScheduleId === schedule.id
      );

      const presentCount = scheduleRecords.filter(record => record.isPresent).length;
      const attendancePercentage = totalTeamMembers > 0
        ? Math.round((presentCount / totalTeamMembers) * 100)
        : 0;

      daySchedules[schedule.day].schedules.push({
        id: schedule.id,
        time: schedule.checkInTime,
        description: schedule.description,
        presentCount,
        totalMembers: totalTeamMembers,
        attendancePercentage
      });

      daySchedules[schedule.day].totalPossibleAttendances += totalTeamMembers;
      daySchedules[schedule.day].totalActualAttendances += presentCount;
    });

    // Calculate attendance percentage for each day
    Object.values(daySchedules).forEach((day: any) => {
      day.attendancePercentage = day.totalPossibleAttendances > 0
        ? Math.round((day.totalActualAttendances / day.totalPossibleAttendances) * 100)
        : 0;
    });

    // Calculate team-wise attendance stats
    const teamStats = teams.map(team => {
      const teamMemberIds = team.members.map(m => m.id);
      const teamRecords = attendanceRecords.filter(
        record => teamMemberIds.includes(record.teamMemberId)
      );

      const totalPossible = teamMemberIds.length * totalSchedules;
      const actualPresent = teamRecords.filter(r => r.isPresent).length;
      const attendancePercentage = totalPossible > 0
        ? Math.round((actualPresent / totalPossible) * 100)
        : 0;

      return {
        teamId: team.id,
        teamName: team.teamName,
        teamCode: team.teamId,
        memberCount: team._count.members,
        totalPossibleAttendances: totalPossible,
        totalActualAttendances: actualPresent,
        attendancePercentage,
        disqualified: team.disqualified
      };
    });

    // Sort teams by attendance percentage (descending)
    teamStats.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalTeams,
          totalTeamMembers,
          totalSchedules,
          totalPossibleAttendances,
          totalActualAttendances,
          overallAttendancePercentage
        },
        dayWiseStats: Object.values(daySchedules),
        teamStats
      }
    });

  } catch (error) {
    console.error("Error fetching attendance statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance statistics" },
      { status: 500 }
    );
  }
}
