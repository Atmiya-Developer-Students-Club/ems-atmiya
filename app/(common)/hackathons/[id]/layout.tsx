import { Metadata } from 'next';

interface HackathonLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata({ params }: HackathonLayoutProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const res = await fetch(`${SITE_URL}/api/hackathons/${id}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
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

    const data = await res.json();
    const hackathon = data.hackathon;

    const formatDate = (date: string) => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(date));
    };

    const startDate = formatDate(hackathon.start_date);
    const endDate = formatDate(hackathon.end_date);
    const location = hackathon.mode === 'OFFLINE' ? hackathon.location : 'Online Hackathon';
    const ogImageUrl = `${SITE_URL}/api/hackathons/${id}/og-image`;

    return {
      title: `${hackathon.name} - EMS Platform`,
      description: hackathon.description,
      openGraph: {
        title: hackathon.name,
        description: hackathon.description,
        type: 'website',
        url: `${SITE_URL}/hackathons/${id}`,
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
