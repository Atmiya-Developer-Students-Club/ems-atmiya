import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: EventLayoutProps): Promise<Metadata> {
  const { eventId } = await params;
  
  try {
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
        poster_url: true,
      }
    });

    if (!event) {
      return {
        title: 'Event Not Found',
        description: 'The requested event could not be found.',
        openGraph: {
          title: 'Event Not Found',
          description: 'The requested event could not be found.',
          images: ['/og-thumbnail.png'],
        },
      };
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
    const ogImageUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/events/${eventId}/og-image`;

    return {
      title: `${event.name} - EMS Platform`,
      description: event.description,
      openGraph: {
        title: event.name,
        description: event.description,
        type: 'website',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/events/${eventId}`,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: event.name,
          },
        ],
        siteName: 'EMS Platform',
      },
      twitter: {
        card: 'summary_large_image',
        title: event.name,
        description: event.description,
        images: [ogImageUrl],
      },
      other: {
        'og:image:width': '1200',
        'og:image:height': '630',
      },
    };
  } catch (error) {
    console.error('Error generating metadata for event:', error);
    return {
      title: 'Event - EMS Platform',
      description: 'Event details on EMS Platform',
      openGraph: {
        title: 'Event - EMS Platform',
        description: 'Event details on EMS Platform',
        images: ['/og-thumbnail.png'],
      },
    };
  }
}

export default function EventLayout({ children }: EventLayoutProps) {
  return children;
}
