import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { QRCodeService } from '@/lib/qr-code';
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

        // Check if user has permission to generate QR code for events (Admin/Master only)
        const userData = await prisma.user.findUnique({
            where: { supabaseId: user.id }, // Use supabaseId instead of id
            select: { role: true }
        });

        if (!userData || !['ADMIN', 'MASTER'].includes(userData.role)) {
            return NextResponse.json(
                { error: 'Insufficient permissions. Only admins and masters can generate event QR codes.' },
                { status: 403 }
            );
        }

        // Get the event details
        const event = await prisma.event.findUnique({
            where: { id: id },
            select: {
                id: true,
                name: true,
                start_date: true,
                createdById: true,
                qrCode: true,
                qrCodeData: true
            }
        });

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        // Check if QR code already exists
        if (event.qrCode) {
            return NextResponse.json({
                success: true,
                status: 200,
                message: 'QR code already exists',
                qrCode: event.qrCode,
                qrCodeData: event.qrCodeData
            });
        }

        // Generate QR code for the event
        const { qrCode, qrCodeData } = await QRCodeService.generateEventQRCode(
            id,
            event.createdById
        );

        // Also generate a URL-based QR code for easy scanning
        const { qrCode: urlQrCode } = await QRCodeService.generateEventURLQRCode(id);

        // Update event with QR code
        await prisma.event.update({
            where: { id: id },
            data: {
                qrCode,
                qrCodeData
            }
        });

        return NextResponse.json({
            success: true,
            status: 200,
            message: 'QR code generated successfully',
            qrCode,
            qrCodeData,
            urlQrCode, // URL-based QR code for easy access
            event: {
                name: event.name,
                date: event.start_date
            }
        });

    } catch (error) {
        console.error('Error generating event QR code:', error);
        return NextResponse.json(
            { error: 'Failed to generate QR code' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    try {
        const { eventId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the event with QR code
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                name: true,
                description: true,
                start_date: true,
                end_date: true,
                start_time: true,
                end_time: true,
                address: true,
                mode: true,
                qrCode: true,
                qrCodeData: true,
                poster_url: true,
                organizer_name: true,
                created_by: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        if (!event.qrCode) {
            return NextResponse.json(
                { error: 'QR code not found. Please generate one first.' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            qrCode: event.qrCode,
            qrCodeData: event.qrCodeData,
            event: {
                id: event.id,
                name: event.name,
                description: event.description,
                start_date: event.start_date,
                end_date: event.end_date,
                start_time: event.start_time,
                end_time: event.end_time,
                address: event.address,
                mode: event.mode,
                poster_url: event.poster_url,
                organizer_name: event.organizer_name
            },
            created_by: event.created_by
        });

    } catch (error) {
        console.error('Error fetching event QR code:', error);
        return NextResponse.json(
            { error: 'Failed to fetch QR code' },
            { status: 500 }
        );
    }
}
