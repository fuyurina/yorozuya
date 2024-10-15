import { useEffect } from 'react';
import { refreshToken } from '@/app/services/tokenManager';

import { supabase } from '@/lib/supabase';

export function useTokenRefresh() {
  useEffect(() => {
    const refreshAllTokens = async () => {
      try {
        const { data: shops, error } = await supabase
          .from('shopee_tokens')
          .select('shop_id, refresh_token')
          .eq('is_active', true);

        if (error) throw error;

        for (const shop of shops) {
          await refreshToken(shop.shop_id, shop.refresh_token);
        }
        console.log('Semua token berhasil di-refresh');
      } catch (error) {
        console.error('Gagal me-refresh token:', error);
      }
    };

    // Jalankan refresh token setiap 3 jam
    const intervalId = setInterval(refreshAllTokens, 3 * 60 * 60 * 1000);

    // Jalankan refresh token saat komponen dimount
    refreshAllTokens();

    // Bersihkan interval saat komponen di-unmount
    return () => clearInterval(intervalId);
  }, []);
}
