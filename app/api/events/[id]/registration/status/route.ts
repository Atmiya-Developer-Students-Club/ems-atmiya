import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({
                isRegistered: false,
                message: 'Please log in to check registration status'
            });
        }

        // Check if user is registered for the event
        const registration = await prisma.eventRegistration.findFirst({
            where: {
                userId: user.id,
                eventId: id
            }
        });

        return NextResponse.json({
            isRegistered: !!registration,
            registration: registration ? {
                id: registration.id,
                attended: registration.attended,
                checkedInAt: registration.checkedInAt,
                createdAt: registration.createdAt
            } : null
        });

    } catch (error) {
        console.error('Error checking registration status:', error);
        return NextResponse.json(
            { error: 'Failed to check registration status' },
            { status: 500 }
        );
    }
}
