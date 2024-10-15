import { supabase } from '@/lib/supabase';
import { SHOPEE_PARTNER_ID,shopeeApi } from '@/lib/shopeeConfig';
import { redis } from '@/app/services/redis';
import jsonStableStringify from 'json-stable-stringify';

export async function getTokens(code: string, shopId: number): Promise<{ tokens: any, shopName: string }> {
    try {
        const tokens = await shopeeApi.getTokens(code, shopId);
        const shopName = await getShopName(shopId, tokens.access_token);
        await saveTokens(shopId, tokens, shopName);
        return { tokens, shopName };
    } catch (error) {
        console.error('Gagal mendapatkan token:', error);
        throw new Error('Gagal mendapatkan token dari Shopee API');
    }
}

async function getShopName(shopId: number, accessToken: string): Promise<string> {
    try {
        const response = await shopeeApi.getShopInfo(shopId, accessToken);
        return response.shop_name || 'Nama Toko Tidak Tersedia';
    } catch (error) {
        console.error('Gagal mendapatkan nama toko:', error);
        return "Toko Tidak Dikenali";
    }
}

export async function saveTokens(shopId: number, tokens: any, shopName?: string): Promise<void> {
    try {
        const now = new Date();
        const data: any = {
            partner_id: SHOPEE_PARTNER_ID,
            shop_id: shopId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            access_token_expiry: new Date(now.getTime() + tokens.expire_in * 1000).toISOString(),
            refresh_token_expiry: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            authorization_expiry: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            last_refresh_attempt: now.toISOString(),
            is_active: true,
            updated_at: now.toISOString()
        };

        // Hanya tambahkan shop_name ke data jika shopName ada
        if (shopName !== undefined && shopName !== null) {
            data.shop_name = shopName;
        }

        const { error } = await supabase
            .from('shopee_tokens')
            .upsert(data, { onConflict: 'shop_id' });
            

        if (error) {
            console.error('Gagal menyimpan token ke database:', error);
            throw new Error('Gagal menyimpan token ke database');
        }

        // Simpan token ke Redis jika penyimpanan ke database berhasil
        await redis.hmset(`shopee:token:${shopId}`, Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, jsonStableStringify(v)])
        ));
        await redis.expire(`shopee:token:${shopId}`, 24 * 60 * 60); // Expire setelah 1 hari

    } catch (error) {
        console.error('Terjadi kesalahan saat menyimpan token:', error);
        throw new Error('Gagal menyimpan token');
    }
}

export async function refreshToken(shopId: number, refreshToken: string): Promise<any> {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const newTokens = await shopeeApi.refreshAccessToken(refreshToken, shopId);
            
            await saveTokens(shopId, newTokens);
            
            return newTokens;

        } catch (error) {
            if (attempt === 3) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Tunggu 2 detik sebelum mencoba lagi
        }
    }
}

export async function getValidAccessToken(shopId: number): Promise<string> {
    try {
        // Coba ambil dari Redis terlebih dahulu
        const shopInfo = await redis.hgetall(`shopee:token:${shopId}`);
        
        if (shopInfo && shopInfo.access_token) {
            return shopInfo.access_token;
        }
        
        // Jika tidak ada di Redis, ambil dari database
        const { data, error } = await supabase
            .from('shopee_tokens')
            .select('access_token')
            .eq('shop_id', shopId)
            .single();
        
        if (error) throw error;
        
        if (data && data.access_token) {
            // Simpan kembali ke Redis untuk penggunaan selanjutnya
            await redis.hset(`shopee:token:${shopId}`, 'access_token', data.access_token);
            await redis.expire(`shopee:token:${shopId}`, 24 * 60 * 60); // Expire setelah 1 hari
            
            return data.access_token;
        }
        
        throw new Error('Token tidak ditemukan');
    } catch (error) {
        console.error('Gagal mendapatkan access token:', error);
        throw new Error('Gagal mendapatkan access token');
    }
}
