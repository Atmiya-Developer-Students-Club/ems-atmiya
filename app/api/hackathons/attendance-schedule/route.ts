import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { CreateAttendanceSchedulePayload } from "@/types/attendance";

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
        { error: "Only master users can manage attendance schedules" },
        { status: 403 }
      );
    }

    // Parse request body
    const body: CreateAttendanceSchedulePayload = await req.json();
    const { hackathonId, day, checkInTime, description } = body;

    // Validate required fields
    if (!hackathonId || !day || !checkInTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
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

    // Create the attendance schedule
    const attendanceSchedule = await prisma.hackathonAttendanceSchedule.create({
      data: {
        hackathonId,
        day,
        checkInTime: new Date(checkInTime),
        description,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance schedule created successfully",
      data: attendanceSchedule
    });

  } catch (error) {
    console.error("Error creating attendance schedule:", error);
    return NextResponse.json(
      { error: "Failed to create attendance schedule" },
      { status: 500 }
    );
  }
}

// Get all attendance schedules for a hackathon
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const hackathonId = url.searchParams.get('hackathonId');

  if (!hackathonId) {
    return NextResponse.json(
      { error: "Hackathon ID is required" },
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
        { error: "Only master users can access attendance schedules" },
        { status: 403 }
      );
    }

    // Get all attendance schedules for the hackathon
    const attendanceSchedules = await prisma.hackathonAttendanceSchedule.findMany({
      where: { hackathonId },
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
      orderBy: [
        { day: 'asc' },
        { checkInTime: 'asc' }
      ],
    });

    return NextResponse.json({
      success: true,
      data: attendanceSchedules
    });

  } catch (error) {
    console.error("Error fetching attendance schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance schedules" },
      { status: 500 }
    );
  }
}
