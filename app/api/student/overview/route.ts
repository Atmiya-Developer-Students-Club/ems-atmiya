import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

const eventSelectFields = {
  id: true,
  name: true,
  start_date: true,
  end_date: true,
  event_type: true,
  mode: true,
} as const;

export async function GET() {
  const supabase = await createClient();
  const { data, error: userError } = await supabase.auth.getUser();
  const user = data?.user;

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find student by supabaseId — select only needed fields
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: {
      currentSemester: true,
      currentYear: true,
      department: { select: { name: true } },
      program: { select: { name: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Run all independent queries in a single transaction (uses one connection)
  const [totalEventsAttended, upcomingEvents, completedEvents, feedbackGiven, recentFeedback] =
    await prisma.$transaction([
      prisma.eventRegistration.count({
        where: { userId: user.id },
      }),
      prisma.eventRegistration.findMany({
        where: {
          userId: user.id,
          event: { status: "UPCOMING" },
        },
        select: { event: { select: eventSelectFields } },
        orderBy: { event: { start_date: "asc" } },
        take: 5,
      }),
      prisma.eventRegistration.findMany({
        where: {
          userId: user.id,
          event: { status: "COMPLETED" },
        },
        select: { event: { select: eventSelectFields } },
        orderBy: { event: { end_date: "desc" } },
        take: 5,
      }),
      prisma.eventFeedback.count({
        where: { userId: user.id },
      }),
      prisma.eventFeedback.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          rating: true,
          comment: true,
          event: { select: { name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return NextResponse.json({
    student: {
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      department: student.department?.name,
      program: student.program?.name,
      currentSemester: student.currentSemester,
      currentYear: student.currentYear,
    },
    totalEventsAttended,
    feedbackGiven,
    upcomingEvents,
    completedEvents,
    recentFeedback,
  });
}
