import { NextResponse } from 'next/server';
import { getAppPushConfig, setAppPushConfig } from '@/app/services/shopeeService';

export async function GET() {
  try {
    const result = await getAppPushConfig();
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching push config:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { callback_url, blocked_shop_id_list } = body;

    const result = await setAppPushConfig({
      callback_url,
      blocked_shop_id_list
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error saving push config:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal' },
      { status: 500 }
    );
  }
} 
export const dynamic = 'force-dynamic';
export const revalidate = 0;