"use server";

import { QRCodeService } from "@/lib/qr-code";
import { formattedEventSchema, FormattedEventSchema } from "@/schemas/event";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { generateEventEmailHTML } from "./mail/template";

export async function createEventAction(data: FormattedEventSchema) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const validatedData = formattedEventSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "Invalid event data" };
  }

  const { speakers } = validatedData.data;

  try {
    const event = await prisma.event.create({
      data: {
        ...validatedData.data,
        poster_url: validatedData.data.poster_url ?? "",
        speakers: {
          create: speakers.map((speaker) => ({
            name: speaker.name,
            bio: speaker.bio,
            photo_url: speaker.photo_url ?? "",
          })),
        },
        createdById: user.id,
        qrCode: "",
        qrCodeData: "",
      },
    });

    // Generate QR code directly instead of making HTTP request
    try {
      const { qrCode, qrCodeData } = await QRCodeService.generateEventURLQRCode(event.id);

      // Update the event with the generated QR code
      await prisma.event.update({
        where: { id: event.id },
        data: {
          qrCode,
          qrCodeData,
        },
      });
    } catch (qrError) {
      console.error("Failed to generate QR code:", qrError);
      // Don't fail the entire event creation if QR code generation fails
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

    axios.post(`${process.env.PIGEON_BASE_URL}/bulk`, {
      subject: `Don't Miss Out! Join Us for ${event.name} at Atmiya University 🎉`,
      recipients: users.map(u => { return { email: u.email, name: `${u.firstName} ${u.lastName}` } }),
      html: generateEventEmailHTML({
        EVENT_NAME: event.name,
        EVENT_DESCRIPTION: event.description,
        EVENT_DATE_START: event.start_date,
        EVENT_DATE_END: event.end_date,
        EVENT_TIME_START: event.start_time,
        EVENT_TIME_END: event.end_time,
        EVENT_MODE: event.mode,
        EVENT_ADDRESS: event.address,
        ORGANIZER_NAME: event.organizer_name,
        ORGANIZER_EMAIL: event.organizer_contact,
        EVENT_HIGHLIGHTS: event.key_highlights,
        EVENT_ID: event.id,
        EVENT_NOTE: event.note,
      })
    },
      {
        headers: {
          Authorization: `Bearer ${process.env.PIGEON_API_KEY}`
        }
      })

    return { success: true, data: event };
  } catch (error) {
    console.error("Error creating event:", error);
    return { error: "Failed to create event" };
  }
}
