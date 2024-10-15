import { NextResponse } from 'next/server';

import { shopeeApi } from '@/lib/shopeeConfig';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { toId, messageType = 'text', content, shopId } = await req.json();

    // Pastikan toId dan shopId adalah number
    const parsedToId = Number(toId);
    const parsedShopId = Number(shopId);

    if (isNaN(parsedToId) || isNaN(parsedShopId)) {
      return NextResponse.json({ success: false, error: 'toId dan shopId harus berupa angka' }, { status: 400 });
    }

    // Validasi messageType
    if (!['text', 'sticker', 'image', 'item', 'order'].includes(messageType)) {
      return NextResponse.json({ success: false, error: 'messageType tidak valid' }, { status: 400 });
    }

    // Validasi content berdasarkan messageType
    if (!validateContent(messageType, content)) {
      return NextResponse.json({ success: false, error: 'content tidak valid untuk messageType yang dipilih' }, { status: 400 });
    }

    // Ambil akses token dari shopee_tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('shopee_tokens')
      .select('access_token')
      .eq('shop_id', parsedShopId)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ success: false, error: 'Gagal mengambil akses token' }, { status: 500 });
    }

    const accessToken = tokenData.access_token;

    // Sebelum mengirim pesan ke API Shopee
    console.log('Data yang dikirim ke API Shopee:', {
      shopId: parsedShopId,
      toId: parsedToId,
      messageType,
      content
    });

    // Kirim pesan
    const result = await shopeeApi.sendMessage(parsedShopId, accessToken, parsedToId, messageType, content);

    // Log hasil dari API Shopee
    console.log('Hasil dari API Shopee:', result);

    // Periksa keberhasilan berdasarkan adanya 'response' dan 'message_id'
    if (result.response && result.response.message_id) {
      console.log('Pesan berhasil dikirim:', result.response);
      return NextResponse.json({ success: true, data: result.response });
    } else {
      console.error('Gagal mengirim pesan:', result.error || 'Tidak ada message_id dalam respons');
      return NextResponse.json({ success: false, error: result.error || 'Gagal mengirim pesan' }, { status: 400 });
    }
  } catch (error) {
    console.error('Kesalahan saat mengirim pesan:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}

function validateContent(messageType: string, content: any): boolean {
  switch (messageType) {
    case 'text':
      return typeof content === 'string' && content.trim().length > 0;
    case 'sticker':
      return content && typeof content.sticker_id === 'number' && typeof content.sticker_package_id === 'number';
    case 'image':
      return content && typeof content.image_url === 'string' && content.image_url.trim().length > 0;
    case 'item':
      return content && Number.isInteger(content.item_id) && content.item_id > 0;
    case 'order':
      return content && typeof content.order_sn === 'string' && content.order_sn.trim().length > 0;
    default:
      return false;
  }
}
