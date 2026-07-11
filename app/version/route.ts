import { NextResponse } from 'next/server';
import { buildInfo } from '@/lib/buildInfo';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    {
      app: 'Noa Finanzas',
      ...buildInfo,
      servedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  );
}
