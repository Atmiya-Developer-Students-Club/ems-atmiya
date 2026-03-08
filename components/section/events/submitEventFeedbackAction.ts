"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { eventFeedbackSchema, EventFeedbackSchema } from "@/schemas/event";

export async function submitEventFeedback(eventId: string, data: EventFeedbackSchema) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "User not authenticated" };
  }

  if (!user.app_metadata.onboarding_complete) {
    return { error: "User onboarding not complete" };
  }

  const validatedData = eventFeedbackSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "Invalid feedback data" };
  }

  try {
    // Fetch event details to check timing and user registration
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        start_time: true,
        end_time: true,
        status: true,
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Check if the event has ended
    const now = new Date();
    let eventEndDateTime: Date;

    if (event.end_date && event.end_time) {
      // If both end_date and end_time exist, use them
      eventEndDateTime = new Date(event.end_date);
      eventEndDateTime.setHours(event.end_time.getHours(), event.end_time.getMinutes(), event.end_time.getSeconds());
    } else if (event.end_date) {
      // If only end_date exists, use end of day
      eventEndDateTime = new Date(event.end_date);
      eventEndDateTime.setHours(23, 59, 59, 999);
    } else if (event.end_time) {
      // If only end_time exists, combine with start_date
      eventEndDateTime = new Date(event.start_date);
      eventEndDateTime.setHours(event.end_time.getHours(), event.end_time.getMinutes(), event.end_time.getSeconds());
    } else {
      // If neither exists, use end of start_date
      eventEndDateTime = new Date(event.start_date);
      eventEndDateTime.setHours(23, 59, 59, 999);
    }

    if (now < eventEndDateTime) {
      // Check if we're within 30 minutes before event ends
      const thirtyMinutesBeforeEnd = new Date(eventEndDateTime.getTime() - 30 * 60 * 1000);
      if (now < thirtyMinutesBeforeEnd) {
        return { error: "Feedback can only be submitted within 30 minutes of the event ending" };
      }
    }

    // Check if user is registered for the event
    const userRegistration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId: eventId,
        },
      },
    });

    if (!userRegistration) {
      return { error: "You must be registered for this event to submit feedback" };
    }

    // Check if user has already submitted feedback for this event
    const existingFeedback = await prisma.eventFeedback.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId: eventId,
        },
      },
    });

    if (existingFeedback) {
      return { error: "You have already submitted feedback for this event" };
    }

    // Create the feedback
    await prisma.eventFeedback.create({
      data: {
        userId: user.id,
        eventId: eventId,
        rating: validatedData.data.rating,
        comment: validatedData.data.comment || null,
      },
    });

    // Update the event's feedback score
    const allFeedbacks = await prisma.eventFeedback.findMany({
      where: { eventId: eventId },
      select: { rating: true },
    });

    const averageRating = allFeedbacks.length > 0
      ? allFeedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) / allFeedbacks.length
      : 0;

    await prisma.event.update({
      where: { id: eventId },
      data: { feedback_score: averageRating },
    });

    return { success: true };
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return { error: "Failed to submit feedback. Please try again." };
  }
}
