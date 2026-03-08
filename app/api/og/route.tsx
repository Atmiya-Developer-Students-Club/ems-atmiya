import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import React from 'react';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get parameters from URL
    const title = searchParams.get('title') || 'Event Management System';
    const subtitle = searchParams.get('subtitle') || 'Atmiya University';
    const type = searchParams.get('type') || 'default';
    const date = searchParams.get('date');
    const location = searchParams.get('location');
    const eventId = searchParams.get('eventId');
    const hackathonId = searchParams.get('hackathonId');

    let dynamicData = null;

    if (eventId || hackathonId) {
      try {
        if (eventId) {
          const event = await prisma.event.findUnique({
            where: { id: eventId },
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
            }
          });
          
          if (event) {
            const formatDate = (date: Date) => {
              return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }).format(date);
            };
            
            dynamicData = {
              title: event.name,
              subtitle: `Organized by ${event.organizer_name}`,
              type: 'event',
              date: formatDate(event.start_date),
              location: event.mode === 'OFFLINE' ? event.address : 'Online Event',
              eventType: event.event_type
            };
          }
        } else if (hackathonId) {
          const hackathon = await prisma.hackathon.findUnique({
            where: { id: hackathonId },
            select: {
              id: true,
              name: true,
              description: true,
              start_date: true,
              end_date: true,
              location: true,
              mode: true,
              organizer_name: true,
              status: true,
              team_size_limit: true,
            }
          });
          
          if (hackathon) {
            const formatDate = (date: Date) => {
              return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }).format(date);
            };
            
            const startDate = formatDate(hackathon.start_date);
            const endDate = formatDate(hackathon.end_date);
            
            dynamicData = {
              title: hackathon.name,
              subtitle: `Organized by ${hackathon.organizer_name}`,
              type: 'hackathon',
              date: `${startDate} - ${endDate}`,
              location: hackathon.mode === 'OFFLINE' ? hackathon.location : 'Online Hackathon',
              teamSize: hackathon.team_size_limit
            };
          }
        }
      } catch (dbError) {
        console.error('Error fetching data for OG image:', dbError);
      }
    }

    // Use dynamic data if available, otherwise use URL parameters
    const finalTitle = dynamicData?.title || title;
    const finalSubtitle = dynamicData?.subtitle || subtitle;
    const finalType = dynamicData?.type || type;
    const finalDate = dynamicData?.date || date;
    const finalLocation = dynamicData?.location || location;

    // Choose background based on type
    const getBackground = () => {
      switch (finalType) {
        case 'event':
          return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        case 'hackathon':
          return 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)';
        default:
          return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      }
    };

    // Choose icon based on type
    const getIcon = () => {
      switch (finalType) {
        case 'event':
          return (
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h.01" />
              <path d="M12 14h.01" />
              <path d="M16 14h.01" />
              <path d="M8 18h.01" />
              <path d="M12 18h.01" />
              <path d="M16 18h.01" />
            </svg>
          );
        case 'hackathon':
          return (
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" />
              <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z" />
              <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z" />
              <path d="M12 3c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z" />
              <path d="M12 21c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2z" />
            </svg>
          );
        default:
          return (
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h.01" />
              <path d="M12 14h.01" />
              <path d="M16 14h.01" />
              <path d="M8 18h.01" />
              <path d="M12 18h.01" />
              <path d="M16 18h.01" />
            </svg>
          );
      }
    };

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            background: getBackground(),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '60px',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
            }}
          />
          
          {/* Logo/Icon */}
          <div
            style={{
              width: '120px',
              height: '120px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {getIcon()}
          </div>

          {/* Type Badge */}
          {finalType !== 'default' && (
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
              {dynamicData?.eventType || (finalType === 'event' ? 'Event' : 'Hackathon')}
            </div>
          )}

          {/* Main Title */}
          <h1
            style={{
              fontSize: '48px',
              fontWeight: '700',
              color: 'white',
              margin: '0 0 20px 0',
              textAlign: 'center',
              lineHeight: '1.1',
              textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
              maxWidth: '1000px',
            }}
          >
            {finalTitle}
          </h1>

          {/* Event Details */}
          {(finalDate || finalLocation) && (
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
              {finalDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span>
                  <span>{finalDate}</span>
                </div>
              )}
              {finalLocation && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📍</span>
                  <span>{finalLocation}</span>
                </div>
              )}
              {dynamicData?.teamSize && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>👥</span>
                  <span>Team Size: {dynamicData.teamSize}</span>
                </div>
              )}
            </div>
          )}

          {/* Subtitle */}
          <p
            style={{
              fontSize: '24px',
              fontWeight: '400',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: '0 0 40px 0',
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              maxWidth: '900px',
            }}
          >
            {finalSubtitle}
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
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}
