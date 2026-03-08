import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {    // Make sure the user is only allowed to fetch their own data
    // or allow admins/masters to fetch any user's data
    if (currentUser.id !== id) {
      // Check if current user has admin or master role
      const currentDbUser = await prisma.user.findUnique({
        where: {
          supabaseId: currentUser.id,
        },
        select: {
          role: true,
        },
      });

      if (!currentDbUser || (currentDbUser.role !== "ADMIN" && currentDbUser.role !== "MASTER")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Fetch the user with their student data
    const user = await prisma.user.findUnique({
      where: {
        supabaseId: id,
      },
      include: {
        students: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
