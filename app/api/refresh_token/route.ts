import { NextRequest, NextResponse } from 'next/server';
import { refreshAllTokens } from '@/app/services/useTokenRefresh';

export async function POST(req: NextRequest) {
  try {
    console.log('Cron job running: Refreshing tokens at', new Date().toISOString());
    await refreshAllTokens();
    return NextResponse.json(
      { 
        message: 'Semua token berhasil di-refresh',
        timestamp: new Date().toISOString()
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Token refresh failed:', error);
    return NextResponse.json({ error: 'Gagal me-refresh token' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Method GET tidak diizinkan' }, { status: 405 });
}
