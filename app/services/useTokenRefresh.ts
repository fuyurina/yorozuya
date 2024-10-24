import { redis } from '@/app/services/redis';
import { refreshToken } from '@/app/services/tokenManager';

import { supabase } from '@/lib/supabase';



export async function refreshAllTokens() {
  try {
    const { data: shops, error } = await supabase
      .from('shopee_tokens')
      .select('shop_id, refresh_token')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching tokens:', error);
      return;
    }

    for (const shop of shops) {
      try {
        const data = await refreshToken(shop.shop_id, shop.refresh_token);
        await redis.hset(`shopee:token:${shop.shop_id}`, 'access_token', JSON.stringify(data.access_token));
        await redis.expire(`shopee:token:${shop.shop_id}`, 24 * 60 * 60); // Expire setelah 1 hari
      } catch (refreshError) {
        console.error(`Gagal me-refresh token untuk shop_id ${shop.shop_id}:`, refreshError);
      }
    }
    console.log('Semua token berhasil di-refresh');
  } catch (error) {
    console.error('Gagal me-refresh token:', error);
  }
}
