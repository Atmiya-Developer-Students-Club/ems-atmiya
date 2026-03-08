import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from "@/lib/prisma";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if event exists and is open for registration
        const event = await prisma.event.findUnique({
            where: { id: id },
            select: {
                id: true,
                name: true,
                registration_required: true,
                registration_limit: true,
                current_registration_count: true,
                status: true,
                start_date: true
            }
        });

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        if (!event.registration_required) {
            return NextResponse.json(
                { error: 'This event does not require registration' },
                { status: 400 }
            );
        }

        if (event.status !== 'UPCOMING') {
            return NextResponse.json(
                { error: 'Registration is closed for this event' },
                { status: 400 }
            );
        }

        // Check if registration limit is reached
        if (event.registration_limit && event.current_registration_count >= event.registration_limit) {
            return NextResponse.json(
                { error: 'Registration limit reached' },
                { status: 400 }
            );
        }

        // Check if user is already registered
        const existingRegistration = await prisma.eventRegistration.findFirst({
            where: {
                userId: user.id,
                eventId: id
            }
        });

        if (existingRegistration) {
            return NextResponse.json(
                { error: 'You are already registered for this event' },
                { status: 400 }
            );
        }

        // Create registration
        const registration = await prisma.eventRegistration.create({
            data: {
                userId: user.id,
                eventId: id
            }
        });

        // Update event registration count
        await prisma.event.update({
            where: { id: id },
            data: {
                current_registration_count: {
                    increment: 1
                }
            }
        });

        return NextResponse.json({
            message: 'Successfully registered for the event',
            registration: {
                id: registration.id,
                eventId: registration.eventId,
                createdAt: registration.createdAt
            }
        });

    } catch (error) {
        console.error('Error registering for event:', error);
        return NextResponse.json(
            { error: 'Failed to register for event' },
            { status: 500 }
        );
    }
}
