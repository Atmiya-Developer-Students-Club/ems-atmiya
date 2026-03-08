import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { UpdateAttendanceSchedulePayload } from "@/types/attendance";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
        { error: "Only master users can update attendance schedules" },
        { status: 403 }
      );
    }

    // Parse request body
    const body: UpdateAttendanceSchedulePayload = await req.json();
    const { day, checkInTime, description } = body;

    // Validate required fields
    if (!day || !checkInTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if the attendance schedule exists
    const existingSchedule = await prisma.hackathonAttendanceSchedule.findUnique({
      where: { id },
      include: {
        hackathon: true
      }
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Attendance schedule not found" },
        { status: 404 }
      );
    }

    // Update the attendance schedule
    const updatedSchedule = await prisma.hackathonAttendanceSchedule.update({
      where: { id },
      data: {
        day,
        checkInTime: new Date(checkInTime),
        description,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance schedule updated successfully",
      data: updatedSchedule
    });

  } catch (error) {
    console.error("Error updating attendance schedule:", error);
    return NextResponse.json(
      { error: "Failed to update attendance schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
        { error: "Only master users can delete attendance schedules" },
        { status: 403 }
      );
    }

    // Check if the attendance schedule exists
    const existingSchedule = await prisma.hackathonAttendanceSchedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Attendance schedule not found" },
        { status: 404 }
      );
    }

    // Delete related attendance records first to avoid foreign key constraints
    await prisma.hackathonAttendance.deleteMany({
      where: {
        attendanceScheduleId: id,
      },
    });

    // Delete the attendance schedule
    await prisma.hackathonAttendanceSchedule.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance schedule deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting attendance schedule:", error);
    return NextResponse.json(
      { error: "Failed to delete attendance schedule" },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the attendance schedule details
    const attendanceSchedule = await prisma.hackathonAttendanceSchedule.findUnique({
      where: { id },
      include: {
        hackathon: {
          select: {
            name: true,
            start_date: true,
            end_date: true,
          }
        },
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
                email: true,
              },
            },
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

    // For students, only show their own attendance record
    if (!await prisma.master.findFirst({ where: { userId: user.id } })) {
      const student = await prisma.student.findFirst({
        where: { userId: user.id },
      });

      if (student) {
        // Filter attendance records to only show the student's record
        const filteredRecords = attendanceSchedule.attendanceRecords.filter(
          record => record.teamMember.studentId === student.id
        );

        return NextResponse.json({
          ...attendanceSchedule,
          attendanceRecords: filteredRecords,
        });
      }
    }

    return NextResponse.json(attendanceSchedule);

  } catch (error) {
    console.error("Error fetching attendance schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance schedule" },
      { status: 500 }
    );
  }
}
