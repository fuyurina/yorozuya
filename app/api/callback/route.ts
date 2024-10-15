import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from '@/app/services/tokenManager';

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code');
    const shopId = request.nextUrl.searchParams.get('shop_id');

    if (!code || !shopId) {
        return NextResponse.json({ error: 'Code or shop_id is missing' }, { status: 400 });
    }

    const tokens = await getTokens(code, Number(shopId));

    return NextResponse.redirect(new URL('/shops', request.url));
}