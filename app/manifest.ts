import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EMS - Atmiya University',
    short_name: 'EMS Atmiya',
    description: 'Event Management System for Atmiya University',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#667eea',
    icons: [
      {
        src: '/ADSC-Icons/launcher-icon-0-75x.png',
        sizes: '36x36',
        type: 'image/png',
      },
      {
        src: '/ADSC-Icons/launcher-icon-1x.png',
        sizes: '48x48',
        type: 'image/png',
      },
      {
        src: '/ADSC-Icons/launcher-icon-1-5x.png',
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: '/ADSC-Icons/launcher-icon-2x.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/ADSC-Icons/launcher-icon-3x.png',
        sizes: '144x144',
        type: 'image/png',
      },
      {
        src: '/ADSC-Icons/launcher-icon-4x.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/ADSC-Icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['education', 'productivity'],
    lang: 'en',
    dir: 'ltr',
    orientation: 'portrait',
    scope: '/',
    prefer_related_applications: false,
  }
}
