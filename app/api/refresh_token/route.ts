import { NextRequest, NextResponse } from 'next/server';
import { refreshAllTokens } from '@/app/services/useTokenRefresh';

export async function POST(req: NextRequest) {
  // Langsung kirim response bahwa proses refresh dimulai
  const startResponse = NextResponse.json({
    message: 'Proses refresh token dimulai di background',
    timestamp: new Date().toISOString()
  }, { status: 202 }); // 202 Accepted

  // Jalankan refresh token di background
  Promise.resolve().then(async () => {
    try {
      console.log('Mulai refresh token di background:', new Date().toISOString());
      await refreshAllTokens();
      console.log('Refresh token selesai:', new Date().toISOString());
    } catch (error) {
      console.error('Error refresh token di background:', error);
    }
  });

  return startResponse;
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Method GET tidak diizinkan' }, { status: 405 });
}
