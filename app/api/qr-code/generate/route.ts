import { NextRequest, NextResponse } from 'next/server';
import { QRCodeService } from '@/lib/qr-code';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type,teamMemberId, studentId, teamId, hackathonId, eventId, userId, saveToDatabase = false } = body;

    // Handle different QR code types
    switch (type) {
      case 'teamMember':
        // Validate required parameters for team member QR
        if (!studentId || !hackathonId) {
          return NextResponse.json(
            { error: 'Missing required parameters: studentId and hackathonId are required for teamMember type' },
            { status: 400 }
          );
        }

        // If teamId is provided and saveToDatabase is true, check if QR already exists
        if (teamId && saveToDatabase) {
          const existingTeamMember = await prisma.hackathonTeamMember.findUnique({
            where: {
                id: teamMemberId
            },
          });

          if (existingTeamMember?.qrCode) {
            return NextResponse.json({
              success: true,
              qrCode: existingTeamMember.qrCode,
              qrCodeData: existingTeamMember.qrCodeData,
              message: 'QR code already exists'
            });
          }
        }

        const teamMemberResult = await QRCodeService.generateTeamMemberQRCode(
          studentId,
          teamId || '',
          hackathonId
        );

        // Save to database if requested and teamId is provided
        if (teamId && saveToDatabase) {
          await prisma.hackathonTeamMember.update({
            where: {
                id: teamMemberId
            },
            data: {
              qrCode: teamMemberResult.qrCode,
              qrCodeData: teamMemberResult.qrCodeData
            }
          });
        }

        return NextResponse.json({
          success: true,
          qrCode: teamMemberResult.qrCode,
          qrCodeData: teamMemberResult.qrCodeData,
          savedToDatabase: teamId && saveToDatabase
        });

      case 'user':
        if (!userId) {
          return NextResponse.json(
            { error: 'Missing required parameter: userId is required for user type' },
            { status: 400 }
          );
        }

        const userResult = await QRCodeService.generateUserQRCode(userId);

        return NextResponse.json({
          success: true,
          qrCode: userResult.qrCode,
          qrCodeData: userResult.qrCodeData,
        });

      case 'event':
        if (!eventId || !userId) {
          return NextResponse.json(
            { error: 'Missing required parameters: eventId and userId are required for event type' },
            { status: 400 }
          );
        }

        const eventResult = await QRCodeService.generateEventQRCode(eventId, userId);

        return NextResponse.json({
          success: true,
          qrCode: eventResult.qrCode,
          qrCodeData: eventResult.qrCodeData,
        });      default:
        // Default behavior for backward compatibility - assume teamMember
        if (!studentId || !hackathonId) {
          return NextResponse.json(
            { error: 'Missing required parameters: studentId and hackathonId are required' },
            { status: 400 }
          );
        }

        // If teamId is provided and saveToDatabase is true, check if QR already exists
        if (teamId && saveToDatabase) {
          const existingTeamMember = await prisma.hackathonTeamMember.findUnique({
            where: {
              teamId_studentId: {
                teamId: teamId,
                studentId: studentId
              }
            }
          });

          if (existingTeamMember?.qrCode) {
            return NextResponse.json({
              success: true,
              qrCode: existingTeamMember.qrCode,
              qrCodeData: existingTeamMember.qrCodeData,
              message: 'QR code already exists'
            });
          }
        }

        const defaultResult = await QRCodeService.generateTeamMemberQRCode(
          studentId,
          teamId || '',
          hackathonId
        );

        // Save to database if requested and teamId is provided
        if (teamId && saveToDatabase) {
          await prisma.hackathonTeamMember.update({
            where: {
              teamId_studentId: {
                teamId: teamId,
                studentId: studentId
              }
            },
            data: {
              qrCode: defaultResult.qrCode,
              qrCodeData: defaultResult.qrCodeData
            }
          });
        }

        return NextResponse.json({
          success: true,
          qrCode: defaultResult.qrCode,
          qrCodeData: defaultResult.qrCodeData,
          savedToDatabase: teamId && saveToDatabase
        });
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
