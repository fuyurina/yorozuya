import { NextRequest, NextResponse } from 'next/server';
import { shopeeApi } from '@/lib/shopeeConfig';

import { getValidAccessToken } from '@/app/services/tokenManager';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = parseInt(searchParams.get('shopId') || '0');
    const conversationId = parseInt(searchParams.get('conversationId') || '0');
    const lastReadMessageId = searchParams.get('lastReadMessageId') || '';

    if (!shopId || !conversationId || !lastReadMessageId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const encodedAccessToken = await getValidAccessToken(shopId);
    
    // Decode access token
    const decodedAccessToken = decodeURIComponent(encodedAccessToken);
    
    // Hapus tanda kutip di awal dan akhir jika ada
    const cleanAccessToken = decodedAccessToken.replace(/^"|"$/g, '');
    

    console.log('Token yang di-decode:', cleanAccessToken);

    const result = await shopeeApi.readConversation(shopId, cleanAccessToken, conversationId, lastReadMessageId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Kesalahan saat menandai pesan sebagai dibaca:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
