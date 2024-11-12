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
    return NextResponse.json({
        success: true,
        message: 'OK'
    }, { status: 200 });
}

// Tambahkan export config untuk mencegah static generation
export const dynamic = 'force-dynamic'
export const revalidate = 0
