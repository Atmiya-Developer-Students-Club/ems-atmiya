import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define the allowed fields that can be updated
const profileUpdateSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Full name too long"),
  phone: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body - only allow specific fields
    const validatedData = profileUpdateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validatedData.error.errors },
        { status: 400 }
      );
    }

    // Only allow updating specific fields - explicitly exclude role and other sensitive fields
    const allowedFields = {
      full_name: validatedData.data.full_name,
      phone: validatedData.data.phone,
    };

    // Update user metadata with only the allowed fields
    const { error: updateError } = await supabase.auth.updateUser({
      data: allowedFields,
    });

    if (updateError) {
      console.error("Error updating user profile:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    try {
      await prisma.user.update({
        where: { supabaseId: user.id },
        data: {
          firstName: allowedFields.full_name.split(" ")[0],
          lastName: allowedFields.full_name.split(" ")[1],
          phone: allowedFields.phone || null,
        },
      });
    } catch (error) {
      console.error("Error initializing Prisma Client:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully"
    });

  } catch (error) {
    console.error("Error in profile update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
