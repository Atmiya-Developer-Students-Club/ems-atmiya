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

        // Check if user has permission to generate QR code for hackathons (Admin/Master only)
        const userData = await prisma.user.findUnique({
            where: { supabaseId: user.id }, // Use supabaseId instead of id
            select: { role: true }
        });

        if (!userData || !['ADMIN', 'MASTER'].includes(userData.role)) {
            return NextResponse.json(
                { error: 'Insufficient permissions. Only admins and masters can generate hackathon QR codes.' },
                { status: 403 }
            );
        }

        // Get the hackathon details
        const hackathon = await prisma.hackathon.findUnique({
            where: { id: id },
            select: {
                id: true,
                name: true,
                start_date: true,
                qrCode: true,
                qrCodeData: true
            }
        });

        if (!hackathon) {
            return NextResponse.json(
                { error: 'Hackathon not found' },
                { status: 404 }
            );
        }

        // Check if QR code already exists
        if (hackathon.qrCode) {
            return NextResponse.json({
                success: true,
                status: 200,
                message: 'QR code already exists',
                qrCode: hackathon.qrCode,
                qrCodeData: hackathon.qrCodeData
            });
        }

        // Generate QR code for the hackathon using URL-based approach
        const { qrCode, qrCodeData } = await QRCodeService.generateHackathonURLQRCode(id);

        // Update hackathon with QR code
        await prisma.hackathon.update({
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
            hackathon: {
                name: hackathon.name,
                date: hackathon.start_date
            }
        });

    } catch (error) {
        console.error('Error generating hackathon QR code:', error);
        return NextResponse.json(
            { error: 'Failed to generate QR code' },
            { status: 500 }
        );
    }
}

export async function GET(
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

        // Get the hackathon with QR code
        const hackathon = await prisma.hackathon.findUnique({
            where: { id: id },
            select: {
                id: true,
                name: true,
                description: true,
                start_date: true,
                end_date: true,
                start_time: true,
                end_time: true,
                location: true,
                mode: true,
                qrCode: true,
                qrCodeData: true,
                poster_url: true,
                organizer_name: true,
            }
        });

        if (!hackathon) {
            return NextResponse.json(
                { error: 'Hackathon not found' },
                { status: 404 }
            );
        }

        if (!hackathon.qrCode) {
            return NextResponse.json(
                { error: 'QR code not found. Please generate one first.' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            qrCode: hackathon.qrCode,
            qrCodeData: hackathon.qrCodeData,
            hackathon: {
                id: hackathon.id,
                name: hackathon.name,
                description: hackathon.description,
                start_date: hackathon.start_date,
                end_date: hackathon.end_date,
                start_time: hackathon.start_time,
                end_time: hackathon.end_time,
                location: hackathon.location,
                mode: hackathon.mode,
                poster_url: hackathon.poster_url,
                organizer_name: hackathon.organizer_name
            }
        });

    } catch (error) {
        console.error('Error fetching hackathon QR code:', error);
        return NextResponse.json(
            { error: 'Failed to fetch QR code' },
            { status: 500 }
        );
    }
}
