import { useState, useCallback, useRef } from 'react';
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

interface SyncProgress {
  total: number;
  current: number;
  processed: string[];
}

interface UseOrderSync {
  isLoading: boolean;
  error: string | null;
  progress: SyncProgress | null;
  syncOrders: (shopId: number, options?: OrderSyncOptions) => Promise<void>;
  cancelSync: () => void;
}

// Tambahkan interface untuk order
interface ShopeeOrder {
  order_sn: string;
  // tambahkan properti lain yang diperlukan
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

export function useOrderSync(): UseOrderSync {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const processOrderDetail = useCallback(async (shopId: number, orderSn: string) => {
    try {
      const response = await getOrderDetail(shopId, orderSn);
      if (!response.success || !response.data) {
        throw new Error(`Data pesanan tidak valid untuk ${orderSn}`);
      }

      const orderData = response.data;
      await Promise.all([
        upsertOrderData(orderData, shopId),
        upsertOrderItems(orderData),
        upsertLogisticData(orderData, shopId)
      ]);

      return true;
    } catch (error: any) {
      console.error(`Gagal memproses pesanan ${orderSn}:`, error.message);
      return false;
    }
  }, []);

  const startSync = useCallback(async (shopId: number, options: OrderSyncOptions = {}) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);
      setProgress({ total: 0, current: 0, processed: [] });

      const now = Math.floor(Date.now() / 1000);
      const syncOptions = {
        timeRangeField: 'update_time' as const,
        startTime: now - (7 * 24 * 60 * 60),
        endTime: now,
        orderStatus: 'ALL' as const,
        pageSize: 50,
        ...options
      };

      let hasMore = true;
      let cursor = '';
      let processedCount = 0;

      while (hasMore && !abortControllerRef.current?.signal.aborted) {
        const response = await getOrderList(shopId, { ...syncOptions, cursor }) as OrderListResponse;
        
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Gagal mengambil daftar pesanan');
        }

        const { order_list = [], more, next_cursor } = response.data;

        setProgress(prev => ({
          ...prev!,
          total: (prev?.total || 0) + order_list.length
        }));

        const batchSize = 5;
        for (let i = 0; i < order_list.length; i += batchSize) {
          if (abortControllerRef.current?.signal.aborted) break;

          const batch = order_list.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map((order: ShopeeOrder) => processOrderDetail(shopId, order.order_sn))
          );

          processedCount += results.filter(Boolean).length;
          setProgress(prev => ({
            ...prev!,
            current: processedCount,
            processed: prev!.processed.concat(
              batch
                .filter((_, index) => results[index])
                .map(order => order.order_sn)
            )
          }));

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        hasMore = more;
        cursor = next_cursor;
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Sinkronisasi dibatalkan');
      } else {
        setError(err.message || 'Terjadi kesalahan yang tidak diketahui');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [processOrderDetail]);

  // Tambahkan fungsi untuk membatalkan sinkronisasi
  const cancelSync = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    isLoading,
    error,
    progress,
    syncOrders: startSync,
    cancelSync
  };
} 