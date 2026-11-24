import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** The public half of the push key; the phone needs it to subscribe. */
export function GET() {
  return NextResponse.json({ key: process.env.VAPID_PUBLIC_KEY ?? '' });
}
