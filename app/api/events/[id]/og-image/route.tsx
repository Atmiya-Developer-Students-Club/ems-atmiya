import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';
import React from 'react';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        start_date: true,
        end_date: true,
        address: true,
        mode: true,
        event_type: true,
        organizer_name: true,
        status: true,
        poster_url: true,
      }
    });

    if (!event) {
      return new NextResponse('Event not found', { status: 404 });
    }

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    };

    const eventDate = formatDate(event.start_date);
    const location = event.mode === 'OFFLINE' ? event.address : 'Online Event';

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Event Poster Background */}
          {event.poster_url && (
            <img
              src={event.poster_url}
              alt={event.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
          
          {/* Overlay for better text readability */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '60px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          >
            {/* Event Badge */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '50px',
                fontSize: '20px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                marginBottom: '30px',
              }}
            >
              {event.event_type}
            </div>

            {/* Main Title */}
            <h1
              style={{
                fontSize: '48px',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 20px 0',
                textAlign: 'center',
                lineHeight: '1.1',
                textShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
                maxWidth: '1000px',
              }}
            >
              {event.name}
            </h1>

            {/* Event Details */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '40px',
                marginBottom: '30px',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📅</span>
                <span>{eventDate}</span>
              </div>
              {location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📍</span>
                  <span>{location}</span>
                </div>
              )}
            </div>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '24px',
                fontWeight: '400',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '0 0 40px 0',
                textAlign: 'center',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                maxWidth: '900px',
              }}
            >
              Organized by {event.organizer_name}
            </p>

            {/* Bottom Branding */}
            <div
              style={{
                position: 'absolute',
                bottom: '40px',
                right: '60px',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '16px 24px',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'white',
                }}
              >
                EMS Platform
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new NextResponse('Error generating image', { status: 500 });
  }
}
