import { getOrderList, getOrderDetail } from '@/app/services/shopeeService';
import { upsertOrderData, upsertOrderItems, upsertLogisticData } from '@/app/services/databaseOperations';

interface OrderSyncOptions {
  timeRangeField?: 'create_time' | 'update_time';
  startTime?: number;
  endTime?: number;
  orderStatus?: 'UNPAID' | 'READY_TO_SHIP' | 'PROCESSED' | 'SHIPPED' | 'COMPLETED' | 'IN_CANCEL' | 'CANCELLED' | 'ALL';
  pageSize?: number;
  onProgress?: (progress: { current: number; total: number }) => void;
  onError?: (error: string) => void;
}

interface ShopeeOrder {
  order_sn: string;
}

interface OrderListResponse {
  success: boolean;
  data?: {
    order_list: ShopeeOrder[];
    more: boolean;
    next_cursor: string;
  };
  message?: string;
}

async function processOrderDetail(shopId: number, orderSn: string) {
  try {
    const response = await getOrderDetail(shopId, orderSn);
    
    const orderData = response.order_list?.[0] || response.data;
    
    if (!orderData) {
      throw new Error(`Data pesanan kosong untuk order ${orderSn}`);
    }

    if (!orderData.order_sn) {
      throw new Error(`Data pesanan tidak memiliki order_sn yang valid: ${orderSn}`);
    }

    await upsertOrderData(orderData, shopId).catch(err => {
      throw new Error(`Gagal menyimpan order data: ${err.message}`);
    });

    await Promise.all([
      upsertOrderItems(orderData).catch(err => {
        throw new Error(`Gagal menyimpan order items: ${err.message}`);
      }),
      upsertLogisticData(orderData, shopId).catch(err => {
        throw new Error(`Gagal menyimpan logistic data: ${err.message}`);
      })
    ]);

    return true;
  } catch (error) {
    const errorDetail = {
      shopId,
      orderSn,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    
    console.error(`Gagal memproses pesanan ${orderSn}: ${errorDetail.error}`);
    return false;
  }
}

interface SyncOrdersResult {
  success: boolean;
  data?: {
    total: number;
    processed: number;
    orderSns: string[];
  };
  error?: string;
}

interface OrderListParams {
  timeRangeField: 'create_time' | 'update_time';
  startTime: number;
  endTime: number;
  orderStatus: string;
  pageSize: number;
  cursor: string;
}

export async function syncOrders(shopId: number, options: OrderSyncOptions = {}) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const syncOptions = {
      timeRangeField: 'update_time' as const,
      startTime: now - (7 * 24 * 60 * 60),
      endTime: now,
      orderStatus: 'ALL' as const,
      pageSize: 50,
      ...options
    };

    let processedCount = 0;
    let totalOrders = 0;
    const processedOrders: string[] = [];

    // Ambil data pertama untuk mendapatkan total orders
    const initialResponse = await getOrderList(shopId, { 
      ...syncOptions, 
      cursor: '' 
    }) as OrderListResponse;

    if (!initialResponse.success || !initialResponse.data) {
      throw new Error(initialResponse.message || 'Gagal mengambil daftar pesanan');
    }

    // Set total awal
    totalOrders = initialResponse.data.order_list.length;
    
    // Update progress awal
    if (options.onProgress) {
      options.onProgress({ 
        current: 0, 
        total: totalOrders 
      });
    }

    // Mulai proses sync
    let hasMore = initialResponse.data.more;
    let cursor = initialResponse.data.next_cursor;

    // Proses batch pertama
    const firstBatch = initialResponse.data.order_list;
    for (const order of firstBatch) {
      const success = await processOrderDetail(shopId, order.order_sn);
      if (success) {
        processedCount++;
        processedOrders.push(order.order_sn);
        
        if (options.onProgress) {
          options.onProgress({ 
            current: processedCount, 
            total: totalOrders 
          });
        }
      }
    }

    // Proses batch selanjutnya jika ada
    while (hasMore) {
      const response = await getOrderList(shopId, { ...syncOptions, cursor }) as OrderListResponse;
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Gagal mengambil daftar pesanan');
      }

      // Update total orders
      totalOrders += response.data.order_list.length;

      for (const order of response.data.order_list) {
        const success = await processOrderDetail(shopId, order.order_sn);
        if (success) {
          processedCount++;
          processedOrders.push(order.order_sn);
          
          if (options.onProgress) {
            options.onProgress({ 
              current: processedCount, 
              total: totalOrders 
            });
          }
        }
      }

      hasMore = response.data.more;
      cursor = response.data.next_cursor;
    }

    return {
      success: true,
      data: {
        total: totalOrders,
        processed: processedCount,
        orderSns: processedOrders
      }
    };

  } catch (err: any) {
    if (options.onError) {
      options.onError(err.message || 'Terjadi kesalahan yang tidak diketahui');
    }
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan yang tidak diketahui'
    };
  }
} 