import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { shopeeApi } from '@/lib/shopeeConfig';
// Inisialisasi Supabase Client



export async function GET() {
  try {
    // Ambil semua token dan nama toko dari tabel shopee_tokens
    const { data: tokens, error } = await supabase
      .from('shopee_tokens')
      .select('shop_id, access_token, shop_name');

    if (error) throw error;

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: 'Tidak ada toko yang terhubung' }, { status: 404 });
    }

    // Ambil daftar percakapan untuk setiap toko
    const allConversations = await Promise.all(
      tokens.map(async (token) => {
        try {
          const conversations = await shopeeApi.getConversationList(
            token.shop_id,
            token.access_token,
            {
              direction: 'older',
              type: 'all',
              page_size: 10
              
            }
          );
          
          // Tambahkan shop_name ke setiap percakapan
          return conversations.response.conversations.map((conv: any) => ({
            ...conv,
            shop_name: token.shop_name
          }));
        } catch (error) {
          console.error(`Error mengambil percakapan untuk toko ${token.shop_id}:`, error);
          return [];
        }
      })
    );

    // Gabungkan semua percakapan menjadi satu array
    const flattenedConversations = allConversations.flat();

    // Urutkan percakapan berdasarkan last_message_timestamp secara menurun
    const sortedConversations = flattenedConversations.sort((a, b) => 
      b.last_message_timestamp - a.last_message_timestamp
    );

    return NextResponse.json(sortedConversations);
  } catch (error) {
    console.error('Error dalam rute API:', error);
    return NextResponse.json({ message: 'Kesalahan Server Internal' }, { status: 500 });
  }
}
