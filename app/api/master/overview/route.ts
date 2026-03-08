import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // Get current user session
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get current master info
  const currentMaster = await prisma.master.findUnique({
    where: { userId: user.id },
  });

  if (!currentMaster) {
    return NextResponse.json({ error: "Master not found" }, { status: 403 });
  }

  // Platform-wide statistics (no filtering)
  const totalStudents = await prisma.student.count();
  const totalPrograms = await prisma.program.count();

  // Upcoming and completed events
  const upcomingEvents = await prisma.event.count({ where: { status: "UPCOMING" } });
  const completedEvents = await prisma.event.count({ where: { status: "COMPLETED" } });
  const cancelledEvents = await prisma.event.count({ where: { status: "CANCELLED" } });

  // Students per department (all departments)
  const studentsByDepartment = await prisma.department.findMany({
    select: {
      name: true,
      students: { select: { id: true } },
    },
  });
  const departmentStats = studentsByDepartment.map((dep) => ({
    name: dep.name,
    count: dep.students.length,
  }));

  // Students per program (all programs)
  const studentsByProgram = await prisma.program.findMany({
    select: {
      name: true,
      students: { select: { id: true } },
    }
  });
  const programStats = studentsByProgram.map((prog) => ({
    name: prog.name,
    count: prog.students.length,
  }));

  // Students per university (all universities)
  const studentsByUniversity = await prisma.student.groupBy({
    by: ["university"],
    _count: {
      id: true,
    },
    where: {
      university: {
        not: null,
      },
    },
    orderBy: {
      _count: { id: "desc" },
    }
  });
  const universityStats = studentsByUniversity.map((uni) => ({
    name: uni.university || "Unknown",
    count: uni._count.id,
  }));

  // Event type distribution
  const eventsByType = await prisma.event.groupBy({
    by: ["event_type"],
    _count: {
      id: true,
    },
    orderBy: {
      _count: { id: "desc" },
    }
  });
  const eventTypeStats = eventsByType.map((type) => ({
    name: type.event_type,
    count: type._count.id,
  }));

  // Event mode distribution
  const eventsByMode = await prisma.event.groupBy({
    by: ["mode"],
    _count: {
      id: true,
    },
    orderBy: {
      _count: { id: "desc" },
    }
  });
  const eventModeStats = eventsByMode.map((mode) => ({
    name: mode.mode,
    count: mode._count.id,
  }));

  // Recent events (platform-wide)
  const recentEvents = await prisma.event.findMany({
    orderBy: { start_date: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      start_date: true,
      status: true,
      registration_required: true,
      current_registration_count: true,
      event_type: true,
      mode: true,
    },
  });

  // Recent registrations (platform-wide)
  const recentRegistrations = await prisma.eventRegistration.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      event: { select: { name: true } },
      user: { select: { firstName: true, lastName: true } },
      createdAt: true,
    },
  });

  // Recent feedback (platform-wide)
  const recentFeedback = await prisma.eventFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      rating: true,
      comment: true,
      event: { select: { name: true } },
      user: { select: { firstName: true, lastName: true } },
      createdAt: true,
    },
  });

  // Top events by registration (platform-wide)
  const topEvents = await prisma.event.findMany({
    orderBy: { current_registration_count: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      current_registration_count: true,
      start_date: true,
    },
  });

  // Average event rating (platform-wide)
  const avgRatingAgg = await prisma.eventFeedback.aggregate({
    _avg: { rating: true },
  });
  const avgEventRating = avgRatingAgg._avg.rating || 0;

  // Monthly trend data for the last 6 months
  // Get the current date and 6 months ago
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 5); // We want current month + 5 previous = 6 months total

  // Format to the first day of each month for the range
  const startDate = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1);

  // Get all users created in the last 6 months
  const userRegistrations = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Get all events created in the last 6 months
  const events = await prisma.event.findMany({
    where: {
      created_at: {
        gte: startDate,
      },
    },
    select: {
      created_at: true,
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  // Get all hackathons created in the last 6 months
  const hackathons = await prisma.hackathon.findMany({
    where: {
      created_at: {
        gte: startDate,
      },
    },
    select: {
      created_at: true,
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  // Generate months array for the last 6 months
  const months = [];
  for (let i = 0; i < 6; i++) {
    const monthDate = new Date();
    monthDate.setMonth(now.getMonth() - 5 + i);
    const monthName = monthDate.toLocaleString('default', { month: 'short' });
    const year = monthDate.getFullYear();
    months.push({
      name: `${monthName} ${year}`,
      year: year,
      month: monthDate.getMonth()
    });
  }

  // Create user registration trend data
  const userRegistrationTrend = months.map(monthInfo => {
    const count = userRegistrations.filter(registration => {
      const date = new Date(registration.createdAt);
      return date.getMonth() === monthInfo.month && date.getFullYear() === monthInfo.year;
    }).length;

    return {
      month: monthInfo.name,
      users: count
    };
  });

  // Create event and hackathon trend data
  const eventHackathonTrend = months.map(monthInfo => {
    const eventCount = events.filter(event => {
      const date = new Date(event.created_at);
      return date.getMonth() === monthInfo.month && date.getFullYear() === monthInfo.year;
    }).length;

    const hackathonCount = hackathons.filter(hackathon => {
      const date = new Date(hackathon.created_at);
      return date.getMonth() === monthInfo.month && date.getFullYear() === monthInfo.year;
    }).length;

    return {
      month: monthInfo.name,
      events: eventCount,
      hackathons: hackathonCount
    };
  });


  return NextResponse.json({
    totalStudents,
    totalPrograms,
    upcomingEvents,
    completedEvents,
    cancelledEvents,
    departmentStats,
    programStats,
    universityStats,
    eventTypeStats,
    eventModeStats,
    recentEvents,
    recentRegistrations,
    recentFeedback,
    topEvents,
    avgEventRating,
    userRegistrationTrend,
    eventHackathonTrend,
  });
}
