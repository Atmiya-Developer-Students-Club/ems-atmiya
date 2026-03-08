import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { QRCodeService, QRCodeData } from '@/lib/qr-code';
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        console.log(user);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { qrCodeData, eventId } = body;

        if (!qrCodeData) {
            return NextResponse.json(
                { error: 'QR code data is required' },
                { status: 400 }
            );
        }

        // Parse and verify QR code
        const parsedData = QRCodeService.parseQRCodeData(qrCodeData);

        if (!parsedData) {
            return NextResponse.json(
                { error: 'Invalid or expired QR code' },
                { status: 400 }
            );
        }

        // Check scanner permissions (only admins and masters can scan)
        const scannerUser = await prisma.user.findUnique({
            where: { supabaseId: user.id },
            select: { role: true, firstName: true, lastName: true }
        });

        if (!scannerUser || !['ADMIN', 'MASTER'].includes(scannerUser.role)) {
            return NextResponse.json(
                { error: 'Insufficient permissions to scan QR codes' },
                { status: 403 }
            );
        }

        let result;

        if (parsedData.type === 'user') {
            // Handle user QR code scan
            result = await handleUserQRScan(parsedData, eventId, user.id, prisma);
        } else if (parsedData.type === 'event') {
            // Handle event QR code scan
            result = await handleEventQRScan(parsedData, user.id, prisma);
        } else {
            return NextResponse.json(
                { error: 'Unknown QR code type' },
                { status: 400 }
            );
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error scanning QR code:', error);
        return NextResponse.json(
            { error: 'Failed to scan QR code' },
            { status: 500 }
        );
    }
}

async function handleUserQRScan(
    qrData: QRCodeData,
    eventId: string | null,
    scannerId: string,
    prisma: PrismaClient
) {
    // Get user details
    const userData = await prisma.user.findUnique({
        where: { supabaseId: qrData.userId },
        select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            students: {
                select: {
                    registrationNumber: true,
                    department: { select: { name: true } },
                    program: { select: { name: true } }
                }
            }
        }
    });

    if (!userData || !userData.students) {
        throw new Error('User not found');
    }

    let registrationInfo = null;

    // If eventId is provided, check if user is registered for the event
    if (eventId) {
        const registration = await prisma.eventRegistration.findFirst({
            where: {
                userId: qrData.userId,
                eventId: eventId
            },
            include: {
                event: {
                    select: { name: true, start_date: true }
                }
            }
        });

        if (registration) {
            // Mark as attended if not already
            if (!registration.attended) {
                await prisma.eventRegistration.update({
                    where: { id: registration.id },
                    data: {
                        attended: true,
                        checkedInAt: new Date(),
                        checkedInBy: scannerId
                    }
                });
            }

            registrationInfo = {
                id: registration.id,
                attended: true,
                checkedInAt: registration.checkedInAt || new Date(),
                event: registration.event
            };
        }
    }

    return {
        success: true,
        type: 'user',
        user: {
            name: `${userData.firstName} ${userData.lastName}`,
            email: userData.email,
            role: userData.role,
            student: userData.students,
        },
        registration: registrationInfo,
        scannedAt: new Date()
    };
}

async function handleEventQRScan(qrData: QRCodeData, scannerId: string, prisma: PrismaClient) {
    if (!qrData.eventId) {
        throw new Error('Event ID not found in QR code');
    }

    // Get event details
    const event = await prisma.event.findUnique({
        where: { id: qrData.eventId },
        select: {
            id: true,
            name: true,
            description: true,
            start_date: true,
            end_date: true,
            start_time: true,
            address: true,
            mode: true,
            poster_url: true,
            organizer_name: true
        }
    });

    if (!event) {
        throw new Error('Event not found');
    }

    return {
        success: true,
        type: 'event',
        event: event,
        scannedAt: new Date(),
        message: 'Event QR code scanned successfully. This code can be used to check in registered users.',
        instructions: 'Users can now scan their personal QR codes or provide their information for manual.'
    };
}
