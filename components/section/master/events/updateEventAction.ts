"use server";

import { formattedEventSchema, FormattedEventSchema } from "@/schemas/event";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function updateEventAction(
  id: string,
  data: FormattedEventSchema
) {
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
    // First, delete existing speakers
    await prisma.eventSpeaker.deleteMany({
      where: { eventId: id },
    });

    // Update the event and create new speakers
    const event = await prisma.event.update({
      where: { id },
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
      },
    });

    return { success: true, data: event };
  } catch (error) {
    console.error("Error updating event:", error);
    return { error: "Failed to update event" };
  }
}
