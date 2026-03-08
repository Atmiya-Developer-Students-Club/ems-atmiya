import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface HackathonLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: HackathonLayoutProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id },
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

    if (!hackathon) {
      return {
        title: 'Hackathon Not Found',
        description: 'The requested hackathon could not be found.',
        openGraph: {
          title: 'Hackathon Not Found',
          description: 'The requested hackathon could not be found.',
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

    const startDate = formatDate(hackathon.start_date);
    const endDate = formatDate(hackathon.end_date);
    const location = hackathon.mode === 'OFFLINE' ? hackathon.location : 'Online Hackathon';
    const ogImageUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/hackathons/${id}/og-image`;

    return {
      title: `${hackathon.name} - EMS Platform`,
      description: hackathon.description,
      openGraph: {
        title: hackathon.name,
        description: hackathon.description,
        type: 'website',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/hackathons/${id}`,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: hackathon.name,
          },
        ],
        siteName: 'EMS Platform',
      },
      twitter: {
        card: 'summary_large_image',
        title: hackathon.name,
        description: hackathon.description,
        images: [ogImageUrl],
      },
      other: {
        'og:image:width': '1200',
        'og:image:height': '630',
      },
    };
  } catch (error) {
    console.error('Error generating metadata for hackathon:', error);
    return {
      title: 'Hackathon - EMS Platform',
      description: 'Hackathon details on EMS Platform',
      openGraph: {
        title: 'Hackathon - EMS Platform',
        description: 'Hackathon details on EMS Platform',
        images: ['/og-thumbnail.png'],
      },
    };
  }
}

export default function HackathonLayout({ children }: HackathonLayoutProps) {
  return children;
}
