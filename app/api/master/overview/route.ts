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

  // Monthly trend date range
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 5);
  const startDate = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1);

  // Run queries in two batches to maintain type safety
  // Batch 1: groupBy queries (run separately for proper type inference)
  const [studentsByUniversity, eventsByType, eventsByMode] = await Promise.all([
    prisma.student.groupBy({
      by: ["university"],
      _count: { id: true },
      where: { university: { not: null } },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.event.groupBy({
      by: ["event_type"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.event.groupBy({
      by: ["mode"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  // Batch 2: all other queries in a single transaction (one connection)
  const [
    totalStudents,
    totalPrograms,
    upcomingEvents,
    completedEvents,
    cancelledEvents,
    studentsByDepartment,
    studentsByProgram,
    recentEvents,
    recentRegistrations,
    recentFeedback,
    topEvents,
    avgRatingAgg,
    userRegistrations,
    eventsTrend,
    hackathonsTrend,
  ] = await prisma.$transaction([
    prisma.student.count(),
    prisma.program.count(),
    prisma.event.count({ where: { status: "UPCOMING" } }),
    prisma.event.count({ where: { status: "COMPLETED" } }),
    prisma.event.count({ where: { status: "CANCELLED" } }),
    // Use _count instead of fetching all student IDs
    prisma.department.findMany({
      select: {
        name: true,
        _count: { select: { students: true } },
      },
    }),
    prisma.program.findMany({
      select: {
        name: true,
        _count: { select: { students: true } },
      },
    }),
    prisma.event.findMany({
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
    }),
    prisma.eventRegistration.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        event: { select: { name: true } },
        user: { select: { firstName: true, lastName: true } },
        createdAt: true,
      },
    }),
    prisma.eventFeedback.findMany({
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
    }),
    prisma.event.findMany({
      orderBy: { current_registration_count: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        current_registration_count: true,
        start_date: true,
      },
    }),
    prisma.eventFeedback.aggregate({
      _avg: { rating: true },
    }),
    // Trend data: fetch only createdAt for counting
    prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    }),
    prisma.event.findMany({
      where: { created_at: { gte: startDate } },
      select: { created_at: true },
    }),
    prisma.hackathon.findMany({
      where: { created_at: { gte: startDate } },
      select: { created_at: true },
    }),
  ]);

  // Transform department/program stats using _count
  const departmentStats = studentsByDepartment.map((dep) => ({
    name: dep.name,
    count: dep._count.students,
  }));

  const programStats = studentsByProgram.map((prog) => ({
    name: prog.name,
    count: prog._count.students,
  }));

  const universityStats = studentsByUniversity.map((uni) => ({
    name: uni.university || "Unknown",
    count: uni._count.id,
  }));

  const eventTypeStats = eventsByType.map((type) => ({
    name: type.event_type,
    count: type._count.id,
  }));

  const eventModeStats = eventsByMode.map((mode) => ({
    name: mode.mode,
    count: mode._count.id,
  }));

  const avgEventRating = avgRatingAgg._avg.rating || 0;

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
    const eventCount = eventsTrend.filter(event => {
      const date = new Date(event.created_at);
      return date.getMonth() === monthInfo.month && date.getFullYear() === monthInfo.year;
    }).length;

    const hackathonCount = hackathonsTrend.filter(hackathon => {
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
