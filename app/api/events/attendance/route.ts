import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Check role in database, not Supabase metadata
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { role: true }
  });

  if (!dbUser || dbUser.role !== Role.MASTER) {
    return NextResponse.json(
      { success: false, error: "Insufficient Permission" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { userId, eventId } = body;

  if (!eventId) {
    return NextResponse.json({ success: false, error: "Missing event ID" }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ success: false, error: "Missing User Id" }, { status: 400 });
  }

  try {
    await prisma.eventRegistration.update({
      where: {
        userId_eventId: {
          userId: userId,
          eventId: eventId,
        }
      },
      data: {
        attended: true,
        checkedInAt: new Date(),
        checkedInBy: user.id,
      }
    })

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
