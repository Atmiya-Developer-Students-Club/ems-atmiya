import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { QRCodeService } from '@/lib/qr-code';
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has a QR code
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { qrCode: true, qrCodeData: true }
    });

    if (existingUser?.qrCode) {
      return NextResponse.json({
        message: 'QR code already exists',
        qrCode: existingUser.qrCode,
        qrCodeData: existingUser.qrCodeData
      });
    }

    // Generate new QR code for the user
    const { qrCode, qrCodeData } = await QRCodeService.generateUserQRCode(user.id);

    // Update user with QR code
    await prisma.user.update({
      where: { supabaseId: user.id },
      data: {
        qrCode,
        qrCodeData
      }
    });

    return NextResponse.json({
      message: 'QR code generated successfully',
      qrCode,
      qrCodeData
    });

  } catch (error) {
    console.error('Error generating user QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's QR code
    const userData = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { 
        qrCode: true, 
        qrCodeData: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (!userData?.qrCode) {
      return NextResponse.json(
        { error: 'QR code not found. Please generate one first.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      qrCode: userData.qrCode,
      qrCodeData: userData.qrCodeData,
      user: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email
      }
    });

  } catch (error) {
    console.error('Error fetching user QR code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QR code' },
      { status: 500 }
    );
  }
}
