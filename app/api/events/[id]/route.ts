import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        created_by: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        speakers: {
          select: {
            id: true,
            name: true,
            bio: true,
            photo_url: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json("Failed to fetch events", { status: 500 });
  }
}
