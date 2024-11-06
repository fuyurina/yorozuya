import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ShippingDocumentParams {
  order_sn: string;
  package_number?: string;
  shipping_document_type: "THERMAL_AIR_WAYBILL";
  shipping_carrier?: string;
}

export function useShippingDocument() {
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{
    processed: number;
    total: number;
    currentCarrier: string;
  }>({
    processed: 0,
    total: 0,
    currentCarrier: ''
  });

  const downloadDocument = async (
    shopId: number, 
    orderList: ShippingDocumentParams[]
  ) => {
    try {
      setIsLoading(prev => ({
        ...prev,
        ...orderList.reduce((acc, order) => ({ ...acc, [order.order_sn]: true }), {})
      }));
      setError(null);

      const queryParams = new URLSearchParams({
        shopId: shopId.toString(),
        orderSns: orderList.map(order => order.order_sn).join(','),
        carrier: orderList[0].shipping_carrier || ''
      }).toString();

      const response = await fetch(`/api/shipping-document/view?${queryParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch documents`);
      }
      
      const blob = await response.blob();
      
      await Promise.all(
        orderList.map(async (order) => {
          await supabase
            .from('logistic')
            .update({ is_printed: true })
            .eq('order_sn', order.order_sn);
        })
      );

      return blob;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      throw err;
    } finally {
      setIsLoading(prev => ({
        ...prev,
        ...orderList.reduce((acc, order) => ({ ...acc, [order.order_sn]: false }), {})
      }));
    }
  };

  return {
    downloadDocument,
    isLoadingForOrder: (orderSn: string) => !!isLoading[orderSn],
    bulkProgress,
    setBulkProgress,
    error
  };
} 