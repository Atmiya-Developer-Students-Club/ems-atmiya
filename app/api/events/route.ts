import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {

  try {
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        start_date: true,
        address: true,
        start_time: true,
        end_time: true,
        status: true,
        mode: true,
        event_type: true,
        poster_url: true,
        description: true,
        ticket_price: true,
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
