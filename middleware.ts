import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const PUBLIC_ASSETS = [
  '/fonts/',
  '/vector-img/',
  '/assets/',
  '/pwa/',
  '/images/',
  '/qrcode/',
  '/icon/',
  '/iconSvg',
  '/media/',
  '/ADSC-Icons/',
  '/favicon.ico',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/sw.js',
  '/flags',
  '/tailwind.config.ts',
] as const;

const isPublicAsset = (request: NextRequest): boolean => {
  return PUBLIC_ASSETS.some((path) => request.nextUrl.pathname.startsWith(path));
};

const createNextResponse = (): NextResponse => {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
};

export async function middleware(request: NextRequest) {

  // 1. Skip middleware for public assets
  if (isPublicAsset(request)) {
    return createNextResponse();
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
