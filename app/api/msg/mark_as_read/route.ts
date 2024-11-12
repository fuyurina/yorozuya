import { NextRequest, NextResponse } from 'next/server';
import { readConversation } from '@/app/services/shopeeService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = parseInt(searchParams.get('shopId') || '0');
    const conversationId = parseInt(searchParams.get('conversationId') || '0');
    const lastReadMessageId = searchParams.get('lastReadMessageId') || '';

    if (!shopId || !conversationId || !lastReadMessageId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const result = await readConversation(shopId, conversationId, lastReadMessageId);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error,
        message: result.message 
      }, { status: 400 });
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Kesalahan saat menandai pesan sebagai dibaca:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
