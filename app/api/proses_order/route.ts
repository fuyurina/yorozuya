import { NextResponse } from 'next/server';
import { getReadyToShipOrders, processReadyToShipOrders, getAllShops } from '@/app/services/shopeeService';

async function getAllOrders(shopId: string, accessToken: string) {
    // Definisikan interface untuk order (sesuaikan dengan struktur data dari Shopee API)
    interface ShopeeOrder {
        order_sn: string;
        // ... properti lainnya jika diperlukan
    }
    
    let allOrders: ShopeeOrder[] = [];
    let hasMore = true;
    let cursor = '';
    while (hasMore) {
        const orders = await getReadyToShipOrders(Number(shopId), accessToken, Number(cursor));
        
        if (orders.response?.order_list) {
            allOrders = [...allOrders, ...orders.response.order_list];
        }
        
        hasMore = orders.response?.more || false;
        cursor = orders.response?.next_cursor || '';
        
        // Tambah delay untuk menghindari rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return allOrders;
}

export async function GET(): Promise<Response> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000 * 60 * 5);

        // Tambahkan logging untuk debug
        console.log('Memulai proses pengambilan toko...');
        const shops = await getAllShops();
        console.log(`Berhasil mengambil ${shops.length} toko`);
        
        const results = [];

        for (const shop of shops) {
            try {
                console.log(`Memproses toko ${shop.shop_id}...`);
                // Verifikasi access token tidak kosong
                if (!shop.access_token) {
                    throw new Error('Access token tidak ditemukan');
                }

                const orders = await getAllOrders(shop.shop_id, shop.access_token);
                console.log(`Ditemukan ${orders.length} pesanan untuk toko ${shop.shop_id}`);

                // Proses setiap pesanan
                for (const order of orders) {
                    const processResult = await processReadyToShipOrders(
                        shop.shop_id,
                        order.order_sn,
                        'dropoff' // default menggunakan metode dropoff
                    );
                    
                    results.push({
                        shop_id: shop.shop_id,
                        order_sn: order.order_sn,
                        result: processResult
                    });
                }
            } catch (shopError) {
                console.error(`Error detail untuk toko ${shop.shop_id}:`, shopError);
                results.push({
                    shop_id: shop.shop_id,
                    error: shopError instanceof Error ? shopError.message : 'Unknown error',
                    errorDetail: shopError instanceof Error ? shopError.stack : null
                });
            }
        }

        const result = await Promise.race([
            Promise.resolve(NextResponse.json({
                success: true,
                data: results
            }, {
                headers: {
                    'Cache-Control': 'no-store',
                }
            })),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 1000 * 60 * 5)
            )
        ]) as Response;

        clearTimeout(timeoutId);
        return result;
    } catch (error) {
        console.error('Error lengkap:', error);
        return NextResponse.json({
            success: false,
            error: 'Terjadi kesalahan saat memproses pesanan',
            details: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : null
        }, { status: 500 });
    }
}

// Tambahkan export config untuk mencegah static generation
export const dynamic = 'force-dynamic'
export const revalidate = 0
