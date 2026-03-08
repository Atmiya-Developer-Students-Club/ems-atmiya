"use server";

import { formattedHackathonSchema, FormattedHackathonSchema } from "@/schemas/hackathon";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { QRCodeService } from "@/lib/qr-code";
import axios from "axios";
import { generateHackathonEmailTemplate } from "./mail/template";

export async function createHackathonAction(data: FormattedHackathonSchema) {
  try {
    console.log("Starting createHackathonAction");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("Authorization failed: No user found");
      return { error: "Unauthorized" };
    }

    console.log("User authenticated:", user.id);

    const validatedData = formattedHackathonSchema.safeParse(data);
    if (!validatedData.success) {
      console.log("Validation errors:", validatedData.error.format());
      return { error: "Invalid hackathon data: " + validatedData.error.errors.map(e => e.message).join(", ") };
    }

    const { problemStatements, rules } = validatedData.data;

    console.log("Creating hackathon in database");

    const result = await prisma.hackathon.create({
      data: {
        name: validatedData.data.name,
        description: validatedData.data.description,
        poster_url: validatedData.data.poster_url ?? "",
        location: validatedData.data.location ?? "",
        start_date: validatedData.data.start_date,
        end_date: validatedData.data.end_date,
        start_time: validatedData.data.start_time,
        end_time: validatedData.data.end_time,
        registration_start_date: validatedData.data.registration_start_date,
        registration_end_date: validatedData.data.registration_end_date,
        registration_limit: validatedData.data.registration_limit,
        mode: validatedData.data.mode,
        status: validatedData.data.status,
        team_size_limit: validatedData.data.team_size_limit,
        organizer_name: validatedData.data.organizer_name,
        organizer_contact: validatedData.data.organizer_contact,
        tags: validatedData.data.tags || [],
        problemStatements: {
          create: problemStatements.map((ps) => ({
            code: ps.code,
            title: ps.title,
            description: ps.description,
          })),
        },
        rules: {
          create: rules.map((rule) => ({
            rule,
          })),
        },
        evaluationCriteria: validatedData.data.evaluationCriteria || [],
        qrCode: "",
        qrCodeData: "",
      },
    });

    console.log("Hackathon created successfully:", result.id);

    // Generate QR code for the hackathon
    try {
      const { qrCode, qrCodeData } = await QRCodeService.generateHackathonURLQRCode(result.id);

      // Update the hackathon with the generated QR code
      await prisma.hackathon.update({
        where: { id: result.id },
        data: {
          qrCode,
          qrCodeData,
        },
      });

      console.log("QR code generated successfully for hackathon:", result.id);
    } catch (qrError) {
      console.error("Failed to generate QR code for hackathon:", qrError);
      // Don't fail the entire hackathon creation if QR code generation fails
    }

    let users: { email: string; firstName: string; lastName: string | null }[] = [];
    try {
      users = await prisma.user.findMany({
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      // Proceed with an empty user list if fetching fails
    }

    axios.post(`${process.env.PIGEON_BASE_URL}/api/bulk`, {
      subject: `Join Us for ${result.name} at Atmiya University! 🚀`,
      recipients: users.map(u => { return { email: u.email, name: `${u.firstName} ${u.lastName}` } }),
      html: generateHackathonEmailTemplate({
        Hackathon_Name: result.name,
        Registration_Start: result.registration_start_date,
        Registration_End: result.registration_end_date,
        Hackathon_Start: result.start_date,
        Hackathon_End: result.end_date,
        Hackathon_Start_Time: result.start_time,
        Hackathon_End_Time: result.end_time,
        Mode: result.mode,
        Location: result.location || "N/A",
        Registration_Limits: result.registration_limit,
        Team_Size_Limit: result.team_size_limit,
        Organizer_Name: result.organizer_name,
        Organizer_Email: result.organizer_contact || "N/A",
        Register_Link: `https://ems.atmiya.edu.in/hackathons/${result.id}`,
      })
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PIGEON_API_KEY}`
      }
    });

    return { success: true, hackathonId: result.id };
  } catch (error) {
    console.error("Error creating hackathon:", error);
    let errorMessage = "Failed to create hackathon";

    if (error instanceof Error) {
      errorMessage += ": " + error.message;
    }

    return { error: errorMessage };
  }
}
