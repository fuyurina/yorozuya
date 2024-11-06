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

export async function GET() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000 * 60 * 5); // 5 menit

        // Ambil semua toko aktif
        const shops = await getAllShops();
        const results = [];

        // Proses setiap toko
        for (const shop of shops) {
            try {
                // Ambil pesanan ready to ship
                const orders = await getAllOrders(shop.shop_id, shop.access_token);
                
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
                console.error(`Error memproses toko ${shop.shop_id}:`, shopError);
                results.push({
                    shop_id: shop.shop_id,
                    error: (shopError as Error).message
                });
            }
        }

        const result = await Promise.race([
            // proses normal
            NextResponse.json({
                success: true,
                data: results
            }, {
                headers: {
                    'Cache-Control': 'no-store',
                }
            }),
            // timeout error
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 1000 * 60 * 5)
            )
        ]);

        clearTimeout(timeoutId);
        return result;
    } catch (error) {
        console.error('Error dalam memproses pesanan:', error);
        return NextResponse.json({
            success: false,
            error: 'Terjadi kesalahan saat memproses pesanan',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
