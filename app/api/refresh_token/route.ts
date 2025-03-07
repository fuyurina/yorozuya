import { NextRequest, NextResponse } from 'next/server';
import { refreshAllTokens } from '@/app/services/useTokenRefresh';

// Definisikan tipe untuk status
interface RefreshStatus {
  inProgress: boolean;
  lastUpdate: string | null;
  result: any | null;  // atau definisikan tipe yang lebih spesifik
  error: string | null;
}

// Simpan status refresh terakhir
let lastRefreshStatus: RefreshStatus = {
  inProgress: false,
  lastUpdate: null,
  result: null,
  error: null
};

export async function POST(req: NextRequest) {
  // Update status bahwa refresh sedang berjalan
  lastRefreshStatus = {
    inProgress: true,
    lastUpdate: new Date().toISOString(),
    result: null,
    error: null
  };

  const startResponse = NextResponse.json({
    message: 'Proses refresh token dimulai di background',
    timestamp: new Date().toISOString()
  }, { status: 202 });

  Promise.resolve().then(async () => {
    try {
      console.log('Mulai refresh token di background:', new Date().toISOString());
      const result = await refreshAllTokens();
      console.log('Refresh token selesai:', new Date().toISOString());
      
      // Update status setelah selesai
      lastRefreshStatus = {
        inProgress: false,
        lastUpdate: new Date().toISOString(),
        result: result,
        error: null
      };
    } catch (error) {
      console.error('Error refresh token di background:', error);
      
      // Update status jika terjadi error
      lastRefreshStatus = {
        inProgress: false,
        lastUpdate: new Date().toISOString(),
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  return startResponse;
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Status refresh token terakhir',
    status: lastRefreshStatus
  }, { status: 200 });
}
