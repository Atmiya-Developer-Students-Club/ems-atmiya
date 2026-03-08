import { markAttendanceSchema } from "@/components/section/master/hackathons/attendance/schema";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  if (user.app_metadata.role === "STUDENT") return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const parsedData = markAttendanceSchema.safeParse(await req.json());
  if (!parsedData.success) return NextResponse.json({ success: false, message: "Invalid data" }, { status: 400 });

  const { sheduleId, studentId, teamId } = parsedData.data;
  console.log("Marking attendance for student:", studentId, "by user:", user.id, "for schedule:", sheduleId);

  try {
    const team = await prisma.hackathonTeam.findFirst({
      where: {
        id: teamId,
      }
    });

    if (!team) return NextResponse.json({ success: false, message: "Team not found" }, { status: 400 });
    if (team.disqualified) return NextResponse.json({ success: false, message: "Team is disqualified" }, { status: 400 });

    const teamMember = await prisma.hackathonTeamMember.findFirst({
      where: {
        studentId,
        teamId,
      }
    });

    if (!teamMember) return NextResponse.json({ success: false, message: "Team member not found" }, { status: 400 });

    const schedule = await prisma.hackathonAttendanceSchedule.findFirst({
      where: {
        id: sheduleId,
      }
    });

    if (!schedule) return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 400 });

    await prisma.hackathonAttendance.upsert({
      where: {
        attendanceScheduleId_teamMemberId: {
          attendanceScheduleId: schedule.id,
          teamMemberId: teamMember.id,
        }
      },
      update: {
        isPresent: true,
        checkedInAt: new Date(),
        checkedInBy: user.id,
      },
      create: {
        attendanceScheduleId: schedule.id,
        teamMemberId: teamMember.id,
        isPresent: true,
        checkedInAt: new Date(),
        checkedInBy: user.id,
      }
    });
    return NextResponse.json({ success: true, message: "Attendance marked successfully" });

  } catch (error) {
    console.error("Error marking attendance:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
